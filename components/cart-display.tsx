"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react"
import { CartManager, type CartItem } from "@/lib/cart-manager"

interface CartDisplayProps {
  onSpeak: (message: string) => void
}

export function CartDisplay({ onSpeak }: CartDisplayProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartManager] = useState(() => CartManager.getInstance())

  useEffect(() => {
    // Subscribe to cart changes
    const unsubscribe = cartManager.subscribe(setCart)

    // Load initial cart state
    setCart(cartManager.getCart())

    return unsubscribe
  }, [cartManager])

  const handleQuantityChange = (itemName: string, newQuantity: number) => {
    const result = cartManager.updateQuantity(itemName, newQuantity)
    onSpeak(result.message)
  }

  const handleRemoveItem = (itemName: string, removeAll = false) => {
    const result = cartManager.removeItem(itemName, removeAll)
    onSpeak(result.message)
  }

  const handleClearCart = () => {
    const result = cartManager.clearCart()
    onSpeak(result.message)
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Shopping Cart ({itemCount} items)</h2>
        </div>
        {cart.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCart}
            className="text-destructive hover:text-destructive bg-transparent"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cart
          </Button>
        )}
      </div>

      {cart.length > 0 ? (
        <div className="space-y-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center py-3 border-b border-border last:border-b-0"
            >
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">{item.description}</div>
                <div className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</div>
              </div>

              <div className="flex items-center gap-3">
                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(item.name, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>

                  <span className="w-8 text-center font-medium">{item.quantity}</span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(item.name, item.quantity + 1)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Item Total */}
                <div className="w-20 text-right font-medium">${(item.price * item.quantity).toFixed(2)}</div>

                {/* Remove Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveItem(item.name, true)}
                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {/* Cart Total */}
          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total ({itemCount} items):</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Your cart is empty</p>
          <p className="text-sm text-muted-foreground mt-2">
            Say "what is this" to identify items and add them to your cart
          </p>
        </div>
      )}
    </Card>
  )
}
