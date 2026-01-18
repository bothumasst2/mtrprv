"use client"

import { useState, useEffect, useRef } from "react"
import { Home, User, Activity, Trophy, LogOut, Calendar, Users, ChevronLeft, ChevronRight, Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/contexts/profile-context"
import { useUserRole } from "@/hooks/use-user-role"

export function AppSidebar() {
  const { role, loading } = useUserRole()

  if (loading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] p-4 md:hidden">
        <div className="flex items-center justify-center">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    )
  }

  // For coach/admin: show responsive sidebar (desktop left, mobile bottom)
  // For user: always show bottom navbar
  if (role === "coach" || role === "admin") {
    return <CoachResponsiveSidebar />
  }

  return <UserBottomNavbar />
}

interface AppSidebarWithVisibilityProps {
  visible?: boolean
}

export function AppSidebarWithVisibility({ visible = false }: AppSidebarWithVisibilityProps) {
  if (!visible) return null
  return <AppSidebar />
}

// ==================== USER BOTTOM NAVBAR ====================
function UserBottomNavbar() {
  const pathname = usePathname()
  const { role, loading } = useUserRole()
  const navRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  const menuItems = [
    { title: "Home", url: "/dashboard", icon: Home },
    { title: "Log", url: "/training-log", icon: Activity },
    { title: "Agenda", url: "/training-agenda", icon: Calendar },
    { title: "Ranking", url: "/ranking", icon: Trophy },
    { title: "Profile", url: "/profile", icon: User },
  ]

  useEffect(() => {
    const currentIndex = menuItems.findIndex(item => pathname === item.url || pathname.startsWith(item.url + '/'))
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex)
    }
  }, [pathname])

  useEffect(() => {
    if (navRef.current) {
      const navItems = navRef.current.querySelectorAll('.nav-item')
      const activeItem = navItems[activeIndex] as HTMLElement
      if (activeItem) {
        const navRect = navRef.current.getBoundingClientRect()
        const itemRect = activeItem.getBoundingClientRect()
        setIndicatorStyle({
          left: itemRect.left - navRect.left + (itemRect.width / 2) - 28,
          width: 56,
        })
      }
    }
  }, [activeIndex, loading])

  if (loading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] p-4">
        <div className="flex items-center justify-center">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="relative bg-[#242424]">
        <div
          className="absolute top-2 h-12 bg-[#3a3a3a] rounded-full transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        >
          <div className="absolute inset-0 bg-[#3a3a3a] rounded-full animate-pulse opacity-50" />
        </div>

        <div ref={navRef} className="relative flex items-center justify-around px-1 py-2">
          {menuItems.map((item, index) => {
            const isActive = activeIndex === index
            return (
              <Link
                key={item.title}
                href={item.url}
                className="nav-item relative flex flex-col items-center justify-center py-1 px-3 min-w-0 flex-1"
              >
                <div className={`relative p-2 rounded-full transition-all duration-300 ${isActive ? 'scale-110' : 'hover:scale-105'}`}>
                  <item.icon
                    className={`h-6 w-6 transition-colors duration-300 ${isActive ? 'text-strava' : 'text-gray-400 hover:text-gray-300'}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                <span className={`text-[10px] mt-0.5 transition-colors duration-300 ${isActive ? 'text-strava font-semibold' : 'text-gray-400'}`}>
                  {item.title}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ==================== COACH RESPONSIVE SIDEBAR ====================
function CoachResponsiveSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { signOut } = useAuth()
  const navRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  const menuItems = [
    { title: "Dashboard", url: "/coach/dashboard", icon: Home },
    { title: "Athletes", url: "/coach/athletes", icon: Users },
    { title: "Training Menu", url: "/coach/training-menu", icon: Calendar },
    { title: "Logs Menu", url: "/coach/active-assignments", icon: Activity },
    { title: "Ranking", url: "/ranking", icon: Trophy },
    { title: "Profile", url: "/profile", icon: User },
  ]

  useEffect(() => {
    const currentIndex = menuItems.findIndex(item => pathname === item.url || pathname.startsWith(item.url + '/'))
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex)
    }
  }, [pathname])

  // Update indicator for mobile bottom navbar
  useEffect(() => {
    if (navRef.current) {
      const navItems = navRef.current.querySelectorAll('.nav-item')
      const activeItem = navItems[activeIndex] as HTMLElement
      if (activeItem) {
        const navRect = navRef.current.getBoundingClientRect()
        const itemRect = activeItem.getBoundingClientRect()
        setIndicatorStyle({
          left: itemRect.left - navRect.left + (itemRect.width / 2) - 28,
          width: 56,
        })
      }
    }
  }, [activeIndex])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <>
      {/* Desktop Left Sidebar - Hidden on mobile */}
      <div
        className={`hidden md:flex fixed left-0 top-0 h-full bg-[#1a1a1a] z-50 flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        {/* Logo Area */}
        <div className={`p-4 border-b border-gray-800 ${isCollapsed ? 'px-4' : 'px-6'}`}>
          <div className={`text-strava font-bold ${isCollapsed ? 'text-center text-lg' : 'text-xl'}`}>
            {isCollapsed ? 'MTR' : 'MTR Coach'}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4">
          {menuItems.map((item, index) => {
            const isActive = activeIndex === index
            return (
              <Link
                key={item.title}
                href={item.url}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 ${isActive
                  ? 'bg-strava text-white'
                  : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                  } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 ${isCollapsed ? 'justify-center' : ''
              }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navbar - Hidden on desktop */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="relative bg-[#242424]">
          {/* Animated indicator */}
          <div
            className="absolute top-2 h-12 bg-[#3a3a3a] rounded-full transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
          >
            <div className="absolute inset-0 bg-[#3a3a3a] rounded-full animate-pulse opacity-50" />
          </div>

          <div ref={navRef} className="relative flex items-center justify-around px-1 py-2">
            {menuItems.map((item, index) => {
              const isActive = activeIndex === index
              // Shorter titles for mobile
              const mobileTitle = item.title === "Dashboard" ? "Home" :
                item.title === "Training Menu" ? "Menu" :
                  item.title === "Logs Menu" ? "Logs" :
                    item.title
              return (
                <Link
                  key={item.title}
                  href={item.url}
                  className="nav-item relative flex flex-col items-center justify-center py-1 px-3 min-w-0 flex-1"
                >
                  <div className={`relative p-2 rounded-full transition-all duration-300 ${isActive ? 'scale-110' : 'hover:scale-105'}`}>
                    <item.icon
                      className={`h-6 w-6 transition-colors duration-300 ${isActive ? 'text-strava' : 'text-gray-400 hover:text-gray-300'}`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span className={`text-[10px] mt-0.5 transition-colors duration-300 ${isActive ? 'text-strava font-semibold' : 'text-gray-400'}`}>
                    {mobileTitle}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}


