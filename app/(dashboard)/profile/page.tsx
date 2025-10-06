"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, XCircle, Edit, Camera } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/contexts/profile-context"
import { ImageCropper } from "@/components/image-cropper"

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined
}

interface UserProfile {
  username: string
  profile_photo: string | null
  strava_link: string | null
}

interface TrainingHistory {
  id: string
  training_type: string
  distance: number
  date: string
  status: "completed" | "pending" | "missed"
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({
    username: "",
    profile_photo: null,
    strava_link: null,
  })
  const [trainingHistory, setTrainingHistory] = useState<TrainingHistory[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { profilePhoto, updateProfilePhoto } = useProfile()

  useEffect(() => {
    if (user) {
      fetchProfile()
      fetchTrainingHistory()
    }
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    const { data } = await supabase
      .from("users")
      .select("username, profile_photo, strava_link")
      .eq("id", user.id)
      .single()

    if (data) {
      setProfile(data)
    } else {
      const { error } = await supabase.from("users").insert({
        id: user.id,
        email: user.email || "",
        username: user.email?.split("@")[0] || "User",
        profile_photo: null,
        strava_link: null,
      })

      if (!error) {
        setProfile({
          username: user.email?.split("@")[0] || "User",
          profile_photo: null,
          strava_link: null,
        })
      }
    }
  }

  const fetchTrainingHistory = async () => {
    if (!user) return

    const { data } = await supabase
      .from("training_log")
      .select("id, training_type, distance, date, status")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })

    setTrainingHistory(data || [])
  }

  const updateProfile = async () => {
    if (!user) return

    setLoading(true)
    const { error } = await supabase
      .from("users")
      .update({
        username: profile.username,
        strava_link: profile.strava_link,
      })
      .eq("id", user.id)

    if (!error) {
      setIsEditing(false)
    }
    setLoading(false)
  }

  const handlePhotoClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        setSelectedImageSrc(e.target.result as string)
        setShowCropper(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedFile: File) => {
    if (!user) return

    setUploadingPhoto(true)
    setShowCropper(false)

    try {
      const fileExt = croppedFile.name.split(".").pop() || "jpg"
      const fileName = `profile-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}` // Organize by userId

      // Upload to user-specific folder
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, croppedFile, { upsert: true })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        return
      }

      // Get public URL
      const { data } = supabase.storage.from("profile-photos").getPublicUrl(filePath)

      // Update profile photo in database
      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_photo: data.publicUrl })
        .eq("id", user.id)

      if (!updateError) {
        setProfile((prev) => ({ ...prev, profile_photo: data.publicUrl }))
        updateProfilePhoto(data.publicUrl) // Update global profile photo
      }
    } catch (error) {
      console.error("Error uploading photo:", error)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setSelectedImageSrc("")
  }

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  return (
    <div className="min-h-screen bg-strava-dark">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-strava">Profile</h1>

        <Card className="bg-strava-darkgrey rounded-lg shadow-sm border border-none relative">
          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsEditing(!isEditing)}
            className="absolute top-5 right-4 p-2 hover:bg-white"
          >
            <Edit className="h-4 w-4 text-strava" />
          </Button>

          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">My Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={getSafeSrc(profilePhoto || profile.profile_photo) || "/placeholder.svg"} />
                  <AvatarFallback className="bg-orange-500 text-white text-xl">
                    {profile.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <button
                    onClick={handlePhotoClick}
                    disabled={uploadingPhoto}
                    className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all"
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {isEditing ? "Click photo to upload new image" : ""}
                {uploadingPhoto && <p className="text-orange-500">Uploading...</p>}
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-strava space-y-2">
                <Label htmlFor="username">Name : </Label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile((prev) => ({ ...prev, username: e.target.value }))}
                  disabled={!isEditing}
                  className="text-black font-bold focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div className="text-strava space-y-2">
                <Label htmlFor="strava">Strava Link</Label>
                {!isEditing && profile.strava_link && isValidUrl(profile.strava_link) ? (
                  <a
                    href={profile.strava_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 border rounded-md text-blue-600 hover:text-blue-800 hover:underline bg-gray-50"
                  >
                    {profile.strava_link}
                  </a>
                ) : (
                  <Input
                    id="strava"
                    value={profile.strava_link || ""}
                    onChange={(e) => setProfile((prev) => ({ ...prev, strava_link: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="https://strava.com/athletes/..."
                    className="text-black font-bold focus:border-orange-500 focus:ring-orange-500"
                  />
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <Button onClick={updateProfile} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-strava-darkgrey rounded-lg shadow-sm border border-none">
          <CardHeader>
            <CardTitle className="text-md font-normal text-white">Training History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trainingHistory.map((training) => (
                <div
                  key={training.id}
                  className="flex items-center justify-between p-4 bg-strava rounded-lg text-white"
                >
                  <div className="flex items-center gap-4">
                    {training.status === "completed" ? (
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-400" />
                    )}
                    <div>
                      <p className="font-bold">{training.training_type}</p>
                      <p className="text-sm text-white">
                        {training.distance} km - {new Date(training.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {showCropper && (
        <ImageCropper imageSrc={selectedImageSrc} onCropComplete={handleCropComplete} onCancel={handleCropCancel} />
      )}
    </div>
  )
}
