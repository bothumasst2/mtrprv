"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, Clock, AlertTriangle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined
}

interface Assignment {
  id: string
  training_type: string
  training_details: string | null
  target_date: string
  assigned_date: string
  status: "pending" | "completed" | "missed"
  user: {
    id: string
    username: string
    profile_photo: string | null
  }
}

type FilterStatus = "all" | "pending" | "completed" | "missed"

export default function ActiveAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all")
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchAssignments()
    }
  }, [user])

  // Add effect to check for missed assignments periodically
  useEffect(() => {
    if (user && assignments.length > 0) {
      const checkMissedAssignments = () => {
        const today = getLocalDateString()
        let hasUpdates = false

        const updatedAssignments = assignments.map(assignment => {
          if (assignment.status === "pending" && assignment.target_date < today) {
            hasUpdates = true
            return { ...assignment, status: "missed" as const }
          }
          return assignment
        })

        if (hasUpdates) {
          setAssignments(updatedAssignments)
          // Also update in database
          updateMissedStatusInDB()
        }
      }

      checkMissedAssignments()
    }
  }, [assignments, user])

  const updateMissedStatusInDB = async () => {
    if (!user) return
    const today = getLocalDateString()

    await supabase
      .from("training_assignments")
      .update({ status: "missed" })
      .eq("coach_id", user.id)
      .eq("status", "pending")
      .lt("target_date", today)
  }

  const fetchAssignments = async () => {
    if (!user) return

    const today = getLocalDateString()

    // Update missed status first - any pending assignment past target date becomes missed
    await supabase
      .from("training_assignments")
      .update({ status: "missed" })
      .eq("coach_id", user.id)
      .eq("status", "pending")
      .lt("target_date", today)

    // Fetch all assignments by this coach with user information
    const { data } = await supabase
      .from("training_assignments")
      .select(`
        id,
        training_type,
        training_details,
        target_date,
        assigned_date,
        status,
        users:user_id (
          id,
          username,
          profile_photo
        )
      `)
      .eq("coach_id", user.id)
      .order("target_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (data) {
      const formattedData = data.map((item: any) => ({
        id: item.id,
        training_type: item.training_type,
        training_details: item.training_details,
        target_date: item.target_date,
        assigned_date: item.assigned_date,
        status: item.status,
        user: item.users,
      }))
      setAssignments(formattedData)
    }

    setLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-500 bg-green-500/10 border border-green-500/20"
      case "missed":
        return "text-red-500 bg-red-500/10 border border-red-500/20"
      default:
        return "text-blue-500 bg-blue-500/10 border border-blue-500/20"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "missed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed"
      case "missed":
        return "Missed"
      default:
        return "Pending"
    }
  }

  const getFilterButtonStyle = (filterType: FilterStatus) => {
    const baseStyle = "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2"

    if (activeFilter === filterType) {
      switch (filterType) {
        case "completed":
          return `${baseStyle} bg-green-600 text-white shadow-lg shadow-green-900/20`
        case "missed":
          return `${baseStyle} bg-red-600 text-white shadow-lg shadow-red-900/20`
        case "pending":
          return `${baseStyle} bg-blue-600 text-white shadow-lg shadow-blue-900/20`
        default:
          return `${baseStyle} bg-strava text-white shadow-lg shadow-orange-900/20`
      }
    } else {
      switch (filterType) {
        case "completed":
          return `${baseStyle} bg-green-600/10 text-green-500 hover:bg-green-600/20 border border-green-600/20`
        case "missed":
          return `${baseStyle} bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-600/20`
        case "pending":
          return `${baseStyle} bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 border border-blue-600/20`
        default:
          return `${baseStyle} bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a] hover:text-white border border-gray-700/50`
      }
    }
  }

  const filteredAssignments = assignments.filter(assignment => {
    if (activeFilter === "all") return true
    return assignment.status === activeFilter
  })

  const getStatusCount = (status: FilterStatus) => {
    if (status === "all") return assignments.length
    return assignments.filter(a => a.status === status).length
  }

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Yakin mau HAPUS data?")
    if (!confirmed) return

    console.log("Deleting ID:", id)

    const { error } = await supabase
      .from("training_assignments")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Delete failed:", error)
    } else {
      setAssignments((prev) => prev.filter((item) => item.id !== id))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-strava-dark">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-strava">Active Assignments</h1>
          <div className="text-center py-8 text-strava">Loading assignments...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-strava-dark">
      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/coach/dashboard">
              <Button variant="ghost" className="p-1 h-8 w-8 text-white hover:bg-strava-darkgrey">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-strava leading-tight">Logs Menu</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Active Assignments</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={`${getFilterButtonStyle("all")} !py-1 !px-3 !text-[11px]`}
            >
              <span>All ({getStatusCount("all")})</span>
            </button>
            <button
              onClick={() => setActiveFilter("pending")}
              className={`${getFilterButtonStyle("pending")} !py-1 !px-3 !text-[11px]`}
            >
              <span>Pending ({getStatusCount("pending")})</span>
            </button>
            <button
              onClick={() => setActiveFilter("completed")}
              className={`${getFilterButtonStyle("completed")} !py-1 !px-3 !text-[11px]`}
            >
              <span>Completed ({getStatusCount("completed")})</span>
            </button>
            <button
              onClick={() => setActiveFilter("missed")}
              className={`${getFilterButtonStyle("missed")} !py-1 !px-3 !text-[11px]`}
            >
              <span>Missed ({getStatusCount("missed")})</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-strava-darkgrey/30 mb-2 pb-1">
            <h2 className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">
              {activeFilter === "all" ? "Assignment List" : `${activeFilter} List`}
              <span className="text-gray-500 ml-2 font-normal">({filteredAssignments.length})</span>
            </h2>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="bg-[#1f1f1f] border border-strava-darkgrey/20 rounded-xl py-12 text-center">
              <Clock className="h-10 w-10 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 text-xs">
                {activeFilter === "all" ? "No assignments found" : `No ${activeFilter} assignments`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {filteredAssignments.map((assignment) => (
                <div key={assignment.id} className="bg-[#1f1f1f] border border-strava-darkgrey/40 rounded-xl p-2.5 transition-all hover:bg-strava-darkgrey/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar className="h-7 w-7 border border-strava-darkgrey">
                        <AvatarImage src={getSafeSrc(assignment.user.profile_photo) || "/placeholder.svg"} />
                        <AvatarFallback className="bg-strava text-white text-[9px]">
                          {assignment.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-[11px] truncate leading-tight">{assignment.user.username}</p>
                        <p className="text-[9px] text-strava truncate leading-tight">{assignment.training_type}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter ${getStatusColor(assignment.status)}`}>
                        {getStatusText(assignment.status)}
                      </div>
                    </div>

                    <div className="space-y-0.5 mb-1.5">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-gray-500">Target</span>
                        <span className="font-bold text-white">{new Date(assignment.target_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px]">
                        <span className="text-gray-500">Assigned</span>
                        <span className="text-gray-400 italic">{new Date(assignment.assigned_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                  </div>

                  {assignment.status !== "completed" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full h-6 text-[9px] rounded-lg mt-0.5 font-bold"
                      onClick={() => handleDelete(assignment.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
