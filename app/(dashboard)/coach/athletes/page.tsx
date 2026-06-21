"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Activity,
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { createAthlete, deleteAthletes } from "@/actions/coach";

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined;
}

interface Athlete {
  id: string;
  username: string;
  email: string;
  profile_photo: string | null;
  kelas_id: string | null;
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

interface AthleteStats {
  completed: number;
  pending: number;
  missed: number;
}

interface KelasItem {
  id: string;
  name: string;
}

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [athleteActivities, setAthleteActivities] = useState<AthleteActivity[]>(
    [],
  );
  const [athleteStats, setAthleteStats] = useState<AthleteStats>({
    completed: 0,
    pending: 0,
    missed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(
    new Set(),
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Add athlete state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberKelas, setNewMemberKelas] = useState("");
  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);

  // Edit kelas state
  const [manageKelasAthlete, setManageKelasAthlete] = useState<Athlete | null>(
    null,
  );
  const [manageKelasId, setManageKelasId] = useState("");
  const [savingKelas, setSavingKelas] = useState(false);
  const [kelasList, setKelasList] = useState<KelasItem[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    fetchAthletes();
    fetchKelas();
  }, []);

  const fetchKelas = async () => {
    const { data } = await supabase
      .from("kelas")
      .select("id, name")
      .order("sort_order", { ascending: true });
    setKelasList(data || []);
  };

