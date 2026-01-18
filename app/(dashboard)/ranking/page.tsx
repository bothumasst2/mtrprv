"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Medal, Award } from "lucide-react"
import { supabase } from "@/lib/supabase"

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined
}

interface RankingUser {
  id: string
  username: string
  profile_photo: string | null
  total_distance: number
  rank: number
}

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankingUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRankings()
  }, [])

  const fetchRankings = async () => {
    // User IDs to exclude from ranking
    const excludedUserIds = ["7f52c19e-c17a-4289-9812-f42aff30374c"]

    // Get ALL completed training logs (no date filter for accumulated total)
    const { data } = await supabase
      .from("training_log")
      .select(`
        user_id,
        distance,
        users (
          id,
          username,
          profile_photo
        )
      `)
      .eq("status", "completed")

    if (data) {
      const userDistances = new Map<string, { user: any; totalDistance: number }>()

      data.forEach((log: any) => {
        const userId = log.user_id

        // Skip excluded users
        if (excludedUserIds.includes(userId)) return

        const existing = userDistances.get(userId)

        if (existing) {
          existing.totalDistance += log.distance
        } else {
          userDistances.set(userId, {
            user: log.users,
            totalDistance: log.distance,
          })
        }
      })

      const sortedRankings = Array.from(userDistances.entries())
        .map(([userId, data], index) => ({
          id: userId,
          username: data.user.username,
          profile_photo: data.user.profile_photo,
          total_distance: data.totalDistance,
          rank: index + 1,
        }))
        .sort((a, b) => b.total_distance - a.total_distance)
        .map((user, index) => ({ ...user, rank: index + 1 }))

      setRankings(sortedRankings)
    }
    setLoading(false)
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-strava" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <span className="text-lg font-bold text-gray-500">#{rank}</span>
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-500"
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500"
      case 3:
        return "bg-gradient-to-r from-amber-800 to-amber-700"
      default:
        return "bg-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-strava-dark">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-strava">Ranking</h1>
          <div className="text-white text-center py-8">Loading rankings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1f1f1f]">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-strava">Ranking</h1>
          <p className="text-xs text-gray-400 mt-1">All-time ranking based on total accumulated distance</p>
        </div>

        <Card className="bg-strava-strava-dark rounded-md shadow-sm border border-none py-2">
          <CardContent>
            <div className="space-y-1">
              {rankings.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-lg text-white ${getRankColor(user.rank)}`}
                >
                  <div className="flex items-center gap-1">
                    <div className="flex items-center justify-center w-10 h-10">{getRankIcon(user.rank)}</div>
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getSafeSrc(user.profile_photo) || "/placeholder.svg"} />
                      <AvatarFallback className="bg-orange-500 text-white">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm-mobile">{user.username}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{user.total_distance.toFixed(2)}</p>
                    <p className="text-xs opacity-90">km</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
