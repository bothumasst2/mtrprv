"use client"

import { Home, User, Activity, Trophy, LogOut, Calendar, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/contexts/profile-context"
import { useUserRole } from "@/hooks/use-user-role"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { MTRLogo } from "@/components/mtr-logo"

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined
}

export function AppSidebar() {
  const pathname = usePathname()
  const { signOut, user } = useAuth()
  const { profilePhoto } = useProfile()
  const { role, loading } = useUserRole()
  const { setOpenMobile } = useSidebar()

  const handleMenuClick = () => {
    setOpenMobile(false)
  }

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
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center justify-center">
            <MTRLogo className="h-10 w-14" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
        </SidebarContent>
      </Sidebar>
    )
  }

  // Different menu items based on role
  const getUserMenuItems = () => [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Profile", url: "/profile", icon: User },
    { title: "Training Log", url: "/training-log", icon: Activity },
    { title: "Training Agenda", url: "/training-agenda", icon: Calendar },
    { title: "Ranking", url: "/ranking", icon: Trophy },
  ]

  const getCoachMenuItems = () => [
    { title: "Dashboard", url: "/coach/dashboard", icon: Home },
    // Removed Profile for coaches
    { title: "Athletes", url: "/coach/athletes", icon: Users },
    { title: "Training Menu", url: "/coach/training-menu", icon: Calendar },
    { title: "Ranking", url: "/ranking", icon: Trophy },
  ]

  const menuItems = role === "coach" || role === "admin" ? getCoachMenuItems() : getUserMenuItems()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-center">
          <MTRLogo className="h-10 w-14" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url} onClick={handleMenuClick}>
                      <item.icon className="h-4 w-4 text-orange-500" />
                      <span className="text-black">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={getSafeSrc(profilePhoto) || "/placeholder.svg"} />
          <AvatarFallback className="bg-orange-500 text-white text-sm">
            {(user?.email?.[0] || "U").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Button variant="outline" onClick={handleSignOut} className="flex-1 justify-start bg-transparent">
          <LogOut className="h-4 w-4 mr-2 text-orange-500" />
          <span className="text-black">Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