  const fetchAthletes = async () => {
    const { data } = await supabase
      .from("users")
      .select("id, username, email, profile_photo, kelas_id")
      .eq("role", "user");

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

          const totalActivities =
            (completedWorkouts?.length || 0) + (assignedWorkouts?.length || 0);

          const allDates: string[] = [];
          if (completedWorkouts) {
            allDates.push(...completedWorkouts.map((w) => w.date));
          }
          if (assignedWorkouts) {
            allDates.push(
              ...assignedWorkouts.map((w) => w.target_date || w.date),
            );
          }

          allDates.sort(
            (a, b) => new Date(b).getTime() - new Date(a).getTime(),
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
            const assignmentDate = new Date(
              a.target_date || a.date,
            ).toDateString();
            return (
              completedDate === assignmentDate &&
              activity.training_type === a.training_type &&
              activity.user_id === a.user_id
            );
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
          assigned_date: matchedAssignment?.assigned_date || null,
          training_details: matchedAssignment?.training_details || null,
        });
      });
    }

    if (assignedActivities) {
      assignedActivities.forEach((activity) => {
        const isCompleted = completedActivities?.some((completed) => {
          if (
            completed.assignment_id &&
            completed.assignment_id === activity.id
          ) {
            return true;
          }
          const completedDate = new Date(completed.date).toDateString();
          const assignmentDate = new Date(
            activity.target_date || activity.date,
          ).toDateString();

          return (
            completedDate === assignmentDate &&
            completed.training_type === activity.training_type &&
            completed.user_id === activity.user_id
          );
        });

        if (!isCompleted) {
          allActivities.push({
            id: activity.id,
            date: activity.target_date || activity.date,
            training_type: activity.training_type,
            distance: activity.distance,
            status: "pending",
            strava_link: null,
            assignment_id: activity.id,
            target_date: activity.target_date || activity.date,
            assigned_date: activity.assigned_date || null,
            training_details: activity.training_details || null,
          });
        }
      });
    }

    allActivities.sort(
      (a: AthleteActivity, b: AthleteActivity) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    setAthleteActivities(allActivities);

    // Compute stats (same logic as ActiveFit)
    const stats = { completed: 0, pending: 0, missed: 0 };
    if (completedActivities) stats.completed = completedActivities.length;
    if (assignedActivities) {
      assignedActivities.forEach((a) => {
        const targetDate = new Date(a.target_date || a.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        const isCompleted = completedActivities?.some((c) => {
          if (c.assignment_id && c.assignment_id === a.id) return true;
          const cd = new Date(c.date).toDateString();
          const ad = new Date(a.target_date || a.date).toDateString();
          return (
            cd === ad &&
            c.training_type === a.training_type &&
            c.user_id === a.user_id
          );
        });

        if (!isCompleted) {
          if (targetDate >= today) stats.pending++;
          else stats.missed++;
        }
      });
    }
    setAthleteStats(stats);
  };

  const handleAthleteClick = (athlete: Athlete) => {
    if (isDeleteMode) return;
    setSelectedAthlete(athlete);
    fetchAthleteActivities(athlete.id);
  };

  const handleBackToList = () => {
    setSelectedAthlete(null);
    setAthleteActivities([]);
    setAthleteStats({ completed: 0, pending: 0, missed: 0 });
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
      const result = await deleteAthletes(athleteIds);

      if (result.error) throw new Error(result.error);

      setAthletes((prev) =>
        prev.filter((athlete) => !selectedAthletes.has(athlete.id)),
      );
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
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete users. Please try again.",
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

  // Add athlete handlers
  const handleCreateMember = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsCreatingMember(true);

    const formData = new FormData();
    formData.append("email", newMemberEmail);
    formData.append("username", newMemberUsername);
    formData.append("password", newMemberPassword);
    formData.append("role", "user");
    if (newMemberKelas) formData.append("kelas_id", newMemberKelas);

    const result = await createAthlete(formData);

    setIsCreatingMember(false);
    setShowConfirmCreate(false);

    if (result.error) {
      toast({
        title: "Error Creating Member",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Member Created",
        description: `Successfully added ${newMemberUsername}.`,
      });
      setIsAddMemberOpen(false);
      setNewMemberEmail("");
      setNewMemberUsername("");
      setNewMemberPassword("");
      setNewMemberKelas("");
      fetchAthletes();
    }
  };

  // Edit kelas handlers
  const handleOpenKelasDialog = (athlete: Athlete) => {
    setManageKelasAthlete(athlete);
    setManageKelasId(athlete.kelas_id || "");
  };

  const handleSaveUserKelas = async () => {
    if (!manageKelasAthlete) return;
    setSavingKelas(true);

    const kelasValue = manageKelasId || null;

    const { error } = await supabase
      .from("users")
      .update({ kelas_id: kelasValue })
      .eq("id", manageKelasAthlete.id);

    if (!error) {
      await fetchAthletes();
      toast({
        title: "Kelas Updated",
        description: `Kelas for ${manageKelasAthlete.username} has been updated.`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update kelas.",
        variant: "destructive",
      });
    }

    setSavingKelas(false);
    setManageKelasAthlete(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Athletes
          </h1>
          <div className="text-gray-500 text-center py-8">
            Loading athletes...
          </div>
        </div>
      </div>
    );
  }

  // ===== DETAIL VIEW =====
  if (selectedAthlete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Back button + Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleBackToList}
              className="h-10 w-10 p-0 rounded-full hover:bg-white shadow-sm transition-all active:scale-90"
            >
              <ArrowLeft className="h-5 w-5 text-strava" />
            </Button>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                {selectedAthlete.username}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Activity Profile
              </p>
            </div>
          </div>

          {/* Profile Athlete Card */}
          <Card className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-strava">
                  Profile Athlete
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenKelasDialog(selectedAthlete)}
                    className="h-8 rounded-xl px-3 text-xs font-black border-gray-200 text-gray-600 hover:bg-strava hover:text-white hover:border-strava"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Atur Kelas
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-gray-100">
                  <AvatarImage
                    src={
                      getSafeSrc(selectedAthlete.profile_photo) ||
                      "/placeholder.svg"
                    }
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-strava/10 text-strava text-lg font-black">
                    {selectedAthlete.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {selectedAthlete.username}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedAthlete.email}
                  </p>
                  {selectedAthlete.kelas_id && (
                    <p className="mt-1 text-[11px] font-bold text-gray-400">
                      Kelas:{" "}
                      <span className="text-strava">
                        {kelasList.find(
                          (k) => k.id === selectedAthlete.kelas_id,
                        )?.name || selectedAthlete.kelas_id}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-green-50 p-3 text-center">
                  <p className="text-2xl font-black text-green-600">
                    {athleteStats.completed}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-green-500">
                    Completed
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-center">
                  <p className="text-2xl font-black text-blue-600">
                    {athleteStats.pending}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500">
                    Pending
                  </p>
                </div>
                <div className="rounded-2xl bg-red-50 p-3 text-center">
                  <p className="text-2xl font-black text-red-500">
                    {athleteStats.missed}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-red-400">
                    Missed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Training Activities */}
          <Card className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-strava">
                Training Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {athleteActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <p className="text-xs text-gray-500">
                    No training activities found
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {athleteActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      {/* Training Type Header */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-900">
                            {activity.training_type}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            activity.status === "completed"
                              ? "bg-green-100 text-green-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {activity.status === "completed"
                            ? "Completed"
                            : "Pending"}
                        </span>
                      </div>

                      {/* Target & Assigned Date */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Target</span>
                          <span className="text-xs font-bold text-gray-900">
                            {activity.target_date
                              ? new Date(
                                  activity.target_date,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : new Date(activity.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Assigned
                          </span>
                          <span className="text-xs text-gray-400 italic">
                            {activity.assigned_date
                              ? new Date(
                                  activity.assigned_date,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Training Details */}
                      {activity.training_details && (
                        <div className="rounded-xl bg-gray-50 px-3.5 py-2.5">
                          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {activity.training_details}
                          </p>
                        </div>
                      )}

                      {/* Distance & Links */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-500">
                          {activity.status === "completed"
                            ? `${activity.distance} km`
                            : ""}
                        </span>
                        {activity.status === "completed" &&
                          activity.strava_link && (
                            <a
                              href={activity.strava_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-strava hover:underline"
                            >
                              View Strava →
                            </a>
                          )}
                      </div>

                      {/* Delete for pending */}
                      {activity.status === "pending" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full mt-1 font-bold rounded-xl h-10 text-xs"
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

        {/* Edit Kelas Dialog — di dalam detail view */}
        <Dialog
          open={!!manageKelasAthlete}
          onOpenChange={(open) => !open && setManageKelasAthlete(null)}
        >
          <DialogContent className="max-w-[90vw] rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)] md:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-[#202124]">
                Atur Kelas — {manageKelasAthlete?.username}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Pilih kelas untuk athlete ini.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <select
                value={manageKelasId}
                onChange={(e) => setManageKelasId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-strava/20"
              >
                <option value="">Tanpa kelas...</option>
                {kelasList.map((kelas) => (
                  <option key={kelas.id} value={kelas.id}>
                    {kelas.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter className="flex flex-row gap-2">
              <Button
                variant="ghost"
                className="flex-1 h-11 rounded-xl font-bold text-xs text-slate-500"
                onClick={() => setManageKelasAthlete(null)}
              >
                Batal
              </Button>
              <Button
                className="flex-1 h-11 bg-strava text-white hover:bg-strava-light rounded-xl font-bold text-xs"
                onClick={handleSaveUserKelas}
                disabled={savingKelas}
              >
                {savingKelas ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== LIST VIEW =====
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
            {/* Add Athlete Button */}
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
              <DialogTrigger asChild>
                <Button className="bg-strava hover:bg-strava-light text-white rounded-lg px-4 h-9 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all">
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)] md:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-[#202124]">
                    New Member Data
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Create a new athlete account.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-[10px] font-black text-strava ml-1 uppercase tracking-widest"
                    >
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="nama@mtr.id"
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="username"
                      className="text-[10px] font-black text-strava ml-1 uppercase tracking-widest"
                    >
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={newMemberUsername}
                      onChange={(e) => setNewMemberUsername(e.target.value)}
                      placeholder="nama"
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="password"
                      className="text-[10px] font-black text-strava ml-1 uppercase tracking-widest"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="text"
                      value={newMemberPassword}
                      onChange={(e) => setNewMemberPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="kelas"
                      className="text-[10px] font-black text-strava ml-1 uppercase tracking-widest"
                    >
                      Kelas
                    </Label>
                    <select
                      id="kelas"
                      value={newMemberKelas}
                      onChange={(e) => setNewMemberKelas(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-strava/20"
                    >
                      <option value="">Pilih kelas...</option>
                      {kelasList.map((kelas) => (
                        <option key={kelas.id} value={kelas.id}>
                          {kelas.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    className="w-full bg-strava hover:bg-strava-light text-white rounded-xl font-bold h-11 text-xs"
                    onClick={() => setShowConfirmCreate(true)}
                    disabled={
                      !newMemberEmail ||
                      !newMemberUsername ||
                      !newMemberPassword ||
                      isCreatingMember
                    }
                  >
                    {isCreatingMember ? "Membuat..." : "Create Athlete"}
                  </Button>
                </DialogFooter>

                {/* Confirm Create Dialog */}
                <AlertDialog
                  open={showConfirmCreate}
                  onOpenChange={setShowConfirmCreate}
                >
                  <AlertDialogContent className="bg-white border-gray-200 rounded-2xl max-w-[90vw] sm:max-w-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-gray-900">
                        Confirm New Member
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-600">
                        Create athlete{" "}
                        <span className="font-bold text-strava">
                          {newMemberUsername}
                        </span>{" "}
                        ({newMemberEmail})
                        {newMemberKelas && (
                          <>
                            {" "}
                            with kelas{" "}
                            <span className="font-bold text-strava">
                              {kelasList.find((k) => k.id === newMemberKelas)
                                ?.name || newMemberKelas}
                            </span>
                          </>
                        )}
                        ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="rounded-xl text-xs h-9">
                        Batal
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCreateMember}
                        disabled={isCreatingMember}
                        className="bg-strava hover:bg-strava-light text-white rounded-xl font-bold text-xs h-9"
                      >
                        {isCreatingMember ? "Creating..." : "Create"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DialogContent>
            </Dialog>

            {isDeleteMode && (
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={
                      athletes.length > 0 &&
                      selectedAthletes.size === athletes.length
                    }
                    onCheckedChange={handleSelectAll}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm md:text-base text-gray-900"
                  >
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
                        <AlertDialogTitle className="text-gray-900">
                          Confirm Deletion
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600">
                          Are you sure you want to delete{" "}
                          {selectedAthletes.size} user(s)? This action cannot be
                          undone and will remove all their training data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-100 text-gray-900">
                          Cancel
                        </AlertDialogCancel>
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
              className={
                isDeleteMode
                  ? "border-gray-200 text-gray-600 hover:bg-gray-100"
                  : "bg-strava hover:bg-strava-light text-white"
              }
            >
              {isDeleteMode ? "Cancel" : "Delete Users"}
            </Button>
          </div>
        </div>

        {athletes.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {athletes.map((athlete) => (
              <Card
                key={athlete.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 transition-all ${
                  isDeleteMode
                    ? "cursor-default"
                    : "cursor-pointer hover:border-strava/50 hover:shadow-md"
                } ${
                  selectedAthletes.has(athlete.id) ? "ring-2 ring-red-500" : ""
                }`}
                onClick={() => handleAthleteClick(athlete)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {isDeleteMode && (
                      <Checkbox
                        checked={selectedAthletes.has(athlete.id)}
                        onCheckedChange={(checked) =>
                          handleAthleteSelection(athlete.id, checked as boolean)
                        }
                        className="mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}

                    <Avatar className="h-12 w-12 border border-gray-100">
                      <AvatarImage
                        src={
                          getSafeSrc(athlete.profile_photo) ||
                          "/placeholder.svg"
                        }
                      />
                      <AvatarFallback className="bg-strava text-white">
                        {athlete.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {athlete.username}
                        </h3>
                        {athlete.kelas_id && (
                          <span className="inline-block px-1.5 py-0 rounded text-[7px] font-black uppercase bg-strava/20 text-strava">
                            {kelasList.find((k) => k.id === athlete.kelas_id)
                              ?.name || athlete.kelas_id}
                          </span>
                        )}
                      </div>
                      <p className="text-sm md:text-base text-gray-500">
                        {athlete.email}
                      </p>
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
                          ? new Date(athlete.last_activity).toLocaleDateString()
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
