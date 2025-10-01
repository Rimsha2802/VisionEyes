export interface VoiceCommand {
  patterns: string[]
  action: string
  description: string
  examples: string[]
}

export const VOICE_COMMANDS: VoiceCommand[] = [
  {
    patterns: [
      "what is this",
      "identify this",
      "what am i looking at",
      "tell me what this is",
      "identify object",
      "what do you see",
      "scan this",
      "analyze this",
    ],
    action: "identify",
    description: "Identify the object in front of the camera",
    examples: ["What is this?", "Tell me what this is", "Identify this object"],
  },
  {
    patterns: [
      "what's the price",
      "how much does this cost",
      "price check",
      "what does this cost",
      "how much is this",
      "price of this",
      "cost of this",
      "how expensive is this",
    ],
    action: "price",
    description: "Get the price of the last identified item",
    examples: ["What's the price?", "How much does this cost?", "Price check"],
  },
  {
    patterns: [
      "add to cart",
      "add this to cart",
      "put in cart",
      "add item",
      "add this item",
      "buy this",
      "purchase this",
      "i want this",
      "add to basket",
    ],
    action: "add",
    description: "Add the current item to your shopping cart",
    examples: ["Add to cart", "Add this item", "I want this"],
  },
  {
    patterns: [
      "remove from cart",
      "remove this from cart",
      "take out of cart",
      "remove item",
      "delete from cart",
      "don't want this",
      "remove this item",
      "take this out",
    ],
    action: "remove",
    description: "Remove the current item from your cart",
    examples: ["Remove from cart", "Remove this item", "Don't want this"],
  },
  {
    patterns: [
      "show cart",
      "what's in my cart",
      "cart contents",
      "review cart",
      "check cart",
      "my cart",
      "shopping cart",
      "what did i buy",
      "cart summary",
    ],
    action: "cart",
    description: "Review your shopping cart contents and total",
    examples: ["Show cart", "What's in my cart?", "Cart summary"],
  },
  {
    patterns: [
      "checkout",
      "proceed to checkout",
      "pay now",
      "complete purchase",
      "finish shopping",
      "buy now",
      "complete order",
      "finalize purchase",
      "go to checkout",
      "start checkout",
    ],
    action: "checkout",
    description: "Proceed to checkout and complete your purchase",
    examples: ["Checkout", "Proceed to checkout", "Complete purchase"],
  },
  {
    patterns: [
      "help",
      "what can you do",
      "commands",
      "voice commands",
      "how to use",
      "instructions",
      "what can i say",
      "available commands",
    ],
    action: "help",
    description: "Get help and list available voice commands",
    examples: ["Help", "What can you do?", "Available commands"],
  },
  {
    patterns: ["repeat", "say that again", "repeat that", "what did you say", "i didn't hear", "pardon", "excuse me"],
    action: "repeat",
    description: "Repeat the last message",
    examples: ["Repeat", "Say that again", "What did you say?"],
  },
  {
    patterns: ["stop", "cancel", "never mind", "quit", "exit", "stop listening", "pause"],
    action: "stop",
    description: "Stop the current action or cancel listening",
    examples: ["Stop", "Cancel", "Never mind"],
  },
  {
    patterns: ["next", "continue", "proceed", "next step", "go ahead"],
    action: "next",
    description: "Continue to the next step in checkout",
    examples: ["Next", "Continue", "Proceed"],
  },
  {
    patterns: ["confirm", "yes", "confirm order", "that's correct", "looks good"],
    action: "confirm",
    description: "Confirm the current step or order",
    examples: ["Confirm", "Yes", "That's correct"],
  },
  {
    patterns: ["cancel checkout", "cancel order", "go back", "abort", "cancel purchase"],
    action: "cancel_checkout",
    description: "Cancel the current checkout process",
    examples: ["Cancel checkout", "Cancel order", "Go back"],
  },
]

export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const normalizedTranscript = transcript.toLowerCase().trim()

  // Find the best matching command
  for (const command of VOICE_COMMANDS) {
    for (const pattern of command.patterns) {
      if (normalizedTranscript.includes(pattern)) {
        return command
      }
    }
  }

  return null
}

export function getVoiceCommandHelp(): string {
  const helpText = VOICE_COMMANDS.filter((cmd) => !["next", "confirm", "cancel_checkout"].includes(cmd.action))
    .map((cmd) => {
      const example = cmd.examples[0]
      return `Say "${example}" to ${cmd.description.toLowerCase()}`
    })
    .join(". ")

  return `Here are the available voice commands: ${helpText}. During checkout, you can also say "next", "confirm", or "cancel checkout".`
}
