-- Minimalny, lokalny fixture kontraktu sprzed 0004.
-- Obejmuje wyłącznie zależności potrzebne do testu addytywnej migracji 0004.

CREATE TABLE categories (
  id bigint PRIMARY KEY,
  parent_id bigint REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE TABLE offers (
  id bigint PRIMARY KEY,
  category_id bigint NOT NULL REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE TABLE attribute_definitions (
  id bigserial PRIMARY KEY,
  stable_key text NOT NULL,
  data_type varchar(30) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uq_ad_stable_key UNIQUE (stable_key),
  CONSTRAINT chk_ad_data_type CHECK (data_type IN ('text', 'number', 'boolean', 'date', 'year', 'enum', 'multi_enum'))
);

CREATE TABLE controlled_option_values (
  id bigserial PRIMARY KEY,
  attribute_id bigint NOT NULL,
  stable_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uq_cov_attr_option UNIQUE (attribute_id, stable_key),
  CONSTRAINT fk_cov_attribute FOREIGN KEY (attribute_id) REFERENCES attribute_definitions(id)
);

CREATE TABLE offer_attribute_values (
  id bigserial PRIMARY KEY,
  offer_id bigint NOT NULL,
  attribute_id bigint NOT NULL,
  value_text text,
  value_number numeric,
  value_boolean boolean,
  value_date timestamp with time zone,
  value_year integer,
  option_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uq_oav_offer_attribute UNIQUE (offer_id, attribute_id),
  CONSTRAINT chk_oav_value_exclusivity CHECK (
    num_nonnulls(value_text, value_number, value_boolean, value_date, value_year, option_id) = 1
  ),
  CONSTRAINT fk_oav_offer FOREIGN KEY (offer_id) REFERENCES offers(id),
  CONSTRAINT fk_oav_attribute FOREIGN KEY (attribute_id) REFERENCES attribute_definitions(id),
  CONSTRAINT fk_oav_option FOREIGN KEY (option_id) REFERENCES controlled_option_values(id)
);

CREATE TABLE offer_attribute_option_values (
  id bigserial PRIMARY KEY,
  offer_id bigint NOT NULL,
  attribute_id bigint NOT NULL,
  option_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uq_oaov_offer_attribute_option UNIQUE (offer_id, attribute_id, option_id),
  CONSTRAINT fk_oaov_offer FOREIGN KEY (offer_id) REFERENCES offers(id),
  CONSTRAINT fk_oaov_attribute FOREIGN KEY (attribute_id) REFERENCES attribute_definitions(id),
  CONSTRAINT fk_oaov_option FOREIGN KEY (option_id) REFERENCES controlled_option_values(id)
);
