"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, XCircle, Activity } from "lucide-react"
import { supabase } from "@/lib/supabase"

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined
}

interface TrainingHistoryItem {
  id: string
  date: string
  training_type: string
  distance: number
  status: "completed" | "pending" | "missed"
  strava_link: string | null
  user: {
    username: string
    profile_photo: string | null
  }
}

export default function CoachTrainingHistoryPage() {
  const [trainingHistory, setTrainingHistory] = useState<TrainingHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrainingHistory()
  }, [])

  const fetchTrainingHistory = async () => {
    // Get all training logs with user information, sorted by most recent first
    const { data } = await supabase
      .from("training_log")
      .select(`
        id,
        date,
        training_type,
        distance,
        status,
        strava_link,
        users (
          username,
          profile_photo
        )
      `)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })

    if (data) {
      const formattedData = data.map((item: any) => ({
        id: item.id,
        date: item.date,
        training_type: item.training_type,
        distance: item.distance,
        status: item.status,
        strava_link: item.strava_link,
        user: item.users,
      }))
      setTrainingHistory(formattedData)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Training History</h1>
          <div className="text-center py-8">Loading training history...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Training History</h1>
          <p className="text-gray-600 mt-2">All athletes' training activities</p>
        </div>

        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">Recent Training Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {trainingHistory.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No training activities found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trainingHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-2xl text-white"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getSafeSrc(item.user.profile_photo) || "/placeholder.svg"} />
                        <AvatarFallback className="bg-orange-500 text-white">
                          {item.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {item.status === "completed" ? (
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-400" />
                      )}
                      <div>
                        <p className="font-medium">{item.training_type}</p>
                        <p className="text-sm text-gray-400">
                          {item.user.username} • {item.distance}km • {new Date(item.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {item.strava_link && (
                      <a
                        href={item.strava_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-500 text-sm hover:underline"
                      >
                        View on Strava
                      </a>
                    )}
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
