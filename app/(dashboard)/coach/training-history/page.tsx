"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, XCircle, Activity, Trash2 } from "lucide-react"
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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTrainingHistory()
  }, [])

  const fetchTrainingHistory = async () => {
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

  const handleDeleteTraining = async (id: string) => {
    const isConfirmed = window.confirm("Yakin mau delete training ini? Data akan terhapus permanen!")
    if (!isConfirmed) return
    setDeletingId(id)
    try {
      const { error } = await supabase
        .from("training_log")
        .delete()
        .eq("id", id)
      if (error) {
        console.error("Error deleting training:", error)
        alert("Gagal delete training record: " + error.message)
        return
      }
      setTrainingHistory(prev => prev.filter(item => item.id !== id))
      alert("Training berhasil dihapus!")
    } catch (error) {
      console.error("Error deleting training:", error)
      alert("Gagal delete training record")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-strava">Training History</h1>
          <div className="text-center py-8 text-strava">Loading training history...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-strava">Training History</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">All athletes' training activities</p>
        </div>

        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xs md:text-sm md:text-base font-semibold text-gray-500">Recent Training Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {trainingHistory.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400">No training activities found</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {trainingHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-transparent hover:border-strava/20"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10 border border-gray-200">
                        <AvatarImage src={getSafeSrc(item.user.profile_photo) || "/placeholder.svg"} />
                        <AvatarFallback className="bg-strava text-white">
                          {item.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="px-2 text-sm md:text-base font-medium text-gray-900">{item.training_type}</p>
                        <p className="px-2 text-xs md:text-sm md:text-base text-gray-500">
                          {item.user.username} - {item.distance}km - {new Date(item.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.strava_link && (
                        <a
                          href={item.strava_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-strava text-xs md:text-sm md:text-base hover:underline font-medium"
                        >
                          Details
                        </a>
                      )}

                      <button
                        onClick={() => handleDeleteTraining(item.id)}
                        disabled={deletingId === item.id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete training record"
                      >
                        {deletingId === item.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
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
