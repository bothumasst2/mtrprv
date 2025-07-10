"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { MTRLogo } from "@/components/mtr-logo"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/contexts/profile-context"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

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
  const pathname = usePathname()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [user, loading, router])

  // Fetch user role
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

    if (!loading && user) {
      fetchUserRole()
    }
  }, [user, loading])

  // Role-based redirect protection
  useEffect(() => {
    if (!loading && !roleLoading && user && userRole) {
      // If coach/admin is on user dashboard, redirect to coach dashboard
      if ((userRole === "coach" || userRole === "admin") && pathname === "/dashboard") {
        console.log("Redirecting coach/admin to coach dashboard")
        router.replace("/coach/dashboard")
      }
      // If user is on coach dashboard, redirect to user dashboard
      else if (userRole === "user" && pathname.startsWith("/coach")) {
        console.log("Redirecting user to user dashboard")
        router.replace("/dashboard")
      }
    }
  }, [user, userRole, loading, roleLoading, router, pathname])

  // Show loading while checking authentication
  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <MTRLogo className="w-24 h-16 mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect if no user
  if (!user) {
    return null
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
