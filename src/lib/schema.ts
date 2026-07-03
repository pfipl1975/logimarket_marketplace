import {
  bigserial,
  bigint,
  boolean,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
} from "drizzle-orm/pg-core";

export const partners = pgTable("partners", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 512 }),
  websiteUrl: varchar("website_url", { length: 512 }),
  contactEmail: varchar("contact_email", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  parentId: bigint("parent_id", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OfferPublicationStatus = "draft" | "published" | "hidden" | "archived" | "deleted";

export const offers = pgTable("offers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  partnerId: bigint("partner_id", { mode: "number" }).notNull(),
  categoryId: bigint("category_id", { mode: "number" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 512 }),
  priceBrutto: numeric("price_brutto"),
  priceOnRequest: boolean("price_on_request").notNull().default(true),
  conversionType: varchar("conversion_type", { length: 20 }).notNull().default("outbound"),
  offerModel: varchar("offer_model", { length: 20 }).notNull().default("rfq"),
  outboundUrl: varchar("outbound_url", { length: 512 }),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  publicationStatus: varchar("publication_status", { length: 20 }).$type<OfferPublicationStatus>().notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  technicalAttributes: jsonb("technical_attributes").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
});

export const clicks = pgTable("clicks", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  offerId: bigint("offer_id", { mode: "number" }).notNull(),
  partnerId: bigint("partner_id", { mode: "number" }).notNull(),
  clickedAt: timestamp("clicked_at", { withTimezone: true }).notNull().defaultNow(),
  sessionHash: varchar("session_hash", { length: 64 }),
  ipHash: varchar("ip_hash", { length: 64 }),
  isUnique24h: boolean("is_unique_24h").notNull().default(true),
});

export const rfqLeads = pgTable("rfq_leads", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  offerId: bigint("offer_id", { mode: "number" }).notNull(),
  partnerId: bigint("partner_id", { mode: "number" }).notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  offerId: bigint("offer_id", { mode: "number" }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  sessionHash: varchar("session_hash", { length: 64 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  message: text("message"),
  sessionHash: varchar("session_hash", { length: 64 }),
  totalAmount: numeric("total_amount"),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  offerId: bigint("offer_id", { mode: "number" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Partner = typeof partners.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type TechnicalAttributes = Record<string, string | number>;
