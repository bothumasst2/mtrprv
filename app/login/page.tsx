"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Eye, EyeOff } from "lucide-react"
import { MTRLogo } from "@/components/mtr-logo"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn, user } = useAuth()
  const router = useRouter()

  // Redirect if already logged in - handled by root page or auth context
  useEffect(() => {
    if (user && !loading) {
      // The redirection will be handled by either:
      // 1. The signIn function in auth-context (if just logged in)
      // 2. The layout's role-based redirect if they manually navigate here
      // 3. The root page if they land there
    }
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await signIn(email, password)

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true")
        localStorage.setItem("email", email)
      }

      // Redirect will be handled by auth context
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Login failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  // Load remembered email on component mount
  useEffect(() => {
    const remembered = localStorage.getItem("rememberMe")
    const savedEmail = localStorage.getItem("email")
    if (remembered === "true" && savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-strava-darkgrey px-4">
      <Card className="w-full bg-strava-dark max-w-md border-none rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-0">
            <MTRLogo className="w-40 h-32 fill-white mx-auto" />
          </div>
          <CardTitle className="text-2xl text-strava font-bold">MTR Private Training</CardTitle>
          <CardDescription>Sign in to your training account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-white">
              <Label htmlFor="email">Email :</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="text-black focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div className="text-white space-y-2">
              <Label htmlFor="password">Password :</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="text-black focus:border-orange-500 focus:ring-orange-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-strava">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                className="border-strava text-strava data-[state=checked]:bg-strava data-[state=checked]:border-strava" />
              <Label htmlFor="remember" className="text-sm">
                Remember me
              </Label>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-strava text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <Button type="submit" className="w-full bg-[#bfbdbd] hover:bg-strava text-grey" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <div className="flex text-[9px] items-center space-x-2 text-strava-light justify-center pt-4 py-6">
          © 2025 - App development by elbruz
        </div>
      </Card>
    </div>
  )
}
