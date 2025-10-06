"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

interface CalendarProps {
  onDateSelect?: (date: string) => void
}

interface TrainingData {
  date: string
  hasCompleted: boolean
  hasPendingAgenda: boolean
  hasOverdueAgenda: boolean
}

export function TrainingCalendar({ onDateSelect }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [trainingData, setTrainingData] = useState<TrainingData[]>([])
  const { user } = useAuth()

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  useEffect(() => {
    if (user) {
      fetchTrainingData()
    }
  }, [currentDate, user])

  const fetchTrainingData = async () => {
    if (!user) return

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const startDate = new Date(year, month, 1).toISOString().split("T")[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0]
    const today = new Date().toISOString().split("T")[0]

    // Update missed status first
    await supabase
      .from("training_assignments")
      .update({ status: "missed" })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .lt("target_date", today)

    // Fetch completed training logs
    const { data: logs } = await supabase
      .from("training_log")
      .select("date, status")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)

    // Fetch training assignments
    const { data: assignments } = await supabase
      .from("training_assignments")
      .select("target_date, status")
      .eq("user_id", user.id)
      .gte("target_date", startDate)
      .lte("target_date", endDate)

    const dataMap = new Map<string, TrainingData>()

    // Mark completed training (green indicators) - use exact date
    logs?.forEach((log) => {
      if (log.status === "completed") {
        const existing = dataMap.get(log.date) || {
          date: log.date,
          hasCompleted: false,
          hasPendingAgenda: false,
          hasOverdueAgenda: false,
        }
        existing.hasCompleted = true
        dataMap.set(log.date, existing)
      }
    })

    // Mark agenda training (blue for pending, red for missed) - use exact target_date
    assignments?.forEach((assignment) => {
      const existing = dataMap.get(assignment.target_date) || {
        date: assignment.target_date,
        hasCompleted: false,
        hasPendingAgenda: false,
        hasOverdueAgenda: false,
      }

      if (assignment.status === "pending") {
        existing.hasPendingAgenda = true // Blue for pending
      } else if (assignment.status === "missed") {
        existing.hasOverdueAgenda = true // Red for missed
      }
      dataMap.set(assignment.target_date, existing)
    })

    setTrainingData(Array.from(dataMap.values()))
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    let startingDayOfWeek = firstDay.getDay()
    startingDayOfWeek = (startingDayOfWeek + 6) % 7  // Shift: Sun(0) → 6, Mon(1) → 0

    const days = []

    // Add previous month days
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, 1 - (startingDayOfWeek - i))
      days.push({
        day: prevDate.getDate(),
        isCurrentMonth: false,
        dayOfWeek: prevDate.getDay(), // This will be the actual day of week (0=Sunday, 6=Saturday)
      })
    }

    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day)
      days.push({
        day,
        isCurrentMonth: true,
        dayOfWeek: currentDate.getDay(), // This will be the actual day of week (0=Sunday, 6=Saturday)
      })
    }

    return days
  }

  const getTrainingIndicator = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return null

    // Create date string in local timezone to match database dates exactly
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    .toLocaleDateString("sv-SE") // Format: YYYY-MM-DD tanpa UTC offset
    const data = trainingData.find((d) => d.date === dateStr)

    if (!data) return null

    if (data.hasCompleted) {
      // Green indicator for completed training
      return <div className="w-2 h-0.5 bg-green-500 rounded-full mx-auto mt-0.5" />
    } else if (data.hasOverdueAgenda) {
      // Red indicator for missed agenda
      return <div className="w-2 h-0.5 bg-red-500 rounded-full mx-auto mt-0.5" />
    } else if (data.hasPendingAgenda) {
      // Blue indicator for pending agenda
      return <div className="w-2 h-0.5 bg-blue-500 rounded-full mx-auto mt-0.5" />
    }

    return null
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const days = getDaysInMonth(currentDate)
  const today = new Date()
  const isCurrentMonth =
    currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()

  return (
    <div className="bg-strava-grey rounded-lg p-2 shadow-sm border border-none">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth("prev")}
          className="p- hover:bg-strava-darkgrey active:scale-95 transition-all duration-150"
        >
          <ChevronLeft className="h-6 w-6 text-strava" />
        </Button>
        <h3 className="font-semibold text-base text-strava">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth("next")}
          className="p-2 hover:bg-strava-darkgrey active:scale-95 transition-all duration-150"
        >
          <ChevronRight className="h-6 w-6 text-strava" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-white py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((dayInfo, index) => (
          <div key={index} className="aspect-square">
            <button
              className={`w-full h-full flex flex-col items-center justify-center text-sm md:text-sm rounded-lg hover:bg-strava-darkgrey transition-colors ${
                dayInfo.isCurrentMonth && dayInfo.day === today.getDate() && isCurrentMonth
                  ? "bg-strava text-white"
                  : dayInfo.isCurrentMonth
                    ? dayInfo.dayOfWeek === 0 // 0 = Sunday, should be red
                      ? "text-strava font-semibold"
                      : "text-white"
                    : "text-strava-white"
              }`}
              onClick={() => {
                if (dayInfo.isCurrentMonth) {
                  const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayInfo.day)
                    .toISOString()
                    .split("T")[0]
                  onDateSelect?.(dateStr)
                }
              }}
            >
              <span>{dayInfo.day}</span>
              {getTrainingIndicator(dayInfo.day, dayInfo.isCurrentMonth)}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
