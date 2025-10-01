"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, CreditCard, ShoppingBag, X } from "lucide-react"
import { CheckoutManager, type Order, type CheckoutStep } from "@/lib/checkout-manager"

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  onSpeak: (message: string, priority?: "high" | "normal") => void
  order: Order | null
}

export function CheckoutModal({ isOpen, onClose, onSpeak, order }: CheckoutModalProps) {
  const [checkoutSteps, setCheckoutSteps] = useState<CheckoutStep[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [checkoutManager] = useState(() => CheckoutManager.getInstance())

  useEffect(() => {
    if (isOpen && order) {
      setCheckoutSteps(checkoutManager.getCheckoutSteps())
      setCurrentStepIndex(0)
      onSpeak("Starting checkout process. I'll guide you through each step.", "high")
    }
  }, [isOpen, order, checkoutManager, onSpeak])

  const handleNextStep = async () => {
    if (!order || currentStepIndex >= checkoutSteps.length) return

    const currentStep = checkoutSteps[currentStepIndex]
    setIsProcessing(true)

    try {
      switch (currentStep.id) {
        case "review":
          onSpeak(checkoutManager.getOrderSummary(), "high")
          checkoutManager.completeStep("review")
          break

        case "confirm":
          onSpeak("Order confirmed. Proceeding to payment processing.", "high")
          checkoutManager.completeStep("confirm")
          break

        case "payment":
          onSpeak("Processing payment. Please wait...", "high")
          const paymentResult = await checkoutManager.processPayment()

          if (paymentResult.success) {
            onSpeak(paymentResult.message, "high")
          } else {
            onSpeak(paymentResult.message, "high")
            setIsProcessing(false)
            return
          }
          break

        case "complete":
          const receipt = checkoutManager.getReceipt()
          onSpeak(receipt, "high")
          setTimeout(() => {
            onClose()
          }, 3000)
          break
      }

      // Update steps and move to next
      const updatedSteps = checkoutManager.getCheckoutSteps()
      setCheckoutSteps(updatedSteps)

      if (currentStepIndex < checkoutSteps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1)
      }
    } catch (error) {
      console.error("Checkout step error:", error)
      onSpeak("An error occurred during checkout. Please try again.", "high")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    const result = checkoutManager.cancelCheckout()
    onSpeak(result.message, "high")
    onClose()
  }

  if (!isOpen || !order) return null

  const currentStep = checkoutSteps[currentStepIndex]
  const isLastStep = currentStepIndex === checkoutSteps.length - 1

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Checkout</h2>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {checkoutSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.completed
                        ? "bg-primary text-primary-foreground"
                        : index === currentStepIndex
                          ? "bg-primary/20 text-primary border-2 border-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < checkoutSteps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 ${step.completed ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <h3 className="font-semibold">{currentStep?.name}</h3>
              <p className="text-sm text-muted-foreground">{currentStep?.description}</p>
            </div>
          </div>

          {/* Order Summary */}
          <Card className="p-4 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Order Summary
            </h3>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Current Step Content */}
          <div className="mb-6">
            {currentStep?.id === "review" && (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Please review your order above. Say "next" or click continue to proceed.
                </p>
              </div>
            )}

            {currentStep?.id === "confirm" && (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Confirm your order of {order.items.reduce((sum, item) => sum + item.quantity, 0)} items for $
                  {order.total.toFixed(2)}. Say "confirm" or click continue to proceed to payment.
                </p>
              </div>
            )}

            {currentStep?.id === "payment" && (
              <div className="text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground mb-4">
                  {isProcessing
                    ? "Processing your payment. Please wait..."
                    : "Ready to process payment. Say 'pay now' or click continue to complete your purchase."}
                </p>
                {isProcessing && (
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </div>
                )}
              </div>
            )}

            {currentStep?.id === "complete" && (
              <div className="text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-semibold mb-2">Order Complete!</p>
                <p className="text-muted-foreground mb-4">
                  Your order {order.id} has been processed successfully. A receipt has been provided via voice.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleCancel} className="flex-1 bg-transparent">
              Cancel
            </Button>
            {!isLastStep && (
              <Button onClick={handleNextStep} disabled={isProcessing} className="flex-1">
                {isProcessing ? "Processing..." : "Continue"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
