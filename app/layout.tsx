import type React from "react"
import { AuthProvider } from "@/contexts/auth-context"
import { ProfileProvider } from "@/contexts/profile-context"
import { Toaster } from "@/components/ui/toaster"
import { PostHogProvider } from "./providers"
import { PwaProvider } from "@/contexts/pwa-context"
import "./globals.css"

export const metadata = {
  title: "MTR Training",
  description: "Mommy Tonasa Runners – Training Tracker",
  generator: 'v0.dev',
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MTR Training",
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <PostHogProvider>
          <PwaProvider>
            <AuthProvider>
              <ProfileProvider>{children}</ProfileProvider>
            </AuthProvider>
          </PwaProvider>
        </PostHogProvider>
        <Toaster />
      </body>
    </html>
  )
}
