"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, Clock, AlertTriangle, ArrowLeft, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import XLSX from "xlsx-js-style"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

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

const TRAINING_TYPES = [
  "EASY RUN ZONA 2",
  "EASY RUN (EZ)",
  "MEDIUM RUN (SPEED)",
  "LONGRUN",
  "FARTLEK RUN (SPEED)",
  "INTERVAL RUN (SPEED)",
  "RACE",
  "STRENGHT SESSION",
]

type FilterStatus = "all" | "pending" | "completed" | "missed"

export default function ActiveAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all")
  const [resendDialogOpen, setResendDialogOpen] = useState(false)
  const [resendAssignment, setResendAssignment] = useState<Assignment | null>(null)
  const [newTargetDate, setNewTargetDate] = useState(getLocalDateString())
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchAssignments()
    }
  }, [user])

  // Add effect to check for missed assignments periodically
  useEffect(() => {
    if (user && assignments.length > 0) {
      const checkMissedAssignments = () => {
        const today = getLocalDateString()
        let hasUpdates = false

        const updatedAssignments = assignments.map(assignment => {
          if (assignment.status === "pending" && assignment.target_date < today) {
            hasUpdates = true
            return { ...assignment, status: "missed" as const }
          }
          return assignment
        })

        if (hasUpdates) {
          setAssignments(updatedAssignments)
          // Also update in database
          updateMissedStatusInDB()
        }
      }

      checkMissedAssignments()
    }
  }, [assignments, user])

  const updateMissedStatusInDB = async () => {
    if (!user) return
    const today = getLocalDateString()

    await supabase
      .from("training_assignments")
      .update({ status: "missed" })
      .eq("coach_id", user.id)
      .eq("status", "pending")
      .lt("target_date", today)
  }

  const fetchAssignments = async () => {
    if (!user) return

    const today = getLocalDateString()

    // Update missed status first - any pending assignment past target date becomes missed
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
        return "text-green-500 bg-green-500/10 border border-green-500/20"
      case "missed":
        return "text-red-500 bg-red-500/10 border border-red-500/20"
      default:
        return "text-blue-500 bg-blue-500/10 border border-blue-500/20"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "missed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-blue-500" />
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

  const getFilterButtonStyle = (filterType: FilterStatus) => {
    const baseStyle = "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2"

    if (activeFilter === filterType) {
      switch (filterType) {
        case "completed":
          return `${baseStyle} bg-green-600 text-white shadow-lg shadow-green-900/20`
        case "missed":
          return `${baseStyle} bg-red-600 text-white shadow-lg shadow-red-900/20`
        case "pending":
          return `${baseStyle} bg-blue-600 text-white shadow-lg shadow-blue-900/20`
        default:
          return `${baseStyle} bg-strava text-white shadow-lg shadow-orange-900/20`
      }
    } else {
      switch (filterType) {
        case "completed":
          return `${baseStyle} bg-green-600/10 text-green-500 hover:bg-green-600/20 border border-green-600/20`
        case "missed":
          return `${baseStyle} bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-600/20`
        case "pending":
          return `${baseStyle} bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 border border-blue-600/20`
        default:
          return `${baseStyle} bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a] hover:text-white border border-gray-700/50`
      }
    }
  }

  const filteredAssignments = assignments.filter(assignment => {
    if (activeFilter === "all") return true
    return assignment.status === activeFilter
  })

  const getStatusCount = (status: FilterStatus) => {
    if (status === "all") return assignments.length
    return assignments.filter(a => a.status === status).length
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

  const handleResend = async () => {
    if (!resendAssignment || !newTargetDate) return

    const { error } = await supabase
      .from("training_assignments")
      .update({
        assigned_date: getLocalDateString(),
        target_date: newTargetDate,
        status: "pending"
      })
      .eq("id", resendAssignment.id)

    if (!error) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === resendAssignment.id
            ? { ...a, assigned_date: getLocalDateString(), target_date: newTargetDate, status: "pending" }
            : a
        )
      )
      setResendDialogOpen(false)
      setResendAssignment(null)
    } else {
      console.error("Resend failed:", error)
      alert("Resend failed. Please try again.")
    }
  }

  const handleExportReport = async () => {
    // 1. Calculate Date Range (Monday 02 AM to Sunday 08 PM)
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)) // Go to Monday
    monday.setHours(2, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(20, 0, 0, 0)

    const formatDateTime = (date: Date) => {
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).toUpperCase()
    }

    // 2. Fetch all assignments in this range
    const { data: reportData } = await supabase
      .from("training_assignments")
      .select(`
        training_type,
        target_date,
        status,
        users:user_id (
          username
        )
      `)
      .gte("target_date", monday.toISOString().split("T")[0])
      .lte("target_date", sunday.toISOString().split("T")[0])

    if (!reportData || reportData.length === 0) {
      alert("No data found for this week (Mon 02:00 AM - Sun 08:00 PM).")
      return
    }

    // 3. Prepare Excel Data
    // Get unique users and map assignments
    const usersList = Array.from(new Set(reportData.map((item: any) => item.users.username))).sort()

    // Create matrix: [ [ "MTR WEEKLY TRAINING REPORT" ], [ "From: ...", "To: ..." ], [ "Athlete", ...TRAINING_TYPES ], [ "username", ...status ], ... ]
    const wsData: any[][] = []

    // Header Row 1: Title
    wsData.push(["MTR WEEKLY TRAINING REPORT"])

    // Header Row 2: Date Range
    wsData.push([`From : ${formatDateTime(monday)}`, "", "", "", `To: ${formatDateTime(sunday)}`])

    // Header Row 3: Column Names
    wsData.push(["Athlete", "Training Menu"])

    // Header Row 4: Sub-Column Names
    wsData.push(["", ...TRAINING_TYPES])

    // Data Rows
    usersList.forEach((username) => {
      const row = [username]
      TRAINING_TYPES.forEach((type) => {
        const assignment = reportData.find(
          (item: any) =>
            item.users.username === username &&
            item.training_type.toUpperCase() === type.toUpperCase()
        )

        if (assignment) {
          row.push(assignment.status === "completed" ? "Completed" : "Missed")
        } else {
          row.push("")
        }
      })
      wsData.push(row)
    })

    // 4. Create Workbook and Worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Merges
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // From
      { s: { r: 1, c: 4 }, e: { r: 1, c: 8 } }, // To
      { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, // Athlete header
      { s: { r: 2, c: 1 }, e: { r: 2, c: 8 } }, // Training Menu header
    ]

    // 5. Apply Styles (using specific formatting for status)
    // xlsx-style or xlsx handles styling differently. 
    // Since styling usually requires a specialized library like xlsx-js-style,
    // and we've installed xlsx-style, we'll try to use it if we can bridge it.
    // However, basic XLSX doesn't support fill colors in browser without extra effort.
    // I will use a dynamic import for style if needed or use standard cell formats.

    // Let's iterate through cells to add styling properties
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1")
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        if (!ws[cellAddress]) continue

        // Basic font and alignment for all
        ws[cellAddress].s = {
          font: { sz: 10 },
          alignment: { vertical: "center", horizontal: "center" },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" }
          }
        }

        // Title styling
        if (R === 0) {
          ws[cellAddress].s.font = { bold: true, sz: 14 }
        }

        // Header color coding
        if (R >= 4) {
          const val = ws[cellAddress].v
          if (C > 0) { // Not the Athlete column
            if (val === "Completed") {
              ws[cellAddress].s.fill = { fgColor: { rgb: "C6EFCE" } } // Light green
              ws[cellAddress].s.font.color = { rgb: "000000" }
            } else if (val === "Missed") {
              ws[cellAddress].s.fill = { fgColor: { rgb: "FFC7CE" } } // Light red
              ws[cellAddress].s.font.color = { rgb: "9C0006" }
            } else if (val === "") {
              ws[cellAddress].s.fill = { fgColor: { rgb: "FFFF00" } } // Yellow
            }
          }
        }
      }
    }

    // 6. Append sheet and Download
    try {
      XLSX.utils.book_append_sheet(wb, ws, "Weekly Report")
      XLSX.writeFile(wb, `MTR_Weekly_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (err) {
      console.error("Export failed:", err)
      alert("Export failed. Please check console for details.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-strava-dark">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-strava">Active Assignments</h1>
          <div className="text-center py-8 text-strava">Loading assignments...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-strava-dark">
      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-strava leading-tight">Logs Training Menu</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">weekly training status</p>
            </div>
            <Button
              onClick={handleExportReport}
              className="bg-green-600 hover:bg-green-700 text-white text-[10px] h-7 px-3 flex items-center gap-1 font-bold rounded-md ml-11"
            >
              <Download className="h-3 w-3" />
              REPORT
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={`${getFilterButtonStyle("all")} !py-1 !px-2 !text-[11px]`}
            >
              <span>All ({getStatusCount("all")})</span>
            </button>
            <button
              onClick={() => setActiveFilter("pending")}
              className={`${getFilterButtonStyle("pending")} !py-1 !px-2 !text-[11px]`}
            >
              <span>Pending ({getStatusCount("pending")})</span>
            </button>
            <button
              onClick={() => setActiveFilter("completed")}
              className={`${getFilterButtonStyle("completed")} !py-1 !px-2 !text-[11px]`}
            >
              <span>Completed ({getStatusCount("completed")})</span>
            </button>
            <button
              onClick={() => setActiveFilter("missed")}
              className={`${getFilterButtonStyle("missed")} !py-1 !px-2 !text-[11px]`}
            >
              <span>Missed ({getStatusCount("missed")})</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-strava-darkgrey/30 mb-2 pb-1">
            <h2 className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">
              {activeFilter === "all" ? "Assignment List" : `${activeFilter} List`}
              <span className="text-gray-500 ml-2 font-normal">({filteredAssignments.length})</span>
            </h2>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="bg-[#1f1f1f] border border-strava-darkgrey/20 rounded-xl py-12 text-center">
              <Clock className="h-10 w-10 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 text-xs">
                {activeFilter === "all" ? "No assignments found" : `No ${activeFilter} assignments`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {filteredAssignments.map((assignment) => (
                <div key={assignment.id} className="bg-[#1f1f1f] border border-strava-darkgrey/40 rounded-xl p-2.5 transition-all hover:bg-strava-darkgrey/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar className="h-7 w-7 border border-strava-darkgrey">
                        <AvatarImage src={getSafeSrc(assignment.user.profile_photo) || "/placeholder.svg"} />
                        <AvatarFallback className="bg-strava text-white text-[9px]">
                          {assignment.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-[11px] truncate leading-tight">{assignment.user.username}</p>
                        <p className="text-[9px] text-strava truncate leading-tight">{assignment.training_type}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter ${getStatusColor(assignment.status)}`}>
                        {getStatusText(assignment.status)}
                      </div>
                    </div>

                    <div className="space-y-0.5 mb-1.5">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-gray-500">Target</span>
                        <span className="font-bold text-white">{new Date(assignment.target_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px]">
                        <span className="text-gray-500">Assigned</span>
                        <span className="text-gray-400 italic">{new Date(assignment.assigned_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-auto">
                    {assignment.status === "missed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-6 text-[9px] rounded-lg font-bold border-strava text-strava hover:bg-strava hover:text-white"
                        onClick={() => {
                          setResendAssignment(assignment)
                          setNewTargetDate(getLocalDateString())
                          setResendDialogOpen(true)
                        }}
                      >
                        <RefreshCw className="h-2.5 w-2.5 mr-1" />
                        Re-send
                      </Button>
                    )}

                    {assignment.status !== "completed" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full h-6 text-[9px] rounded-lg font-bold"
                        onClick={() => handleDelete(assignment.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
        <AlertDialogContent className="bg-[#1f1f1f] border border-strava-darkgrey text-white rounded-2xl max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-strava/10 rounded-full">
                <RefreshCw className="h-5 w-5 text-strava" />
              </div>
              <AlertDialogTitle className="text-strava font-bold">Re-send Training Menu</AlertDialogTitle>
            </div>
            <div className="text-gray-400 text-sm space-y-3">
              <div className="bg-strava-dark/50 p-3 rounded-xl border border-strava-darkgrey/30">
                <p><span className="text-xs text-strava font-bold">Athlete:</span> <span className="text-xs">{resendAssignment?.user.username}</span></p>
                <p><span className="text-xs text-strava font-bold">Menu:</span> <span className="text-xs">{resendAssignment?.training_type}</span></p>
                <p className="line-clamp-20"><span className="text-xs text-strava font-bold">Details:</span> <span className="text-xs">{resendAssignment?.training_details}</span></p>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="new_target_date" className="text-strava text-xs font-bold">Set New Target Date</Label>
                <Input
                  id="new_target_date"
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="bg-[#2a2a2a] border-strava-darkgrey text-white text-xs focus:border-strava"
                />
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel
              className="bg-transparent border-gray-700 text-gray-400 hover:bg-strava-darkgrey hover:text-white rounded-xl text-xs h-9"
              onClick={() => {
                setResendDialogOpen(false)
                setResendAssignment(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResend}
              className="bg-strava hover:bg-strava-light text-white border-none rounded-xl text-xs h-9 font-bold"
            >
              Re-Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
