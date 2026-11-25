import { supabase } from "@/lib/supabase"
import { isPastIuranDeadline, shouldBlockIuranStatus } from "./iuran-rules.mjs"

export { isPastIuranDeadline }

export interface IuranStatus {
  status: "pending" | "paid" | null
  paidAt: string | null
}

export async function getIuranStatus(userId: string): Promise<IuranStatus> {
  const now = new Date()
  const { data, error } = await supabase
    .from("iuran_payments")
    .select("status, paid_at")
    .eq("user_id", userId)
    .eq("month", now.getMonth() + 1)
    .eq("year", now.getFullYear())
    .maybeSingle()

  if (error) {
    console.error("Error fetching iuran status:", error)
    return { status: null, paidAt: null }
  }

  return { status: data?.status || null, paidAt: data?.paid_at || null }
}

export async function ensureIuranRecord(userId: string, month?: number, year?: number): Promise<void> {
  const now = new Date()
  const currentMonth = month || now.getMonth() + 1
  const currentYear = year || now.getFullYear()
  const { data } = await supabase
    .from("iuran_payments")
    .select("id")
    .eq("user_id", userId)
    .eq("month", currentMonth)
    .eq("year", currentYear)
    .maybeSingle()

  if (!data) {
    const { error } = await supabase.from("iuran_payments").insert({
      user_id: userId,
      month: currentMonth,
      year: currentYear,
      status: "pending",
    })
    if (error && error.code !== "23505") console.error("Failed to insert pending iuran record:", error)
  }
}

export async function shouldBlockForIuran(userId: string): Promise<boolean> {
  const now = new Date()
  if (!isPastIuranDeadline(now.getDate())) return false

  const { data: userData } = await supabase.from("users").select("role").eq("id", userId).maybeSingle()
  if (userData?.role !== "user") return false

  const { status } = await getIuranStatus(userId)
  return shouldBlockIuranStatus({ dayOfMonth: now.getDate(), role: userData.role, status })
}
