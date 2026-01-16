import type React from "react"
import { AuthProvider } from "@/contexts/auth-context"
import { ProfileProvider } from "@/contexts/profile-context"
import { Toaster } from "@/components/ui/toaster"
import { PostHogProvider } from "./providers"
import "./globals.css"

export const metadata = {
  title: "MTR Private Training",
  description: "Mommy Tonasa Runners – Training Tracker",
  generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <PostHogProvider>
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        </PostHogProvider>
        <Toaster />
      </body>
    </html>
  )
}
