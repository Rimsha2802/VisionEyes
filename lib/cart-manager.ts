import { findProduct } from "./product-database"

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  description: string
  addedAt: Date
}

export interface CartState {
  items: CartItem[]
  total: number
  itemCount: number
  lastModified: Date
}

export class CartManager {
  private static instance: CartManager
  private cart: CartItem[] = []
  private listeners: ((cart: CartItem[]) => void)[] = []
  private storageKey = "ai-shopping-cart"

  private constructor() {
    this.loadFromStorage()
  }

  static getInstance(): CartManager {
    if (!CartManager.instance) {
      CartManager.instance = new CartManager()
    }
    return CartManager.instance
  }

  // Subscribe to cart changes
  subscribe(listener: (cart: CartItem[]) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener([...this.cart]))
    this.saveToStorage()
  }

  private loadFromStorage(): void {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(this.storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          this.cart = parsed.map((item: any) => ({
            ...item,
            addedAt: new Date(item.addedAt),
          }))
        }
      } catch (error) {
        console.error("Failed to load cart from storage:", error)
        this.cart = []
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.cart))
      } catch (error) {
        console.error("Failed to save cart to storage:", error)
      }
    }
  }

  addItem(productName: string): { success: boolean; message: string; item?: CartItem } {
    const product = findProduct(productName)

    if (!product) {
      return {
        success: false,
        message: `Product "${productName}" not found in database`,
      }
    }

    const existingItem = this.cart.find((item) => item.name.toLowerCase() === product.name.toLowerCase())

    if (existingItem) {
      existingItem.quantity += 1
      this.notifyListeners()
      return {
        success: true,
        message: `Added another ${product.name}. You now have ${existingItem.quantity}.`,
        item: existingItem,
      }
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        description: product.description,
        addedAt: new Date(),
      }
      this.cart.push(newItem)
      this.notifyListeners()
      return {
        success: true,
        message: `Added ${product.name} to cart for $${product.price}.`,
        item: newItem,
      }
    }
  }

  removeItem(productName: string, removeAll = false): { success: boolean; message: string } {
    const existingItemIndex = this.cart.findIndex((item) => item.name.toLowerCase() === productName.toLowerCase())

    if (existingItemIndex === -1) {
      return {
        success: false,
        message: `${productName} is not in your cart.`,
      }
    }

    const existingItem = this.cart[existingItemIndex]

    if (removeAll || existingItem.quantity === 1) {
      this.cart.splice(existingItemIndex, 1)
      this.notifyListeners()
      return {
        success: true,
        message: `Removed ${productName} from your cart completely.`,
      }
    } else {
      existingItem.quantity -= 1
      this.notifyListeners()
      return {
        success: true,
        message: `Removed one ${productName}. You now have ${existingItem.quantity}.`,
      }
    }
  }

  updateQuantity(productName: string, quantity: number): { success: boolean; message: string } {
    if (quantity < 0) {
      return { success: false, message: "Quantity cannot be negative." }
    }

    if (quantity === 0) {
      return this.removeItem(productName, true)
    }

    const existingItem = this.cart.find((item) => item.name.toLowerCase() === productName.toLowerCase())

    if (!existingItem) {
      return {
        success: false,
        message: `${productName} is not in your cart.`,
      }
    }

    existingItem.quantity = quantity
    this.notifyListeners()
    return {
      success: true,
      message: `Updated ${productName} quantity to ${quantity}.`,
    }
  }

  getCart(): CartItem[] {
    return [...this.cart]
  }

  getCartState(): CartState {
    const total = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const itemCount = this.cart.reduce((sum, item) => sum + item.quantity, 0)

    return {
      items: [...this.cart],
      total,
      itemCount,
      lastModified: new Date(),
    }
  }

  clearCart(): { success: boolean; message: string } {
    const itemCount = this.cart.reduce((sum, item) => sum + item.quantity, 0)
    this.cart = []
    this.notifyListeners()
    return {
      success: true,
      message: `Cleared ${itemCount} items from your cart.`,
    }
  }

  getCartSummary(): string {
    if (this.cart.length === 0) {
      return "Your cart is empty."
    }

    const itemCount = this.cart.reduce((sum, item) => sum + item.quantity, 0)
    const total = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const itemsList = this.cart
      .map((item) => {
        const itemTotal = (item.price * item.quantity).toFixed(2)
        return `${item.quantity} ${item.name}${item.quantity > 1 ? "s" : ""} for $${itemTotal}`
      })
      .join(", ")

    return `Your cart contains ${itemCount} items: ${itemsList}. Total: $${total.toFixed(2)}.`
  }

  findItemByName(name: string): CartItem | null {
    return this.cart.find((item) => item.name.toLowerCase().includes(name.toLowerCase())) || null
  }

  getItemsByCategory(): { [category: string]: CartItem[] } {
    const categorized: { [category: string]: CartItem[] } = {}

    this.cart.forEach((item) => {
      const product = findProduct(item.name)
      const category = product?.category || "other"

      if (!categorized[category]) {
        categorized[category] = []
      }
      categorized[category].push(item)
    })

    return categorized
  }

  validateCart(): { valid: boolean; issues: string[] } {
    const issues: string[] = []

    this.cart.forEach((item) => {
      const product = findProduct(item.name)

      if (!product) {
        issues.push(`Product "${item.name}" no longer exists in database`)
      } else if (!product.inStock) {
        issues.push(`${item.name} is currently out of stock`)
      } else if (product.price !== item.price) {
        issues.push(`Price for ${item.name} has changed from $${item.price} to $${product.price}`)
      }
    })

    return {
      valid: issues.length === 0,
      issues,
    }
  }
}
