"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

export default function HomePage() {
  const { user, loading } = useAuth()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null)
        setRoleLoading(false)
        return
      }

      try {
        const { data } = await supabase.from("users").select("role").eq("id", user.id).single()
        setUserRole(data?.role || "user")
      } catch (error) {
        console.error("Error fetching user role:", error)
        setUserRole("user")
      } finally {
        setRoleLoading(false)
      }
    }

    if (!loading) {
      fetchUserRole()
    }
  }, [user, loading])

  useEffect(() => {
    if (!loading && !roleLoading && !redirecting) {
      if (user && userRole) {
        setRedirecting(true)
        // Route based on user role with immediate redirect
        if (userRole === "admin" || userRole === "coach") {
          router.replace("/coach/dashboard")
        } else {
          router.replace("/dashboard")
        }
      } else if (!user) {
        setRedirecting(true)
        router.replace("/login")
      }
    }
  }, [user, userRole, loading, roleLoading, redirecting, router])

  if (loading || roleLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src="/logo-mtr.svg" alt="MTR Logo" className="w-24 h-16 mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return null
}
