import type { CartItem } from "./cart-manager";
import { findProduct } from "./product-database"; // Import findProduct if needed for validation

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: Date;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"; // Added cancelled
}

export interface CheckoutStep {
  id: string;
  name: string;
  description: string;
  completed: boolean;
}

export class CheckoutManager {
  private static instance: CheckoutManager;
  private currentOrder: Order | null = null;
  // Make steps mutable within the class instance
  private checkoutSteps: CheckoutStep[] = [
    { id: "review", name: "Review", description: "Review items", completed: false },
    { id: "confirm", name: "Confirm", description: "Confirm order", completed: false },
    { id: "payment", name: "Payment", description: "Process payment", completed: false },
    { id: "complete", name: "Complete", description: "Order finished", completed: false },
  ];
  private readonly TAX_RATE = 0.08; // Example tax rate (8%)

  private constructor() {}

  static getInstance(): CheckoutManager {
    if (!CheckoutManager.instance) {
      CheckoutManager.instance = new CheckoutManager();
    }
    return CheckoutManager.instance;
  }

  // --- ADDED resetSteps ---
  resetSteps(): void {
    this.checkoutSteps.forEach(step => step.completed = false);
    console.log("CheckoutManager: Steps reset.");
  }
  // ------------------------

  startCheckout(cartItems: CartItem[]): { success: boolean; message: string; order?: Order } {
    console.log("CheckoutManager: startCheckout called.");
    if (cartItems.length === 0) {
      return { success: false, message: "Cannot checkout empty cart." };
    }

    // Reset steps for the new checkout process
    this.resetSteps();

    // Perform validation before creating order (example)
    const validation = this.validateCartItems(cartItems);
    if (!validation.valid) {
        return { success: false, message: `Cart validation failed: ${validation.issues.join(', ')}` };
    }


    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + tax;

    // Create order object
    this.currentOrder = {
      id: `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // More unique ID
      items: cartItems.map((item) => ({ // Map CartItem to OrderItem
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
      status: "pending", // Initial status
    };

    console.log(`CheckoutManager: Checkout started for order ${this.currentOrder.id}.`);
    return {
      success: true,
      message: "Checkout started.",
      order: { ...this.currentOrder }, // Return a copy
    };
  }

  // Helper for validation during checkout start (optional but good)
  validateCartItems(cartItems: CartItem[]): { valid: boolean; issues: string[] } {
     const issues: string[] = [];
     cartItems.forEach(item => {
         const productInfo = findProduct(item.name);
         if (!productInfo) {
             issues.push(`Item '${item.name}' no longer available.`);
         } else if (!productInfo.inStock) {
              issues.push(`'${item.name}' is out of stock.`);
         } else if (productInfo.price !== item.price) {
             // Decide how to handle price changes: notify only, block checkout, or update cart?
             // For now, just notify.
             console.warn(`Price discrepancy for ${item.name}: Cart price ${item.price}, DB price ${productInfo.price}`);
             // issues.push(`Price for '${item.name}' has changed.`);
         }
         if (item.quantity <= 0) {
            issues.push(`Invalid quantity for '${item.name}'.`);
         }
     });
     return { valid: issues.length === 0, issues };
  }


  getCurrentOrder(): Order | null {
    // Return a copy to prevent external modification
    return this.currentOrder ? { ...this.currentOrder } : null;
  }

  getCheckoutSteps(): CheckoutStep[] {
    // Return a copy of the steps array
    return this.checkoutSteps.map(step => ({ ...step }));
  }

  completeStep(stepId: string): { success: boolean; message: string } {
     console.log(`CheckoutManager: Attempting to complete step '${stepId}'.`);
     const step = this.checkoutSteps.find((s) => s.id === stepId);

    if (!step) {
      return { success: false, message: `Invalid step ID: ${stepId}` };
    }
    if (step.completed) {
       console.log(`Step '${stepId}' already completed.`);
      return { success: false, message: `Step ${step.name} already done.` };
    }

    // Optionally add logic to ensure previous steps are completed first
    const currentStepIndex = this.checkoutSteps.findIndex(s => s.id === stepId);
    if (currentStepIndex > 0) {
        const previousStep = this.checkoutSteps[currentStepIndex - 1];
        if (!previousStep.completed) {
            console.warn(`Cannot complete step '${stepId}' before '${previousStep.id}'.`);
            return { success: false, message: `Please complete step '${previousStep.name}' first.` };
        }
    }


    step.completed = true;
    console.log(`Step '${stepId}' marked as completed.`);

    // Update order status based on completed step
    if (this.currentOrder) {
        if (stepId === 'payment' && this.currentOrder.status !== 'failed') { // Only if payment itself didn't fail
            this.currentOrder.status = 'processing'; // Or directly to completed if payment is final
        }
         if (stepId === 'complete') {
             this.currentOrder.status = 'completed';
         }
    }


    return { success: true, message: `Completed step: ${step.name}` };
  }

  getOrderSummary(): string {
    if (!this.currentOrder) return "No active order.";

    const itemCount = this.currentOrder.items.reduce((sum, item) => sum + item.quantity, 0);
    const itemsList = this.currentOrder.items
      .map((item) => `${item.quantity} ${item.name}${item.quantity > 1 ? "s" : ""}`)
      .join(", ");

    return `Order Review: ${itemCount} item${itemCount !== 1 ? 's' : ''} (${itemsList}). Subtotal: $${this.currentOrder.subtotal.toFixed(2)}, Tax: $${this.currentOrder.tax.toFixed(2)}, Total: $${this.currentOrder.total.toFixed(2)}.`;
  }

  // Simulate payment processing
  async processPayment(): Promise<{ success: boolean; message: string }> {
    console.log("CheckoutManager: processPayment called.");
    if (!this.currentOrder || this.currentOrder.status === 'completed' || this.currentOrder.status === 'failed' || this.currentOrder.status === 'cancelled') {
        console.warn(`processPayment: Invalid order state (${this.currentOrder?.status})`);
      return { success: false, message: "No active order to process payment for or order already processed/failed." };
    }
     // Ensure previous steps are done
     if (!this.checkoutSteps.find(s=>s.id === 'confirm')?.completed) {
         console.warn("processPayment: Confirmation step not completed.");
         return { success: false, message: "Please confirm the order before payment." };
     }


    this.currentOrder.status = 'processing'; // Update status
    console.log(`Order ${this.currentOrder.id} status set to processing.`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2500)); // 2.5 seconds delay

    // Simulate success/failure
    const paymentSuccess = Math.random() > 0.15; // 85% success rate

    if (paymentSuccess) {
        console.log(`Order ${this.currentOrder.id} payment successful.`);
        // Mark payment and complete steps as done
        this.completeStep("payment");
        this.completeStep("complete"); // Auto-complete on successful payment
        // Status will be updated to 'completed' by completeStep('complete')

        return {
            success: true,
            message: `Payment successful! Order ${this.currentOrder.id} is complete.`,
        };
    } else {
        console.log(`Order ${this.currentOrder.id} payment failed.`);
        if (this.currentOrder) { // Check again as state might change
            this.currentOrder.status = "failed";
        }
        // Do not mark payment step as complete on failure
        // Reset 'confirm' step completion? Optional, allows re-confirmation.
        // const confirmStep = this.checkoutSteps.find(s => s.id === 'confirm');
        // if (confirmStep) confirmStep.completed = false;

        return {
            success: false,
            message: "Payment failed. Please try again or cancel checkout.",
        };
    }
  }

  getReceipt(): string {
    if (!this.currentOrder) return "No order found.";
    if (this.currentOrder.status !== "completed") {
        return `Order ${this.currentOrder.id} is not yet complete (Status: ${this.currentOrder.status}).`;
    }

    const itemsList = this.currentOrder.items
      .map((item) => `${item.quantity}x ${item.name} @ $${item.price.toFixed(2)} = $${(item.price * item.quantity).toFixed(2)}`)
      .join("\n"); // Use newline for better readability if spoken

    return `Receipt for Order ${this.currentOrder.id}:\n${itemsList}\nSubtotal: $${this.currentOrder.subtotal.toFixed(2)}\nTax: $${this.currentOrder.tax.toFixed(2)}\nTotal: $${this.currentOrder.total.toFixed(2)}\nCompleted: ${this.currentOrder.createdAt.toLocaleString()}. Thank you!`;
  }

  cancelCheckout(): { success: boolean; message: string } {
    console.log("CheckoutManager: cancelCheckout called.");
    if (!this.currentOrder || !this.isCheckoutInProgress()) {
      return { success: false, message: "No active checkout to cancel." };
    }

    const orderId = this.currentOrder.id;
    this.currentOrder.status = 'cancelled'; // Mark as cancelled
    // Keep order data but mark cancelled, or nullify? Let's nullify for simplicity now.
    this.currentOrder = null;
    this.resetSteps(); // Reset step completion status

    console.log(`Checkout for order ${orderId} cancelled.`);
    return { success: true, message: "Checkout cancelled." };
  }

  isCheckoutInProgress(): boolean {
    // Checkout is in progress if there's an order and its status is pending or processing
    return !!this.currentOrder && (this.currentOrder.status === "pending" || this.currentOrder.status === "processing");
  }
}

















// import type { CartItem } from "./cart-manager"

// export interface OrderItem {
//   id: string
//   name: string
//   price: number
//   quantity: number
//   description: string
// }

// export interface Order {
//   id: string
//   items: OrderItem[]
//   subtotal: number
//   tax: number
//   total: number
//   createdAt: Date
//   status: "pending" | "processing" | "completed" | "failed"
// }

// export interface CheckoutStep {
//   id: string
//   name: string
//   description: string
//   completed: boolean
// }

// export class CheckoutManager {
//   private static instance: CheckoutManager
//   private currentOrder: Order | null = null
//   private checkoutSteps: CheckoutStep[] = [
//     {
//       id: "review",
//       name: "Review Cart",
//       description: "Review your items and total",
//       completed: false,
//     },
//     {
//       id: "confirm",
//       name: "Confirm Order",
//       description: "Confirm your order details",
//       completed: false,
//     },
//     {
//       id: "payment",
//       name: "Process Payment",
//       description: "Process payment information",
//       completed: false,
//     },
//     {
//       id: "complete",
//       name: "Order Complete",
//       description: "Order confirmation and receipt",
//       completed: false,
//     },
//   ]

//   private constructor() {}

//   static getInstance(): CheckoutManager {
//     if (!CheckoutManager.instance) {
//       CheckoutManager.instance = new CheckoutManager()
//     }
//     return CheckoutManager.instance
//   }

//   startCheckout(cartItems: CartItem[]): { success: boolean; message: string; order?: Order } {
//     if (cartItems.length === 0) {
//       return {
//         success: false,
//         message: "Cannot checkout with an empty cart.",
//       }
//     }

//     // Reset checkout steps
//     this.checkoutSteps.forEach((step) => (step.completed = false))

//     // Calculate totals
//     const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
//     const taxRate = 0.08 // 8% tax
//     const tax = subtotal * taxRate
//     const total = subtotal + tax

//     // Create order
//     this.currentOrder = {
//       id: `ORDER-${Date.now()}`,
//       items: cartItems.map((item) => ({
//         id: item.id,
//         name: item.name,
//         price: item.price,
//         quantity: item.quantity,
//         description: item.description,
//       })),
//       subtotal,
//       tax,
//       total,
//       createdAt: new Date(),
//       status: "pending",
//     }

//     return {
//       success: true,
//       message: "Checkout started successfully.",
//       order: this.currentOrder,
//     }
//   }

//   getCurrentOrder(): Order | null {
//     return this.currentOrder
//   }

//   getCheckoutSteps(): CheckoutStep[] {
//     return [...this.checkoutSteps]
//   }


//   completeStep(stepId: string): { success: boolean; message: string } {
//     const step = this.checkoutSteps.find((s) => s.id === stepId)

//     if (!step) {
//       return {
//         success: false,
//         message: `Invalid checkout step: ${stepId}`,
//       }
//     }

//     if (step.completed) {
//       return {
//         success: false,
//         message: `Step ${step.name} is already completed.`,
//       }
//     }

//     step.completed = true

//     return {
//       success: true,
//       message: `Completed step: ${step.name}`,
//     }
//   }

//   getOrderSummary(): string {
//     if (!this.currentOrder) {
//       return "No active order found."
//     }

//     const itemCount = this.currentOrder.items.reduce((sum, item) => sum + item.quantity, 0)
//     const itemsList = this.currentOrder.items
//       .map((item) => `${item.quantity} ${item.name}${item.quantity > 1 ? "s" : ""}`)
//       .join(", ")

//     return `Order ${this.currentOrder.id}: ${itemCount} items (${itemsList}). Subtotal: $${this.currentOrder.subtotal.toFixed(2)}, Tax: $${this.currentOrder.tax.toFixed(2)}, Total: $${this.currentOrder.total.toFixed(2)}.`
//   }

//   async processPayment(): Promise<{ success: boolean; message: string }> {
//     if (!this.currentOrder) {
//       return {
//         success: false,
//         message: "No active order to process payment for.",
//       }
//     }

//     // Simulate payment processing delay
//     await new Promise((resolve) => setTimeout(resolve, 2000))

//     // Simulate payment success (90% success rate for demo)
//     const paymentSuccess = Math.random() > 0.1

//     if (paymentSuccess) {
//       this.currentOrder.status = "completed"
//       this.completeStep("payment")
//       this.completeStep("complete")

//       return {
//         success: true,
//         message: `Payment processed successfully. Order ${this.currentOrder.id} is complete.`,
//       }
//     } else {
//       this.currentOrder.status = "failed"

//       return {
//         success: false,
//         message: "Payment processing failed. Please try again or use a different payment method.",
//       }
//     }
//   }

//   getReceipt(): string {
//     if (!this.currentOrder || this.currentOrder.status !== "completed") {
//       return "No completed order found."
//     }

//     const itemsList = this.currentOrder.items
//       .map((item) => `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`)
//       .join(", ")

//     return `Receipt for Order ${this.currentOrder.id}: ${itemsList}. Subtotal: $${this.currentOrder.subtotal.toFixed(2)}, Tax: $${this.currentOrder.tax.toFixed(2)}, Total: $${this.currentOrder.total.toFixed(2)}. Order completed at ${this.currentOrder.createdAt.toLocaleString()}. Thank you for your purchase!`
//   }

//   cancelCheckout(): { success: boolean; message: string } {
//     if (!this.currentOrder) {
//       return {
//         success: false,
//         message: "No active checkout to cancel.",
//       }
//     }

//     this.currentOrder = null
//     this.checkoutSteps.forEach((step) => (step.completed = false))

//     return {
//       success: true,
//       message: "Checkout cancelled successfully.",
//     }
//   }

//   isCheckoutInProgress(): boolean {
//     return this.currentOrder !== null && this.currentOrder.status === "pending"
//   }
// }
