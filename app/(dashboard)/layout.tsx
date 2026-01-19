"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { MTRLogo } from "@/components/mtr-logo"
import InstallPrompt from "@/components/InstallPrompt"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/contexts/profile-context"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined
}

function HeaderContent() {
  const { user, signOut } = useAuth()
  const { profilePhoto } = useProfile()
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.replace("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-strava-darkgrey backdrop-blur border-b border-none px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MTRLogo className="fill-white h-16 w-28" />
        </div>

        {/* Avatar with popup menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="focus:outline-none"
          >
            <Avatar className="h-12 w-12 border-2 border-orange-500 cursor-pointer hover:border-orange-600 transition-colors">
              <AvatarImage src={getSafeSrc(profilePhoto) || "/placeholder.svg"} />
              <AvatarFallback className="bg-orange-500 text-white">
                {(user?.email?.[0] || "U").toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          {/* Popup Menu */}
          {showMenu && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />

              {/* Menu dropdown */}
              <div className="absolute right-0 top-14 z-50 w-48 bg-[#2a2a2a] rounded-lg shadow-xl border border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <Link
                  href="/profile"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-white hover:bg-[#3a3a3a] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="text-sm">Profile</span>
                </Link>

                <div className="border-t border-gray-700" />

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-3 text-strava hover:bg-[#3a3a3a] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default function DashboardLayout({
  children,
  hideSidebar = false,
}: {
  children: React.ReactNode
  hideSidebar?: boolean
}) {
  const { user, loading } = useAuth()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const pathsWithoutSidebar: string[] = []
  const shouldHideSidebar = pathsWithoutSidebar.some((path) => pathname.startsWith(path))

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

  // Check if current user is coach/admin for desktop sidebar margin
  const isCoachOrAdmin = userRole === "coach" || userRole === "admin"

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Add margin on desktop for coach sidebar */}
      <div className={isCoachOrAdmin ? "md:ml-64" : ""}>
        <HeaderContent />
        <main className={shouldHideSidebar ? "" : "pb-20"}>{children}</main>
      </div>
      {!shouldHideSidebar && <AppSidebar />}
      <InstallPrompt />
    </div>
  )
}
