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

export default function ActiveAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchAssignments()
    }
  }, [user])

  const fetchAssignments = async () => {
    if (!user) return

    const today = new Date().toISOString().split("T")[0]

    // Update missed status first
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

        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              All Training Assignments ({assignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No training assignments found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
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

                    {/* ✨ Tombol Delete */}
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(assignment.id)}
                      >
                        Delete
                      </Button>
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
