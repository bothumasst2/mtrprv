"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trophy, Medal, Award, RotateCcw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useUserRole } from "@/hooks/use-user-role"
import { resetRanking } from "@/actions/coach"

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined
}

interface RankingUser {
  id: string
  username: string
  profile_photo: string | null
  total_distance: number
  rank: number
  kelas_id: string | null
  kelas_name: string
}

interface KelasGroup {
  id: string
  name: string
  sort_order: number
}

export default function RankingPage() {
  const [rankingsByKelas, setRankingsByKelas] = useState<Record<string, RankingUser[]>>({})
  const [kelasGroups, setKelasGroups] = useState<KelasGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [cutoffDate, setCutoffDate] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  const { user } = useAuth()
  const { role } = useUserRole()
  const isCoachOrAdmin = role === "coach" || role === "admin"

  useEffect(() => {
    fetchRankings()
  }, [])

  const fetchRankings = async () => {
    // Fetch all kelas groups
    const { data: kelasData } = await supabase
      .from("kelas")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true })

    const kelasList = kelasData || []
    setKelasGroups(kelasList)

    // Pre-fill empty mapping for all kelas
    const emptyMap: Record<string, RankingUser[]> = {}
    kelasList.forEach((k) => { emptyMap[k.name] = [] })
    emptyMap["No-Race"] = [] // fallback for unassigned

    // Fetch cutoff date
    const { data: resetData } = await supabase
      .from("ranking_reset")
      .select("cutoff_at")
      .single()

    let cutoff = null
    if (resetData?.cutoff_at) {
      cutoff = resetData.cutoff_at
      setCutoffDate(cutoff)
    }

    // User IDs to exclude from ranking
    const excludedUserIds = ["7f52c19e-c17a-4289-9812-f42aff30374c"]

    // Build query — filter by cutoff date if reset has been performed
    // Reset does NOT delete training_log; it only changes the ranking period start
    let query = supabase
      .from("training_log")
      .select(`
        user_id,
        distance,
        users (
          id,
          username,
          profile_photo,
          kelas_id
        )
      `)
      .eq("status", "completed")

    if (cutoff) {
      query = query.gte("date", cutoff)
    }

    const { data } = await query

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

      // Build kelas_id → kelas_name lookup
      const kelasNameMap = new Map<string, string>()
      kelasList.forEach((k) => kelasNameMap.set(k.id, k.name))

      const allRankings = Array.from(userDistances.entries())
        .map(([userId, data], index) => ({
          id: userId,
          username: data.user.username,
          profile_photo: data.user.profile_photo,
          kelas_id: data.user.kelas_id,
          kelas_name: kelasNameMap.get(data.user.kelas_id) || "No-Race",
          total_distance: data.totalDistance,
          rank: index + 1,
        }))

      // Group by kelas_name
      const nextRankings = { ...emptyMap }
      allRankings.forEach((user) => {
        const group = user.kelas_name
        if (!nextRankings[group]) nextRankings[group] = []
        nextRankings[group].push(user)
      })
      // Sort each group
      Object.keys(nextRankings).forEach((key) => {
        nextRankings[key].sort((a, b) => b.total_distance - a.total_distance)
        nextRankings[key] = nextRankings[key].map((user, index) => ({ ...user, rank: index + 1 }))
      })

      setRankingsByKelas(nextRankings)
    }
    setLoading(false)
  }

  const handleReset = async () => {
    if (!user) return
    setResetting(true)

    const formData = new FormData()
    formData.append("user_id", user.id)
    const result = await resetRanking(formData)

    if (result.success) {
      setShowResetConfirm(false)
      await fetchRankings()
    }

    setResetting(false)
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

  // Dynamic kelas — fetch from DB; always include "No-Race" fallback
  const visibleKelas = [
    ...kelasGroups.map((k) => k.name),
    ...(kelasGroups.some((k) => k.name === "No-Race") ? [] : ["No-Race"]),
  ]

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-strava">Ranking</h1>
            <p className="text-xs text-gray-400 mt-1">All-time ranking based on total accumulated distance per class</p>
            {cutoffDate && (
              <p className="mt-1 text-[10px] text-gray-500 font-medium">
                Periode sejak{" "}
                <span className="font-bold text-gray-400">
                  {new Date(cutoffDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>
            )}
          </div>

          {isCoachOrAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowResetConfirm(true)}
              className="h-8 rounded-xl px-3 text-xs font-black border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleKelas.map((kelas) => (
            <RankingList
              key={kelas}
              title={kelas}
              data={rankingsByKelas[kelas] || []}
            />
          ))}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="max-w-[85vw] rounded-2xl border border-slate-200 bg-[#1f1f1f] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-red-400">
              Reset Ranking?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-gray-400">
              Semua akumulasi jarak akan di-reset ke 0. Data training historis tidak akan dihapus.
              Ranking akan mulai menghitung dari sekarang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel className="rounded-xl font-bold text-xs">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={resetting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold px-4 h-9 text-xs"
            >
              {resetting ? "Me-reset..." : "Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
