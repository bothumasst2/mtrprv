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

  const handleDeleteTraining = async (id: string) => {
    // Show confirmation dialog
    const isConfirmed = window.confirm("Yakin mau delete training ini? Data akan terhapus permanen!")

    if (!isConfirmed) {
      return // User cancelled
    }

    // Set loading state for this specific item
    setDeletingId(id)

    try {
      // Delete from Supabase training_log table
      const { error } = await supabase
        .from("training_log")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("Error deleting training:", error)
        alert("Gagal delete training record: " + error.message)
        return
      }

      // Remove from local state immediately for better UX
      setTrainingHistory(prev => prev.filter(item => item.id !== id))

      // Show success message
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
      <div className="min-h-screen bg-strava-dark">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-strava">Training History</h1>
          <div className="text-white text-center py-8">Loading training history...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-strava-dark">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-strava">Training History</h1>
          <p className="text-sm text-gray-600 mt-1">All athletes' training activities</p>
        </div>

        <Card className="bg-[#1f1f1f] rounded-lg shadow-sm border border-none">
          <CardHeader>
            <CardTitle className="text-xs font-semibold text-gray-400">Recent Training Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {trainingHistory.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No training activities found</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {trainingHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-strava-dark rounded-xl text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getSafeSrc(item.user.profile_photo) || "/placeholder.svg"} />
                        <AvatarFallback className="bg-strava text-white">
                          {item.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="px-2 text-sm font-small">{item.training_type}</p>
                        <p className="px-2 text-xs text-gray-400">
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
                          className="text-strava text-xs hover:text-strava"
                        >
                          Details
                        </a>
                      )}

                      <button
                        onClick={() => handleDeleteTraining(item.id)}
                        disabled={deletingId === item.id}
                        className="p-2 text-strava-light hover:text-strava hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete training record"
                      >
                        {deletingId === item.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent"></div>
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
