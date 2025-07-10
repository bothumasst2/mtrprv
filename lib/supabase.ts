import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          profile_photo: string | null
          strava_link: string | null
          role: "user" | "coach" | "admin"
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          profile_photo?: string | null
          strava_link?: string | null
          role?: "user" | "coach" | "admin"
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          profile_photo?: string | null
          strava_link?: string | null
          role?: "user" | "coach" | "admin"
          created_at?: string
        }
      }
      training_log: {
        Row: {
          id: string
          user_id: string
          date: string
          training_type: string
          distance: number
          strava_link: string | null
          status: "completed" | "pending" | "missed"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          training_type: string
          distance: number
          strava_link?: string | null
          status?: "completed" | "pending" | "missed"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          training_type?: string
          distance?: number
          strava_link?: string | null
          status?: "completed" | "pending" | "missed"
          created_at?: string
        }
      }
      training_agenda: {
        Row: {
          id: string
          user_id: string
          date: string
          training_type: string
          target_distance: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          training_type: string
          target_distance: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          training_type?: string
          target_distance?: number
          created_at?: string
        }
      }
      training_assignments: {
        Row: {
          id: string
          coach_id: string
          user_id: string
          training_type: string
          training_details: string | null
          assigned_date: string
          target_date: string
          status: "pending" | "completed"
          created_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          user_id: string
          training_type: string
          training_details?: string | null
          assigned_date: string
          target_date: string
          status?: "pending" | "completed"
          created_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          user_id?: string
          training_type?: string
          training_details?: string | null
          assigned_date?: string
          target_date?: string
          status?: "pending" | "completed"
          created_at?: string
        }
      }
    }
  }
}
