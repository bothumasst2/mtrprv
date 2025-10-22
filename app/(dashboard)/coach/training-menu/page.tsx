"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Send, Home, Users, Calendar, Trophy, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

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

// Custom Bottom Navbar Component for Training Menu
function TrainingMenuBottomNavbar({ visible }: { visible: boolean }) {
  const router = useRouter()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const menuItems = [
    { title: "Dashboard", url: "/coach/dashboard", icon: Home },
    { title: "Athletes", url: "/coach/athletes", icon: Users },
    { title: "Training Menu", url: "/coach/training-menu", icon: Calendar },
    { title: "Ranking", url: "/ranking", icon: Trophy },
  ]

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Glossy bottom navbar */}
      <div className="relative bg-white/40 backdrop-blur-xl border-t border-gray-200/50 shadow-lg">
        {/* Glossy overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5"></div>

        {/* Navigation items */}
        <div className="relative flex items-center justify-around px-2 py-3">
          {menuItems.map((item) => {
            const isActive = item.url === "/coach/training-menu"
            return (
              <button
                key={item.title}
                onClick={() => router.push(item.url)}
                className="relative group flex flex-col items-center justify-center p-2 min-w-0 flex-1"
              >
                {/* Active indicator glow */}
                {isActive && (
                  <div className="absolute inset-0 bg-strava/10 rounded-lg blur-sm"></div>
                )}

                {/* Icon container with glossy effect */}
                <div className={`
                  relative p-3 rounded-lg transition-all duration-300 group-hover:scale-110
                  ${isActive
                    ? 'bg-strava shadow-lg'
                    : 'bg-gray-100/80 hover:bg-gray-100/80'
                  }
                `}>
                  {/* Inner gloss */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/30 to-white/60 rounded-lg"></div>

                  {/* Icon */}
                  <item.icon className={`
                    relative h-6 w-6 transition-colors duration-300
                    ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-800'}
                  `} />
                </div>

                {/* Tooltip */}
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="bg-gray-900 text-white text-mobile-xs font-roboto-normal px-2 py-1 rounded-lg whitespace-nowrap">
                    {item.title}
                  </div>
                </div>
              </button>
            )
          })}

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className="relative group flex flex-col items-center justify-center p-2 min-w-0 flex-1"
          >
            {/* Icon container with glossy effect */}
            <div className="relative p-3 rounded-xl transition-all duration-300 group-hover:scale-110 bg-gray-100/80 hover:bg-red-100/80">
              {/* Inner gloss */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/30 to-white/60 rounded-xl"></div>

              {/* Icon */}
              <LogOut className="relative h-6 w-6 text-gray-600 group-hover:text-red-600 transition-colors duration-300" />
            </div>

            {/* Tooltip */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-gray-900 text-white text-mobile-xs font-roboto-normal px-2 py-1 rounded-lg whitespace-nowrap">
                Sign Out
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CoachTrainingMenuPage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [formData, setFormData] = useState({
    training_type: "",
    training_details: "",
    target_date: new Date().toISOString().split("T")[0],
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successCount, setSuccessCount] = useState(0)
  const [navbarVisible, setNavbarVisible] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  // Auto-hide navbar functionality - only show when cursor is at bottom
  useEffect(() => {
    let hideTimeout: NodeJS.Timeout

    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight
      const cursorY = e.clientY

      // Show navbar when cursor is in the bottom 100px of the screen
      if (cursorY >= windowHeight - 100) {
        setNavbarVisible(true)
        // Clear any existing hide timeout
        if (hideTimeout) {
          clearTimeout(hideTimeout)
        }
      } else {
        // Hide navbar after 2 seconds when cursor moves away from bottom
        hideTimeout = setTimeout(() => {
          setNavbarVisible(false)
        }, 2000)
      }
    }

    const handleMouseLeave = () => {
      // Hide navbar when mouse leaves the window
      hideTimeout = setTimeout(() => {
        setNavbarVisible(false)
      }, 1000)
    }

    const handleMouseEnter = () => {
      // Clear hide timeout when mouse enters the window
      if (hideTimeout) {
        clearTimeout(hideTimeout)
      }
    }

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    // Cleanup function
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      if (hideTimeout) {
        clearTimeout(hideTimeout)
      }
    }
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase.from("users").select("id, username, email").eq("role", "user")

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
      assigned_date: new Date().toISOString().split("T")[0],
      target_date: formData.target_date,
      status: "pending",
    }))

    const { error } = await supabase.from("training_assignments").insert(assignments)

    if (!error) {
      setSuccess(true)
      setSuccessCount(selectedUsers.length) // Store the actual count
      setSelectedUsers([])
      setFormData({
        training_type: "",
        training_details: "",
        target_date: new Date().toISOString().split("T")[0],
      })
    }

    setLoading(false)
  }

  return (
    <>
      {/* Custom auto-hide bottom navbar */}
      <TrainingMenuBottomNavbar visible={navbarVisible} />

      <div className={`min-h-screen bg-strava-dark ${navbarVisible ? 'pb-20' : ''}`}>
        <div className="container mx-auto px-4 py-6 space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-strava">Training Menu</h1>
            <p className="text-md text-gray-600 mt-0">Assign training programs to your athletes</p>
          </div>

          <Card className="bg-strava-grey rounded-xl shadow-sm border border-none">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Plus className="h-5 w-5 text-strava font-black" />
                Assign Training
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Athletes ({selectedUsers.length} selected)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-xs bg-strava"
                    >
                      {selectedUsers.length === users.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <div className="bg-white border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={user.id}
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => handleUserToggle(user.id)}
                        />
                        <Label htmlFor={user.id} className="text-sm cursor-pointer flex-1">
                          {user.username}
                        </Label>
                      </div>
                    ))}
                  </div>
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
                    <p className="text-green-800 font-medium">
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
    </>
  )
}
