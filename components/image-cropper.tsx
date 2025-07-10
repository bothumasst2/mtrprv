"use client"

import React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"

interface ImageCropperProps {
  imageSrc: string
  onCropComplete: (croppedFile: File) => void
  onCancel: () => void
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [scale, setScale] = useState([1])
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    },
    [isDragging, dragStart],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const getCroppedImage = async (): Promise<File> => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) throw new Error("Canvas or image not found")

    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas context not found")

    const size = 300 // Output size
    canvas.width = size
    canvas.height = size

    // Calculate the crop area
    const cropSize = 200 // Crop area size
    const scaleValue = scale[0]

    // Draw the cropped and scaled image
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()

    const drawSize = cropSize * scaleValue
    const drawX = (size - drawSize) / 2 + position.x * 0.5
    const drawY = (size - drawSize) / 2 + position.y * 0.5

    ctx.drawImage(image, drawX, drawY, drawSize, drawSize)
    ctx.restore()

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "profile-photo.jpg", { type: "image/jpeg" })
            resolve(file)
          }
        },
        "image/jpeg",
        0.9,
      )
    })
  }

  const handleSave = async () => {
    try {
      const croppedFile = await getCroppedImage()
      onCropComplete(croppedFile)
    } catch (error) {
      console.error("Error cropping image:", error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-center">Adjust Your Photo</h3>

          {/* Crop Area */}
          <div className="relative mx-auto" style={{ width: 200, height: 200 }}>
            <div
              className="absolute inset-0 rounded-full border-2 border-orange-500 overflow-hidden cursor-move bg-gray-100"
              onMouseDown={handleMouseDown}
            >
              <img
                ref={imageRef}
                src={imageSrc || "/placeholder.svg"}
                alt="Crop preview"
                className="absolute"
                style={{
                  width: 200 * scale[0],
                  height: 200 * scale[0],
                  left: position.x,
                  top: position.y,
                  transform: "translate(-50%, -50%)",
                  marginLeft: "50%",
                  marginTop: "50%",
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* Scale Slider */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <Slider value={scale} onValueChange={setScale} min={0.5} max={3} step={0.1} className="w-full" />
          </div>

          {/* Hidden Canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1 bg-orange-500 hover:bg-orange-600">
              Save Photo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
