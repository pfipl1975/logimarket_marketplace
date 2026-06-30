"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { submitCheckout } from "@/app/actions";
import { useCart } from "@/hooks/useCart";
import { CheckCircle2, Loader2, Building2, User, Mail, Phone, MessageSquare, Package } from "lucide-react";
import type { CartItemWithOffer } from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/types";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  items: CartItemWithOffer[];
  total: number;
  checkoutLabels: Dictionary["checkout"];
  formLabels: Dictionary["form"];
  ctaLabels: Pick<Dictionary["cta"], "placeOrder">;
  cartLabels: Pick<Dictionary["cart"], "total">;
  offerLabels: Pick<Dictionary["offers"], "onRequest">;
}

export function CheckoutModal({ open, onClose, items, total, checkoutLabels, formLabels, ctaLabels, cartLabels, offerLabels }: CheckoutModalProps) {
  const { clearCart } = useCart();
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [formData, setFormData] = useState({ companyName: "", contactName: "", email: "", phone: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    await submitCheckout({
      companyName: formData.companyName, contactName: formData.contactName, email: formData.email,
      phone: formData.phone || undefined, message: formData.message || undefined,
      items: items.map((item) => ({ offerId: item.offerId, title: item.title, quantity: item.quantity, unitPrice: item.priceBrutto })),
      totalAmount: total,
    });
    setPending(false);
    setSuccess(true);
    clearCart();
    setTimeout(() => { onClose(); setSuccess(false); setFormData({ companyName: "", contactName: "", email: "", phone: "", message: "" }); }, 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-14 w-14" style={{ color: "#147487" }} />
            <p className="text-xl font-bold">{checkoutLabels.successTitle}</p>
            <p className="text-sm text-muted-foreground max-w-xs">{checkoutLabels.successDescription}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Package className="h-5 w-5 text-brand-teal" />{checkoutLabels.title}
              </DialogTitle>
              <DialogDescription>
                {checkoutLabels.description}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: "#d9dde2", backgroundColor: "#f8f9fa" }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{checkoutLabels.summary}</p>
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="line-clamp-1">{item.title} <span className="text-muted-foreground">x{item.quantity}</span></span>
                  <span className="font-medium shrink-0 ml-2">
                    {item.priceBrutto && !item.priceOnRequest
                      ? new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(Number(item.priceBrutto) * item.quantity)
                      : offerLabels.onRequest}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>{cartLabels.total}</span>
                <span>{new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 2 }).format(total)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="co-company" className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{formLabels.companyName}</Label>
                <Input id="co-company" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="co-name" className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" />{formLabels.contactName}</Label>
                <Input id="co-name" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="co-email" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{formLabels.email}</Label>
                  <Input id="co-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="co-phone" className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{formLabels.phone}</Label>
                  <Input id="co-phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="co-msg" className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />{formLabels.orderNotes}</Label>
                <Textarea id="co-msg" rows={2} placeholder={checkoutLabels.orderNotesPlaceholder}
                  value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} />
              </div>
              <Button type="submit" disabled={pending} className="w-full font-semibold gap-2 text-white border-0"
                style={{ backgroundColor: "#147487" }}
                onMouseEnter={(e) => !pending && (e.currentTarget.style.backgroundColor = "#0e5a6a")}
                onMouseLeave={(e) => !pending && (e.currentTarget.style.backgroundColor = "#147487")}>
                {pending ? <><Loader2 className="h-4 w-4 animate-spin" />{checkoutLabels.pending}</> : ctaLabels.placeOrder}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {checkoutLabels.legalNote}
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
