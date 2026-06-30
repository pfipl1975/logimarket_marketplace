"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { Minus, Plus, Trash2, ShoppingCart, Package } from "lucide-react";
import { CheckoutModal } from "./CheckoutModal";
import type { Dictionary } from "@/lib/i18n/types";

interface CartDrawerProps {
  cartLabels: Dictionary["cart"];
  ctaLabels: Pick<Dictionary["cta"], "browseOffers" | "goToCheckout" | "continueShopping" | "placeOrder">;
  checkoutLabels: Dictionary["checkout"];
  formLabels: Dictionary["form"];
  offerLabels: Pick<Dictionary["offers"], "onRequest">;
}

export function CartDrawer({ cartLabels, ctaLabels, checkoutLabels, formLabels, offerLabels }: CartDrawerProps) {
  const { isOpen, setIsOpen, removeFromCart, updateQuantity, items } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const total = items.reduce((sum, item) => {
    if (item.priceBrutto && !item.priceOnRequest) return sum + Number(item.priceBrutto) * item.quantity;
    return sum;
  }, 0);

  const hasItems = items.length > 0;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-lg font-bold">
              <ShoppingCart className="h-5 w-5 text-brand-teal" />{cartLabels.title}
            </SheetTitle>
          </SheetHeader>

          {!hasItems ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Package className="h-8 w-8" style={{ color: "#5a6472" }} />
              </div>
              <div>
                <p className="text-base font-semibold">{cartLabels.emptyTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{cartLabels.emptyDescription}</p>
              </div>
              <Button onClick={() => setIsOpen(false)} variant="outline" className="mt-2">{ctaLabels.browseOffers}</Button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-lg border bg-white p-3" style={{ borderColor: "#d9dde2" }}>
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                        : <div className="flex h-full w-full items-center justify-center"><Package className="h-6 w-6" style={{ color: "#5a6472" }} /></div>}
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <p className="text-sm font-semibold leading-tight line-clamp-2">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.partnerName}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeFromCart(item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded border hover:bg-gray-100 transition-colors" style={{ borderColor: "#d9dde2" }}>
                            {item.quantity > 1 ? <Minus className="h-3 w-3" /> : <Trash2 className="h-3 w-3 text-red-500" />}
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded border hover:bg-gray-100 transition-colors" style={{ borderColor: "#d9dde2" }}>
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-sm font-bold">
                          {item.priceBrutto && !item.priceOnRequest
                            ? new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(Number(item.priceBrutto) * item.quantity)
                            : offerLabels.onRequest}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-4" style={{ borderColor: "#d9dde2" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{cartLabels.total} ({items.reduce((s, i) => s + i.quantity, 0)} {cartLabels.unitShort})</span>
                  <span className="text-lg font-bold">{new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 2 }).format(total)}</span>
                </div>
                <Button onClick={() => { setIsOpen(false); setCheckoutOpen(true); }} className="w-full font-semibold gap-2 text-white border-0"
                  style={{ backgroundColor: "#147487" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0e5a6a")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#147487")}>
                  {ctaLabels.goToCheckout}
                </Button>
                <Button onClick={() => setIsOpen(false)} variant="ghost" className="w-full text-sm text-muted-foreground hover:text-foreground">{ctaLabels.continueShopping}</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      {checkoutOpen && (
        <CheckoutModal
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          items={items}
          total={total}
          checkoutLabels={checkoutLabels}
          formLabels={formLabels}
          ctaLabels={ctaLabels}
          cartLabels={cartLabels}
          offerLabels={offerLabels}
        />
      )}
    </>
  );
}
