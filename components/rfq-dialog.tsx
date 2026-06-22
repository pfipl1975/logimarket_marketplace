'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { CheckCircle2, FileText, Loader2 } from 'lucide-react'
import { submitRfq, type RfqState } from '@/app/actions/rfq'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const initialState: RfqState = { ok: false, message: '' }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-teal text-teal-foreground hover:bg-teal/90"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Wysyłanie...
        </>
      ) : (
        'Wyślij zapytanie'
      )}
    </Button>
  )
}

export function RfqDialog({
  offerId,
  offerTitle,
  partnerName,
  size = 'default',
  className,
}: {
  offerId: number
  offerTitle: string
  partnerName: string
  size?: 'default' | 'lg'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(submitRfq, initialState)

  useEffect(() => {
    if (state.ok) {
      const timer = setTimeout(() => setOpen(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [state.ok])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={size}
          className={`bg-teal text-teal-foreground hover:bg-teal/90 ${className ?? ''}`}
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          Zapytaj o wycenę
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {state.ok ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-teal" aria-hidden="true" />
            <p className="text-base font-medium text-foreground">
              {state.message}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Zapytanie o wycenę (RFQ)</DialogTitle>
              <DialogDescription>
                {offerTitle} — {partnerName}. Zapytanie trafi bezpośrednio do
                partnera, który przygotuje wycenę B2B.
              </DialogDescription>
            </DialogHeader>
            <form action={formAction} className="grid gap-4">
              <input type="hidden" name="offerId" value={offerId} />
              <div className="grid gap-1.5">
                <Label htmlFor="companyName">Nazwa firmy *</Label>
                <Input id="companyName" name="companyName" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="contactName">Osoba kontaktowa *</Label>
                <Input id="contactName" name="contactName" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" type="tel" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="message">Wiadomość</Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={3}
                  placeholder="Liczba sztuk, termin, dodatkowe wymagania..."
                />
              </div>
              {state.message && !state.ok ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.message}
                </p>
              ) : null}
              <SubmitButton />
              <p className="text-center text-xs text-muted-foreground">
                Wysyłając formularz wyrażasz zgodę na przekazanie danych
                partnerowi w celu przygotowania oferty.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
