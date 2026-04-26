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
  kelas: string | null
}

const RANKING_KELAS = ["42", "21", "10", "No-Race"] as const

export default function RankingPage() {
  const [rankingsByKelas, setRankingsByKelas] = useState<Record<string, RankingUser[]>>({
    "42": [],
    "21": [],
    "10": [],
    "No-Race": [],
  })
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
          profile_photo,
          kelas
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

      const allRankings = Array.from(userDistances.entries())
        .map(([userId, data], index) => ({
          id: userId,
          username: data.user.username,
          profile_photo: data.user.profile_photo,
          kelas: data.user.kelas,
          total_distance: data.totalDistance,
          rank: index + 1,
        }))

      const nextRankings = RANKING_KELAS.reduce<Record<string, RankingUser[]>>((acc, kelas) => {
        acc[kelas] = allRankings
          .filter((user) => String(user.kelas || "No-Race") === kelas)
          .sort((a, b) => b.total_distance - a.total_distance)
          .map((user, index) => ({ ...user, rank: index + 1 }))
        return acc
      }, {})

      setRankingsByKelas(nextRankings)
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

  const visibleKelas = RANKING_KELAS.filter(
    (kelas) => (rankingsByKelas[kelas] || []).length > 0,
  )

  const RankingList = ({ title, data }: { title: string; data: RankingUser[] }) => (
    <Card className="bg-strava-strava-dark rounded-md shadow-sm border border-none py-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-sm font-bold uppercase tracking-wider text-strava">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">No runners yet</div>
        ) : (
          <div className="space-y-1">
            {data.map((user) => (
              <div
                key={user.id}
                className={`flex items-center justify-between p-4 rounded-lg text-white ${getRankColor(user.rank)}`}
              >
                <div className="flex min-w-0 items-center gap-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center">{getRankIcon(user.rank)}</div>
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={getSafeSrc(user.profile_photo) || "/placeholder.svg"} />
                    <AvatarFallback className="bg-orange-500 text-white">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm-mobile font-semibold">{user.username}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold">{user.total_distance.toFixed(2)}</p>
                  <p className="text-xs opacity-90">km</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-[#1f1f1f]">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-strava">Ranking</h1>
          <p className="text-xs text-gray-400 mt-1">All-time ranking based on total accumulated distance per class</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleKelas.map((kelas) => (
            <RankingList
              key={kelas}
              title={kelas === "No-Race" ? "No Race" : `${kelas}K`}
              data={rankingsByKelas[kelas] || []}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
