"use client"

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

interface TrainingLog {
  id: string
  date: string
  training_type: string
  distance: number
  strava_link: string | null
  status: "completed" | "pending" | "missed"
}

const TRAINING_TYPES = [
  "EASY RUN ZONE 2",
  "LONGRUN",
  "MEDIUM RUN (SPEED)",
  "EASY RUN (EZ)",
  "Strenght session / Running Drills",
  "FARTLEK RUN (SPEED)",
  "INTERVAL RUN (SPEED)",
]

export default function TrainingLogPage() {
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    training_type: "",
    distance: "",
    strava_link: "",
  })
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchTrainingLogs()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const { error } = await supabase.from("training_log").insert({
      user_id: user.id,
      date: formData.date,
      training_type: formData.training_type,
      distance: Number.parseFloat(formData.distance),
      strava_link: formData.strava_link || null,
      status: "completed",
    })

    if (!error) {
      setFormData({
        date: new Date().toISOString().split("T")[0],
        training_type: "",
        distance: "",
        strava_link: "",
      })
      setShowForm(false)
      fetchTrainingLogs()
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Training Log</h1>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all duration-150"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Training
          </Button>
        </div>

        {showForm && (
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">Upload Data Training</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Tanggal</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    required
                    className="focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="training_type">Menu Training</Label>
                  <Select
                    value={formData.training_type}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, training_type: value }))}
                  >
                    <SelectTrigger className="focus:border-orange-500 focus:ring-orange-500">
                      <SelectValue placeholder="Select training type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRAINING_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="distance">Jarak (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    step="0.1"
                    value={formData.distance}
                    onChange={(e) => setFormData((prev) => ({ ...prev, distance: e.target.value }))}
                    placeholder="Contoh: 5.2"
                    required
                    className="focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strava_link">Link Strava</Label>
                  <Input
                    id="strava_link"
                    value={formData.strava_link}
                    onChange={(e) => setFormData((prev) => ({ ...prev, strava_link: e.target.value }))}
                    placeholder="Link Strava"
                    className="focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all duration-150"
                >
                  Submit
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">Training History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trainingLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-2xl text-white">
                  <div className="flex items-center gap-3">
                    {log.status === "completed" ? (
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-400" />
                    )}
                    <div>
                      <p className="font-medium">{log.training_type}</p>
                      <p className="text-sm text-gray-400">
                        {log.distance}km • {new Date(log.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {log.strava_link && (
                    <a
                      href={log.strava_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 text-sm hover:underline"
                    >
                      View on Strava
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
