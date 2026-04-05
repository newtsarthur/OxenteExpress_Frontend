import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CartItem, Product } from "@/data/types";
import { useSocket } from "@/contexts/SocketContext";

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  totalWeight: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = "oxente_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const socket = useSocket();

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    // Emit stock reservation event
    if (socket) {
      socket.emit('reserve_stock', {
        productId: product.id,
        quantity: 1,
        action: 'reserve'
      });
    }
  };

  const removeItem = (productId: string) => {
    const itemToRemove = items.find(i => i.product.id === productId);
    const quantityToRestore = itemToRemove?.quantity || 0;

    setItems((prev) => prev.filter((i) => i.product.id !== productId));

    // Emit stock restoration event
    if (socket && quantityToRestore > 0) {
      socket.emit('reserve_stock', {
        productId,
        quantity: quantityToRestore,
        action: 'restore'
      });
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const currentItem = items.find(i => i.product.id === productId);
    const currentQuantity = currentItem?.quantity || 0;
    const quantityDifference = quantity - currentQuantity;

    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );

    // Emit stock adjustment event
    if (socket && quantityDifference !== 0) {
      socket.emit('reserve_stock', {
        productId,
        quantity: Math.abs(quantityDifference),
        action: quantityDifference > 0 ? 'reserve' : 'restore'
      });
    }
  };

  const clearCart = () => {
    // Restore all stock before clearing
    if (socket) {
      items.forEach(item => {
        socket.emit('reserve_stock', {
          productId: item.product.id,
          quantity: item.quantity,
          action: 'restore'
        });
      });
    }

    setItems([]);
  };

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const totalWeight = items.reduce((sum, i) => sum + i.product.weightKg * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, subtotal, totalWeight, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
