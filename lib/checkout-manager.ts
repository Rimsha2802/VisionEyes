import type { CartItem } from "./cart-manager"

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  description: string
}

export interface Order {
  id: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  createdAt: Date
  status: "pending" | "processing" | "completed" | "failed"
}

export interface CheckoutStep {
  id: string
  name: string
  description: string
  completed: boolean
}

export class CheckoutManager {
  private static instance: CheckoutManager
  private currentOrder: Order | null = null
  private checkoutSteps: CheckoutStep[] = [
    {
      id: "review",
      name: "Review Cart",
      description: "Review your items and total",
      completed: false,
    },
    {
      id: "confirm",
      name: "Confirm Order",
      description: "Confirm your order details",
      completed: false,
    },
    {
      id: "payment",
      name: "Process Payment",
      description: "Process payment information",
      completed: false,
    },
    {
      id: "complete",
      name: "Order Complete",
      description: "Order confirmation and receipt",
      completed: false,
    },
  ]

  private constructor() {}

  static getInstance(): CheckoutManager {
    if (!CheckoutManager.instance) {
      CheckoutManager.instance = new CheckoutManager()
    }
    return CheckoutManager.instance
  }

  startCheckout(cartItems: CartItem[]): { success: boolean; message: string; order?: Order } {
    if (cartItems.length === 0) {
      return {
        success: false,
        message: "Cannot checkout with an empty cart.",
      }
    }

    // Reset checkout steps
    this.checkoutSteps.forEach((step) => (step.completed = false))

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const taxRate = 0.08 // 8% tax
    const tax = subtotal * taxRate
    const total = subtotal + tax

    // Create order
    this.currentOrder = {
      id: `ORDER-${Date.now()}`,
      items: cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        description: item.description,
      })),
      subtotal,
      tax,
      total,
      createdAt: new Date(),
      status: "pending",
    }

    return {
      success: true,
      message: "Checkout started successfully.",
      order: this.currentOrder,
    }
  }

  getCurrentOrder(): Order | null {
    return this.currentOrder
  }

  getCheckoutSteps(): CheckoutStep[] {
    return [...this.checkoutSteps]
  }

  completeStep(stepId: string): { success: boolean; message: string } {
    const step = this.checkoutSteps.find((s) => s.id === stepId)

    if (!step) {
      return {
        success: false,
        message: `Invalid checkout step: ${stepId}`,
      }
    }

    if (step.completed) {
      return {
        success: false,
        message: `Step ${step.name} is already completed.`,
      }
    }

    step.completed = true

    return {
      success: true,
      message: `Completed step: ${step.name}`,
    }
  }

  getOrderSummary(): string {
    if (!this.currentOrder) {
      return "No active order found."
    }

    const itemCount = this.currentOrder.items.reduce((sum, item) => sum + item.quantity, 0)
    const itemsList = this.currentOrder.items
      .map((item) => `${item.quantity} ${item.name}${item.quantity > 1 ? "s" : ""}`)
      .join(", ")

    return `Order ${this.currentOrder.id}: ${itemCount} items (${itemsList}). Subtotal: $${this.currentOrder.subtotal.toFixed(2)}, Tax: $${this.currentOrder.tax.toFixed(2)}, Total: $${this.currentOrder.total.toFixed(2)}.`
  }

  async processPayment(): Promise<{ success: boolean; message: string }> {
    if (!this.currentOrder) {
      return {
        success: false,
        message: "No active order to process payment for.",
      }
    }

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Simulate payment success (90% success rate for demo)
    const paymentSuccess = Math.random() > 0.1

    if (paymentSuccess) {
      this.currentOrder.status = "completed"
      this.completeStep("payment")
      this.completeStep("complete")

      return {
        success: true,
        message: `Payment processed successfully. Order ${this.currentOrder.id} is complete.`,
      }
    } else {
      this.currentOrder.status = "failed"

      return {
        success: false,
        message: "Payment processing failed. Please try again or use a different payment method.",
      }
    }
  }

  getReceipt(): string {
    if (!this.currentOrder || this.currentOrder.status !== "completed") {
      return "No completed order found."
    }

    const itemsList = this.currentOrder.items
      .map((item) => `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`)
      .join(", ")

    return `Receipt for Order ${this.currentOrder.id}: ${itemsList}. Subtotal: $${this.currentOrder.subtotal.toFixed(2)}, Tax: $${this.currentOrder.tax.toFixed(2)}, Total: $${this.currentOrder.total.toFixed(2)}. Order completed at ${this.currentOrder.createdAt.toLocaleString()}. Thank you for your purchase!`
  }

  cancelCheckout(): { success: boolean; message: string } {
    if (!this.currentOrder) {
      return {
        success: false,
        message: "No active checkout to cancel.",
      }
    }

    this.currentOrder = null
    this.checkoutSteps.forEach((step) => (step.completed = false))

    return {
      success: true,
      message: "Checkout cancelled successfully.",
    }
  }

  isCheckoutInProgress(): boolean {
    return this.currentOrder !== null && this.currentOrder.status === "pending"
  }
}
