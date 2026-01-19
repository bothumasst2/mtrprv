"use client"

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Activity, Calendar, TrendingUp } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined
}

interface CoachStats {
  totalUsers: number
  activeAssignments: number
  completedThisWeek: number
  totalDistance: number
}

interface ActivityFeedItem {
  id: string
  training_type: string
  distance: number
  date: string
  created_at: string
  user: {
    username: string
    profile_photo: string | null
  }
}

export default function CoachDashboardPage() {
  const [stats, setStats] = useState<CoachStats>({
    totalUsers: 0,
    activeAssignments: 0,
    completedThisWeek: 0,
    totalDistance: 0,
  })
  const [userActivities, setUserActivities] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchCoachStats()
      fetchUserActivities()
    }
  }, [user])

  const fetchCoachStats = async () => {
    if (!user) return

    // Get total users
    const { data: usersData } = await supabase.from("users").select("id").eq("role", "user")

    // Get active assignments (pending only)
    const { data: assignmentsData } = await supabase
      .from("training_assignments")
      .select("status, target_date")
      .eq("coach_id", user.id);

    const today = getLocalDateString();
    const activeAssignmentsCount = assignmentsData?.filter(
      (item) => item.status === "pending" && item.target_date >= today
    ).length || 0;

    // Get completed activities within specific weekly range: 
    // Monday 2 AM to Sunday 8 PM
    const now = new Date()
    const currentDay = now.getDay()
    const diffToMonday = (currentDay === 0 ? 6 : currentDay - 1)

    const monday = new Date(now)
    monday.setDate(now.getDate() - diffToMonday)
    monday.setHours(2, 0, 0, 0)

    // If it's Monday but before 2 AM, the current "training week" is last week's
    if (now < monday) {
      monday.setDate(monday.getDate() - 7)
    }

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(20, 0, 0, 0)

    const startRange = monday.toISOString()
    const endRange = sunday.toISOString()

    const { data: completedData } = await supabase
      .from("training_log")
      .select("id")
      .eq("status", "completed")
      .gte("created_at", startRange)
      .lte("created_at", endRange)

    // Get total distance from all users
    const { data: distanceData } = await supabase.from("training_log").select("distance").eq("status", "completed")

    const totalDistance = distanceData?.reduce((sum, log) => sum + log.distance, 0) || 0

    setStats({
      totalUsers: usersData?.length || 0,
      activeAssignments: activeAssignmentsCount,
      completedThisWeek: completedData?.length || 0,
      totalDistance: Math.round(totalDistance * 10) / 10, // Round to 1 decimal
    })
  }

  const fetchUserActivities = async () => {
    // Calculate weekly range: Monday 2 AM to Sunday 8 PM
    const now = new Date()
    const currentDay = now.getDay()
    const diffToMonday = (currentDay === 0 ? 6 : currentDay - 1)

    const monday = new Date(now)
    monday.setDate(now.getDate() - diffToMonday)
    monday.setHours(2, 0, 0, 0)

    if (now < monday) {
      monday.setDate(monday.getDate() - 7)
    }

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(20, 0, 0, 0)

    const startRange = monday.toISOString()
    const endRange = sunday.toISOString()

    // Fetch all completed training logs within the weekly range
    const { data: activitiesData } = await supabase
      .from("training_log")
      .select(`
        id,
        training_type,
        distance,
        date,
        created_at,
        user:user_id (
          username,
          profile_photo
        )
      `)
      .eq("status", "completed")
      .gte("created_at", startRange)
      .lte("created_at", endRange)
      .order("created_at", { ascending: false })

    if (activitiesData) {
      setUserActivities(activitiesData as any)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-strava-dark">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-xl md:text-3xl font-bold text-strava">Coach Dashboard</h1>
          <div className="text-center py-8 text-strava">Loading Data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="container mx-auto px-3 py-6 space-y-2">
        <div>
          <h1 className="text-xl md:text-4xl font-bold text-strava">Coach Dashboard</h1>
          <p className="text-xs text-strava-grey mt-0 mb-6">Overview of all your athletes and their progress</p>
        </div>

        {/* Clickable Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          <Link href="/coach/athletes">
            <Card className="bg-strava text-white border-0 rounded-2xl cursor-pointer hover:bg-strava-grey transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col items-start">
                  <Users className="h-8 w-8 text-white mb-2" />
                  <p className="text-2xl md:text-3xl font-bold">{stats.totalUsers}</p>
                  <p className="text-white text-xs">Total Athletes</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/coach/active-assignments">
            <Card className="bg-strava text-white border-0 rounded-2xl cursor-pointer hover:bg-strava-grey transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col items-start">
                  <Calendar className="h-8 w-8 text-white mb-2" />
                  <p className="text-2xl md:text-3xl font-bold">{stats.activeAssignments}</p>
                  <p className="text-white text-xs">Active Assignments</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/coach/training-history">
            <Card className="bg-strava text-white border-0 rounded-2xl cursor-pointer hover:bg-strava-grey transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col items-start">
                  <Activity className="h-8 w-8 text-white mb-2" />
                  <p className="text-2xl md:text-3xl font-bold">{stats.completedThisWeek}</p>
                  <p className="text-white text-xs">Completed This Week</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/ranking">
            <Card className="bg-strava text-white border-0 rounded-2xl cursor-pointer hover:bg-strava-grey transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col items-start">
                  <TrendingUp className="h-8 w-8 text-white mb-2" />
                  <p className="text-2xl md:text-3xl font-bold">{stats.totalDistance}</p>
                  <p className="text-white text-xs">Total Distance (km)</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* User Activities */}
        <Card className="bg-[#303030] rounded-2xl shadow-sm border border-none">
          <CardHeader>
            <CardTitle className="text-xs font-semibold text-white">Recent User Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {userActivities.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-[10px] text-gray-500">
                  Belum ada aktivitas di periode minggu ini.<br />
                  (Senin 02:00 - Minggu 20:00)
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {userActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-2 bg-strava-dark rounded-xl">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getSafeSrc(activity.user.profile_photo) || "/placeholder.svg"} />
                        <AvatarFallback className="bg-white-500 text-white">
                          {activity.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-small text-white text-xs">{activity.training_type}</p>
                        <p className="text-[10px] text-gray-500">
                          {activity.user.username} - {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-strava text-xs">{activity.distance} km</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
