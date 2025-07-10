"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
]

export default function CoachTrainingMenuPage() {
  const [users, setUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    user_id: "",
    training_type: "",
    training_details: "",
    target_date: new Date().toISOString().split("T")[0],
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase.from("users").select("id, username, email").eq("role", "user")

    setUsers(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setSuccess(false)

    const { error } = await supabase.from("training_assignments").insert({
      coach_id: user.id,
      user_id: formData.user_id,
      training_type: formData.training_type,
      training_details: formData.training_details,
      assigned_date: new Date().toISOString().split("T")[0],
      target_date: formData.target_date,
      status: "pending",
    })

    if (!error) {
      setSuccess(true)
      setFormData({
        user_id: "",
        training_type: "",
        training_details: "",
        target_date: new Date().toISOString().split("T")[0],
      })
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Training Menu</h1>
          <p className="text-gray-600 mt-2">Assign training programs to your athletes</p>
        </div>

        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Plus className="h-5 w-5 text-orange-500" />
              Assign Training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Athlete Name</Label>
                <Select
                  value={formData.user_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, user_id: value }))}
                >
                  <SelectTrigger className="focus:border-orange-500 focus:ring-orange-500">
                    <SelectValue placeholder="Select an athlete" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="training_type">Training Menu</Label>
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
                <Label htmlFor="target_date">Target Date</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, target_date: e.target.value }))}
                  required
                  className="focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="training_details">Training Details</Label>
                <Textarea
                  id="training_details"
                  value={formData.training_details}
                  onChange={(e) => setFormData((prev) => ({ ...prev, training_details: e.target.value }))}
                  placeholder="Enter specific instructions, distance, pace, etc."
                  rows={4}
                  className="focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">Training assignment sent successfully!</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !formData.user_id || !formData.training_type}
                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all duration-150"
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? "Sending..." : "Send Training Assignment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
