"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { ensureIuranRecord, shouldBlockForIuran } from "@/lib/iuran"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), milliseconds)),
  ])
}

async function checkBlockReasons(userId: string): Promise<"blocked" | "iuran_blocked" | null> {
  const blockCheck = withTimeout(
    Promise.resolve(supabase.from("user_blocks").select("user_id").eq("user_id", userId).maybeSingle()),
    5000,
  )
  const iuranCheck = (async () => {
    await ensureIuranRecord(userId)
    return shouldBlockForIuran(userId)
  })()
  const [blockResult, iuranResult] = await Promise.allSettled([blockCheck, iuranCheck])

  if (blockResult.status === "fulfilled" && blockResult.value.data) return "blocked"
  if (iuranResult.status === "fulfilled" && iuranResult.value) return "iuran_blocked"
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const checkedUsersRef = useRef(new Set<string>())
  const inflightChecksRef = useRef(new Map<string, Promise<boolean>>())

  const handleBlockRedirect = useCallback(async (userId: string) => {
    if (checkedUsersRef.current.has(userId)) return false
    const existing = inflightChecksRef.current.get(userId)
    if (existing) return existing

    const check = (async () => {
      try {
        const reason = await checkBlockReasons(userId)
        if (!reason) {
          checkedUsersRef.current.add(userId)
          return false
        }
        await supabase.auth.signOut()
        setUser(null)
        window.location.href = `/login?${reason}=true`
        checkedUsersRef.current.add(userId)
        return true
      } catch (error) {
        console.warn("Block check failed; retrying on next auth event:", error)
        return false
      } finally {
        inflightChecksRef.current.delete(userId)
      }
    })()

    inflightChecksRef.current.set(userId, check)
    return check
  }, [])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      let initialUserId: string | null = null
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
        initialUserId = session?.user?.id ?? null
      } catch (error) {
        console.error("Failed to get initial session:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
      if (initialUserId) await handleBlockRedirect(initialUserId)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, !!session)
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        await handleBlockRedirect(session.user.id)
      }

      // Only redirect on sign out, not sign in (handled in signIn function)
      if (event === "SIGNED_OUT") {
        console.log("User signed out, redirecting to login")
        router.push("/login")
      }
    })

    return () => subscription.unsubscribe()
  }, [router, handleBlockRedirect])

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
        if (await handleBlockRedirect(data.user.id)) return
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
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } finally {
      // Force a full page reload and redirect to login
      // This is more robust for PWA standalone mode
      window.location.href = "/login"
    }
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
