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
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Send } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

interface User {
  id: string
  username: string
  email: string
}

const TRAINING_TYPES = [
  "EASY RUN ZONA 2",
  "LONGRUN",
  "MEDIUM RUN (SPEED)",
  "EASY RUN (EZ)",
  "Strenght session / Running Drills",
  "FARTLEK RUN ( SPEED )",
  "INTERVAL RUN ( SPEED )",
  "RACE",
]

export default function CoachTrainingMenuPage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [formData, setFormData] = useState({
    training_type: "",
    training_details: "",
    target_date: getLocalDateString(),
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successCount, setSuccessCount] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase.from("users").select("id, username, email").eq("role", "user").order("username", { ascending: true })
    setUsers(data || [])
  }

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map((user) => user.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || selectedUsers.length === 0) return

    setLoading(true)
    setSuccess(false)

    // Create assignments for all selected users
    const assignments = selectedUsers.map((userId) => ({
      coach_id: user.id,
      user_id: userId,
      training_type: formData.training_type,
      training_details: formData.training_details,
      assigned_date: getLocalDateString(),
      target_date: formData.target_date,
      status: "pending",
    }))

    const { error } = await supabase.from("training_assignments").insert(assignments)

    if (!error) {
      setSuccess(true)
      setSuccessCount(selectedUsers.length)
      setSelectedUsers([])
      setFormData({
        training_type: "",
        training_details: "",
        target_date: getLocalDateString(),
      })
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-strava-dark">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-strava">Training Menu</h1>
          <p className="text-sm text-gray-300 mt-0">Assign training programs to your athletes</p>
        </div>

        <Card className="bg-[#1f1f1f] rounded-xl shadow-sm border border-none">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-strava flex items-center gap-2">
              <Plus className="h-5 w-5 text-strava font-black" />
              Assign Training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-white">Athletes ({selectedUsers.length} selected)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs bg-strava border-none text-white"
                  >
                    {selectedUsers.length === users.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleUserToggle(u.id)}
                      className={`
                        px-4 py-2 rounded-full text-xs font-sm transition-all duration-200
                        ${selectedUsers.includes(u.id)
                          ? "bg-strava text-white border-strava"
                          : "bg-transparent border border-gray-500 text-gray-300 hover:border-gray-400"
                        }
                      `}
                    >
                      {u.username}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="training_type" className="text-white">Training Menu</Label>
                <div className="flex flex-wrap gap-2">
                  {TRAINING_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, training_type: type }))}
                      className={`
                        px-4 py-2 rounded-full text-xs font-sm transition-all duration-200
                        ${formData.training_type === type
                          ? "bg-strava text-white border-strava"
                          : "bg-transparent border border-gray-500 text-gray-300 hover:border-gray-400"
                        }
                      `}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_date" className="text-white">Target Date</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, target_date: e.target.value }))}
                  required
                  className="bg-[#2a2a2a] border-gray-500 text-white focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="training_details" className="text-white">Training Details</Label>
                <Textarea
                  id="training_details"
                  value={formData.training_details}
                  onChange={(e) => setFormData((prev) => ({ ...prev, training_details: e.target.value }))}
                  placeholder="Enter specific instructions, distance, pace, etc."
                  rows={4}
                  className="bg-[#2a2a2a] border-gray-500 text-white focus:border-orange-500"
                />
              </div>

              {success && (
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                  <p className="text-green-400 font-sm">
                    Training assignment sent to {successCount} athlete(s) successfully!
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || selectedUsers.length === 0 || !formData.training_type}
                className="w-full bg-strava hover:bg-strava-light active:scale-95 transition-all duration-150"
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? "Sending..." : `Send Training Assignment to ${selectedUsers.length} Athlete(s)`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

