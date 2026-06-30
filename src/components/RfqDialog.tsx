"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitRfq } from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/types";

interface RfqDialogProps {
  offerId: number;
  offerTitle: string;
  partnerName: string;
  className?: string;
  rfqLabels: Dictionary["rfq"];
  formLabels: Dictionary["form"];
  ctaLabels: Pick<Dictionary["cta"], "sendRequest" | "requestQuote">;
}

export function RfqDialog({ offerId, offerTitle, partnerName, className, rfqLabels, formLabels, ctaLabels }: RfqDialogProps) {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [formData, setFormData] = useState({ companyName: "", contactName: "", email: "", phone: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    const result = await submitRfq({
      offerId, companyName: formData.companyName, contactName: formData.contactName,
      email: formData.email, phone: formData.phone || undefined, message: formData.message || undefined,
    });
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setTimeout(() => { setOpen(false); setSuccess(false); setFormData({ companyName: "", contactName: "", email: "", phone: "", message: "" }); }, 2500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={`gap-2 font-semibold text-white border-0 ${className ?? ""}`}
          style={{ backgroundColor: "#141c2c" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1e2940")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#141c2c")}>
          <FileText className="h-4 w-4" />{ctaLabels.requestQuote}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-12 w-12" style={{ color: "#147487" }} />
            <p className="text-base font-medium">{rfqLabels.successTitle}</p>
            <p className="text-sm text-muted-foreground">{rfqLabels.successDescription}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{rfqLabels.title}</DialogTitle>
              <DialogDescription>
                <span className="font-semibold text-brand-navy">{offerTitle}</span>{" — "}{partnerName}. {rfqLabels.descriptionSuffix}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
              <div className="grid gap-1.5"><Label htmlFor="rfq-company">{formLabels.companyName}</Label>
                <Input id="rfq-company" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} required /></div>
              <div className="grid gap-1.5"><Label htmlFor="rfq-contact">{formLabels.contactName}</Label>
                <Input id="rfq-contact" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label htmlFor="rfq-email">{formLabels.email}</Label>
                  <Input id="rfq-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
                <div className="grid gap-1.5"><Label htmlFor="rfq-phone">{formLabels.phone}</Label>
                  <Input id="rfq-phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
              </div>
              <div className="grid gap-1.5"><Label htmlFor="rfq-msg">{formLabels.message}</Label>
                <Textarea id="rfq-msg" rows={3} placeholder={rfqLabels.messagePlaceholder}
                  value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} /></div>
              <Button type="submit" disabled={pending} className="w-full font-semibold gap-2 text-white border-0"
                style={{ backgroundColor: "#147487" }}
                onMouseEnter={(e) => !pending && (e.currentTarget.style.backgroundColor = "#0e5a6a")}
                onMouseLeave={(e) => !pending && (e.currentTarget.style.backgroundColor = "#147487")}>
                {pending ? <><Loader2 className="h-4 w-4 animate-spin" />{rfqLabels.pending}</> : ctaLabels.sendRequest}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{rfqLabels.consent}</p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
