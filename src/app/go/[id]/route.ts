import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { offers } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offerId = Number(id);
  if (isNaN(offerId)) return NextResponse.redirect("/");

  const rows = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
  if (rows.length === 0) return NextResponse.redirect("/");

  const offer = rows[0];
  return NextResponse.redirect(offer.outboundUrl || "/", 302);
}
