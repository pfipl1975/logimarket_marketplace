"use server"

import { db } from "@/lib/db"
import { partners, categories, offers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  verifyPassword,
  createSession,
  destroySession,
  isAuthenticated,
  adminConfigured,
} from "@/lib/admin-auth"

async function requireAdmin() {
  if (!(await isAuthenticated())) throw new Error("Unauthorized")
}

/* ----------------------------- Auth ----------------------------- */

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  if (!adminConfigured()) {
    return { error: "Panel nie jest skonfigurowany. Ustaw zmienne ADMIN_PASSWORD i ADMIN_SESSION_SECRET." }
  }
  const password = String(formData.get("password") ?? "")
  if (!verifyPassword(password)) {
    return { error: "Nieprawidłowe hasło." }
  }
  await createSession()
  redirect("/admin")
}

export async function logoutAction() {
  await destroySession()
  redirect("/admin")
}

/* --------------------------- Partners --------------------------- */

export async function savePartner(formData: FormData) {
  await requireAdmin()
  const id = formData.get("id") ? Number(formData.get("id")) : null
  const values = {
    companyName: String(formData.get("companyName") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    websiteUrl: (String(formData.get("websiteUrl") ?? "").trim() || null) as string | null,
    logoUrl: (String(formData.get("logoUrl") ?? "").trim() || null) as string | null,
  }
  if (!values.companyName || !values.contactEmail) return
  if (id) {
    await db.update(partners).set(values).where(eq(partners.id, id))
  } else {
    await db.insert(partners).values(values)
  }
  revalidatePath("/admin/partnerzy")
  revalidatePath("/")
}

export async function deletePartner(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  await db.delete(partners).where(eq(partners.id, id))
  revalidatePath("/admin/partnerzy")
}

/* -------------------------- Categories -------------------------- */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function saveCategory(formData: FormData) {
  await requireAdmin()
  const id = formData.get("id") ? Number(formData.get("id")) : null
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  const slug = String(formData.get("slug") ?? "").trim() || slugify(name)
  if (id) {
    await db.update(categories).set({ name, slug }).where(eq(categories.id, id))
  } else {
    await db.insert(categories).values({ name, slug })
  }
  revalidatePath("/admin/kategorie")
  revalidatePath("/")
}

export async function deleteCategory(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  await db.delete(categories).where(eq(categories.id, id))
  revalidatePath("/admin/kategorie")
}

/* ---------------------------- Offers ---------------------------- */

export async function saveOffer(formData: FormData) {
  await requireAdmin()
  const id = formData.get("id") ? Number(formData.get("id")) : null

  const conversionType = String(formData.get("conversionType") ?? "outbound")
  const priceRaw = String(formData.get("priceBrutto") ?? "").trim()
  const priceOnRequest = formData.get("priceOnRequest") === "on"

  // Parse the technical attributes textarea: "Key: Value" per line.
  const attrsRaw = String(formData.get("technicalAttributes") ?? "")
  const technicalAttributes: Record<string, string> = {}
  for (const line of attrsRaw.split("\n")) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key && value) technicalAttributes[key] = value
  }

  const values = {
    partnerId: Number(formData.get("partnerId")),
    categoryId: Number(formData.get("categoryId")),
    title: String(formData.get("title") ?? "").trim(),
    description: (String(formData.get("description") ?? "").trim() || null) as string | null,
    imageUrl: (String(formData.get("imageUrl") ?? "").trim() || null) as string | null,
    priceBrutto: priceOnRequest || !priceRaw ? null : priceRaw,
    priceOnRequest,
    conversionType,
    outboundUrl: (String(formData.get("outboundUrl") ?? "").trim() || null) as string | null,
    isFeatured: formData.get("isFeatured") === "on",
    isActive: formData.get("isActive") === "on",
    technicalAttributes,
  }
  if (!values.title || !values.partnerId || !values.categoryId) return

  if (id) {
    await db.update(offers).set(values).where(eq(offers.id, id))
  } else {
    await db.insert(offers).values(values)
  }
  revalidatePath("/admin/oferty")
  revalidatePath("/")
}

export async function deleteOffer(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  await db.delete(offers).where(eq(offers.id, id))
  revalidatePath("/admin/oferty")
  revalidatePath("/")
}
