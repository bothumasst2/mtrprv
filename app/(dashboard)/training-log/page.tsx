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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { WeeklyActivityChart } from "@/components/WeeklyActivityChart"

interface TrainingLog {
  id: string
  date: string
  training_type: string
  distance: number
  strava_link: string | null
  status: "completed" | "pending" | "missed"
}

export default function TrainingLogPage() {
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([])
  const [availableTrainingTypes, setAvailableTrainingTypes] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    training_type: "",
    distance: "",
    strava_link: "",
  })
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchTrainingLogs()
      fetchAvailableTrainingTypes()
    }
  }, [user])

  const fetchTrainingLogs = async () => {
    if (!user) return

    const { data } = await supabase
      .from("training_log")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })

    setTrainingLogs(data || [])
  }

  const fetchAvailableTrainingTypes = async () => {
    if (!user) return

    // Get training types from pending assignments
    const { data: assignments } = await supabase
      .from("training_assignments")
      .select("training_type")
      .eq("user_id", user.id)
      .eq("status", "pending")

    if (assignments && assignments.length > 0) {
      const uniqueTypes = [...new Set(assignments.map((a) => a.training_type))]
      setAvailableTrainingTypes(uniqueTypes)
    } else {
      // Clear to all training types if no assignments
      setAvailableTrainingTypes([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isSubmitting) return
    setIsSubmitting(true)

    const { error } = await supabase.from("training_log").insert({
      user_id: user.id,
      date: formData.date,
      training_type: formData.training_type,
      distance: Number.parseFloat(formData.distance),
      strava_link: formData.strava_link || null,
      status: "completed",
    })

    if (!error) {
      // Auto-complete matching training assignment
      await supabase
        .from("training_assignments")
        .update({ status: "completed" })
        .eq("user_id", user.id)
        .eq("training_type", formData.training_type)
        .eq("status", "pending")

      setFormData({
        date: getLocalDateString(),
        training_type: "",
        distance: "",
        strava_link: "",
      })
      setShowForm(false)
      fetchTrainingLogs()
      fetchAvailableTrainingTypes()

      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent("trainingCompleted"))
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-strava-dark">
      <div className="container mx-auto px-4 py-6 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-md md:text-xl font-semibold text-white">Training Log</h1>
        </div>
        <WeeklyActivityChart logs={trainingLogs} />
        <Card className="bg-[#1f1f1f] rounded-md shadow-sm border border-none">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white">Training History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {trainingLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-strava-darkgrey rounded-lg text-white">
                  <div className="flex items-center gap-2">
                    {log.status === "completed" ? (
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-strava" />
                    )}
                    <div>
                      <p className="font-roboto-bold text-xs">{log.training_type}</p>
                      <p className="text-xs text-gray-400">
                        {log.distance}km • {new Date(log.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {log.strava_link && (
                    <a
                      href={log.strava_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-strava text-xs font-roboto-normal hover:font-roboto-bold hover:underline"
                    >
                      See More
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
