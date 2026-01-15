"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image";

// Running Shoe Icon SVG Component
const ShoeIcon = ({ className = "" }: { className?: string }) => (
  <Image
    src="/runicon.svg"
    width={30}
    height={30}
    className={className}
    alt="run icon"
  />
)

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

    // Mark completed training - use exact date
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

    // Mark agenda training - use exact target_date (but we won't display them)
    assignments?.forEach((assignment) => {
      const existing = dataMap.get(assignment.target_date) || {
        date: assignment.target_date,
        hasCompleted: false,
        hasPendingAgenda: false,
        hasOverdueAgenda: false,
      }

      if (assignment.status === "pending") {
        existing.hasPendingAgenda = true
      } else if (assignment.status === "missed") {
        existing.hasOverdueAgenda = true
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
        dayOfWeek: prevDate.getDay(),
      })
    }

    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day)
      days.push({
        day,
        isCurrentMonth: true,
        dayOfWeek: currentDate.getDay(),
      })
    }

    return days
  }

  // Check if a date has completed training - only show shoe icon for completed
  const hasCompletedTraining = (day: number, isCurrentMonth: boolean): boolean => {
    if (!isCurrentMonth) return false

    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toLocaleDateString("sv-SE")
    const data = trainingData.find((d) => d.date === dateStr)

    return data?.hasCompleted ?? false
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
  const isToday = (day: number, isCurrentMonthDay: boolean) =>
    isCurrentMonthDay && day === today.getDate() && isCurrentMonth

  return (
    <div className="bg-[#1c1c1c] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth("prev")}
            className="p-2 hover:bg-[#2a2a2a] rounded-full"
          >
            <ChevronLeft className="h-5 w-5 text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth("next")}
            className="p-2 hover:bg-[#2a2a2a] rounded-full"
          >
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Day names - Single letters */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <div key={index} className="text-center text-sm font-medium text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dayInfo, index) => {
          const completed = hasCompletedTraining(dayInfo.day, dayInfo.isCurrentMonth)
          const isTodayDate = isToday(dayInfo.day, dayInfo.isCurrentMonth)

          return (
            <div key={index} className="aspect-square p-0.5">
              <button
                className={`w-full h-full flex items-center justify-center rounded-full transition-colors relative
                  ${!dayInfo.isCurrentMonth
                    ? "text-gray-600"
                    : isTodayDate
                      ? "bg-white text-black font-semibold"
                      : completed
                        ? "bg-white text-black"
                        : "text-gray-300 border border-gray-600 hover:bg-[#2a2a2a]"
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
                {completed ? (
                  <ShoeIcon className="w-8 h-8" />
                ) : (
                  <span className="text-sm">{dayInfo.day}</span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
