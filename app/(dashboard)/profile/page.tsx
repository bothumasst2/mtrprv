"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CheckCircle, XCircle, Edit, Camera, Plus, Trash2, Check, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/contexts/profile-context"
import { useUserRole } from "@/hooks/use-user-role"
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

interface KelasItem {
  id: string
  name: string
  sort_order: number
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
  const { role } = useUserRole()
  const isCoachOrAdmin = role === "coach" || role === "admin"

  // Kelas management state
  const [kelasList, setKelasList] = useState<KelasItem[]>([])
  const [isAddKelasOpen, setIsAddKelasOpen] = useState(false)
  const [newKelasName, setNewKelasName] = useState("")
  const [addingKelas, setAddingKelas] = useState(false)

  // Edit kelas state
  const [editingKelasId, setEditingKelasId] = useState<string | null>(null)
  const [editingKelasName, setEditingKelasName] = useState("")
  const [savingKelasId, setSavingKelasId] = useState<string | null>(null)

  // Delete kelas state
  const [showDeleteKelasConfirm, setShowDeleteKelasConfirm] = useState<string | null>(null)
  const [deletingKelasId, setDeletingKelasId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchProfile()
      fetchTrainingHistory()
      if (isCoachOrAdmin) {
        fetchKelas()
      }
    }
  }, [user, isCoachOrAdmin])

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
        kelas_id: null,
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

  const fetchKelas = async () => {
    const { data } = await supabase
      .from("kelas")
      .select("*")
      .order("sort_order", { ascending: true })
    setKelasList(data || [])
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
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, croppedFile, { upsert: true })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        return
      }

      const { data } = supabase.storage.from("profile-photos").getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_photo: data.publicUrl })
        .eq("id", user.id)

      if (!updateError) {
        setProfile((prev) => ({ ...prev, profile_photo: data.publicUrl }))
        updateProfilePhoto(data.publicUrl)
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

  // Kelas CRUD handlers
  const handleAddKelas = async () => {
    if (!newKelasName.trim()) return
    setAddingKelas(true)
    const maxOrder = kelasList.reduce((max, k) => Math.max(max, k.sort_order), 0)
    const { error } = await supabase.from("kelas").insert({
      name: newKelasName.trim(),
      sort_order: maxOrder + 1,
    })
    if (!error) {
      setNewKelasName("")
      setIsAddKelasOpen(false)
      fetchKelas()
    }
    setAddingKelas(false)
  }

  const handleEditKelas = async (kelasId: string) => {
    if (!editingKelasName.trim()) {
      setEditingKelasId(null)
      return
    }
    setSavingKelasId(kelasId)
    const { error } = await supabase
      .from("kelas")
      .update({ name: editingKelasName.trim() })
      .eq("id", kelasId)
    if (!error) {
      setEditingKelasId(null)
      setEditingKelasName("")
      fetchKelas()
    }
    setSavingKelasId(null)
  }

  const handleDeleteKelas = async (kelasId: string) => {
    setDeletingKelasId(kelasId)
    const { error } = await supabase.from("kelas").delete().eq("id", kelasId)
    if (!error) {
      setShowDeleteKelasConfirm(null)
      fetchKelas()
    }
    setDeletingKelasId(null)
  }

  return (
    <div className="min-h-screen bg-strava-dark">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-strava">Profile</h1>

        <Card className="bg-[#1f1f1f] rounded-lg shadow-sm border border-none relative">
          <Button
            variant="ghost"
            size="sm"
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
                    className="text-sm font-md focus:border-orange-500 focus:ring-orange-500"
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

        {/* Kelas Management - Coach/Admin only */}
        {isCoachOrAdmin && (
          <Card className="bg-[#1f1f1f] rounded-lg shadow-sm border border-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Kelas Management</CardTitle>
              <Button
                size="sm"
                onClick={() => setIsAddKelasOpen(true)}
                className="bg-strava hover:bg-strava-light text-white rounded-lg h-8 px-3 text-xs font-bold"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Kelas
              </Button>
            </CardHeader>
            <CardContent>
              {kelasList.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No classes defined yet. Add your first class.
                </p>
              ) : (
                <div className="space-y-2">
                  {kelasList.map((kelas) => (
                    <div
                      key={kelas.id}
                      className="flex items-center justify-between bg-[#2a2a2a] rounded-lg px-4 py-3"
                    >
                      {editingKelasId === kelas.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingKelasName}
                            onChange={(e) => setEditingKelasName(e.target.value)}
                            className="h-8 text-sm bg-[#1f1f1f] border-gray-600 text-white"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditKelas(kelas.id)}
                            disabled={savingKelasId === kelas.id}
                            className="text-green-400 hover:text-green-300 h-8 px-2"
                          >
                            {savingKelasId === kelas.id ? (
                              <span className="text-xs">...</span>
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingKelasId(null)}
                            className="text-gray-400 hover:text-gray-300 h-8 px-2"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="text-white font-bold text-sm">
                              {kelas.name}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              Urutan: {kelas.sort_order}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingKelasId(kelas.id)
                                setEditingKelasName(kelas.name)
                              }}
                              className="text-gray-400 hover:text-strava h-8 px-2"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowDeleteKelasConfirm(kelas.id)}
                              className="text-gray-400 hover:text-red-400 h-8 px-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Add Kelas Dialog */}
            <AlertDialog open={isAddKelasOpen} onOpenChange={setIsAddKelasOpen}>
              <AlertDialogContent className="max-w-[85vw] rounded-2xl border border-slate-200 bg-[#1f1f1f] md:max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg font-bold text-white">
                    Tambah Kelas Baru
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs leading-relaxed text-gray-400">
                    Masukkan nama kelas baru (contoh: 42, 21, 10, No-Race).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={newKelasName}
                  onChange={(e) => setNewKelasName(e.target.value)}
                  placeholder="Nama kelas"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                  autoFocus
                />
                <AlertDialogFooter className="gap-2 mt-4">
                  <AlertDialogCancel className="rounded-xl font-bold text-xs">
                    Batal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleAddKelas}
                    disabled={addingKelas || !newKelasName.trim()}
                    className="bg-strava hover:bg-strava-light text-white rounded-xl font-bold px-4 h-9 text-xs"
                  >
                    {addingKelas ? "Menambahkan..." : "Tambah"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete Kelas Confirmation */}
            <AlertDialog
              open={!!showDeleteKelasConfirm}
              onOpenChange={(open) => !open && setShowDeleteKelasConfirm(null)}
            >
              <AlertDialogContent className="max-w-[85vw] rounded-2xl border border-slate-200 bg-[#1f1f1f] md:max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg font-bold text-red-400">
                    Hapus Kelas?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs leading-relaxed text-gray-400">
                    Kelas akan dihapus permanen. Athlete yang menggunakan kelas ini
                    akan tetap ada, tapi kelasnya akan dihapus.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 mt-4">
                  <AlertDialogCancel className="rounded-xl font-bold text-xs">
                    Batal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      showDeleteKelasConfirm && handleDeleteKelas(showDeleteKelasConfirm)
                    }
                    disabled={deletingKelasId === showDeleteKelasConfirm}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold px-4 h-9 text-xs"
                  >
                    {deletingKelasId === showDeleteKelasConfirm ? "Menghapus..." : "Hapus"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        )}

        <Card className="bg-strava-darkgrey rounded-lg shadow-sm border border-none">
          <CardHeader>
            <CardTitle className="text-sm font-normal text-white">Training History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {trainingHistory.map((training) => (
                <div
                  key={training.id}
                  className="flex items-center justify-between p-4 bg-[#1f1f1f] rounded-lg text-white"
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
