"use client"

import { useState, useEffect } from "react"
import { TrainingCalendar } from "@/components/training-calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, CheckCircle, XCircle, Activity, Target, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

interface TrainingStats {
  totalWorkouts: number
  weeklyTraining: number
}

interface TrainingTask {
  id: string
  training_type: string
  status: "completed" | "pending" | "missed"
  date: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<TrainingStats>({ totalWorkouts: 0, weeklyTraining: 0 })
  const [recentTasks, setRecentTasks] = useState<TrainingTask[]>([])
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchStats()
      fetchRecentTasks()
    }

    // Listen for training completion events
    const handleTrainingCompleted = () => {
      fetchStats()
    }

    window.addEventListener("trainingCompleted", handleTrainingCompleted)
    return () => window.removeEventListener("trainingCompleted", handleTrainingCompleted)
  }, [user])

  const fetchStats = async () => {
    if (!user) return

    // Get total completed workouts this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]

    const { data: totalData } = await supabase
      .from("training_log")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("date", startOfMonth)

    // Get pending training assignments (weekly training count)
    const { data: weeklyData } = await supabase
      .from("training_assignments")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")

    setStats({
      totalWorkouts: totalData?.length || 1,
      weeklyTraining: weeklyData?.length || 0, // This will be 0 when all assignments are completed
    })
  }

  const fetchRecentTasks = async () => {
    if (!user) return

    const { data } = await supabase
      .from("training_log")
      .select("id, training_type, status, date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(4)

    const defaultTasks = [
      { id: "1", training_type: "Easy Run Zone 2", status: "completed" as const, date: "2025-01-10" },
      { id: "2", training_type: "Long Run", status: "completed" as const, date: "2025-01-12" },
      { id: "3", training_type: "Medium Run (Speed)", status: "missed" as const, date: "2025-01-14" },
      { id: "4", training_type: "Fartlek Run (Speed)", status: "completed" as const, date: "2025-01-16" },
    ]

    setRecentTasks(data && data.length > 0 ? data : defaultTasks)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 py-6 space-y-6">
        <div className="max-w-md mx-auto md:max-w-full">
          <TrainingCalendar />
        </div>

        {/* Clickable Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/training-log">
            <Card className="bg-gray-800 text-white border-0 rounded-2xl cursor-pointer hover:bg-gray-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col items-start">
                  <Activity className="h-8 w-8 text-green-400 mb-2" />
                  <p className="text-3xl md:text-4xl font-bold text-green-400">{stats.totalWorkouts}</p>
                  <p className="text-white font-semibold text-sm md:text-base">Total Workout</p>
                  <p className="text-green-400 text-xs">accumulation of activities</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/training-agenda">
            <Card className="bg-gray-800 text-white border-0 rounded-2xl cursor-pointer hover:bg-gray-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col items-start">
                  <Target className="h-8 w-8 text-blue-400 mb-2" />
                  <p className="text-3xl md:text-4xl font-bold text-blue-400">{stats.weeklyTraining}</p>
                  <p className="text-white font-semibold text-sm md:text-base">Weekly Training</p>
                  <p className="text-blue-400 text-xs">Training Task</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Upload Button */}
        <div className="py-2">
          <Link href="/training-log">
            <button className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white py-6 text-lg rounded-2xl border-0 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-150 flex items-center justify-center">
              <Plus className="h-6 w-6 mr-2" />
              Upload Training
            </button>
          </Link>
        </div>

        {/* Training Tasks */}
        <div className="bg-gray-100 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Training Task</h3>
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div key={task.id} className="bg-gray-800 rounded-2xl p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {task.status === "completed" ? (
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <XCircle className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <span className="font-medium text-sm md:text-base">{task.training_type}</span>
                  </div>
                  <Link
                    href="/training-log"
                    className="flex items-center gap-1 text-orange-500 text-sm hover:underline"
                  >
                    More Details
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
