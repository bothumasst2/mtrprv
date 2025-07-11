"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Clock, Calendar, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

interface TrainingAssignment {
  id: string
  training_type: string
  training_details: string | null
  target_date: string
  status: "pending" | "completed" | "missed"
  assigned_date: string
}

export default function TrainingAgendaPage() {
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchAssignments()
    }
  }, [user])

  useEffect(() => {
    // Update missed status on component mount and periodically
    const updateMissedStatus = async () => {
      if (!user) return

      const today = new Date().toISOString().split("T")[0]

      // Update assignments that are past target date and still pending to missed
      await supabase
        .from("training_assignments")
        .update({ status: "missed" })
        .eq("user_id", user.id)
        .eq("status", "pending")
        .lt("target_date", today)

      // Refresh the assignments after updating
      fetchAssignments()
    }

    updateMissedStatus()
  }, [user])

  const fetchAssignments = async () => {
    if (!user) return

    const { data } = await supabase.from("training_assignments").select("*").eq("user_id", user.id)

    if (data) {
      // Sort by target date first (ascending), then by creation time
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.target_date).getTime()
        const dateB = new Date(b.target_date).getTime()
        if (dateA === dateB) {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        }
        return dateA - dateB
      })
      setAssignments(sortedData)
    }
    setLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-500"
      case "missed":
        return "text-red-500"
      default:
        return "text-blue-500" // pending
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "missed":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-blue-500" /> // pending
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Training Agenda</h1>
          <div className="text-center py-8">Loading training agenda...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Training Agenda</h1>
          <p className="text-gray-600 mt-2">Your assigned training schedule from your coach</p>
        </div>

        {assignments.length === 0 ? (
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Training Assigned</h3>
              <p className="text-gray-600">Your coach hasn't assigned any training yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      {getStatusIcon(assignment.status)}
                      {assignment.training_type}
                    </CardTitle>
                    <span className={`text-sm font-medium ${getStatusColor(assignment.status)}`}>
                      {getStatusText(assignment.status)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Training Details</p>
                      <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{assignment.training_details}</p>
                    </div>
                  )}

                  {(assignment.status === "pending" || assignment.status === "missed") && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 text-sm">
                        <strong>Note:</strong> This training will be automatically marked as completed when you upload
                        the corresponding training in your Training Log.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
