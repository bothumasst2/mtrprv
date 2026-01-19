"use client";

import { useState, useEffect } from "react";
import { TrainingCalendar } from "@/components/training-calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  CheckCircle,
  XCircle,
  Activity,
  Target,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

interface TrainingStats {
  totalWorkouts: number;
  weeklyTraining: number;
}

interface TrainingTask {
  id: string;
  training_type: string;
  status: "completed" | "pending" | "missed";
  date: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<TrainingStats>({
    totalWorkouts: 0,
    weeklyTraining: 0,
  });
  const [recentTasks, setRecentTasks] = useState<TrainingTask[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchRecentTasks();
    }

    // Listen for training completion events
    const handleTrainingCompleted = () => {
      fetchStats();
    };

    window.addEventListener("trainingCompleted", handleTrainingCompleted);
    return () =>
      window.removeEventListener("trainingCompleted", handleTrainingCompleted);
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    // Helper for local date string
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const today = `${year}-${month}-${day}`

    // Get total completed workouts this month
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    )
      .toISOString()
      .split("T")[0];

    const { data: totalData } = await supabase
      .from("training_log")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("date", startOfMonth);

    // Get training assignments
    const { data: assignmentsData } = await supabase
      .from("training_assignments")
      .select("status, target_date")
      .eq("user_id", user.id);

    // Count truly pending tasks (status is 'pending' AND target_date >= today)
    const pendingCount = assignmentsData?.filter(
      (item) => item.status === "pending" && item.target_date >= today
    ).length || 0;

    setStats({
      totalWorkouts: totalData?.length || 0,
      weeklyTraining: pendingCount,
    });
  };

  const fetchRecentTasks = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("training_log")
      .select("id, training_type, status, date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(4);

    setRecentTasks(data || []);
  };

  return (
    <div className="min-h-screen bg-strava-dark">
      <div className="px-4 py-6 space-y-2">
        <div className="w-full mx-auto">
          <TrainingCalendar />
        </div>

        {/* Clickable Stats Cards */}
        <div className="grid grid-cols-2 gap-2 items-stretch">
          <Link href="/training-log" className="h-full">
            <Card className="bg-strava-darkgrey text-white border-0 rounded-lg cursor-pointer hover:bg-strava-grey transition-colors">
              <CardContent className="p-4 flex-col h-full">
                <div className="flex flex-col items-start h-full">
                  <Activity className="h-8 w-8 text-strava mb-2" />
                  <p className="text-4xl md:text-4xl font-bold text-strava">
                    {stats.totalWorkouts}
                  </p>
                  <p className="text-white font-roboto-bold text-mobile-base md:text-base">
                    Total Workout
                  </p>
                  <p className="text-gray-400 text-mobile-xs font-roboto-normal">
                    Accumulation of activities
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/training-agenda" className="h-full">
            <Card className="bg-strava-darkgrey text-white border-0 rounded-lg cursor-pointer hover:bg-strava-grey transition-colors">
              <CardContent className="p-4 flex-col h-full">
                <div className="flex flex-col items-start h-full">
                  <Target className="h-8 w-8 text-strava mb-2" />
                  <p className="text-4xl md:text-4xl font-bold text-strava">
                    {stats.weeklyTraining}
                  </p>
                  <p className="text-white font-roboto-bold text-mobile-base md:text-base">
                    Weekly Training
                  </p>
                  <p className="text-gray-400 text-mobile-xs font-roboto-normal">
                    Your Training Menu
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Upload Button */}
        <div className="py-0">
          <Link href="/training-log">
            <button className="font-bold w-full bg-strava hover:bg-strava-white hover:text-strava active:bg-orange-700 text-white py-4 text-lg rounded-lg border-0 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              UPLOAD TRAINING
            </button>
          </Link>
        </div>

        {/* Training Tasks */}
        <div className="bg-strava-darkgrey rounded-lg p-4">
          <h3 className="text-mobile-xs font-roboto-bold text-white mb-2">
            Your Activities
          </h3>
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="bg-strava-grey rounded-lg p-4 text-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {task.status === "completed" ? (
                      <div className="w-6 h-6 bg-strava rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-strava rounded-full flex items-center justify-center">
                        <XCircle className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <span className="font-roboto-bold text-mobile-sm md:text-base">
                      {task.training_type}
                    </span>
                  </div>
                  <Link
                    href="/training-log"
                    className="flex items-center gap-1 text-white text-[10px] hover:font-roboto-bold transition-colors"
                  >
                    See More
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
