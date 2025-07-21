"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Users, Activity, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined
}

interface Athlete {
  id: string
  username: string
  email: string
  profile_photo: string | null
  total_workouts: number
  last_activity: string | null
}

interface AthleteActivity {
  id: string
  date: string
  training_type: string
  distance: number
  status: "completed" | "pending" | "missed"
  strava_link: string | null
}

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [athleteActivities, setAthleteActivities] = useState<AthleteActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAthletes()
  }, [])

  const fetchAthletes = async () => {
    const { data } = await supabase.from("users").select("id, username, email, profile_photo").eq("role", "user")

    if (data) {
      // Get workout counts for each athlete from both tables
      const athletesWithStats = await Promise.all(
        data.map(async (athlete) => {
          // Get completed workouts
          const { data: completedWorkouts } = await supabase
            .from("training_log")
            .select("id, date, status")
            .eq("user_id", athlete.id)

          // Get assigned workouts with target_date
          const { data: assignedWorkouts } = await supabase
            .from("training_assignments")
            .select("id, date, target_date")
            .eq("user_id", athlete.id)

          // Combine and get total count
          const totalActivities = (completedWorkouts?.length || 0) + (assignedWorkouts?.length || 0)

          // Get the most recent activity date from both tables
          const allDates: string[] = []
          if (completedWorkouts) allDates.push(...completedWorkouts.map(w => w.date))
          if (assignedWorkouts) allDates.push(...assignedWorkouts.map(w => w.target_date || w.date))
          
          allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          const lastActivity = allDates.length > 0 ? allDates[0] : null

          return {
            ...athlete,
            total_workouts: totalActivities,
            last_activity: lastActivity,
          }
        }),
      )

      setAthletes(athletesWithStats)
    }
    setLoading(false)
  }

  const fetchAthleteActivities = async (athleteId: string) => {
    // Fetch completed activities from training_log
    const { data: completedActivities } = await supabase
      .from("training_log")
      .select("*")
      .eq("user_id", athleteId)

    // Fetch pending/missed activities from training_assignments
    const { data: assignedActivities } = await supabase
      .from("training_assignments")
      .select("*")
      .eq("user_id", athleteId)

    // Combine both datasets
    const allActivities: AthleteActivity[] = []

    // Add completed activities
    if (completedActivities) {
      completedActivities.forEach(activity => {
        allActivities.push({
          id: activity.id,
          date: activity.date,
          training_type: activity.training_type,
          distance: activity.distance,
          status: "completed",
          strava_link: activity.strava_link
        })
      })
    }

    // Add assigned activities (pending/missed)
    if (assignedActivities) {
      assignedActivities.forEach(activity => {
        // Check if this assignment is already completed in training_log
        const isCompleted = completedActivities?.some(completed => 
          completed.date === (activity.target_date || activity.date) && 
          completed.training_type === activity.training_type &&
          completed.user_id === activity.user_id
        )

        if (!isCompleted) {
          // Determine if it's pending or missed based on target date
          const targetDate = new Date(activity.target_date || activity.date)
          const today = new Date()
          
          // Set today to start of day to compare dates accurately
          today.setHours(0, 0, 0, 0)
          targetDate.setHours(0, 0, 0, 0)
          
          const status = targetDate < today ? "missed" : "pending"

          allActivities.push({
            id: activity.id,
            date: activity.target_date || activity.date,
            training_type: activity.training_type,
            distance: activity.distance,
            status: status,
            strava_link: null
          })
        }
      })
    }

    // Sort by date (most recent first)
    allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setAthleteActivities(allActivities)
  }

  const handleAthleteClick = (athlete: Athlete) => {
    setSelectedAthlete(athlete)
    fetchAthleteActivities(athlete.id)
  }

  const handleBackToList = () => {
    setSelectedAthlete(null)
    setAthleteActivities([])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Athletes</h1>
          <div className="text-center py-8">Loading athletes...</div>
        </div>
      </div>
    )
  }

  if (selectedAthlete) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBackToList} className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{selectedAthlete.username}</h1>
              <p className="text-gray-600">Activity History</p>
            </div>
          </div>

          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">Training Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {athleteActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No training activities found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {athleteActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            activity.status === "completed"
                              ? "bg-green-500"
                              : activity.status === "missed"
                                ? "bg-red-500"
                                : "bg-blue-500"
                          }`}
                        />
                        <div>
                          <p className="font-medium text-gray-800">{activity.training_type}</p>
                          <p className="text-sm text-gray-600">
                            {activity.distance}km • {new Date(activity.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-medium ${
                            activity.status === "completed"
                              ? "text-green-600"
                              : activity.status === "missed"
                                ? "text-red-600"
                                : "text-blue-600"
                          }`}
                        >
                          {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                        </p>
                        {activity.strava_link && (
                          <a
                            href={activity.strava_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-orange-500 hover:underline"
                          >
                            View Strava
                          </a>
                        )}
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

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Athletes</h1>
          <p className="text-gray-600 mt-2">Manage and view your athletes' progress</p>
        </div>

        {athletes.length === 0 ? (
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Athletes Found</h3>
              <p className="text-gray-600">No athletes are registered in the system yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {athletes.map((athlete) => (
              <Card
                key={athlete.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleAthleteClick(athlete)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getSafeSrc(athlete.profile_photo) || "/placeholder.svg"} />
                      <AvatarFallback className="bg-orange-500 text-white">
                        {athlete.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-800">{athlete.username}</h3>
                      <p className="text-sm text-gray-600">{athlete.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Workouts</p>
                      <p className="font-bold text-green-600">{athlete.total_workouts}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Last Activity</p>
                      <p className="font-medium text-gray-800">
                        {athlete.last_activity ? new Date(athlete.last_activity).toLocaleDateString() : "None"}
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
  )
}
