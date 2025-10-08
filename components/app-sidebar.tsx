"use client"

import { Home, User, Activity, Trophy, LogOut, Calendar, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/contexts/profile-context"
import { useUserRole } from "@/hooks/use-user-role"
import { Button } from "@/components/ui/button"

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

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Don't render menu items until role is loaded
  if (loading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 p-4">
        <div className="flex items-center justify-center">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    )
  }

  // Different menu items based on role
  const getUserMenuItems = () => [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Training Log", url: "/training-log", icon: Activity },
    { title: "Training Agenda", url: "/training-agenda", icon: Calendar },
    { title: "Ranking", url: "/ranking", icon: Trophy },
  ]

  const getCoachMenuItems = () => [
    { title: "Dashboard", url: "/coach/dashboard", icon: Home },
    { title: "Athletes", url: "/coach/athletes", icon: Users },
    { title: "Training Menu", url: "/coach/training-menu", icon: Calendar },
    { title: "Ranking", url: "/ranking", icon: Trophy },
  ]

  const menuItems = role === "coach" || role === "admin" ? getCoachMenuItems() : getUserMenuItems()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Glossy bottom navbar */}
      <div className="relative bg-white/40 backdrop-blur-xl border-t border-gray-200/50 shadow-lg">
        {/* Glossy overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5"></div>
        
        {/* Navigation items */}
        <div className="relative flex items-center justify-around px-2 py-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.url
            return (
              <Link
                key={item.title}
                href={item.url}
                className="relative group flex flex-col items-center justify-center p-2 min-w-0 flex-1"
              >
                {/* Active indicator glow */}
                {isActive && (
                  <div className="absolute inset-0 bg-strava/10 rounded-lg blur-sm"></div>
                )}
                
                {/* Icon container with glossy effect */}
                <div className={`
                  relative p-3 rounded-lg transition-all duration-300 group-hover:scale-110
                  ${isActive
                    ? 'bg-strava shadow-lg'
                    : 'bg-gray-100/80 hover:bg-gray-100/80'
                  }
                `}>
                  {/* Inner gloss */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/30 to-white/60 rounded-lg"></div>
                  
                  {/* Icon */}
                  <item.icon className={`
                    relative h-6 w-6 transition-colors duration-300
                    ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-800'}
                  `} />
                </div>
                
                {/* Tooltip */}
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="bg-gray-900 text-white text-mobile-xs font-roboto-normal px-2 py-1 rounded-lg whitespace-nowrap">
                    {item.title}
                  </div>
                </div>
              </Link>
            )
          })}
          
          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className="relative group flex flex-col items-center justify-center p-2 min-w-0 flex-1"
          >
            {/* Icon container with glossy effect */}
            <div className="relative p-3 rounded-xl transition-all duration-300 group-hover:scale-110 bg-gray-100/80 hover:bg-red-100/80">
              {/* Inner gloss */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/30 to-white/60 rounded-xl"></div>
              
              {/* Icon */}
              <LogOut className="relative h-6 w-6 text-gray-600 group-hover:text-red-600 transition-colors duration-300" />
            </div>
            
            {/* Tooltip */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-gray-900 text-white text-mobile-xs font-roboto-normal px-2 py-1 rounded-lg whitespace-nowrap">
                Sign Out
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
