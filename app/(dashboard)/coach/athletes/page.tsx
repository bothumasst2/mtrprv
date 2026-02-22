"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Activity, ArrowLeft, Trash2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined;
}

interface Athlete {
  id: string;
  username: string;
  email: string;
  profile_photo: string | null;
  total_workouts: number;
  last_activity: string | null;
}

interface AthleteActivity {
  id: string;
  date: string;
  training_type: string;
  distance: number;
  status: "completed" | "pending";
  strava_link: string | null;
  assignment_id?: string; // ID dari training_assignments jika ada
  target_date?: string;
  assigned_date?: string;
  training_details?: string;
}

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [athleteActivities, setAthleteActivities] = useState<AthleteActivity[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(
    new Set(),
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    const { data } = await supabase.from("users").select(
      "id, username, email, profile_photo",
    ).eq("role", "user");

    if (data) {
      // Get workout counts for each athlete from both tables
      const athletesWithStats = await Promise.all(
        data.map(async (athlete) => {
          // Get completed workouts
          const { data: completedWorkouts } = await supabase
            .from("training_log")
            .select("id, date, status")
            .eq("user_id", athlete.id);

          // Get assigned workouts with target_date
          const { data: assignedWorkouts } = await supabase
            .from("training_assignments")
            .select("id, date, target_date")
            .eq("user_id", athlete.id);

          // Combine and get total count
          const totalActivities = (completedWorkouts?.length || 0) +
            (assignedWorkouts?.length || 0);

          // Get the most recent activity date from both tables
          const allDates: string[] = [];
          if (completedWorkouts) {
            allDates.push(...completedWorkouts.map((w) => w.date));
          }
          if (assignedWorkouts) {
            allDates.push(
              ...assignedWorkouts.map((w) => w.target_date || w.date),
            );
          }

          allDates.sort((a, b) =>
            new Date(b).getTime() - new Date(a).getTime()
          );
          const lastActivity = allDates.length > 0 ? allDates[0] : null;

          return {
            ...athlete,
            total_workouts: totalActivities,
            last_activity: lastActivity,
          };
        }),
      );

      setAthletes(athletesWithStats);
    }
    setLoading(false);
  };

  const fetchAthleteActivities = async (athleteId: string) => {
    // Fetch completed activities from training_log
    const { data: completedActivities } = await supabase
      .from("training_log")
      .select("*")
      .eq("user_id", athleteId);

    // Fetch pending/missed activities from training_assignments
    const { data: assignedActivities } = await supabase
      .from("training_assignments")
      .select("*")
      .eq("user_id", athleteId);

    // Combine both datasets
    const allActivities: AthleteActivity[] = [];

    // Add completed activities
    if (completedActivities) {
      completedActivities.forEach((activity) => {
        let matchedAssignment = null;
        if (assignedActivities) {
          matchedAssignment = assignedActivities.find((a: any) => {
            if (activity.assignment_id && activity.assignment_id === a.id) {
              return true;
            }
            const completedDate = new Date(activity.date).toDateString();
            const assignmentDate = new Date(a.target_date || a.date)
              .toDateString();
            return completedDate === assignmentDate &&
              activity.training_type === a.training_type &&
              activity.user_id === a.user_id;
          });
        }

        allActivities.push({
          id: activity.id,
          date: activity.date,
          training_type: activity.training_type,
          distance: activity.distance,
          status: "completed",
          strava_link: activity.strava_link,
          assignment_id: activity.assignment_id, // Jika ada reference ke assignment
          target_date: matchedAssignment?.target_date || activity.date,
          assigned_date: matchedAssignment?.assigned_date,
          training_details: matchedAssignment?.training_details,
        });
      });
    }

    // Add assigned activities (pending/missed) yang belum dikerjakan
    if (assignedActivities) {
      assignedActivities.forEach((activity) => {
        // Cek apakah assignment ini sudah dikerjakan dengan berbagai cara pencocokan
        const isCompleted = completedActivities?.some((completed) => {
          // Method 1: Cocokkan berdasarkan assignment_id jika ada
          if (
            completed.assignment_id && completed.assignment_id === activity.id
          ) {
            return true;
          }

          // Method 2: Cocokkan berdasarkan tanggal, tipe latihan, dan user
          const completedDate = new Date(completed.date).toDateString();
          const assignmentDate = new Date(activity.target_date || activity.date)
            .toDateString();

          return completedDate === assignmentDate &&
            completed.training_type === activity.training_type &&
            completed.user_id === activity.user_id;
        });

        // Jika belum dikerjakan, tambahkan sebagai pending (hanya yang belum lewat tanggal)
        if (!isCompleted) {
          const targetDate = new Date(activity.target_date || activity.date);
          const today = new Date();

          // Set today to start of day to compare dates accurately
          today.setHours(0, 0, 0, 0);
          targetDate.setHours(0, 0, 0, 0);

          // Hanya tampilkan yang pending (belum lewat tanggal), skip yang missed
          if (targetDate >= today) {
            allActivities.push({
              id: activity.id,
              date: activity.target_date || activity.date,
              training_type: activity.training_type,
              distance: activity.distance,
              status: "pending",
              strava_link: null,
              assignment_id: activity.id,
              target_date: activity.target_date || activity.date,
              assigned_date: activity.assigned_date,
              training_details: activity.training_details,
            });
          }
        }
      });
    }

    // Sort by date (most recent first)
    allActivities.sort((a: AthleteActivity, b: AthleteActivity) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setAthleteActivities(allActivities);
  };

  const handleAthleteClick = (athlete: Athlete) => {
    if (isDeleteMode) return; // Don't allow click-through in delete mode
    setSelectedAthlete(athlete);
    fetchAthleteActivities(athlete.id);
  };

  const handleBackToList = () => {
    setSelectedAthlete(null);
    setAthleteActivities([]);
  };

  const handleDeleteModeToggle = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedAthletes(new Set()); // Clear selections when toggling mode
  };

  const handleAthleteSelection = (athleteId: string, checked: boolean) => {
    const newSelected = new Set(selectedAthletes);
    if (checked) {
      newSelected.add(athleteId);
    } else {
      newSelected.delete(athleteId);
    }
    setSelectedAthletes(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAthletes(new Set(athletes.map((athlete) => athlete.id)));
    } else {
      setSelectedAthletes(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedAthletes.size === 0) return;

    setIsDeleting(true);

    try {
      const athleteIds = Array.from(selectedAthletes);

      // Delete from all related tables first
      const deletePromises = [
        // Delete training logs
        supabase.from("training_log").delete().in("user_id", athleteIds),
        // Delete training assignments
        supabase.from("training_assignments").delete().in(
          "user_id",
          athleteIds,
        ),
        // Delete users (this will cascade delete related data)
        supabase.from("users").delete().in("id", athleteIds),
      ];

      await Promise.all(deletePromises);

      // Remove deleted athletes from local state
      setAthletes((prev) =>
        prev.filter((athlete) => !selectedAthletes.has(athlete.id))
      );

      // Reset state
      setSelectedAthletes(new Set());
      setIsDeleteMode(false);

      toast({
        title: "Users Deleted",
        description: `Successfully deleted ${athleteIds.length} user(s)`,
      });
    } catch (error) {
      console.error("Error deleting users:", error);
      toast({
        title: "Error",
        description: "Failed to delete users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    const confirmed = confirm(
      "Are you sure you want to delete this assignment?",
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("training_assignments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete failed:", error);
      toast({
        title: "Error",
        description: "Failed to delete assignment.",
        variant: "destructive",
      });
    } else {
      if (selectedAthlete) {
        fetchAthleteActivities(selectedAthlete.id);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1f1f1f]">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Athletes
          </h1>
          <div className="text-white text-center py-8">Loading athletes...</div>
        </div>
      </div>
    );
  }

  if (selectedAthlete) {
    return (
      <div className="min-h-screen bg-[#1f1f1f]">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <div className="text-orange-500 flex items-center gap-4">
            <Button variant="ghost" onClick={handleBackToList} className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-orange-500">
                {selectedAthlete.username}
              </h1>
              <p className="text-white text-sm">Activity History</p>
            </div>
          </div>
          <Card className="bg-strava-darkgrey rounded-xl shadow-sm border-none">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">
                Training Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {athleteActivities.length === 0
                ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600">
                      No training activities found
                    </p>
                  </div>
                )
                : (
                  <div className="space-y-4">
                    {athleteActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="bg-[#1f1f1f] border border-strava-darkgrey/40 rounded-xl p-4 flex flex-col gap-3"
                      >
                        <div>
                          <h3 className="font-bold text-strava text-sm uppercase tracking-wider">
                            {activity.training_type}
                          </h3>
                          <div
                            className={`mt-2 inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                              activity.status === "completed"
                                ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                            }`}
                          >
                            {activity.status}
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs mt-2">
                          <div className="space-y-1 w-full">
                            <div className="flex justify-between text-gray-400">
                              <span>Target</span>
                              <span className="font-bold text-white">
                                {activity.target_date
                                  ? new Date(activity.target_date)
                                    .toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "-"}
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>Assigned</span>
                              <span className="italic">
                                {activity.assigned_date
                                  ? new Date(activity.assigned_date)
                                    .toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "-"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {activity.training_details && (
                          <div className="mt-2 p-3 bg-strava-dark/30 rounded-lg border border-strava-darkgrey/20">
                            <p className="text-xs text-gray-400 leading-relaxed italic">
                              {activity.training_details}
                            </p>
                          </div>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {activity.status === "completed"
                              ? `Distance: ${activity.distance}km`
                              : ""}
                          </span>
                          {activity.status === "completed" &&
                            activity.strava_link && (
                            <a
                              href={activity.strava_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-strava hover:underline font-medium"
                            >
                              View Strava
                            </a>
                          )}
                        </div>

                        {activity.status === "pending" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full mt-2 font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl h-10"
                            onClick={() => handleDeleteAssignment(activity.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1f1f1f]">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-orange-500">
              Athletes
            </h1>
            <p className="text-xs text-white mt-1">
              Manage and view your athletes progress
            </p>
          </div>

          {/* Delete Mode Controls */}
          <div className="flex items-center gap-4">
            {isDeleteMode && (
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={athletes.length > 0 &&
                      selectedAthletes.size === athletes.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm text-white">
                    Select All ({selectedAthletes.size}/{athletes.length})
                  </label>
                </div>

                {selectedAthletes.size > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        disabled={isDeleting}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        {isDeleting
                          ? "Deleting..."
                          : `Delete Selected (${selectedAthletes.size})`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete{" "}
                          {selectedAthletes.size}{" "}
                          user(s)? This action cannot be undone and will remove
                          all their training data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteSelected}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Users
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}

            <Button
              variant={isDeleteMode ? "outline" : "default"}
              onClick={handleDeleteModeToggle}
              className={isDeleteMode
                ? "border-white text-gray-500 hover:bg-strava hover:text-gray-900"
                : ""}
            >
              {isDeleteMode ? "Cancel" : "Delete Users"}
            </Button>
          </div>
        </div>

        {athletes.length === 0
          ? (
            <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  No Athletes Found
                </h3>
                <p className="text-gray-600">
                  No athletes are registered in the system yet.
                </p>
              </CardContent>
            </Card>
          )
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {athletes.map((athlete) => (
                <Card
                  key={athlete.id}
                  className={`bg-strava-darkgrey rounded-xl shadow-sm border border-none transition-all ${
                    isDeleteMode
                      ? "cursor-default hover:bg-strava"
                      : "cursor-pointer hover:bg-strava hover:shadow-md"
                  } ${
                    selectedAthletes.has(athlete.id)
                      ? "ring-2 ring-red-500"
                      : ""
                  }`}
                  onClick={() => handleAthleteClick(athlete)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {isDeleteMode && (
                        <Checkbox
                          checked={selectedAthletes.has(athlete.id)}
                          onCheckedChange={(checked) =>
                            handleAthleteSelection(
                              athlete.id,
                              checked as boolean,
                            )}
                          className="mt-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={getSafeSrc(athlete.profile_photo) ||
                            "/placeholder.svg"}
                        />
                        <AvatarFallback className="bg-orange-500 text-white">
                          {athlete.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h3 className="font-semibold text-white">
                          {athlete.username}
                        </h3>
                        <p className="text-sm text-gray-400">{athlete.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                      <div>
                        <p className="text-gray-400">Total Workouts</p>
                        <p className="text-lg font-bold text-white">
                          {athlete.total_workouts}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Last Activity</p>
                        <p className="font-medium text-white">
                          {athlete.last_activity
                            ? new Date(athlete.last_activity)
                              .toLocaleDateString()
                            : "None"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
