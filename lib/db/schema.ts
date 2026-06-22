import {
  bigint,
  bigserial,
  boolean,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const partners = pgTable('partners', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  logoUrl: varchar('logo_url', { length: 512 }),
  websiteUrl: varchar('website_url', { length: 512 }),
  contactEmail: varchar('contact_email', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const categories = pgTable('categories', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  parentId: bigint('parent_id', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const offers = pgTable('offers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  partnerId: bigint('partner_id', { mode: 'number' }).notNull(),
  categoryId: bigint('category_id', { mode: 'number' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 512 }),
  priceBrutto: numeric('price_brutto'),
  priceOnRequest: boolean('price_on_request').notNull().default(true),
  // 'outbound' = direct link to partner, 'rfq' = request-for-quote form
  conversionType: varchar('conversion_type', { length: 20 })
    .notNull()
    .default('outbound'),
  outboundUrl: varchar('outbound_url', { length: 512 }),
  isFeatured: boolean('is_featured').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  technicalAttributes: jsonb('technical_attributes').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const clicks = pgTable('clicks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  offerId: bigint('offer_id', { mode: 'number' }).notNull(),
  partnerId: bigint('partner_id', { mode: 'number' }).notNull(),
  clickedAt: timestamp('clicked_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  sessionHash: varchar('session_hash', { length: 64 }),
  ipHash: varchar('ip_hash', { length: 64 }),
  isUnique24h: boolean('is_unique_24h').notNull().default(true),
})

export const rfqLeads = pgTable('rfq_leads', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  offerId: bigint('offer_id', { mode: 'number' }).notNull(),
  partnerId: bigint('partner_id', { mode: 'number' }).notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  message: text('message'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type Partner = typeof partners.$inferSelect
export type Category = typeof categories.$inferSelect
export type Offer = typeof offers.$inferSelect
export type RfqLead = typeof rfqLeads.$inferSelect

export type TechnicalAttributes = Record<string, string | number>
