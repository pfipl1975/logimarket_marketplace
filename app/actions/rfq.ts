'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { offers, rfqLeads } from '@/lib/db/schema'

export type RfqState = {
  ok: boolean
  message: string
}

export async function submitRfq(
  _prev: RfqState,
  formData: FormData,
): Promise<RfqState> {
  const offerId = Number(formData.get('offerId'))
  const companyName = String(formData.get('companyName') ?? '').trim()
  const contactName = String(formData.get('contactName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()

  if (Number.isNaN(offerId)) {
    return { ok: false, message: 'Nieprawidłowa oferta.' }
  }
  if (!companyName || !contactName || !email) {
    return {
      ok: false,
      message: 'Uzupełnij nazwę firmy, osobę kontaktową i adres e-mail.',
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Podaj prawidłowy adres e-mail.' }
  }

  const [offer] = await db
    .select()
    .from(offers)
    .where(eq(offers.id, offerId))
    .limit(1)

  if (!offer) {
    return { ok: false, message: 'Oferta nie istnieje.' }
  }

  await db.insert(rfqLeads).values({
    offerId,
    partnerId: offer.partnerId,
    companyName,
    contactName,
    email,
    phone: phone || null,
    message: message || null,
  })

  // In production a transactional email would be sent to the partner's
  // contact_email here. For the MVP the lead is persisted for follow-up.
  return {
    ok: true,
    message:
      'Dziękujemy! Twoje zapytanie zostało wysłane do partnera. Skontaktuje się z Tobą bezpośrednio.',
  }
}
