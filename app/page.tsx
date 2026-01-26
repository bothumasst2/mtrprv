"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { MTRLogo } from "@/components/mtr-logo"

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
        const { data, error } = await supabase.from("users").select("role").eq("id", user.id).single()
        if (error) {
          console.error("Error fetching user role:", error)
          setUserRole("user")
        } else {
          setUserRole(data?.role || "user")
        }
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
        console.log("Redirecting user with role:", userRole)
        // Route based on user role with immediate redirect
        if (userRole === "admin" || userRole === "coach") {
          router.replace("/coach/dashboard")
        } else {
          router.replace("/dashboard")
        }
      } else if (!user) {
        setRedirecting(true)
        console.log("No user, redirecting to login")
        router.replace("/login")
      }
    }
  }, [user, userRole, loading, roleLoading, redirecting, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <MTRLogo className="w-24 h-16 mx-auto mb-4" />
      </div>
    </div>
  )
}
