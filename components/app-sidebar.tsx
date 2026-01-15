"use client"

import { useState, useEffect, useRef } from "react"
import { Home, User, Activity, Trophy, LogOut, Calendar, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/contexts/profile-context"
import { useUserRole } from "@/hooks/use-user-role"

export function AppSidebar() {
  return <AppBottomNavbar />
}

interface AppSidebarWithVisibilityProps {
  visible?: boolean
}

export function AppSidebarWithVisibility({ visible = false }: AppSidebarWithVisibilityProps) {
  if (!visible) return null
  return <AppBottomNavbar />
}

function AppBottomNavbar() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const { role, loading } = useUserRole()
  const navRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Different menu items based on role
  const getUserMenuItems = () => [
    { title: "Home", url: "/dashboard", icon: Home },
    { title: "Log", url: "/training-log", icon: Activity },
    { title: "Agenda", url: "/training-agenda", icon: Calendar },
    { title: "Ranking", url: "/ranking", icon: Trophy },
    { title: "Profile", url: "/profile", icon: User },
  ]

  const getCoachMenuItems = () => [
    { title: "Home", url: "/coach/dashboard", icon: Home },
    { title: "Athletes", url: "/coach/athletes", icon: Users },
    { title: "Menu", url: "/coach/training-menu", icon: Calendar },
    { title: "Ranking", url: "/ranking", icon: Trophy },
    { title: "Profile", url: "/profile", icon: User },
  ]

  const menuItems = role === "coach" || role === "admin" ? getCoachMenuItems() : getUserMenuItems()

  // Find current active index based on pathname
  useEffect(() => {
    const currentIndex = menuItems.findIndex(item => pathname === item.url || pathname.startsWith(item.url + '/'))
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex)
    }
  }, [pathname, menuItems])

  // Update indicator position with smooth animation
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

  // Don't render menu items until role is loaded
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
      {/* Bottom navbar */}
      <div className="relative bg-[#242424]">
        {/* Animated liquid blob indicator */}
        <div
          className="absolute top-2 h-12 bg-[#3a3a3a] rounded-full transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        >
          {/* Liquid blob effect layers */}
          <div className="absolute inset-0 bg-[#3a3a3a] rounded-full animate-pulse opacity-50" />
        </div>

        {/* Navigation items */}
        <div ref={navRef} className="relative flex items-center justify-around px-1 py-2">
          {menuItems.map((item, index) => {
            const isActive = activeIndex === index
            return (
              <Link
                key={item.title}
                href={item.url}
                className="nav-item relative flex flex-col items-center justify-center py-1 px-3 min-w-0 flex-1"
              >
                {/* Icon */}
                <div className={`
                  relative p-2 rounded-full transition-all duration-300
                  ${isActive ? 'scale-110' : 'hover:scale-105'}
                `}>
                  <item.icon
                    className={`
                      h-6 w-6 transition-colors duration-300
                      ${isActive ? 'text-strava' : 'text-gray-400 hover:text-gray-300'}
                    `}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>

                {/* Label */}
                <span className={`
                  text-[10px] mt-0.5 transition-colors duration-300
                  ${isActive ? 'text-strava font-semibold' : 'text-gray-400'}
                `}>
                  {item.title}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* CSS for liquid animation */}
      <style jsx>{`
        @keyframes liquid {
          0%, 100% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          }
          50% {
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
          }
        }
      `}</style>
    </div>
  )
}

