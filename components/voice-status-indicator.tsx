"use client"

import { Mic, MicOff, Volume2, Camera, ShoppingCart } from "lucide-react"

interface VoiceStatusIndicatorProps {
  isListening: boolean
  isSpeaking: boolean
  cameraActive: boolean
  cartItemCount: number
  lastCommand?: string
}

export function VoiceStatusIndicator({
  isListening,
  isSpeaking,
  cameraActive,
  cartItemCount,
  lastCommand,
}: VoiceStatusIndicatorProps) {
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          {/* Voice Status */}
          <div className="flex items-center gap-2">
            {isListening ? (
              <Mic className="w-5 h-5 text-green-400 animate-pulse" />
            ) : (
              <MicOff className="w-5 h-5 text-gray-500" />
            )}
            <span className="text-white text-sm">{isListening ? "Listening..." : "Voice Ready"}</span>
          </div>

          {/* Speech Status */}
          <div className="flex items-center gap-2">
            <Volume2 className={`w-5 h-5 ${isSpeaking ? "text-blue-400 animate-pulse" : "text-gray-500"}`} />
            <span className="text-white text-sm">{isSpeaking ? "Speaking..." : "Audio Ready"}</span>
          </div>

          {/* Camera Status */}
          <div className="flex items-center gap-2">
            <Camera className={`w-5 h-5 ${cameraActive ? "text-green-400" : "text-gray-500"}`} />
            <span className="text-white text-sm">{cameraActive ? "Camera Active" : "Camera Off"}</span>
          </div>

          {/* Cart Status */}
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-yellow-400" />
            <span className="text-white text-sm">Cart: {cartItemCount} items</span>
          </div>
        </div>
      </div>

      {lastCommand && <div className="text-gray-300 text-sm">Last command: "{lastCommand}"</div>}

      <div className="mt-3 text-gray-400 text-xs">
        Say: "What is this?" • "What's the price?" • "Add to cart" • "Show cart" • "Checkout"
      </div>
    </div>
  )
}
