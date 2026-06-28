"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { getCartItems, getCartCount, addToCart, removeFromCart, updateCartQuantity, clearCart } from "@/app/actions";
import type { CartItemWithOffer } from "@/app/actions";

interface CartContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  itemCount: number;
  items: CartItemWithOffer[];
  refresh: () => void;
  addToCart: (offerId: number, quantity?: number) => void;
  removeFromCart: (cartItemId: number) => void;
  updateQuantity: (cartItemId: number, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [itemCount, setItemCount] = useState(0);
  const [items, setItems] = useState<CartItemWithOffer[]>([]);

  const refresh = useCallback(async () => {
    const [count, cartItems] = await Promise.all([getCartCount(), getCartItems()]);
    setItemCount(count);
    setItems(cartItems);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAdd = useCallback(async (offerId: number, quantity = 1) => {
    await addToCart(offerId, quantity);
    await refresh();
    setIsOpen(true);
  }, [refresh]);

  const handleRemove = useCallback(async (cartItemId: number) => {
    await removeFromCart(cartItemId);
    await refresh();
  }, [refresh]);

  const handleUpdateQty = useCallback(async (cartItemId: number, quantity: number) => {
    await updateCartQuantity(cartItemId, quantity);
    await refresh();
  }, [refresh]);

  const handleClear = useCallback(async () => {
    await clearCart();
    await refresh();
  }, [refresh]);

  return (
    <CartContext.Provider value={{
      isOpen, setIsOpen, itemCount, items, refresh,
      addToCart: handleAdd, removeFromCart: handleRemove,
      updateQuantity: handleUpdateQty, clearCart: handleClear,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
