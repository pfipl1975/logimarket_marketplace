import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { offers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offerId = Number(id);
  if (isNaN(offerId)) return NextResponse.redirect(new URL("/", request.url));

  const rows = await db
    .select({
      outboundUrl: offers.outboundUrl,
    })
    .from(offers)
    .where(
      and(
        eq(offers.id, offerId),
        eq(offers.isActive, true),
        eq(offers.publicationStatus, "published")
      )
    )
    .limit(1);

  if (rows.length === 0) return NextResponse.redirect(new URL("/", request.url));

  const offer = rows[0];
  return NextResponse.redirect(offer.outboundUrl || new URL("/", request.url).toString(), 302);
}
