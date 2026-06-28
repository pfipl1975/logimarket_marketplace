"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";

export function AddToCartButton({ offerId }: { offerId: number }) {
  const { addToCart } = useCart();
  return (
    <Button onClick={() => addToCart(offerId, 1)} className="w-full gap-2 font-semibold text-white border-0 h-12 text-base"
      style={{ backgroundColor: "#147487" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0e5a6a")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#147487")}>
      <ShoppingCart className="h-5 w-5" />Dodaj do koszyka
    </Button>
  );
}
