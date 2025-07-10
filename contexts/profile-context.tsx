"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

interface ProfileContextType {
  profilePhoto: string | null
  updateProfilePhoto: (photoUrl: string) => void
  refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const { user } = useAuth()

  const refreshProfile = async () => {
    if (!user) return

    const { data } = await supabase.from("users").select("profile_photo").eq("id", user.id).single()

    if (data) {
      setProfilePhoto(data.profile_photo)
    }
  }

  const updateProfilePhoto = (photoUrl: string) => {
    setProfilePhoto(photoUrl)
  }

  useEffect(() => {
    if (user) {
      refreshProfile()
    }
  }, [user])

  return (
    <ProfileContext.Provider value={{ profilePhoto, updateProfilePhoto, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider")
  }
  return context
}
