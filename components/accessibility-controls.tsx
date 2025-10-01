"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, Mic, MicOff } from "lucide-react"

interface AccessibilityControlsProps {
  onVoiceToggle: (enabled: boolean) => void
  onSpeechToggle: (enabled: boolean) => void
  voiceEnabled: boolean
  speechEnabled: boolean
}

export function AccessibilityControls({
  onVoiceToggle,
  onSpeechToggle,
  voiceEnabled,
  speechEnabled,
}: AccessibilityControlsProps) {
  const [speechRate, setSpeechRate] = useState(1)
  const [speechVolume, setSpeechVolume] = useState(1)

  useEffect(() => {
    // Apply speech settings globally
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        // Store settings in localStorage for persistence
        localStorage.setItem("speechRate", speechRate.toString())
        localStorage.setItem("speechVolume", speechVolume.toString())
      }
    }
  }, [speechRate, speechVolume])

  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-white font-semibold text-sm">Accessibility Controls</h3>

      <div className="flex gap-2">
        <Button
          variant={voiceEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => onVoiceToggle(!voiceEnabled)}
          className="flex items-center gap-2"
        >
          {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          Voice
        </Button>

        <Button
          variant={speechEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => onSpeechToggle(!speechEnabled)}
          className="flex items-center gap-2"
        >
          {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          Audio
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-white text-xs block">Speech Speed: {speechRate.toFixed(1)}x</label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={speechRate}
          onChange={(e) => setSpeechRate(Number.parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="space-y-2">
        <label className="text-white text-xs block">Volume: {Math.round(speechVolume * 100)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={speechVolume}
          onChange={(e) => setSpeechVolume(Number.parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  )
}
