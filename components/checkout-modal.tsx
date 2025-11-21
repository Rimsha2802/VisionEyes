



"use client"

// ADD React import
import * as React from 'react';
// Keep other imports
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, CreditCard, ShoppingBag, X } from "lucide-react";
import { CheckoutManager, type Order, type CheckoutStep } from "@/lib/checkout-manager";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void; // Used for closing the modal (cancellation or completion)
  onSpeak: (message: string, priority?: "high" | "normal") => void;
  order: Order | null;
}

// Define the type for the exposed functions via ref
export interface CheckoutModalRef {
  triggerNextStep: () => void;
  triggerCancel: () => void;
}

// Wrap component definition with forwardRef
export const CheckoutModal = forwardRef<CheckoutModalRef, CheckoutModalProps>(
  ({ isOpen, onClose, onSpeak, order }, ref) => {
    const [checkoutSteps, setCheckoutSteps] = useState<CheckoutStep[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    // Get singleton instance
    const [checkoutManager] = useState(() => CheckoutManager.getInstance());

    // Effect to initialize or reset state when modal opens/closes or order changes
    useEffect(() => {
      if (isOpen && order) {
        // Reset steps logic using the manager instance
        checkoutManager.resetSteps(); // Ensure steps start fresh
        setCheckoutSteps(checkoutManager.getCheckoutSteps()); // Get initial steps
        setCurrentStepIndex(0); // Start at the first step
        setIsProcessing(false); // Ensure not processing initially
        console.log("CheckoutModal: Initializing for order", order.id);
        // Initial voice guidance
        onSpeak("Checkout started. Step 1: Review your order. Say 'next' or 'continue'.", "high");
      } else if (!isOpen) {
        // Reset internal state when modal is not open
        console.log("CheckoutModal: Resetting state as modal is closed.");
        setCurrentStepIndex(0);
        setIsProcessing(false);
        setCheckoutSteps([]); // Clear steps
      }
    }, [isOpen, order, checkoutManager, onSpeak]); // Dependencies trigger re-initialization

    // Expose control functions via ref for the parent component (page.tsx)
    useImperativeHandle(ref, () => ({
      triggerNextStep: () => {
        console.log("CheckoutModal: triggerNextStep called via ref.");
        // Prevent triggering if already processing, modal not open, or no order
        if (!isProcessing && isOpen && order) {
           handleNextStep(); // Call internal handler
        } else {
             console.log("CheckoutModal: triggerNextStep ignored (processing, closed, or no order).");
        }
      },
      triggerCancel: () => {
         console.log("CheckoutModal: triggerCancel called via ref.");
         if (isOpen) {
            handleCancel(); // Call internal handler
         }
      }
    }));

    // Internal handler for advancing checkout steps
    const handleNextStep = async () => {
      // Guard clauses: ensure order exists, not processing, and within step bounds
      if (!order || isProcessing || checkoutSteps.length === 0) {
          console.log("handleNextStep: Guard clause hit (no order, processing, or no steps).");
          return;
      }
       if (currentStepIndex >= checkoutSteps.length) {
         console.log("handleNextStep: Guard clause hit (already finished or index out of bounds).");
         return;
      }

      const currentStep = checkoutSteps[currentStepIndex];
      console.log(`handleNextStep: Processing step ${currentStepIndex}: ${currentStep?.id}`);
      setIsProcessing(true); // Indicate processing started

      try {
        let nextStepIndex = currentStepIndex + 1; // Default to moving to the next step

        // --- Step-specific Logic ---
        switch (currentStep.id) {
          case "review":
            // Speak summary and mark step complete
            onSpeak(checkoutManager.getOrderSummary() + " Say 'confirm' or 'next'.", "high");
            checkoutManager.completeStep("review");
            break;

          case "confirm":
            // Confirm and immediately attempt payment processing
            onSpeak("Order confirmed. Processing payment...", "high");
            checkoutManager.completeStep("confirm");
            // Directly call payment logic, don't just advance index yet
            await processPaymentStep();
            // processPaymentStep handles setting index on success/failure
            return; // Exit handleNextStep, let processPaymentStep control flow

          case "payment":
            // This case handles explicit "Pay Now" trigger if confirm didn't auto-trigger
            onSpeak("Processing payment...", "high"); // Reiterate if needed
            await processPaymentStep();
             // processPaymentStep handles setting index on success/failure
            return; // Exit handleNextStep

          case "complete":
            // This step is usually reached via processPaymentStep success
            const receipt = checkoutManager.getReceipt();
            onSpeak(receipt, "high");
            console.log("Checkout complete. Closing modal soon.");
            setIsProcessing(false); // Ensure processing stops
            // Use setTimeout to allow user to hear receipt before modal closes
            setTimeout(() => {
              if (isOpen) { // Check if modal is still meant to be open
                 console.log("Closing modal after completion delay.");
                 onClose(); // Trigger the close handler passed from parent
              }
            }, 7000); // Longer delay (7 seconds) for receipt
            return; // Final step, exit function
        }
        // --- End Step-specific Logic ---

        // Update steps state for UI feedback after completing a non-terminal step
        const updatedSteps = checkoutManager.getCheckoutSteps();
        setCheckoutSteps([...updatedSteps]); // Force re-render with updated completion status

        // Move to the next step index if we haven't returned early
        if (nextStepIndex < checkoutSteps.length) {
            console.log(`handleNextStep: Advancing to step index ${nextStepIndex}`);
            setCurrentStepIndex(nextStepIndex);
            // Announce the next step action needed
            const nextStepInfo = updatedSteps[nextStepIndex];
             let guidance = "Say 'next' or 'continue'."; // Default guidance
             if (nextStepInfo?.id === 'confirm') guidance = "Say 'confirm' or 'next'.";
             else if (nextStepInfo?.id === 'payment') guidance = "Say 'pay now' or 'next'.";
             else if (nextStepInfo?.id === 'complete') guidance = ''; // No action needed

             if (nextStepInfo && guidance) {
                 onSpeak(`Step ${nextStepIndex + 1}: ${nextStepInfo.name}. ${guidance}`, "normal");
             }
        } else {
             console.log(`handleNextStep: Reached end of steps or stayed on current step.`);
        }

      } catch (error) {
        console.error("Checkout step error:", error);
        onSpeak("An error occurred during checkout. Please try again or say 'cancel'.", "high");
        // Don't advance step on error, allow retry or cancel
      } finally {
        // Reset processing state ONLY if not waiting for payment/completion async actions
        if (!['confirm', 'payment', 'complete'].includes(currentStep?.id)) {
            setIsProcessing(false);
            console.log("handleNextStep: Reset isProcessing for non-async step.");
        }
         // If payment failed in processPaymentStep, it sets isProcessing false there.
      }
    };

    // Helper function specifically for the payment step logic
    const processPaymentStep = async () => {
        console.log("processPaymentStep: Starting payment processing...");
        setIsProcessing(true); // Ensure processing state is set
        const paymentResult = await checkoutManager.processPayment(); // Async simulation

        if (paymentResult.success) {
            console.log("processPaymentStep: Payment success.");
            onSpeak(paymentResult.message, "high");
            // Payment success automatically completes payment and complete steps
            const updatedSteps = checkoutManager.getCheckoutSteps();
            setCheckoutSteps([...updatedSteps]);
            // Find the index of the 'complete' step and move there
            const completeStepIndex = updatedSteps.findIndex(step => step.id === 'complete');
            if (completeStepIndex !== -1) {
                console.log(`Advancing to 'complete' step: ${completeStepIndex}`);
                setCurrentStepIndex(completeStepIndex);
                // Trigger handleNextStep again slightly later to speak the receipt
                setTimeout(() => handleNextStep(), 100); // Small delay for state update
            } else {
                 console.error("processPaymentStep: 'complete' step index not found!");
                 setIsProcessing(false); // Stop processing if flow breaks
            }
        } else {
            console.log("processPaymentStep: Payment failed.");
            onSpeak(paymentResult.message, "high");
            setIsProcessing(false); // Stop processing on payment failure
            // Stay on the payment step to allow retry or cancel
            setCurrentStepIndex(checkoutSteps.findIndex(step => step.id === 'payment'));
        }
    };


    // Internal handler for cancellation
    const handleCancel = () => {
      console.log("CheckoutModal: handleCancel called internally.");
      const result = checkoutManager.cancelCheckout(); // Cancel in manager
      onSpeak(result.message, "high"); // Speak result
      onClose(); // Trigger the close handler passed from parent
    };

    // Render null if not open or no order data
    if (!isOpen || !order) return null;

    // Loading/Error state if steps aren't ready
    if (checkoutSteps.length === 0 || currentStepIndex >= checkoutSteps.length) {
         console.warn("CheckoutModal: Steps not ready or index out of bounds.", { len: checkoutSteps.length, idx: currentStepIndex });
        return (
             <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <Card className="w-full max-w-2xl p-6 text-center">Loading checkout state...</Card>
             </div>
        );
    }

    // Get current step details safely
    const currentStep = checkoutSteps[currentStepIndex];

    // --- RENDER JSX ---
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"> {/* Added backdrop */}
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl rounded-lg"> {/* Added style */}
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b"> {/* Added style */}
              <h2 className="text-2xl font-bold">Checkout</h2>
              <Button variant="ghost" size="icon" onClick={handleCancel} aria-label="Close checkout"> {/* Use icon button */}
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4 px-2 sm:px-4"> {/* Added padding */}
                {checkoutSteps.map((step, index) => (
                  // Use React.Fragment for keys when mapping without a wrapping element
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center text-center"> {/* Stack icon and text */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 mb-1 ${
                          step.completed
                            ? "bg-primary border-primary text-primary-foreground"
                            : index === currentStepIndex
                              ? "border-primary text-primary bg-primary/10"
                              : "border-muted text-muted-foreground bg-muted"
                        }`}
                        aria-current={index === currentStepIndex ? "step" : undefined}
                      >
                        {step.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
                      </div>
                      <span className={`text-xs ${index === currentStepIndex ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{step.name}</span>
                    </div>
                    {/* Connector line */}
                    {index < checkoutSteps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${step.completed ? "bg-primary" : "bg-muted"}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <Card className="p-4 mb-6 bg-muted/50 rounded"> {/* Added style */}
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Order Summary
              </h3>
              <div className="space-y-1 text-sm"> {/* Adjusted spacing/size */}
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.name}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (Est.):</span>
                    <span>${order.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg mt-1">
                    <span>Total:</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Current Step Content Area */}
            <div className="mb-6 min-h-[120px] flex items-center justify-center text-center"> {/* Centered content */}
              {currentStep?.id === "review" && (
                  <p className="text-muted-foreground">Please review your order above. Say <strong className="text-foreground">"next"</strong> or click continue.</p>
              )}
              {currentStep?.id === "confirm" && (
                  <p className="text-muted-foreground">Confirm order for ${order.total.toFixed(2)}. Say <strong className="text-foreground">"confirm"</strong> or click continue.</p>
              )}
              {currentStep?.id === "payment" && (
                <div>
                  <CreditCard className="h-10 w-10 mx-auto mb-3 text-primary" />
                  <p className="text-muted-foreground">
                    {isProcessing
                      ? "Processing payment..."
                      : `Ready to pay ${order.total.toFixed(2)}. Say "pay now" or click button.`}
                  </p>
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              )}
              {currentStep?.id === "complete" && (
                <div>
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
                  <p className="text-lg font-semibold mb-1">Order Complete!</p>
                  <p className="text-muted-foreground text-sm">
                    Order ID: {order.id}. You'll hear receipt details shortly.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t"> {/* Added style */}
              <Button variant="outline" onClick={handleCancel} className="flex-1 bg-transparent">
                Cancel Checkout
              </Button>
              {/* Only show Continue/Pay button if not on the final step */}
              {currentStep?.id !== "complete" && (
                 <Button onClick={handleNextStep} disabled={isProcessing} className="flex-1">
                   {isProcessing ? (
                     <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" /> Processing...
                     </>
                   ) :
                    currentStep?.id === "review" ? "Continue to Confirm" :
                    currentStep?.id === "confirm" ? "Confirm & Pay" :
                    currentStep?.id === "payment" ? `Pay $${order.total.toFixed(2)} Now` :
                    "Continue"}
                 </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }
);

// Add display name for easier debugging in React DevTools
CheckoutModal.displayName = "CheckoutModal";












// "use client"

// import { useState, useEffect } from "react"
// import { Card } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { CheckCircle, Clock, CreditCard, ShoppingBag, X } from "lucide-react"
// import { CheckoutManager, type Order, type CheckoutStep } from "@/lib/checkout-manager"

// interface CheckoutModalProps {
//   isOpen: boolean
//   onClose: () => void
//   onSpeak: (message: string, priority?: "high" | "normal") => void
//   order: Order | null
//    onComplete?: () => void;
// }

// export function CheckoutModal({ isOpen, onClose, onSpeak, order }: CheckoutModalProps) {
//   const [checkoutSteps, setCheckoutSteps] = useState<CheckoutStep[]>([])
//   const [isProcessing, setIsProcessing] = useState(false)
//   const [currentStepIndex, setCurrentStepIndex] = useState(0)
//   const [checkoutManager] = useState(() => CheckoutManager.getInstance())

//   useEffect(() => {
//     if (isOpen && order) {
//       setCheckoutSteps(checkoutManager.getCheckoutSteps())
//       setCurrentStepIndex(0)
//       onSpeak("Starting checkout process. I'll guide you through each step.", "high")
//     }
//   }, [isOpen, order, checkoutManager, onSpeak])

//   const handleNextStep = async () => {
//     if (!order || currentStepIndex >= checkoutSteps.length) return

//     const currentStep = checkoutSteps[currentStepIndex]
//     setIsProcessing(true)

//     try {
//       switch (currentStep.id) {
//         case "review":
//           onSpeak(checkoutManager.getOrderSummary(), "high")
//           checkoutManager.completeStep("review")
//           break

//         case "confirm":
//           onSpeak("Order confirmed. Proceeding to payment processing.", "high")
//           checkoutManager.completeStep("confirm")
//           break

//         case "payment":
//           onSpeak("Processing payment. Please wait...", "high")
//           const paymentResult = await checkoutManager.processPayment()

//           if (paymentResult.success) {
//             onSpeak(paymentResult.message, "high")
//           } else {
//             onSpeak(paymentResult.message, "high")
//             setIsProcessing(false)
//             return
//           }
//           break

//         case "complete":
//           const receipt = checkoutManager.getReceipt()
//           onSpeak(receipt, "high")
//           setTimeout(() => {
//             onClose()
//           }, 3000)
//           break
//       }

//       // Update steps and move to next
//       const updatedSteps = checkoutManager.getCheckoutSteps()
//       setCheckoutSteps(updatedSteps)

//       if (currentStepIndex < checkoutSteps.length - 1) {
//         setCurrentStepIndex(currentStepIndex + 1)
//       }
//     } catch (error) {
//       console.error("Checkout step error:", error)
//       onSpeak("An error occurred during checkout. Please try again.", "high")
//     } finally {
//       setIsProcessing(false)
//     }
//   }

//   const handleCancel = () => {
//     const result = checkoutManager.cancelCheckout()
//     onSpeak(result.message, "high")
//     onClose()
//   }

//   if (!isOpen || !order) return null

//   const currentStep = checkoutSteps[currentStepIndex]
//   const isLastStep = currentStepIndex === checkoutSteps.length - 1

//   return (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
//       <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//         <div className="p-6">
//           {/* Header */}
//           <div className="flex items-center justify-between mb-6">
//             <h2 className="text-2xl font-bold">Checkout</h2>
//             <Button variant="ghost" size="sm" onClick={handleCancel}>
//               <X className="h-4 w-4" />
//             </Button>
//           </div>

//           {/* Progress Steps */}
//           <div className="mb-8">
//             <div className="flex items-center justify-between mb-4">
//               {checkoutSteps.map((step, index) => (
//                 <div key={step.id} className="flex items-center">
//                   <div
//                     className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
//                       step.completed
//                         ? "bg-primary text-primary-foreground"
//                         : index === currentStepIndex
//                           ? "bg-primary/20 text-primary border-2 border-primary"
//                           : "bg-muted text-muted-foreground"
//                     }`}
//                   >
//                     {step.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
//                   </div>
//                   {index < checkoutSteps.length - 1 && (
//                     <div className={`w-16 h-0.5 mx-2 ${step.completed ? "bg-primary" : "bg-muted"}`} />
//                   )}
//                 </div>
//               ))}
//             </div>
//             <div className="text-center">
//               <h3 className="font-semibold">{currentStep?.name}</h3>
//               <p className="text-sm text-muted-foreground">{currentStep?.description}</p>
//             </div>
//           </div>

//           {/* Order Summary */}
//           <Card className="p-4 mb-6">
//             <h3 className="font-semibold mb-3 flex items-center gap-2">
//               <ShoppingBag className="h-4 w-4" />
//               Order Summary
//             </h3>
//             <div className="space-y-2">
//               {order.items.map((item) => (
//                 <div key={item.id} className="flex justify-between items-center">
//                   <span>
//                     {item.quantity}x {item.name}
//                   </span>
//                   <span>${(item.price * item.quantity).toFixed(2)}</span>
//                 </div>
//               ))}
//               <div className="border-t pt-2 mt-2">
//                 <div className="flex justify-between">
//                   <span>Subtotal:</span>
//                   <span>${order.subtotal.toFixed(2)}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Tax:</span>
//                   <span>${order.tax.toFixed(2)}</span>
//                 </div>
//                 <div className="flex justify-between font-semibold text-lg">
//                   <span>Total:</span>
//                   <span>${order.total.toFixed(2)}</span>
//                 </div>
//               </div>
//             </div>
//           </Card>

//           {/* Current Step Content */}
//           <div className="mb-6">
//             {currentStep?.id === "review" && (
//               <div className="text-center">
//                 <p className="text-muted-foreground mb-4">
//                   Please review your order above. Say "next" or click continue to proceed.
//                 </p>
//               </div>
//             )}

//             {currentStep?.id === "confirm" && (
//               <div className="text-center">
//                 <p className="text-muted-foreground mb-4">
//                   Confirm your order of {order.items.reduce((sum, item) => sum + item.quantity, 0)} items for $
//                   {order.total.toFixed(2)}. Say "confirm" or click continue to proceed to payment.
//                 </p>
//               </div>
//             )}

//             {currentStep?.id === "payment" && (
//               <div className="text-center">
//                 <CreditCard className="h-12 w-12 mx-auto mb-4 text-primary" />
//                 <p className="text-muted-foreground mb-4">
//                   {isProcessing
//                     ? "Processing your payment. Please wait..."
//                     : "Ready to process payment. Say 'pay now' or click continue to complete your purchase."}
//                 </p>
//                 {isProcessing && (
//                   <div className="flex items-center justify-center gap-2">
//                     <Clock className="h-4 w-4 animate-spin" />
//                     <span className="text-sm">Processing...</span>
//                   </div>
//                 )}
//               </div>
//             )}

//             {currentStep?.id === "complete" && (
//               <div className="text-center">
//                 <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
//                 <p className="text-lg font-semibold mb-2">Order Complete!</p>
//                 <p className="text-muted-foreground mb-4">
//                   Your order {order.id} has been processed successfully. A receipt has been provided via voice.
//                 </p>
//               </div>
//             )}
//           </div>

//           {/* Action Buttons */}
//           <div className="flex gap-4">
//             <Button variant="outline" onClick={handleCancel} className="flex-1 bg-transparent">
//               Cancel
//             </Button>
//             {!isLastStep && (
//               <Button onClick={handleNextStep} disabled={isProcessing} className="flex-1">
//                 {isProcessing ? "Processing..." : "Continue"}
//               </Button>
//             )}
//           </div>
//         </div>
//       </Card>
//     </div>
//   )
// }
