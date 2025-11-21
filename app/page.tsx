"use client"

import { useState, useRef, useCallback, useEffect } from "react"; // Import useRef
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Camera, Volume2, HelpCircle } from "lucide-react";
import { findProduct } from "@/lib/product-database";
import { parseVoiceCommand, getVoiceCommandHelp } from "@/lib/voice-commands";
import { EnhancedSpeechSynthesis } from "@/lib/speech-synthesis";
import { CartManager } from "@/lib/cart-manager";
import { CheckoutManager, type Order } from "@/lib/checkout-manager";
import { CartDisplay } from "@/components/cart-display";
import { CheckoutModal } from "@/components/checkout-modal";
import { AccessibilityControls } from "@/components/accessibility-controls";
import { VoiceStatusIndicator } from "@/components/voice-status-indicator";

export default function AIShoppingAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(
    'Welcome to your AI Shopping Assistant. Say "what is this" to identify an item, or say "help" for available commands.',
  );
  const [cart, setCart] = useState<any[]>([]);
  // State for UI display
  const [lastDetectedItem, setLastDetectedItem] = useState<string | null>(null);
  // Ref for immediate access in command handlers
  const lastDetectedItemRef = useRef<string | null>(null); // <<< ADDED REF
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechSynthRef = useRef<EnhancedSpeechSynthesis | null>(null);
  const cartManagerRef = useRef<any | null>(null);
  const checkoutManagerRef = useRef<any | null>(null);

  // Initialize managers and subscribe to changes
  useEffect(() => {
    cartManagerRef.current = CartManager.getInstance();
    checkoutManagerRef.current = CheckoutManager.getInstance();

    const unsubscribe = cartManagerRef.current.subscribe(setCart);
    setCart(cartManagerRef.current.getCart());

    return unsubscribe;
  }, []);

  // Initialize camera and speech
  useEffect(() => {
    initializeCamera();
    initializeSpeech();
    speak(currentMessage);
  }, []);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Camera access denied:", error);
      setCameraActive(false);
      speak(
        "Camera access is required for object detection. Please allow camera permissions and refresh the page.",
        "high",
      );
    }
  };

  const initializeSpeech = () => {
    speechSynthRef.current = new EnhancedSpeechSynthesis();

    // Initialize speech recognition
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Keep this false for one command at a time
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim(); // Trim whitespace
        console.log("[v0] Voice command received:", transcript);
        handleVoiceCommand(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("[v0] Speech recognition error:", event.error);
        setIsListening(false);

        let errorMessage = "Sorry, I encountered an error with voice recognition.";

        switch (event.error) {
          case "no-speech":
            errorMessage = "I didn't hear anything. Please try speaking again.";
            break;
          case "audio-capture":
            errorMessage = "Microphone access is required. Please check your microphone permissions.";
            break;
          case "not-allowed":
            errorMessage = "Microphone access was denied. Please allow microphone permissions and try again.";
            break;
          case "network":
            errorMessage = "Network error occurred. Please check your internet connection.";
            break;
          default:
            errorMessage = "Sorry, I didn't catch that. Please try again.";
        }

        speak(errorMessage, "high");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onstart = () => {
        console.log("[v0] Speech recognition started");
      };
    } else {
      speak("Voice recognition is not supported in this browser. Please use the manual buttons.", "high");
    }
  };

  const speak = async (text: string, priority: "high" | "normal" = "normal") => {
    if (speechSynthRef.current && speechEnabled) {
      setIsSpeaking(true);
      setCurrentMessage(text);

      try {
        await speechSynthRef.current.speak(text, priority);
      } catch (error) {
        console.error("[v0] Speech synthesis error:", error);
      } finally {
        setIsSpeaking(false);
      }
    }
  };

  // --- MODIFIED startListening ---
  const startListening = () => {
    if (recognitionRef.current && !isListening && !isProcessing && voiceEnabled) {
      setIsListening(true);
      // Start recognition FIRST
      try {
        recognitionRef.current.start();
        // THEN speak the prompt (shortened, normal priority)
        // Avoid speaking if speech is currently active from previous command.
        if (!isSpeaking) {
           speak("Listening...", "normal");
        }
      } catch (e) {
          console.error("[v0] Error starting recognition:", e);
          setIsListening(false); // Reset state if start fails
      }
    }
  };
  // -----------------------------

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      // No need to speak here, onend handles the state change
    }
  };

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext("2d");

    if (!context) return null;

    // Ensure video dimensions are valid before drawing
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error("Video dimensions are zero, cannot capture image.");
        return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight); // Explicitly use dimensions

    try {
        return canvas.toDataURL("image/jpeg", 0.8);
    } catch (e) {
        console.error("Error converting canvas to Data URL:", e);
        return null;
    }
  }, []);

  const identifyObject = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    speak("Analyzing the image, please wait...", "high"); // Speak before capturing

    const imageData = await captureImage();

    if (!imageData) {
      speak("Unable to capture image. Please ensure camera is working and try again.", "high");
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch("/api/identify-object", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
         const errorBody = await response.text();
         console.error("API Error Response:", errorBody);
         throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();

      // Ensure result.object exists and is a string before setting state/ref
      if (result.object && typeof result.object === 'string' && result.object !== "unknown object") {
        const detectedObjectName = result.object.trim().toLowerCase(); // Normalize

        // --- UPDATE BOTH STATE AND REF ---
        setLastDetectedItem(detectedObjectName);
        lastDetectedItemRef.current = detectedObjectName; // <<< UPDATE REF
        // ---------------------------------

        console.log("Setting lastDetectedItem state to:", detectedObjectName);
        console.log("Setting lastDetectedItemRef.current to:", detectedObjectName); // Log ref update

        const product = findProduct(detectedObjectName);
        if (product) {
          speak(
            `I can see a ${product.name}. ${product.description}. It costs $${product.price}. Say "add to cart" to add it.`,
          );
        } else {
          speak(`I can see a ${detectedObjectName}, but I don't have pricing information for this item.`);
        }
      } else {
        // Clear ref if detection fails
        lastDetectedItemRef.current = null;
        // Optionally clear state too, or leave it showing the previous item? Clear for consistency.
        setLastDetectedItem(null);
        speak(
          "I cannot clearly identify this object. Please try positioning it better and try again.",
        );
      }
    } catch (error) {
      console.error("[v0] Object identification error:", error);
      speak("Sorry, I encountered an error while analyzing the image. Please try again.", "high");
      // Clear ref and state on error
      lastDetectedItemRef.current = null;
      setLastDetectedItem(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPrice = async (itemName: string) => {
    if (!itemName) { // Check for valid itemName
      speak("Cannot get price, no item name provided.", "high");
      return;
    }
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      speak(`Looking up price for ${itemName}...`, "high"); // Include item name

      const response = await fetch("/api/get-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: itemName }),
      });

       if (!response.ok) {
         throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.price) {
        speak(
          `The ${result.item} costs $${result.price}. ${result.description || ''}. It's in the ${result.category || 'unknown'} section. Say "add to cart" to add it.`,
        );
      } else {
        speak(`Sorry, I don't have pricing information for ${itemName}.`);
      }
    } catch (error) {
      console.error("[v0] Price lookup error:", error);
      speak("Sorry, I encountered an error while looking up the price. Please try again.", "high");
    } finally {
      setIsProcessing(false);
    }
  };

  const addToCart = (itemName: string) => {
    console.log(`--- addToCart called with itemName: '${itemName}' ---`); // Log entry
    if (!cartManagerRef.current) {
        console.error("CartManager not initialized in addToCart");
        return;
    }
    if (!itemName) { // Check for valid itemName
        console.error("addToCart called with empty or invalid itemName");
        speak("Cannot add item, item name is missing.", "high");
        return;
    }

    const result = cartManagerRef.current.addItem(itemName);

    if (result.success) {
      const cartState = cartManagerRef.current.getCartState();
      speak(`${result.message} Your cart total is now $${cartState.total.toFixed(2)}.`);
    } else {
      speak(result.message);
    }
  };

  const removeFromCart = (itemName: string) => {
    if (!cartManagerRef.current) return;
     if (!itemName) { // Add check
        speak("Cannot remove item, item name is missing.", "high");
        return;
    }

    const result = cartManagerRef.current.removeItem(itemName);

    if (result.success) {
      const cartState = cartManagerRef.current.getCartState();
      speak(`${result.message} Your cart total is now $${cartState.total.toFixed(2)}.`);
    } else {
      speak(result.message);
    }
  };

  const reviewCart = () => {
    if (!cartManagerRef.current) return;

    const summary = cartManagerRef.current.getCartSummary();
    speak(`${summary} Say "checkout" to proceed with payment.`);
  };

  const handleCheckout = () => {
    if (!cartManagerRef.current || !checkoutManagerRef.current) return;

    const cartState = cartManagerRef.current.getCartState();

    if (cartState.itemCount === 0) {
      speak("Your cart is empty. Please add items before checking out.");
      return;
    }

    const result = checkoutManagerRef.current.startCheckout(cartState.items);

    if (result.success && result.order) {
      setCurrentOrder(result.order);
      setShowCheckout(true);
      speak(
        `${result.message} Starting checkout for ${cartState.itemCount} items totaling $${cartState.total.toFixed(2)}.`,
        "high",
      );
    } else {
      speak(result.message, "high");
    }
  };

  const handleCheckoutComplete = () => {
    if (cartManagerRef.current) {
      cartManagerRef.current.clearCart();
    }
    setShowCheckout(false);
    setCurrentOrder(null);
    speak("Thank you for your purchase! Your cart has been cleared.", "high");
  };

  // --- MODIFIED handleVoiceCommand ---
  const handleVoiceCommand = (transcript: string) => {
    if (!transcript || transcript.trim().length === 0) {
        console.log("[v0] Ignored empty transcript.");
        return;
    }

    console.log("[v0] Processing command:", transcript);
    setLastCommand(transcript);

    const command = parseVoiceCommand(transcript);

    // No need to read state here anymore, we use the ref inside the switch cases

    if (!command) {
      speak("I didn't understand that command. Say 'help' to hear available voice commands.");
      return;
    }

    // Handle checkout-specific commands (keep this logic)
    if (showCheckout && checkoutManagerRef.current?.isCheckoutInProgress()) {
        // ... (existing checkout command handling) ...
         switch (transcript.toLowerCase()) {
            case "next":
            case "continue":
            case "proceed":
              console.log("Checkout Modal should handle 'next'");
              // You might need to trigger the modal's next step function here if it doesn't listen itself
              return;
            case "confirm":
            case "yes":
              console.log("Checkout Modal should handle 'confirm'");
              // Trigger modal confirm if needed
              return;
            case "pay now":
            case "complete payment":
              console.log("Checkout Modal should handle 'pay now'");
              // Trigger modal payment if needed
              return;
            case "cancel":
            case "cancel checkout":
              const cancelResult = checkoutManagerRef.current.cancelCheckout();
              speak(cancelResult.message, "high");
              setShowCheckout(false);
              setCurrentOrder(null);
              return;
          }
    }


    switch (command.action) {
      case "identify":
        identifyObject();
        break;

      case "price":
        // Read from the REF
        console.log(`Checking PRICE command. Ref value: '${lastDetectedItemRef.current}'`);
        if (lastDetectedItemRef.current) {
          getPrice(lastDetectedItemRef.current);
        } else {
          console.error("PRICE command failed: Ref value is falsy.");
          speak("Please identify an item first before asking for its price.");
        }
        break;

      case "add":
        // Read from the REF
        console.log(`Checking ADD command. Ref value: '${lastDetectedItemRef.current}'`);
        const itemToAdd = lastDetectedItemRef.current; // Store in temp var for check

        if (itemToAdd && itemToAdd !== 'unknown object' && itemToAdd.trim().length > 0) {
          console.log("ADD condition PASSED (using Ref). Calling addToCart...");
          addToCart(itemToAdd);
        } else {
          console.error("ADD condition FAILED (using Ref). NOT calling addToCart.");
          if (!itemToAdd) console.error("Reason: Ref value is falsy.");
          else if (itemToAdd === 'unknown object') console.error("Reason: Ref value is 'unknown object'.");
          else if (itemToAdd.trim().length === 0) console.error("Reason: Ref value is whitespace.");
          else console.error("Reason: Unknown failure (Ref).");
          speak("Please identify an item first before adding it to your cart.");
        }
        break;

      case "remove":
        // Read from the REF
        console.log(`Checking REMOVE command. Ref value: '${lastDetectedItemRef.current}'`);
        if (lastDetectedItemRef.current) {
          removeFromCart(lastDetectedItemRef.current);
        } else {
          console.error("REMOVE command failed: Ref value is falsy.");
          speak("Please identify an item first, or say 'show cart' to review items you can remove.");
        }
        break;

      case "cart":
        reviewCart();
        break;

      case "checkout":
        handleCheckout();
        break;

      case "help":
        speak(getVoiceCommandHelp());
        break;

      case "repeat":
        if (speechSynthRef.current) {
          speechSynthRef.current.repeatLastMessage();
        }
        break;

      case "stop":
        if (speechSynthRef.current?.getIsSpeaking()) {
          speechSynthRef.current.stop();
        }
        if (isListening) {
          recognitionRef.current?.stop();
          setIsListening(false);
        }
        speak("Stopped.", "high");
        break;

      default:
        speak(`I didn't understand "${transcript}". Say 'help' for available commands.`);
    }
  };
 // ---------------------------------

  const handleVoiceToggle = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    if (!enabled && isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    speak(enabled ? "Voice recognition enabled" : "Voice recognition disabled", "high");
  };

  const handleSpeechToggle = (enabled: boolean) => {
    setSpeechEnabled(enabled);
    if (!enabled && isSpeaking) {
      speechSynthRef.current?.stop();
      setIsSpeaking(false);
    }
  };

  // --- Return JSX ---
  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <AccessibilityControls
          onVoiceToggle={handleVoiceToggle}
          onSpeechToggle={handleSpeechToggle}
          voiceEnabled={voiceEnabled}
          speechEnabled={speechEnabled}
        />

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-balance">AI Smart Shopping Assistant</h1>
          <p className="text-muted-foreground text-pretty">Voice-controlled shopping for the visually impaired</p>
        </div>

        {/* Camera View */}
        <Card className="relative overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 md:h-96 object-cover bg-muted" />
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* ... overlay divs ... */}
             <div className="w-48 h-48 border-2 border-primary/50 rounded-lg">
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary"></div>
            </div>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">Processing...</div>
            </div>
          )}
        </Card>

        {/* Status Display */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Volume2 className={`h-5 w-5 ${isSpeaking ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium">
              {isSpeaking ? "Speaking..." : isListening ? "Listening..." : isProcessing ? "Processing..." : "Ready"}
            </span>
          </div>
          <p className="text-lg text-pretty">{currentMessage}</p>
          {/* Display state value in UI */}
          {lastDetectedItem && lastDetectedItem !== 'unknown object' && (
             <p className="text-sm text-muted-foreground mt-2">Last detected: {lastDetectedItem}</p>
          )}
        </Card>

        {/* Voice Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={isListening ? stopListening : startListening}
            className="flex items-center gap-2 text-lg py-6"
            variant={isListening ? "destructive" : "default"}
            disabled={isProcessing || !voiceEnabled || !recognitionRef.current}
          >
            {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            {isListening ? "Stop Listening" : "Start Voice Command"}
          </Button>

          <Button
            size="lg"
            onClick={identifyObject}
            variant="outline"
            className="flex items-center gap-2 text-lg py-6 bg-transparent"
            disabled={isProcessing || !cameraActive}
          >
            <Camera className="h-6 w-6" />
            Identify Object
          </Button>

          <Button
            size="lg"
            onClick={() => speak(getVoiceCommandHelp())}
            variant="outline"
            className="flex items-center gap-2 text-lg py-6 bg-transparent"
            disabled={isProcessing || isSpeaking}
          >
            <HelpCircle className="h-6 w-6" />
            Voice Help
          </Button>
        </div>

        {/* Enhanced Cart Display */}
        <CartDisplay onSpeak={speak} />

        {/* Checkout Modal */}
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => {
            setShowCheckout(false);
            setCurrentOrder(null);
          }}
          onSpeak={speak}
          order={currentOrder}
         // onComplete={handleCheckoutComplete} // Pass the completion handler
        />

        {/* Enhanced Voice Commands Help Card (Keep as is) */}
         <Card className="p-6">
           {/* ... help content ... */}
            <h3 className="text-lg font-semibold mb-3">Voice Commands</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
             {/* ... keep all the command descriptions ... */}
              <div className="space-y-1">
                <div className="font-medium">"What is this?" - Identify object</div>
                <div className="text-muted-foreground text-xs">Also: "Tell me what this is", "Identify this"</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">"What's the price?" - Get price info</div>
                <div className="text-muted-foreground text-xs">Also: "How much does this cost?"</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">"Add to cart" - Add current item</div>
                <div className="text-muted-foreground text-xs">Also: "I want this", "Buy this"</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">"Remove from cart" - Remove item</div>
                <div className="text-muted-foreground text-xs">Also: "Don't want this", "Take this out"</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">"Show cart" - Review cart</div>
                <div className="text-muted-foreground text-xs">Also: "What's in my cart?", "Cart summary"</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">"Checkout" - Complete purchase</div>
                <div className="text-muted-foreground text-xs">Also: "Pay now", "Complete purchase"</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">"Help" - Get assistance</div>
                <div className="text-muted-foreground text-xs">Also: "What can you do?", "Commands"</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">"Repeat" - Repeat last message</div>
                <div className="text-muted-foreground text-xs">Also: "Say that again", "What did you say?"</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">"Cancel checkout" - Cancel checkout process</div>
                <div className="text-muted-foreground text-xs">Also: "Cancel", "Stop checkout"</div>
            </div>
           </div>
         </Card>

        <VoiceStatusIndicator
          isListening={isListening}
          isSpeaking={isSpeaking}
          cameraActive={cameraActive}
          cartItemCount={cart.length}
          lastCommand={lastCommand}
        />
      </div>
    </div>
  );
}












// // "use client"

// // import { useState, useRef, useCallback, useEffect } from "react"
// // import { Button } from "@/components/ui/button"
// // import { Card } from "@/components/ui/card"
// // import { Mic, MicOff, Camera, Volume2, HelpCircle } from "lucide-react"
// // import { findProduct } from "@/lib/product-database"
// // import { parseVoiceCommand, getVoiceCommandHelp } from "@/lib/voice-commands"
// // import { EnhancedSpeechSynthesis } from "@/lib/speech-synthesis"
// // import { CartManager } from "@/lib/cart-manager"
// // import { CheckoutManager, type Order } from "@/lib/checkout-manager"
// // import { CartDisplay } from "@/components/cart-display"
// // import { CheckoutModal } from "@/components/checkout-modal"
// // import { AccessibilityControls } from "@/components/accessibility-controls"
// // import { VoiceStatusIndicator } from "@/components/voice-status-indicator"

// // export default function AIShoppingAssistant() {
// //   const [isListening, setIsListening] = useState(false)
// //   const [isSpeaking, setIsSpeaking] = useState(false)
// //   const [currentMessage, setCurrentMessage] = useState(
// //     'Welcome to your AI Shopping Assistant. Say "what is this" to identify an item, or say "help" for available commands.',
// //   )
// //   const [cart, setCart] = useState<any[]>([])
// //   const [lastDetectedItem, setLastDetectedItem] = useState<string | null>(null)
// //   const [isProcessing, setIsProcessing] = useState(false)
// //   const [showCheckout, setShowCheckout] = useState(false)
// //   const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
// //   const [voiceEnabled, setVoiceEnabled] = useState(true)
// //   const [speechEnabled, setSpeechEnabled] = useState(true)
// //   const [cameraActive, setCameraActive] = useState(false)
// //   const [lastCommand, setLastCommand] = useState<string>()

// //   const videoRef = useRef<HTMLVideoElement>(null)
// //   const canvasRef = useRef<HTMLCanvasElement>(null)
// //   const recognitionRef = useRef<any>(null)
// //   const speechSynthRef = useRef<EnhancedSpeechSynthesis | null>(null)
// //   const cartManagerRef = useRef<any | null>(null)
// //   const checkoutManagerRef = useRef<any | null>(null)

// //   // Initialize managers and subscribe to changes
// //   useEffect(() => {
// //     cartManagerRef.current = CartManager.getInstance()
// //     checkoutManagerRef.current = CheckoutManager.getInstance()

// //     const unsubscribe = cartManagerRef.current.subscribe(setCart)
// //     setCart(cartManagerRef.current.getCart())

// //     return unsubscribe
// //   }, [])

// //   // Initialize camera and speech
// //   useEffect(() => {
// //     initializeCamera()
// //     initializeSpeech()
// //     speak(currentMessage)
// //   }, [])

// //   const initializeCamera = async () => {
// //     try {
// //       const stream = await navigator.mediaDevices.getUserMedia({
// //         video: { facingMode: "environment" }, // Use back camera on mobile
// //       })
// //       if (videoRef.current) {
// //         videoRef.current.srcObject = stream
// //         setCameraActive(true)
// //       }
// //     } catch (error) {
// //       console.error("Camera access denied:", error)
// //       setCameraActive(false)
// //       speak(
// //         "Camera access is required for object detection. Please allow camera permissions and refresh the page.",
// //         "high",
// //       )
// //     }
// //   }

// //   const initializeSpeech = () => {
// //     speechSynthRef.current = new EnhancedSpeechSynthesis()

// //     // Initialize speech recognition
// //     if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
// //       const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
// //       recognitionRef.current = new SpeechRecognition()
// //       recognitionRef.current.continuous = false
// //       recognitionRef.current.interimResults = false
// //       recognitionRef.current.lang = "en-US"

// //       recognitionRef.current.onresult = (event: any) => {
// //         const transcript = event.results[0][0].transcript
// //         console.log("[v0] Voice command received:", transcript)
// //         handleVoiceCommand(transcript)
// //       }

// //       recognitionRef.current.onerror = (event: any) => {
// //         console.error("[v0] Speech recognition error:", event.error)
// //         setIsListening(false)

// //         let errorMessage = "Sorry, I encountered an error with voice recognition."

// //         switch (event.error) {
// //           case "no-speech":
// //             errorMessage = "I didn't hear anything. Please try speaking again."
// //             break
// //           case "audio-capture":
// //             errorMessage = "Microphone access is required. Please check your microphone permissions."
// //             break
// //           case "not-allowed":
// //             errorMessage = "Microphone access was denied. Please allow microphone permissions and try again."
// //             break
// //           case "network":
// //             errorMessage = "Network error occurred. Please check your internet connection."
// //             break
// //           default:
// //             errorMessage = "Sorry, I didn't catch that. Please try again."
// //         }

// //         speak(errorMessage, "high")
// //       }

// //       recognitionRef.current.onend = () => {
// //         setIsListening(false)
// //       }

// //       recognitionRef.current.onstart = () => {
// //         console.log("[v0] Speech recognition started")
// //       }
// //     } else {
// //       speak("Voice recognition is not supported in this browser. Please use the manual buttons.", "high")
// //     }
// //   }

// //   const speak = async (text: string, priority: "high" | "normal" = "normal") => {
// //     if (speechSynthRef.current && speechEnabled) {
// //       setIsSpeaking(true)
// //       setCurrentMessage(text)

// //       try {
// //         await speechSynthRef.current.speak(text, priority)
// //       } catch (error) {
// //         console.error("[v0] Speech synthesis error:", error)
// //       } finally {
// //         setIsSpeaking(false)
// //       }
// //     }
// //   }

// //   const startListening = () => {
// //     if (recognitionRef.current && !isListening && !isProcessing && voiceEnabled) {
// //       setIsListening(true)
// //       recognitionRef.current.start()
// //       speak("Listening for your command...", "high")
// //     }
// //   }

// //   const stopListening = () => {
// //     if (recognitionRef.current && isListening) {
// //       recognitionRef.current.stop()
// //       setIsListening(false)
// //       speak("Stopped listening.", "high")
// //     }
// //   }

// //   const captureImage = useCallback(async () => {
// //     if (!videoRef.current || !canvasRef.current) return null

// //     const canvas = canvasRef.current
// //     const video = videoRef.current
// //     const context = canvas.getContext("2d")

// //     if (!context) return null

// //     canvas.width = video.videoWidth
// //     canvas.height = video.videoHeight
// //     context.drawImage(video, 0, 0)

// //     return canvas.toDataURL("image/jpeg", 0.8)
// //   }, [])
// //   const identifyObject = async () => {
// //     if (isProcessing) return

// //     setIsProcessing(true)
// //     const imageData = await captureImage()

// //     if (!imageData) {
// //       speak("Unable to capture image. Please ensure camera is working and try again.", "high")
// //       setIsProcessing(false)
// //       return
// //     }

// //     try {
// //       speak("Analyzing the image, please wait...", "high")

// //       const response = await fetch("/api/identify-object", {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({ image: imageData }),
// //       })

// //       const result = await response.json()

// //       if (result.object && result.object !== "unknown object") {
// //         setLastDetectedItem(result.object)

// //         const product = findProduct(result.object)
// //         if (product) {
// //           speak(
// //             `I can see a ${product.name}. ${product.description}. It costs $${product.price}. Say "add to cart" to add it to your shopping cart.`,
// //           )
// //         } else {
// //           speak(`I can see a ${result.object}, but I don't have pricing information for this item in our database.`)
// //         }
// //       } else {
// //         speak(
// //           "I cannot clearly identify this object. Please try positioning the item better in the camera frame with good lighting, and try again.",
// //         )
// //       }
// //     } catch (error) {
// //       console.error("[v0] Object identification error:", error)
// //       speak("Sorry, I encountered an error while analyzing the image. Please try again.", "high")
// //     } finally {
// //       setIsProcessing(false)
// //     }
// //   }

// //   const getPrice = async (itemName: string) => {
// //     if (isProcessing) return

// //     setIsProcessing(true)

// //     try {
// //       speak("Looking up price information...", "high")

// //       const response = await fetch("/api/get-price", {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({ item: itemName }),
// //       })

// //       const result = await response.json()

// //       if (result.price) {
// //         speak(
// //           `The ${result.item} costs $${result.price}. ${result.description}. It's in the ${result.category} section. Say "add to cart" to purchase it.`,
// //         )
// //       } else {
// //         speak(`Sorry, I don't have pricing information for ${itemName} in our database.`)
// //       }
// //     } catch (error) {
// //       console.error("[v0] Price lookup error:", error)
// //       speak("Sorry, I encountered an error while looking up the price. Please try again.", "high")
// //     } finally {
// //       setIsProcessing(false)
// //     }
// //   }

// //   const addToCart = (itemName: string) => {
// //     if (!cartManagerRef.current) return

// //     const result = cartManagerRef.current.addItem(itemName)

// //     if (result.success) {
// //       const cartState = cartManagerRef.current.getCartState()
// //       speak(`${result.message} Your cart total is now $${cartState.total.toFixed(2)}.`)
// //     } else {
// //       speak(result.message)
// //     }
// //   }

// //   const removeFromCart = (itemName: string) => {
// //     if (!cartManagerRef.current) return

// //     const result = cartManagerRef.current.removeItem(itemName)

// //     if (result.success) {
// //       const cartState = cartManagerRef.current.getCartState()
// //       speak(`${result.message} Your cart total is now $${cartState.total.toFixed(2)}.`)
// //     } else {
// //       speak(result.message)
// //     }
// //   }

// //   const reviewCart = () => {
// //     if (!cartManagerRef.current) return

// //     const summary = cartManagerRef.current.getCartSummary()
// //     speak(`${summary} Say "checkout" to proceed with payment.`)
// //   }

// //   const handleCheckout = () => {
// //     if (!cartManagerRef.current || !checkoutManagerRef.current) return

// //     const cartState = cartManagerRef.current.getCartState()

// //     if (cartState.itemCount === 0) {
// //       speak("Your cart is empty. Please add items before checking out.")
// //       return
// //     }

// //     const result = checkoutManagerRef.current.startCheckout(cartState.items)

// //     if (result.success && result.order) {
// //       setCurrentOrder(result.order)
// //       setShowCheckout(true)
// //       speak(
// //         `${result.message} Starting checkout for ${cartState.itemCount} items totaling $${cartState.total.toFixed(2)}.`,
// //         "high",
// //       )
// //     } else {
// //       speak(result.message, "high")
// //     }
// //   }

// //   const handleCheckoutComplete = () => {
// //     // Clear cart after successful checkout
// //     if (cartManagerRef.current) {
// //       cartManagerRef.current.clearCart()
// //     }
// //     setShowCheckout(false)
// //     setCurrentOrder(null)
// //     speak("Thank you for your purchase! Your cart has been cleared.", "high")
// //   }

// //   const handleVoiceCommand = (transcript: string) => {
// //     console.log("[v0] Processing command:", transcript)
// //     setLastCommand(transcript)

// //     const command = parseVoiceCommand(transcript)

// //     if (!command) {
// //       speak("I didn't understand that command. Say 'help' to hear available voice commands.")
// //       return
// //     }

// //     // Handle checkout-specific commands
// //     if (showCheckout && checkoutManagerRef.current?.isCheckoutInProgress()) {
// //       switch (transcript.toLowerCase()) {
// //         case "next":
// //         case "continue":
// //         case "proceed":
// //           // Let the checkout modal handle this
// //           return
// //         case "confirm":
// //         case "yes":
// //           // Let the checkout modal handle this
// //           return
// //         case "pay now":
// //         case "complete payment":
// //           // Let the checkout modal handle this
// //           return
// //         case "cancel":
// //         case "cancel checkout":
// //           const cancelResult = checkoutManagerRef.current.cancelCheckout()
// //           speak(cancelResult.message, "high")
// //           setShowCheckout(false)
// //           setCurrentOrder(null)
// //           return
// //       }
// //     }

// //     switch (command.action) {
// //       case "identify":
// //         identifyObject()
// //         break

// //       case "price":
// //         if (lastDetectedItem) {
// //           getPrice(lastDetectedItem)
// //         } else {
// //           speak("Please identify an item first before asking for its price.")
// //         }
// //         break

// //       case "add":
// //         if (lastDetectedItem) {
// //           addToCart(lastDetectedItem)
// //         } else {
// //           speak("Please identify an item first before adding it to your cart.")
// //         }
// //         break
      

// //       case "remove":
// //         if (lastDetectedItem) {
// //           removeFromCart(lastDetectedItem)
// //         } else {
// //           speak("Please identify an item first, or say 'show cart' to review items you can remove.")
// //         }
// //         break

// //       case "cart":
// //         reviewCart()
// //         break

// //       case "checkout":
// //         handleCheckout()
// //         break

// //       case "help":
// //         speak(getVoiceCommandHelp())
// //         break

// //       case "repeat":
// //         if (speechSynthRef.current) {
// //           speechSynthRef.current.repeatLastMessage()
// //         }
// //         break

// //       case "stop":
// //         if (speechSynthRef.current) {
// //           speechSynthRef.current.stop()
// //         }
// //         if (isListening) {
// //           stopListening()
// //         }
// //         speak("Stopped.", "high")
// //         break

// //       default:
// //         speak("I didn't understand that command. Say 'help' for available voice commands.")
// //     }
// //   }

// //   const handleVoiceToggle = (enabled: boolean) => {
// //     setVoiceEnabled(enabled)
// //     if (!enabled && isListening) {
// //       stopListening()
// //     }
// //     speak(enabled ? "Voice recognition enabled" : "Voice recognition disabled", "high")
// //   }

// //   const handleSpeechToggle = (enabled: boolean) => {
// //     setSpeechEnabled(enabled)
// //     if (!enabled && isSpeaking) {
// //       speechSynthRef.current?.stop()
// //       setIsSpeaking(false)
// //     }
// //   }

// //   return (
// //     <div className="min-h-screen bg-background text-foreground p-4">
// //       <div className="max-w-4xl mx-auto space-y-6">
// //         <AccessibilityControls
// //           onVoiceToggle={handleVoiceToggle}
// //           onSpeechToggle={handleSpeechToggle}
// //           voiceEnabled={voiceEnabled}
// //           speechEnabled={speechEnabled}
// //         />

// //         {/* Header */}
// //         <div className="text-center space-y-2">
// //           <h1 className="text-3xl font-bold text-balance">AI Smart Shopping Assistant</h1>
// //           <p className="text-muted-foreground text-pretty">Voice-controlled shopping for the visually impaired</p>
// //         </div>

// //         {/* Camera View */}
// //         <Card className="relative overflow-hidden">
// //           <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 md:h-96 object-cover bg-muted" />
// //           <canvas ref={canvasRef} className="hidden" />

// //           {/* Camera Overlay */}
// //           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
// //             <div className="w-48 h-48 border-2 border-primary/50 rounded-lg">
// //               <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
// //               <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
// //               <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
// //               <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary"></div>
// //             </div>
// //           </div>

// //           {/* Processing Indicator */}
// //           {isProcessing && (
// //             <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
// //               <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">Processing...</div>
// //             </div>
// //           )}
// //         </Card>

// //         {/* Status Display */}
// //         <Card className="p-6">
// //           <div className="flex items-center gap-3 mb-4">
// //             <Volume2 className={`h-5 w-5 ${isSpeaking ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
// //             <span className="text-sm font-medium">
// //               {isSpeaking ? "Speaking..." : isListening ? "Listening..." : isProcessing ? "Processing..." : "Ready"}
// //             </span>
// //           </div>
// //           <p className="text-lg text-pretty">{currentMessage}</p>
// //           {lastDetectedItem && <p className="text-sm text-muted-foreground mt-2">Last detected: {lastDetectedItem}</p>}
// //         </Card>

// //         {/* Voice Controls */}
// //         <div className="flex flex-col sm:flex-row gap-4 justify-center">
// //           <Button
// //             size="lg"
// //             onClick={isListening ? stopListening : startListening}
// //             className="flex items-center gap-2 text-lg py-6"
// //             variant={isListening ? "destructive" : "default"}
// //             disabled={isProcessing || !voiceEnabled}
// //           >
// //             {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
// //             {isListening ? "Stop Listening" : "Start Voice Command"}
// //           </Button>

// //           <Button
// //             size="lg"
// //             onClick={identifyObject}
// //             variant="outline"
// //             className="flex items-center gap-2 text-lg py-6 bg-transparent"
// //             disabled={isProcessing || !cameraActive}
// //           >
// //             <Camera className="h-6 w-6" />
// //             Identify Object
// //           </Button>

// //           <Button
// //             size="lg"
// //             onClick={() => speak(getVoiceCommandHelp())}
// //             variant="outline"
// //             className="flex items-center gap-2 text-lg py-6 bg-transparent"
// //             disabled={isProcessing}
// //           >
// //             <HelpCircle className="h-6 w-6" />
// //             Voice Help
// //           </Button>
// //         </div>

// //         {/* Enhanced Cart Display */}
// //         <CartDisplay onSpeak={speak} />

// //         {/* Checkout Modal */}
// //         <CheckoutModal
// //           isOpen={showCheckout}
// //           onClose={() => {
// //             setShowCheckout(false)
// //             setCurrentOrder(null)
// //           }}
// //           onSpeak={speak}
// //           order={currentOrder}
// //           onComplete={handleCheckoutComplete}
// //         />

// //         {/* Enhanced Voice Commands Help */}
// //         <Card className="p-6">
// //           <h3 className="text-lg font-semibold mb-3">Voice Commands</h3>
// //           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
// //             <div className="space-y-1">
// //               <div className="font-medium">"What is this?" - Identify object</div>
// //               <div className="text-muted-foreground text-xs">Also: "Tell me what this is", "Identify this"</div>
// //             </div>
// //             <div className="space-y-1">
// //               <div className="font-medium">"What's the price?" - Get price info</div>
// //               <div className="text-muted-foreground text-xs">Also: "How much does this cost?"</div>
// //             </div>
// //             <div className="space-y-1">
// //               <div className="font-medium">"Add to cart" - Add current item</div>
// //               <div className="text-muted-foreground text-xs">Also: "I want this", "Buy this"</div>
// //             </div>
// //             <div className="space-y-1">
// //               <div className="font-medium">"Remove from cart" - Remove item</div>
// //               <div className="text-muted-foreground text-xs">Also: "Don't want this", "Take this out"</div>
// //             </div>
// //             <div className="space-y-1">
// //               <div className="font-medium">"Show cart" - Review cart</div>
// //               <div className="text-muted-foreground text-xs">Also: "What's in my cart?", "Cart summary"</div>
// //             </div>
// //             <div className="space-y-1">
// //               <div className="font-medium">"Checkout" - Complete purchase</div>
// //               <div className="text-muted-foreground text-xs">Also: "Pay now", "Complete purchase"</div>
// //             </div>
// //             <div className="space-y-1">
// //               <div className="font-medium">"Help" - Get assistance</div>
// //               <div className="text-muted-foreground text-xs">Also: "What can you do?", "Commands"</div>
// //             </div>
// //             <div className="space-y-1">
// //               <div className="font-medium">"Repeat" - Repeat last message</div>
// //               <div className="text-muted-foreground text-xs">Also: "Say that again", "What did you say?"</div>
// //             </div>
// //             <div className="space-y-1">
// //               <div className="font-medium">"Cancel checkout" - Cancel checkout process</div>
// //               <div className="text-muted-foreground text-xs">Also: "Cancel", "Stop checkout"</div>
// //             </div>
// //           </div>
// //         </Card>

// //         <VoiceStatusIndicator
// //           isListening={isListening}
// //           isSpeaking={isSpeaking}
// //           cameraActive={cameraActive}
// //           cartItemCount={cart.length}
// //           lastCommand={lastCommand}
// //         />
// //       </div>
// //     </div>
// //   )
// // }
