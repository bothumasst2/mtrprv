"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log("Getting initial session...")
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Session error:", error)
        } else {
          console.log("Session found:", !!session)
        }

        setUser(session?.user ?? null)
      } catch (error) {
        console.error("Failed to get initial session:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, !!session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Only redirect on sign out, not sign in (handled in signIn function)
      if (event === "SIGNED_OUT") {
        console.log("User signed out, redirecting to login")
        router.push("/login")
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting sign in for:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Sign in error:", error)
        throw new Error(error.message)
      }

      console.log("Sign in successful:", !!data.user)

      // Get user role and redirect accordingly
      if (data.user) {
        const { data: userData } = await supabase.from("users").select("role").eq("id", data.user.id).single()

        const userRole = userData?.role || "user"

        if (userRole === "coach" || userRole === "admin") {
          router.push("/coach/dashboard")
        } else {
          router.push("/dashboard")
        }
      }
    } catch (error) {
      console.error("Sign in failed:", error)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
