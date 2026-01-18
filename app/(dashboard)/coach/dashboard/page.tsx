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

interface UserActivity {
  id: string
  username: string
  profile_photo: string | null
  last_activity: string
  total_distance: number
}

export default function CoachDashboardPage() {
  const [stats, setStats] = useState<CoachStats>({
    totalUsers: 0,
    activeAssignments: 0,
    completedThisWeek: 0,
    totalDistance: 0,
  })
  const [userActivities, setUserActivities] = useState<UserActivity[]>([])
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

    // Get active assignments (pending + missed)
    const { data: assignmentsData } = await supabase
      .from("training_assignments")
      .select("id")
      .eq("coach_id", user.id)
      .in("status", ["pending", "missed"])

    // Get completed activities this week
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const startOfWeekStr = getLocalDateString(startOfWeek)

    const { data: completedData } = await supabase
      .from("training_log")
      .select("id")
      .eq("status", "completed")
      .gte("date", startOfWeekStr)

    // Get total distance from all users
    const { data: distanceData } = await supabase.from("training_log").select("distance").eq("status", "completed")

    const totalDistance = distanceData?.reduce((sum, log) => sum + log.distance, 0) || 0

    setStats({
      totalUsers: usersData?.length || 0,
      activeAssignments: assignmentsData?.length || 0,
      completedThisWeek: completedData?.length || 0,
      totalDistance: Math.round(totalDistance * 10) / 10, // Round to 1 decimal
    })
  }

  const fetchUserActivities = async () => {
    // Get recent user activities with their total distances
    const { data: users } = await supabase
      .from("users")
      .select("id, username, profile_photo")
      .eq("role", "user")
      .limit(10)

    if (users) {
      const activities = await Promise.all(
        users.map(async (user) => {
          // Get last activity date
          const { data: lastActivity } = await supabase
            .from("training_log")
            .select("date")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .order("date", { ascending: false })
            .limit(1)

          // Get total distance for this user
          const { data: distanceData } = await supabase
            .from("training_log")
            .select("distance")
            .eq("user_id", user.id)
            .eq("status", "completed")

          const totalDistance = distanceData?.reduce((sum, log) => sum + log.distance, 0) || 0

          return {
            id: user.id,
            username: user.username,
            profile_photo: user.profile_photo,
            last_activity: lastActivity?.[0]?.date || "",
            total_distance: Math.round(totalDistance * 10) / 10,
          }
        }),
      )

      // Only show users who have actual activity (last_activity is not empty and total_distance > 0)
      const activeUsers = activities.filter((activity) => activity.last_activity !== "" && activity.total_distance > 0)

      setUserActivities(activeUsers)
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
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-4xl font-bold text-strava">Coach Dashboard</h1>
          <p className="text-sm text-white mt-0">Overview of all your athletes and their progress</p>
        </div>

        {/* Clickable Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/coach/athletes">
            <Card className="bg-strava text-white border-0 rounded-2xl cursor-pointer hover:bg-strava-grey transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col items-start">
                  <Users className="h-8 w-8 text-white mb-2" />
                  <p className="text-2xl md:text-3xl font-bold">{stats.totalUsers}</p>
                  <p className="text-blue-200 text-sm">Total Athletes</p>
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
                  <p className="text-white text-sm">Active Assignments</p>
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
                  <p className="text-white text-sm">Completed This Week</p>
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
                  <p className="text-white text-sm">Total Distance (km)</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* User Activities - Only show if there are active users */}
        {userActivities.length > 0 && (
          <Card className="bg-[#303030] rounded-2xl shadow-sm border border-none">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Recent User Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {userActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 bg-strava-dark rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getSafeSrc(activity.profile_photo) || "/placeholder.svg"} />
                        <AvatarFallback className="bg-white-500 text-white">
                          {activity.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white">{activity.username}</p>
                        <p className="text-sm text-gray-500">
                          Last activity: {new Date(activity.last_activity).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-strava">{activity.total_distance} km</p>
                      <p className="text-xs text-gray-600">Total distance</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
