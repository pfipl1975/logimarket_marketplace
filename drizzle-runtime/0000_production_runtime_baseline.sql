DO $$
DECLARE
  v_count integer;
  v_fingerprint_match boolean := true;
BEGIN
  -- 1. State check
  SELECT count(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'attribute_definition_translations', 'attribute_definitions', 'cart_items',
    'categories', 'category_attribute_assignments', 'clicks',
    'controlled_option_value_translations', 'controlled_option_values',
    'offer_attribute_option_values', 'offer_attribute_values', 'offers',
    'order_items', 'orders', 'partners', 'rfq_leads'
  );

  IF v_count = 15 THEN
    -- FINGERPRINT VALIDATION DEFERRED TO TYPESCRIPT POST-CHECK
    -- EXACT_EXISTING: success without DDL
    RETURN;
  ELSIF v_count > 0 THEN
    RAISE EXCEPTION 'PARTIAL_OR_DRIFTED schema detected. Found % runtime tables.', v_count;
  END IF;

  -- 2. DDL Execution for EMPTY DEV

  -- SEQUENCES
  CREATE SEQUENCE attribute_definition_translations_id_seq AS integer;
  CREATE SEQUENCE attribute_definitions_id_seq AS integer;
  CREATE SEQUENCE cart_items_id_seq AS integer;
  CREATE SEQUENCE categories_id_seq AS integer;
  CREATE SEQUENCE category_attribute_assignments_id_seq AS integer;
  CREATE SEQUENCE clicks_id_seq AS integer;
  CREATE SEQUENCE controlled_option_value_translations_id_seq AS integer;
  CREATE SEQUENCE controlled_option_values_id_seq AS integer;
  CREATE SEQUENCE offer_attribute_option_values_id_seq AS integer;
  CREATE SEQUENCE offer_attribute_values_id_seq AS integer;
  CREATE SEQUENCE offers_id_seq AS integer;
  CREATE SEQUENCE order_items_id_seq AS integer;
  CREATE SEQUENCE orders_id_seq AS integer;
  CREATE SEQUENCE partners_id_seq AS integer;
  CREATE SEQUENCE rfq_leads_id_seq AS integer;

  -- TABLES (in dependency order)

  CREATE TABLE attribute_definitions (
    id bigint PRIMARY KEY DEFAULT nextval('attribute_definitions_id_seq'::regclass),
    stable_key text NOT NULL,
    data_type character varying(30) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT uq_ad_stable_key UNIQUE (stable_key),
    CONSTRAINT chk_ad_data_type CHECK ((data_type)::text = ANY ((ARRAY['text'::character varying, 'number'::character varying, 'boolean'::character varying, 'date'::character varying, 'year'::character varying, 'enum'::character varying, 'multi_enum'::character varying])::text[]))
  );

  CREATE TABLE categories (
    id bigint PRIMARY KEY DEFAULT nextval('categories_id_seq'::regclass),
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    parent_id bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT categories_slug_key UNIQUE (slug),
    CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categories(id)
  );

  CREATE TABLE partners (
    id bigint PRIMARY KEY DEFAULT nextval('partners_id_seq'::regclass),
    company_name character varying(255) NOT NULL,
    logo_url character varying(512),
    contact_email character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    website_url character varying
  );

  CREATE TABLE controlled_option_values (
    id bigint PRIMARY KEY DEFAULT nextval('controlled_option_values_id_seq'::regclass),
    attribute_id bigint NOT NULL,
    stable_key text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT uq_cov_attr_option UNIQUE (attribute_id, stable_key),
    CONSTRAINT uq_cov_attribute_id_pair UNIQUE (attribute_id, id),
    CONSTRAINT fk_cov_attribute FOREIGN KEY (attribute_id) REFERENCES attribute_definitions(id)
  );

  CREATE TABLE attribute_definition_translations (
    id bigint PRIMARY KEY DEFAULT nextval('attribute_definition_translations_id_seq'::regclass),
    attribute_definition_id bigint NOT NULL,
    locale character varying(10) NOT NULL,
    name text NOT NULL,
    short_label character varying(100),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT uq_adt_attribute_locale UNIQUE (attribute_definition_id, locale),
    CONSTRAINT fk_adt_attribute_definition FOREIGN KEY (attribute_definition_id) REFERENCES attribute_definitions(id),
    CONSTRAINT chk_adt_locale CHECK ((locale)::text = ANY ((ARRAY['pl'::character varying, 'en'::character varying, 'de'::character varying, 'fr'::character varying, 'uk'::character varying, 'es'::character varying, 'zh'::character varying])::text[]))
  );

  CREATE TABLE category_attribute_assignments (
    id bigint PRIMARY KEY DEFAULT nextval('category_attribute_assignments_id_seq'::regclass),
    category_id bigint NOT NULL,
    attribute_definition_id bigint NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_filterable boolean DEFAULT false NOT NULL,
    is_comparable boolean DEFAULT false NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    unit_code character varying(20),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT uq_caa_category_attribute UNIQUE (category_id, attribute_definition_id),
    CONSTRAINT fk_caa_attribute_definition FOREIGN KEY (attribute_definition_id) REFERENCES attribute_definitions(id),
    CONSTRAINT fk_caa_category FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT chk_caa_sort_order CHECK (sort_order >= 0)
  );

  CREATE TABLE controlled_option_value_translations (
    id bigint PRIMARY KEY DEFAULT nextval('controlled_option_value_translations_id_seq'::regclass),
    controlled_option_value_id bigint NOT NULL,
    locale character varying(10) NOT NULL,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT uq_covt_option_locale UNIQUE (controlled_option_value_id, locale),
    CONSTRAINT fk_covt_controlled_option_value FOREIGN KEY (controlled_option_value_id) REFERENCES controlled_option_values(id),
    CONSTRAINT chk_covt_locale CHECK ((locale)::text = ANY ((ARRAY['pl'::character varying, 'en'::character varying, 'de'::character varying, 'fr'::character varying, 'uk'::character varying, 'es'::character varying, 'zh'::character varying])::text[]))
  );

  CREATE TABLE offers (
    id bigint PRIMARY KEY DEFAULT nextval('offers_id_seq'::regclass),
    partner_id bigint NOT NULL,
    category_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    price_brutto numeric,
    outbound_url character varying(512),
    technical_attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    offer_model character varying(20) DEFAULT 'rfq'::character varying NOT NULL,
    description text,
    image_url character varying(512),
    price_on_request boolean DEFAULT true NOT NULL,
    conversion_type character varying(20) DEFAULT 'outbound'::character varying NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    publication_status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    published_at timestamp with time zone,
    archived_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT offers_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT offers_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id),
    CONSTRAINT offers_conversion_type_check CHECK (((conversion_type)::text = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::text[]))),
    CONSTRAINT offers_offer_model_check CHECK (((offer_model)::text = ANY ((ARRAY['rfq'::character varying, 'marketplace'::character varying])::text[]))),
    CONSTRAINT offers_publication_status_check CHECK (((publication_status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))
  );

  CREATE TABLE cart_items (
    id bigint PRIMARY KEY DEFAULT nextval('cart_items_id_seq'::regclass),
    session_hash character varying(64) NOT NULL,
    offer_id bigint NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cart_items_session_hash_offer_id_key UNIQUE (session_hash, offer_id)
  );

  CREATE TABLE clicks (
    id bigint PRIMARY KEY DEFAULT nextval('clicks_id_seq'::regclass),
    offer_id integer,
    partner_id integer,
    clicked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    session_hash character varying(64) NOT NULL,
    ip_hash character varying(64) NOT NULL,
    is_unique_24h boolean DEFAULT true,
    CONSTRAINT clicks_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES offers(id),
    CONSTRAINT clicks_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id)
  );

  CREATE TABLE offer_attribute_values (
    id bigint PRIMARY KEY DEFAULT nextval('offer_attribute_values_id_seq'::regclass),
    offer_id bigint NOT NULL,
    attribute_id bigint NOT NULL,
    value_text text,
    value_number numeric,
    value_boolean boolean,
    value_date timestamp with time zone,
    value_year integer,
    option_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT uq_oav_offer_attribute UNIQUE (offer_id, attribute_id),
    CONSTRAINT fk_oav_attribute FOREIGN KEY (attribute_id) REFERENCES attribute_definitions(id),
    CONSTRAINT fk_oav_attribute_option_pair FOREIGN KEY (attribute_id, option_id) REFERENCES controlled_option_values(attribute_id, id),
    CONSTRAINT fk_oav_offer FOREIGN KEY (offer_id) REFERENCES offers(id),
    CONSTRAINT fk_oav_option FOREIGN KEY (option_id) REFERENCES controlled_option_values(id),
    CONSTRAINT chk_oav_value_exclusivity CHECK (num_nonnulls(value_text, (value_number)::text, (value_boolean)::text, (value_date)::text, (value_year)::text, (option_id)::text) = 1)
  );

  CREATE TABLE offer_attribute_option_values (
    id bigint PRIMARY KEY DEFAULT nextval('offer_attribute_option_values_id_seq'::regclass),
    offer_id bigint NOT NULL,
    attribute_id bigint NOT NULL,
    option_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT uq_oaov_offer_attribute_option UNIQUE (offer_id, attribute_id, option_id),
    CONSTRAINT fk_oaov_attribute FOREIGN KEY (attribute_id) REFERENCES attribute_definitions(id),
    CONSTRAINT fk_oaov_attribute_option_pair FOREIGN KEY (attribute_id, option_id) REFERENCES controlled_option_values(attribute_id, id),
    CONSTRAINT fk_oaov_offer FOREIGN KEY (offer_id) REFERENCES offers(id),
    CONSTRAINT fk_oaov_option FOREIGN KEY (option_id) REFERENCES controlled_option_values(id)
  );

  CREATE TABLE orders (
    id bigint PRIMARY KEY DEFAULT nextval('orders_id_seq'::regclass),
    session_hash character varying(64) NOT NULL,
    status character varying(20) DEFAULT 'new'::character varying NOT NULL,
    company_name character varying(255),
    contact_name character varying(255),
    email character varying(255),
    phone character varying(100),
    message text,
    total_amount character varying(50),
    created_at timestamp with time zone DEFAULT now()
  );

  CREATE TABLE order_items (
    id bigint PRIMARY KEY DEFAULT nextval('order_items_id_seq'::regclass),
    order_id bigint NOT NULL,
    offer_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    quantity integer NOT NULL,
    unit_price character varying(50),
    total_price character varying(50)
  );

  CREATE TABLE rfq_leads (
    id bigint PRIMARY KEY DEFAULT nextval('rfq_leads_id_seq'::regclass),
    offer_id bigint NOT NULL,
    partner_id bigint NOT NULL,
    company_name character varying(255),
    contact_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(100),
    message text,
    status character varying(20) DEFAULT 'new'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
  );

  -- OWNERSHIP
  ALTER SEQUENCE attribute_definition_translations_id_seq OWNED BY attribute_definition_translations.id;
  ALTER SEQUENCE attribute_definitions_id_seq OWNED BY attribute_definitions.id;
  ALTER SEQUENCE cart_items_id_seq OWNED BY cart_items.id;
  ALTER SEQUENCE categories_id_seq OWNED BY categories.id;
  ALTER SEQUENCE category_attribute_assignments_id_seq OWNED BY category_attribute_assignments.id;
  ALTER SEQUENCE clicks_id_seq OWNED BY clicks.id;
  ALTER SEQUENCE controlled_option_value_translations_id_seq OWNED BY controlled_option_value_translations.id;
  ALTER SEQUENCE controlled_option_values_id_seq OWNED BY controlled_option_values.id;
  ALTER SEQUENCE offer_attribute_option_values_id_seq OWNED BY offer_attribute_option_values.id;
  ALTER SEQUENCE offer_attribute_values_id_seq OWNED BY offer_attribute_values.id;
  ALTER SEQUENCE offers_id_seq OWNED BY offers.id;
  ALTER SEQUENCE order_items_id_seq OWNED BY order_items.id;
  ALTER SEQUENCE orders_id_seq OWNED BY orders.id;
  ALTER SEQUENCE partners_id_seq OWNED BY partners.id;
  ALTER SEQUENCE rfq_leads_id_seq OWNED BY rfq_leads.id;

  -- 8 EXPLICIT NON-CONSTRAINT INDEXES
  CREATE INDEX idx_categories_parent ON categories USING btree (parent_id);
  CREATE INDEX idx_caa_attribute ON category_attribute_assignments USING btree (attribute_definition_id);
  CREATE INDEX idx_caa_cat_filterable_sort ON category_attribute_assignments USING btree (category_id, is_filterable, sort_order);
  CREATE INDEX idx_caa_cat_visible_sort ON category_attribute_assignments USING btree (category_id, is_visible, sort_order);
  CREATE INDEX idx_clicks_tracking ON clicks USING btree (offer_id, partner_id, clicked_at);
  CREATE INDEX idx_offers_category ON offers USING btree (category_id);
  CREATE INDEX idx_offers_partner ON offers USING btree (partner_id);
  CREATE INDEX idx_offers_tech_attributes ON offers USING gin (technical_attributes);

  -- RLS & GRANTS
  ALTER TABLE attribute_definition_translations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE attribute_definitions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE category_attribute_assignments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE controlled_option_value_translations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE controlled_option_values ENABLE ROW LEVEL SECURITY;
  ALTER TABLE offer_attribute_option_values ENABLE ROW LEVEL SECURITY;
  ALTER TABLE offer_attribute_values ENABLE ROW LEVEL SECURITY;
  ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
  ALTER TABLE rfq_leads ENABLE ROW LEVEL SECURITY;

  REVOKE ALL ON TABLE attribute_definition_translations FROM anon;
  REVOKE ALL ON TABLE attribute_definitions FROM anon;
  REVOKE ALL ON TABLE cart_items FROM anon;
  REVOKE ALL ON TABLE categories FROM anon;
  REVOKE ALL ON TABLE category_attribute_assignments FROM anon;
  REVOKE ALL ON TABLE clicks FROM anon;
  REVOKE ALL ON TABLE controlled_option_value_translations FROM anon;
  REVOKE ALL ON TABLE controlled_option_values FROM anon;
  REVOKE ALL ON TABLE offer_attribute_option_values FROM anon;
  REVOKE ALL ON TABLE offer_attribute_values FROM anon;
  REVOKE ALL ON TABLE offers FROM anon;
  REVOKE ALL ON TABLE order_items FROM anon;
  REVOKE ALL ON TABLE orders FROM anon;
  REVOKE ALL ON TABLE partners FROM anon;
  REVOKE ALL ON TABLE rfq_leads FROM anon;

  REVOKE ALL ON TABLE attribute_definition_translations FROM authenticated;
  REVOKE ALL ON TABLE attribute_definitions FROM authenticated;
  REVOKE ALL ON TABLE cart_items FROM authenticated;
  REVOKE ALL ON TABLE categories FROM authenticated;
  REVOKE ALL ON TABLE category_attribute_assignments FROM authenticated;
  REVOKE ALL ON TABLE clicks FROM authenticated;
  REVOKE ALL ON TABLE controlled_option_value_translations FROM authenticated;
  REVOKE ALL ON TABLE controlled_option_values FROM authenticated;
  REVOKE ALL ON TABLE offer_attribute_option_values FROM authenticated;
  REVOKE ALL ON TABLE offer_attribute_values FROM authenticated;
  REVOKE ALL ON TABLE offers FROM authenticated;
  REVOKE ALL ON TABLE order_items FROM authenticated;
  REVOKE ALL ON TABLE orders FROM authenticated;
  REVOKE ALL ON TABLE partners FROM authenticated;
  REVOKE ALL ON TABLE rfq_leads FROM authenticated;

  REVOKE ALL ON SEQUENCE attribute_definition_translations_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE attribute_definitions_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE cart_items_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE categories_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE category_attribute_assignments_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE clicks_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE controlled_option_value_translations_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE controlled_option_values_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE offer_attribute_option_values_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE offer_attribute_values_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE offers_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE order_items_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE orders_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE partners_id_seq FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE rfq_leads_id_seq FROM anon, authenticated;
END $$;
