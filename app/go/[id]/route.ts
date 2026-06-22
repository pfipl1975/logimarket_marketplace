import { createHash, randomUUID } from 'node:crypto'
import { and, eq, gte } from 'drizzle-orm'
import { cookies, headers } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { clicks, offers } from '@/lib/db/schema'

const SESSION_COOKIE = 'lm_sid'

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 64)
}

function withUtm(url: string): string {
  try {
    const target = new URL(url)
    target.searchParams.set('utm_source', 'logimarket.pl')
    target.searchParams.set('utm_medium', 'marketplace')
    target.searchParams.set('utm_campaign', 'mvp_katalog')
    return target.toString()
  } catch {
    return url
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const offerId = Number(id)
  const origin = (await headers()).get('host')
  const fallback = `https://${origin ?? 'logimarket.pl'}`

  if (Number.isNaN(offerId)) {
    return NextResponse.redirect(fallback)
  }

  const [offer] = await db
    .select()
    .from(offers)
    .where(eq(offers.id, offerId))
    .limit(1)

  if (!offer || !offer.outboundUrl) {
    return NextResponse.redirect(`${fallback}/oferta/${offerId}`)
  }

  // Resolve / set a stable session id for unique-click tracking.
  const cookieStore = await cookies()
  let sid = cookieStore.get(SESSION_COOKIE)?.value
  const isNewSession = !sid
  if (!sid) sid = randomUUID()

  const headerStore = await headers()
  const ip =
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerStore.get('x-real-ip') ||
    'unknown'

  const sessionHash = hash(sid)
  const ipHash = hash(ip)

  // Unique within 24h = no prior click for this offer from this session.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const prior = await db
    .select({ id: clicks.id })
    .from(clicks)
    .where(
      and(
        eq(clicks.offerId, offerId),
        eq(clicks.sessionHash, sessionHash),
        gte(clicks.clickedAt, since),
      ),
    )
    .limit(1)

  await db.insert(clicks).values({
    offerId,
    partnerId: offer.partnerId,
    sessionHash,
    ipHash,
    isUnique24h: prior.length === 0,
  })

  const response = NextResponse.redirect(withUtm(offer.outboundUrl))
  if (isNewSession) {
    response.cookies.set(SESSION_COOKIE, sid, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
  }
  return response
}
