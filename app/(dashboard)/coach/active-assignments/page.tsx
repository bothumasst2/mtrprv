"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, Clock, AlertTriangle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

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
        const today = new Date().toISOString().split("T")[0]
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
    const today = new Date().toISOString().split("T")[0]
    
    await supabase
      .from("training_assignments")
      .update({ status: "missed" })
      .eq("coach_id", user.id)
      .eq("status", "pending")
      .lt("target_date", today)
  }

  const fetchAssignments = async () => {
    if (!user) return

    const today = new Date().toISOString().split("T")[0]

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
        return "text-green-600 bg-green-50"
      case "missed":
        return "text-red-600 bg-red-50"
      default:
        return "text-blue-600 bg-blue-50"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "missed":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-blue-600" />
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
          return `${baseStyle} bg-green-500 text-white shadow-md`
        case "missed":
          return `${baseStyle} bg-red-500 text-white shadow-md`
        case "pending":
          return `${baseStyle} bg-blue-500 text-white shadow-md`
        default:
          return `${baseStyle} bg-gray-800 text-white shadow-md`
      }
    } else {
      switch (filterType) {
        case "completed":
          return `${baseStyle} bg-green-50 text-green-600 hover:bg-green-100 border border-green-200`
        case "missed":
          return `${baseStyle} bg-red-50 text-red-600 hover:bg-red-100 border border-red-200`
        case "pending":
          return `${baseStyle} bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200`
        default:
          return `${baseStyle} bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200`
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
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Active Assignments</h1>
          <div className="text-center py-8">Loading assignments...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/coach/dashboard">
            <Button variant="ghost" className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Active Assignments</h1>
            <p className="text-gray-600">Monitor all training assignments and their status</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={() => setActiveFilter("all")}
                className={getFilterButtonStyle("all")}
              >
                <span>All</span>
                <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                  {getStatusCount("all")}
                </span>
              </button>
              
              <button
                onClick={() => setActiveFilter("pending")}
                className={getFilterButtonStyle("pending")}
              >
                <Clock className="h-4 w-4" />
                <span>Pending</span>
                <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                  {getStatusCount("pending")}
                </span>
              </button>

              <button
                onClick={() => setActiveFilter("completed")}
                className={getFilterButtonStyle("completed")}
              >
                <CheckCircle className="h-4 w-4" />
                <span>Completed</span>
                <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                  {getStatusCount("completed")}
                </span>
              </button>

              <button
                onClick={() => setActiveFilter("missed")}
                className={getFilterButtonStyle("missed")}
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Missed</span>
                <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                  {getStatusCount("missed")}
                </span>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              {activeFilter === "all" ? "All Training Assignments" : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Assignments`} ({filteredAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {activeFilter === "all" ? "No training assignments found" : `No ${activeFilter} assignments found`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAssignments.map((assignment) => (
                  <div key={assignment.id} className="border rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getSafeSrc(assignment.user.profile_photo) || "/placeholder.svg"} />
                          <AvatarFallback className="bg-orange-500 text-white">
                            {assignment.user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-gray-800">{assignment.user.username}</p>
                          <p className="text-sm text-gray-600">{assignment.training_type}</p>
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(assignment.status)}`}
                      >
                        {getStatusIcon(assignment.status)}
                        {getStatusText(assignment.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">Target Date</p>
                        <p className="font-medium">{new Date(assignment.target_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Assigned Date</p>
                        <p className="font-medium">{new Date(assignment.assigned_date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {assignment.training_details && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-800">{assignment.training_details}</p>
                      </div>
                    )}

                    {/* Delete Button - Only show if not completed */}
                    {assignment.status !== "completed" && (
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(assignment.id)}
                        >
                          Delete
                        </Button>
                      </div>
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
