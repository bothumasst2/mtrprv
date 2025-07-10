"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

export function useUserRole() {
  const [role, setRole] = useState<"user" | "coach" | "admin" | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole(null)
        setLoading(false)
        return
      }

      try {
        const { data } = await supabase.from("users").select("role").eq("id", user.id).single()
        setRole(data?.role || "user")
      } catch (error) {
        console.error("Error fetching user role:", error)
        setRole("user")
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [user])

  return { role, loading }
}
