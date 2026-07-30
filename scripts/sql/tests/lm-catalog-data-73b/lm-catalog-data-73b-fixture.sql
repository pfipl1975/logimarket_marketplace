-- Minimal setup for lm-cat-filter-73b testing
CREATE SCHEMA IF NOT EXISTS public;

DROP TABLE IF EXISTS public.offer_attribute_option_values CASCADE;
DROP TABLE IF EXISTS public.offer_attribute_values CASCADE;
DROP TABLE IF EXISTS public.controlled_option_value_translations CASCADE;
DROP TABLE IF EXISTS public.controlled_option_values CASCADE;
DROP TABLE IF EXISTS public.attribute_definition_translations CASCADE;
DROP TABLE IF EXISTS public.category_attribute_assignments CASCADE;
DROP TABLE IF EXISTS public.attribute_definitions CASCADE;
DROP TABLE IF EXISTS public.offers CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.migration_batches CASCADE;
DROP TABLE IF EXISTS public.migration_source_entries CASCADE;
DROP TABLE IF EXISTS public.migration_oav_targets CASCADE;
DROP TABLE IF EXISTS public.migration_oaov_targets CASCADE;
DROP TABLE IF EXISTS public.migration_rollback_attempts CASCADE;

CREATE TABLE public.categories (
    id serial PRIMARY KEY,
    parent_id integer,
    slug text
);

CREATE TABLE public.offers (
    id serial PRIMARY KEY,
    title text,
    publication_status text,
    is_active boolean,
    offer_model text,
    category_id integer,
    technical_attributes jsonb,
    conversion_type text
);

CREATE TABLE public.attribute_definitions (
    id serial PRIMARY KEY,
    stable_key text UNIQUE,
    data_type text,
    is_active boolean
);

CREATE TABLE public.attribute_definition_translations (
    id serial PRIMARY KEY,
    attribute_definition_id integer,
    locale text
);

CREATE TABLE public.category_attribute_assignments (
    id serial PRIMARY KEY,
    category_id integer,
    attribute_definition_id integer,
    sort_order integer,
    is_filterable boolean,
    is_comparable boolean,
    is_required boolean,
    is_visible boolean,
    unit_code text
);

CREATE TABLE public.controlled_option_values (
    id serial PRIMARY KEY,
    attribute_id integer,
    stable_key text,
    is_active boolean
);

CREATE TABLE public.controlled_option_value_translations (
    id serial PRIMARY KEY,
    controlled_option_value_id integer,
    locale text
);

CREATE TABLE public.offer_attribute_values (
    id serial PRIMARY KEY,
    offer_id integer,
    attribute_id integer,
    option_id integer,
    value_number numeric,
    value_text text,
    value_boolean boolean,
    value_date date,
    value_year integer
);

CREATE TABLE public.offer_attribute_option_values (
    id serial PRIMARY KEY,
    offer_id integer,
    attribute_id integer,
    option_id integer
);

CREATE TABLE public.migration_batches (id serial PRIMARY KEY);
CREATE TABLE public.migration_source_entries (id serial PRIMARY KEY);
CREATE TABLE public.migration_oav_targets (id serial PRIMARY KEY);
CREATE TABLE public.migration_oaov_targets (id serial PRIMARY KEY);
CREATE TABLE public.migration_rollback_attempts (id serial PRIMARY KEY);
