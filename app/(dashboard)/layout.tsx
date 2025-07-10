"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { MTRLogo } from "@/components/mtr-logo"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/contexts/profile-context"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined
}

function HeaderContent() {
  const { user } = useAuth()
  const { profilePhoto } = useProfile()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="md:hidden" />
          <MTRLogo className="h-12 w-16" />
        </div>
        <Link href="/profile">
          <Avatar className="h-12 w-12 border-4 border-orange-500 cursor-pointer hover:border-orange-600 transition-colors">
            <AvatarImage src={getSafeSrc(profilePhoto) || "/placeholder.svg"} />
            <AvatarFallback className="bg-orange-500 text-white">
              {(user?.email?.[0] || "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
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

  // Redirect based on role and current path
  useEffect(() => {
    if (!loading && !roleLoading && user && userRole) {
      const currentPath = window.location.pathname

      // More aggressive redirection for coaches
      if (userRole === "coach" || userRole === "admin") {
        if (currentPath === "/dashboard" || currentPath === "/") {
          router.replace("/coach/dashboard")
          return
        }
      }
      // If user is on coach dashboard, redirect to user dashboard
      else if (userRole === "user" && currentPath.startsWith("/coach")) {
        router.replace("/dashboard")
        return
      }
    }
  }, [user, userRole, loading, roleLoading, router])

  // Additional check on mount
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (user && !loading) {
        const { data } = await supabase.from("users").select("role").eq("id", user.id).single()
        const role = data?.role || "user"
        const currentPath = window.location.pathname

        if ((role === "coach" || role === "admin") && (currentPath === "/dashboard" || currentPath === "/")) {
          router.replace("/coach/dashboard")
        }
      }
    }

    checkAndRedirect()
  }, [user, loading, router])

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src="/logo-mtr.svg" alt="MTR Logo" className="w-24 h-16 mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <HeaderContent />
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
