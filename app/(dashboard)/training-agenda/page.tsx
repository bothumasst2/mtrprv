"use client"

function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

import type React from "react"
import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CheckCircle,
  Clock,
  Calendar,
  AlertTriangle,
  Plus,
  ChevronRight,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

interface TrainingAssignment {
  id: string
  training_type: string
  training_details: string | null
  target_date: string
  status: "pending" | "completed" | "missed"
  assigned_date: string
  created_at?: string
}

type FilterStatus = "all" | "pending" | "completed" | "missed"

export default function TrainingAgendaPage() {
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([])
  const [filter, setFilter] = useState<FilterStatus>("all")
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Modal & Form states
  const [selectedAssignment, setSelectedAssignment] = useState<TrainingAssignment | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    distance: "",
    strava_link: "",
  })

  useEffect(() => {
    if (user) {
      updateMissedStatus()
    }
  }, [user])

  // Reset form when modal closes
  useEffect(() => {
    if (!showDetailModal) {
      setShowForm(false)
      setFormData({
        date: getLocalDateString(),
        distance: "",
        strava_link: "",
      })
    }
  }, [showDetailModal])

  // Auto-set distance to 0 for STRENGTH SESSION
  useEffect(() => {
    if (selectedAssignment?.training_type?.toUpperCase().includes("STRENGTH SESSION")) {
      setFormData(prev => ({ ...prev, distance: "0" }))
    }
  }, [selectedAssignment])

  const updateMissedStatus = async () => {
    if (!user) return

    const today = getLocalDateString()

    await supabase
      .from("training_assignments")
      .update({ status: "missed" })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .lt("target_date", today)

    fetchAssignments()
  }

  const fetchAssignments = async () => {
    if (!user) return

    const { data } = await supabase
      .from("training_assignments")
      .select("*")
      .eq("user_id", user.id)

    if (data) {
      const today = getLocalDateString()

      const processedData = data.map((item: TrainingAssignment) => {
        if (item.status === "pending" && item.target_date < today) {
          return { ...item, status: "missed" as const }
        }
        return item
      })

      const statusPriority = (status: string) => {
        if (status === "pending") return 0
        if (status === "missed") return 1
        return 2 // completed
      }

      const sortedData = processedData.sort((a, b) => {
        const priorityA = statusPriority(a.status)
        const priorityB = statusPriority(b.status)

        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }

        // Jika status sama, urutkan target_date dari terbaru ke lama
        const dateA = new Date(a.target_date).getTime()
        const dateB = new Date(b.target_date).getTime()
        return dateB - dateA
      })

      setAssignments(sortedData)
    }

    setLoading(false)
  }

  const handleCardClick = (assignment: TrainingAssignment) => {
    setSelectedAssignment(assignment)
    setShowDetailModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedAssignment || isSubmitting) return
    setIsSubmitting(true)

    // Insert ke training_log
    const { error } = await supabase.from("training_log").insert({
      user_id: user.id,
      date: formData.date,
      training_type: selectedAssignment.training_type,
      distance: Number.parseFloat(formData.distance),
      strava_link: formData.strava_link || null,
      status: "completed",
    })

    if (!error) {
      // Update HANYA assignment yang dipilih (berdasarkan ID spesifik)
      await supabase
        .from("training_assignments")
        .update({ status: "completed" })
        .eq("id", selectedAssignment.id)

      // Reset state
      setFormData({
        date: getLocalDateString(),
        distance: "",
        strava_link: "",
      })
      setShowForm(false)
      setShowDetailModal(false)
      setSelectedAssignment(null)
      fetchAssignments()

      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent("trainingCompleted"))
    }
    setIsSubmitting(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-500"
      case "missed":
        return "text-red-500"
      default:
        return "text-blue-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "missed":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-blue-500" />
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

  // Check if STRENGTH SESSION
  const isStrengthSession = selectedAssignment?.training_type?.toUpperCase().includes("STRENGTH SESSION")

  return (
    <div className="min-h-screen bg-strava-dark">
      <div className="container mx-auto px-4 py-6 space-y-3">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg md:text-3xl font-bold text-strava">Training Agenda</h1>
            <p className="text-xs text-gray-500 mt-0">
              Your assigned training schedule from your coach
            </p>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {(["all", "pending", "completed", "missed"] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all duration-200 ${filter === s
                  ? "bg-strava text-white shadow-lg scale-104"
                  : "bg-strava-darkgrey text-gray-400 hover:text-white"
                  }`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-strava">Loading training agenda...</div>
        ) : assignments.filter(a => filter === "all" || a.status === filter).length === 0 ? (
          <Card className="bg-[#1f1f1f] rounded-md shadow-sm border border-none">
            <CardContent className="p-8 text-center">
              <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xs font-medium text-gray-500 mb-2">
                No {filter !== "all" ? filter : ""} Training Found
              </h3>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {assignments
              .filter(a => filter === "all" || a.status === filter)
              .map((assignment) => (
                <Card
                  key={assignment.id}
                  className="bg-[#1f1f1f] rounded-md shadow-sm border border-none cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => handleCardClick(assignment)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                        {getStatusIcon(assignment.status)}
                        {assignment.training_type}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-xs font-medium ${getStatusColor(
                            assignment.status
                          )}`}
                        >
                          {getStatusText(assignment.status)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white text-[10px]">Target Date</p>
                        <p className="text-strava font-bold">
                          {new Date(assignment.target_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-white text-[10px]">Assigned Date</p>
                        <p className="text-strava font-bold">
                          {new Date(assignment.assigned_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="bg-strava-dark rounded-md max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            {selectedAssignment && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white">
                    {getStatusIcon(selectedAssignment.status)}
                    {selectedAssignment.training_type}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Status */}
                  <span className={`text-sm font-medium ${getStatusColor(selectedAssignment.status)}`}>
                    {getStatusText(selectedAssignment.status)}
                  </span>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Target Date</p>
                      <p className="text-strava font-bold">
                        {new Date(selectedAssignment.target_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Assigned Date</p>
                      <p className="text-strava font-bold">
                        {new Date(selectedAssignment.assigned_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Training Details */}
                  {selectedAssignment.training_details && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Training Details</p>
                      <div className="bg-gray-300 p-3 rounded-md">
                        <p className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                          {selectedAssignment.training_details}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Note for pending/missed */}
                  {(selectedAssignment.status === "pending" || selectedAssignment.status === "missed")}

                  {/* Form Upload Training */}
                  {showForm ? (
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="training_type_display" className="text-gray-500 text-xs">Menu Training :</Label>
                        <div className="px-3 py-2 bg-gray-400 text-gray-800 rounded-lg text-xs font-medium border border-gray-200">
                          {selectedAssignment.training_type}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="date" className="text-gray-500 text-xs">Tanggal :</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                          required
                          className="text-xs bg-gray-100 text-gray-900 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="distance" className="text-gray-500 text-xs">
                          Jarak (km) :
                          {isStrengthSession && <span className="text-gray-400 ml-1">(Otomatis 0 untuk Strength)</span>}
                        </Label>
                        <Input
                          id="distance"
                          type="number"
                          step="0.1"
                          value={formData.distance}
                          onChange={(e) => setFormData((prev) => ({ ...prev, distance: e.target.value }))}
                          placeholder={isStrengthSession ? "0" : "Contoh: 5.2"}
                          required
                          disabled={isStrengthSession}
                          className={`text-xs bg-gray-100 text-gray-900 border-gray-300 focus:border-orange-500 focus:ring-orange-500 ${isStrengthSession ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="strava_link" className="text-gray-500 text-xs">URL :</Label>
                        <Input
                          type="text"
                          id="strava_link"
                          value={formData.strava_link}
                          onChange={(e) => setFormData((prev) => ({ ...prev, strava_link: e.target.value }))}
                          placeholder="Hanya URL Jam atau STRAVA"
                          className="text-xs bg-gray-100 text-gray-900 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={!formData.date || !formData.distance || !formData.strava_link || isSubmitting}
                        className="text-sm w-full bg-strava hover:bg-orange-600 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? "Submitting..." : "Submit"}
                      </Button>
                    </form>
                  ) : (
                    <>
                      {/* Add Training Button - only for pending/missed */}
                      {(selectedAssignment.status === "pending" || selectedAssignment.status === "missed") && (
                        <Button
                          onClick={() => setShowForm(true)}
                          className="w-full bg-strava hover:bg-orange-600 text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Training
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
