-- Disposable legacy schema fixture for LM-CAT-FILTER-49C tests and local build verification.
-- It intentionally excludes the seven runtime filter tables; the lean migration creates them.

CREATE TABLE public.partners (
  id bigint PRIMARY KEY,
  company_name varchar(255) NOT NULL,
  logo_url varchar(512),
  website_url varchar(512),
  contact_email varchar(100) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
  id bigint PRIMARY KEY,
  name varchar(100) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  parent_id bigint REFERENCES public.categories(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.offers (
  id bigint PRIMARY KEY,
  partner_id bigint NOT NULL,
  category_id bigint NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  title varchar(255) NOT NULL,
  description text,
  image_url varchar(512),
  price_brutto numeric,
  price_on_request boolean NOT NULL DEFAULT true,
  conversion_type varchar(20) NOT NULL DEFAULT 'outbound',
  offer_model varchar(20) NOT NULL DEFAULT 'rfq',
  outbound_url varchar(512),
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  publication_status varchar(20) NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  technical_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE public.cart_items (
  id bigserial PRIMARY KEY,
  offer_id bigint NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  session_hash varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id bigserial PRIMARY KEY,
  company_name varchar(255) NOT NULL,
  contact_name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  phone varchar(50),
  message text,
  session_hash varchar(64),
  total_amount numeric,
  status varchar(20) NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL,
  offer_id bigint NOT NULL,
  title varchar(255) NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rfq_leads (
  id bigserial PRIMARY KEY,
  offer_id bigint NOT NULL,
  partner_id bigint NOT NULL,
  company_name varchar(255) NOT NULL,
  contact_name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  phone varchar(50),
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.clicks (
  id bigserial PRIMARY KEY,
  offer_id bigint NOT NULL,
  partner_id bigint NOT NULL,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  session_hash varchar(64),
  ip_hash varchar(64),
  is_unique_24h boolean NOT NULL DEFAULT true
);

INSERT INTO public.partners (id, company_name, contact_email)
VALUES (1, 'Fixture Partner', 'fixture@example.test');

INSERT INTO public.categories (id, name, slug)
VALUES (1, 'Fixture category', 'fixture-category');

INSERT INTO public.offers (id, partner_id, category_id, title, publication_status)
VALUES
  (1, 1, 1, 'Fixture offer 1', 'published'),
  (2, 1, 1, 'Fixture offer 2', 'published'),
  (3, 1, 1, 'Fixture offer 3', 'published'),
  (4, 1, 1, 'Fixture offer 4', 'published'),
  (5, 1, 1, 'Fixture offer 5', 'published'),
  (6, 1, 1, 'Fixture offer 6', 'published'),
  (7, 1, 1, 'Fixture offer 7', 'published'),
  (8, 1, 1, 'Fixture offer 8', 'published'),
  (9, 1, 1, 'Fixture offer 9', 'published'),
  (10, 1, 1, 'Fixture offer 10', 'published');
