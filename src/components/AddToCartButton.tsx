"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import type { Dictionary } from "@/lib/i18n/types";

interface AddToCartButtonProps {
  offerId: number;
  label: Dictionary["cta"]["addToCart"];
}

export function AddToCartButton({ offerId, label }: AddToCartButtonProps) {
  const { addToCart } = useCart();
  return (
    <Button onClick={() => addToCart(offerId, 1)} className="w-full gap-2 font-semibold text-white border-0 h-12 text-base"
      style={{ backgroundColor: "#147487" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0e5a6a")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#147487")}>
      <ShoppingCart className="h-5 w-5" />{label}
    </Button>
  );
}
