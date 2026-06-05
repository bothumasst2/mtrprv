"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function resetRanking(formData: FormData) {
  const userId = formData.get("user_id") as string

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return { error: "Server configuration error: Missing Supabase keys" }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from("ranking_reset")
      .upsert({ id: true, cutoff_at: now, reset_by: userId, reset_at: now })

    if (error) return { error: error.message }

    revalidatePath("/ranking")
    return { success: true, cutoff: now }
  } catch (err) {
    console.error("Error resetting ranking:", err)
    return { error: err instanceof Error ? err.message : "Failed to reset ranking" }
  }
}

export async function createAthlete(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const username = formData.get("username") as string
  const role = formData.get("role") as string
  const kelas = formData.get("kelas") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return { error: "Server configuration error: Missing Supabase keys" }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        role: role || "user",
      },
    })

    if (error) {
      console.error("Error creating user:", error)
      return { error: error.message }
    }

    if (!data.user) {
      return { error: "Failed to create user" }
    }

    // Insert into public.users — auth.users does NOT auto-sync
    const { error: insertError } = await supabase
      .from("users")
      .insert({
        id: data.user.id,
        email,
        username: username || email.split("@")[0],
        profile_photo: null,
        strava_link: null,
        kelas: kelas || "No-Race",
        role: role || "user",
      })

    if (insertError) {
      console.error("Error inserting user:", insertError)
      // Try to clean up auth user
      await supabase.auth.admin.deleteUser(data.user.id)
      return { error: `Failed to create user: ${insertError.message}` }
    }

    revalidatePath("/coach/athletes")

    return { success: true, user: data.user }
  } catch (err) {
    console.error("Unexpected error:", err)
    return { error: "An unexpected error occurred" }
  }
}

export async function deleteAthletes(athleteIds: string[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return { error: "Server configuration error: Missing Supabase keys" }
  }

  const ids = [...new Set(athleteIds)].filter(Boolean)

  if (ids.length === 0) {
    return { error: "No athletes selected" }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Step 1: Delete all dependent data rows
    const requiredCleanup = [
      supabase.from("training_log").delete().in("user_id", ids),
      supabase.from("training_assignments").delete().in("user_id", ids),
    ]

    const requiredResults = await Promise.all(requiredCleanup)
    const requiredError = requiredResults.find((r) => r.error)?.error
    if (requiredError) throw requiredError

    // Step 2: Delete from public.users
    const { error: userDeleteError } = await supabase
      .from("users")
      .delete()
      .in("id", ids)

    if (userDeleteError) {
      console.error("Users delete error:", userDeleteError)
    }

    // Step 3: Delete auth users
    const authResults = await Promise.all(
      ids.map((id) => supabase.auth.admin.deleteUser(id)),
    )

    const authErrors = authResults.filter((r) => r.error)
    if (authErrors.length > 0) {
      console.error("Auth delete errors:", authErrors.map((r) => r.error))
    }

    revalidatePath("/coach/athletes")
    revalidatePath("/coach/training-menu")
    revalidatePath("/coach/active-assignments")
    revalidatePath("/coach/dashboard")

    return { success: true, deleted: ids.length }
  } catch (err) {
    console.error("Error deleting athletes:", err)
    return { error: err instanceof Error ? err.message : "Failed to delete athletes" }
  }
}
