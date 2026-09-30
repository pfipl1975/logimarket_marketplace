"use client";

import { useEffect } from "react";
import { useCart } from "@/hooks/useCart";

export function PostCheckoutCartSync() {
  const { resetAfterCheckout } = useCart();

  useEffect(() => {
    void resetAfterCheckout();
  }, [resetAfterCheckout]);

  return null;
}
