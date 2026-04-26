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
  assignment_id?: string;
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
      const athletesWithStats = await Promise.all(
        data.map(async (athlete) => {
          const { data: completedWorkouts } = await supabase
            .from("training_log")
            .select("id, date, status")
            .eq("user_id", athlete.id);

          const { data: assignedWorkouts } = await supabase
            .from("training_assignments")
            .select("id, date, target_date")
            .eq("user_id", athlete.id);

          const totalActivities = (completedWorkouts?.length || 0) +
            (assignedWorkouts?.length || 0);

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
    const { data: completedActivities } = await supabase
      .from("training_log")
      .select("*")
      .eq("user_id", athleteId);

    const { data: assignedActivities } = await supabase
      .from("training_assignments")
      .select("*")
      .eq("user_id", athleteId);

    const allActivities: AthleteActivity[] = [];

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
          assignment_id: activity.assignment_id,
          target_date: matchedAssignment?.target_date || activity.date,
          assigned_date: matchedAssignment?.assigned_date,
          training_details: matchedAssignment?.training_details,
        });
      });
    }

    if (assignedActivities) {
      assignedActivities.forEach((activity) => {
        const isCompleted = completedActivities?.some((completed) => {
          if (
            completed.assignment_id && completed.assignment_id === activity.id
          ) {
            return true;
          }
          const completedDate = new Date(completed.date).toDateString();
          const assignmentDate = new Date(activity.target_date || activity.date)
            .toDateString();

          return completedDate === assignmentDate &&
            completed.training_type === activity.training_type &&
            completed.user_id === activity.user_id;
        });

        if (!isCompleted) {
          const targetDate = new Date(activity.target_date || activity.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          targetDate.setHours(0, 0, 0, 0);

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

    allActivities.sort((a: AthleteActivity, b: AthleteActivity) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setAthleteActivities(allActivities);
  };

  const handleAthleteClick = (athlete: Athlete) => {
    if (isDeleteMode) return;
    setSelectedAthlete(athlete);
    fetchAthleteActivities(athlete.id);
  };

  const handleBackToList = () => {
    setSelectedAthlete(null);
    setAthleteActivities([]);
  };

  const handleDeleteModeToggle = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedAthletes(new Set());
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
      const res = await fetch("/api/delete-athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete users");
      }
      setAthletes((prev) =>
        prev.filter((athlete) => !selectedAthletes.has(athlete.id))
      );
      setSelectedAthletes(new Set());
      setIsDeleteMode(false);
      toast({
        title: "Users Deleted",
        description: "Successfully deleted " + athleteIds.length + " user(s)",
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

    if (!error) {
      if (selectedAthlete) {
        fetchAthleteActivities(selectedAthlete.id);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Athletes
          </h1>
          <div className="text-gray-500 text-center py-8">Loading athletes...</div>
        </div>
      </div>
    );
  }

  if (selectedAthlete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <div className="text-strava flex items-center gap-4">
            <Button variant="ghost" onClick={handleBackToList} className="p-2 hover:bg-gray-200">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-strava">
                {selectedAthlete.username}
              </h1>
              <p className="text-gray-600 text-sm md:text-base">Activity History</p>
            </div>
          </div>
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Training Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {athleteActivities.length === 0
                ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No training activities found
                    </p>
                  </div>
                )
                : (
                  <div className="space-y-4">
                    {athleteActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:border-strava/30 transition-colors shadow-sm"
                      >
                        <div>
                          <h3 className="font-bold text-strava text-sm md:text-base uppercase tracking-wider">
                            {activity.training_type}
                          </h3>
                          <div
                            className={`mt-2 inline-flex px-3 py-1 rounded-full text-[10px] md:text-sm font-bold uppercase tracking-widest ${
                              activity.status === "completed"
                                ? "bg-green-50 text-green-600 border border-green-200"
                                : "bg-blue-50 text-blue-600 border border-blue-200"
                            }`}
                          >
                            {activity.status}
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs md:text-sm mt-2">
                          <div className="space-y-1 w-full">
                            <div className="flex justify-between text-gray-500">
                              <span>Target</span>
                              <span className="font-bold text-gray-900">
                                {activity.target_date
                                  ? new Date(activity.target_date)
                                    .toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "-"}
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-400">
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
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-xs md:text-sm text-gray-600 leading-relaxed italic">
                              {activity.training_details}
                            </p>
                          </div>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs md:text-sm text-gray-500">
                            {activity.status === "completed"
                              ? "Distance: " + activity.distance + "km"
                              : ""}
                          </span>
                          {activity.status === "completed" &&
                            activity.strava_link && (
                            <a
                              href={activity.strava_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs md:text-sm text-strava hover:underline font-medium"
                            >
                              View Strava
                            </a>
                          )}
                        </div>

                        {activity.status === "pending" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full mt-2 font-bold rounded-xl h-10"
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-strava">
              Athletes
            </h1>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              Manage and view your athletes progress
            </p>
          </div>

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
                  <label htmlFor="select-all" className="text-sm md:text-base text-gray-900">
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
                          : "Delete Selected (" + selectedAthletes.size + ")"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white border-gray-200">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-gray-900">Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600">
                          Are you sure you want to delete{" "}
                          {selectedAthletes.size}{" "}
                          user(s)? This action cannot be undone and will remove
                          all their training data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-100 text-gray-900">Cancel</AlertDialogCancel>
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
                ? "border-gray-200 text-gray-600 hover:bg-gray-100"
                : "bg-strava hover:bg-strava-light text-white"}
            >
              {isDeleteMode ? "Cancel" : "Delete Users"}
            </Button>
          </div>
        </div>

        {athletes.length === 0
          ? (
            <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Athletes Found
                </h3>
                <p className="text-gray-600">
                  No athletes are registered in the system yet.
                </p>
              </CardContent>
            </Card>
          )
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {athletes.map((athlete) => (
                <Card
                  key={athlete.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 transition-all ${
                    isDeleteMode
                      ? "cursor-default"
                      : "cursor-pointer hover:border-strava/50 hover:shadow-md"
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

                      <Avatar className="h-12 w-12 border border-gray-100">
                        <AvatarImage
                          src={getSafeSrc(athlete.profile_photo) ||
                            "/placeholder.svg"}
                        />
                        <AvatarFallback className="bg-strava text-white">
                          {athlete.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {athlete.username}
                        </h3>
                        <p className="text-sm md:text-base text-gray-500">{athlete.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm md:text-base mt-4">
                      <div>
                        <p className="text-gray-500">Total Workouts</p>
                        <p className="text-lg font-bold text-gray-900">
                          {athlete.total_workouts}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Last Activity</p>
                        <p className="font-medium text-gray-900">
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
