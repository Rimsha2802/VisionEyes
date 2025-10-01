export interface SpeechSettings {
  rate: number
  pitch: number
  volume: number
  voice: string | null
}

export class EnhancedSpeechSynthesis {
  private synth: SpeechSynthesis
  private settings: SpeechSettings
  private lastMessage = ""
  private isSpeaking = false

  constructor() {
    this.synth = window.speechSynthesis
    this.settings = {
      rate: 0.9,
      pitch: 1.0,
      volume: 1.0,
      voice: null,
    }
  }

  speak(text: string, priority: "high" | "normal" = "normal"): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop current speech if high priority
      if (priority === "high" && this.isSpeaking) {
        this.synth.cancel()
      }

      this.lastMessage = text
      this.isSpeaking = true

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = this.settings.rate
      utterance.pitch = this.settings.pitch
      utterance.volume = this.settings.volume

      // Set voice if available
      if (this.settings.voice) {
        const voices = this.synth.getVoices()
        const selectedVoice = voices.find((voice) => voice.name === this.settings.voice)
        if (selectedVoice) {
          utterance.voice = selectedVoice
        }
      }

      utterance.onend = () => {
        this.isSpeaking = false
        resolve()
      }

      utterance.onerror = (event) => {
        this.isSpeaking = false
        console.error("Speech synthesis error:", event)
        reject(event)
      }

      this.synth.speak(utterance)
    })
  }

  repeatLastMessage(): Promise<void> {
    if (this.lastMessage) {
      return this.speak(this.lastMessage)
    }
    return this.speak("I don't have a previous message to repeat.")
  }

  stop(): void {
    this.synth.cancel()
    this.isSpeaking = false
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking
  }

  getLastMessage(): string {
    return this.lastMessage
  }

  updateSettings(newSettings: Partial<SpeechSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices()
  }
}
