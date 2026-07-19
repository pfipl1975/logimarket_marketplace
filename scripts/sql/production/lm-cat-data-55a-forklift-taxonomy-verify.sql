BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15000ms';
SET LOCAL lock_timeout = '3000ms';

DO $$
DECLARE
  v_title text;
  v_category_id bigint;
  v_pub_status varchar(20);
  v_offer_model varchar(20);
  v_partner_id bigint;
  v_price_brutto numeric;
  v_price_on_request boolean;
  v_conversion_type varchar(20);
  v_is_featured boolean;
  v_is_active boolean;
  v_tech_attrs jsonb;
  
  v_offer_1_cat bigint;
  
  v_slug_21 text;
  v_slug_25 text;
  
  v_cat_21_count integer;
  v_cat_25_count integer;
BEGIN
  -- 1. Get offer 8 details
  SELECT title, category_id, publication_status, offer_model,
         partner_id, price_brutto, price_on_request, conversion_type,
         is_featured, is_active, technical_attributes
  INTO v_title, v_category_id, v_pub_status, v_offer_model,
       v_partner_id, v_price_brutto, v_price_on_request, v_conversion_type,
       v_is_featured, v_is_active, v_tech_attrs
  FROM public.offers WHERE id = 8;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LM55A verify: offer 8 not found' USING ERRCODE = 'check_violation';
  END IF;

  IF v_category_id IS DISTINCT FROM 25 THEN
    RAISE EXCEPTION 'LM55A verify: expected category_id 25, got %', v_category_id USING ERRCODE = 'check_violation';
  END IF;

  IF v_title <> 'Elektryczny wózek paletowy LogiTrans L-18' THEN
    RAISE EXCEPTION 'LM55A verify: title mismatch: "%"', v_title USING ERRCODE = 'check_violation';
  END IF;

  IF v_pub_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'LM55A verify: publication_status mismatch: "%"', v_pub_status USING ERRCODE = 'check_violation';
  END IF;

  IF v_offer_model IS DISTINCT FROM 'rfq' THEN
    RAISE EXCEPTION 'LM55A verify: offer_model mismatch: "%"', v_offer_model USING ERRCODE = 'check_violation';
  END IF;

  IF v_partner_id IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'LM55A verify: partner_id mismatch: %', v_partner_id USING ERRCODE = 'check_violation';
  END IF;

  IF v_price_brutto IS DISTINCT FROM 8900.00 THEN
    RAISE EXCEPTION 'LM55A verify: price_brutto mismatch: %', v_price_brutto USING ERRCODE = 'check_violation';
  END IF;

  IF v_price_on_request IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'LM55A verify: price_on_request mismatch: %', v_price_on_request USING ERRCODE = 'check_violation';
  END IF;

  IF v_conversion_type IS DISTINCT FROM 'outbound' THEN
    RAISE EXCEPTION 'LM55A verify: conversion_type mismatch: "%"', v_conversion_type USING ERRCODE = 'check_violation';
  END IF;

  IF v_is_featured IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'LM55A verify: is_featured mismatch: %', v_is_featured USING ERRCODE = 'check_violation';
  END IF;

  IF v_is_active IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'LM55A verify: is_active mismatch: %', v_is_active USING ERRCODE = 'check_violation';
  END IF;

  -- Semantyczne porównanie JSONB
  IF v_tech_attrs IS DISTINCT FROM '{"Bateria":"Li-Ion 24V/30Ah","Udźwig (kg)":1800,"Długość wideł (mm)":1150}'::jsonb THEN
    RAISE EXCEPTION 'LM55A verify: technical_attributes mismatch, got %', v_tech_attrs USING ERRCODE = 'check_violation';
  END IF;

  -- 2. Inspect offer 1
  SELECT category_id INTO v_offer_1_cat FROM public.offers WHERE id = 1;
  IF v_offer_1_cat IS DISTINCT FROM 21 THEN
    RAISE EXCEPTION 'LM55A verify: expected offer 1 in category 21, got %', v_offer_1_cat USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Verify category slugs
  SELECT slug INTO v_slug_21 FROM public.categories WHERE id = 21;
  IF v_slug_21 IS DISTINCT FROM 'wozki-widlowe-elektryczne' THEN
    RAISE EXCEPTION 'LM55A verify: source category slug mismatch' USING ERRCODE = 'check_violation';
  END IF;

  SELECT slug INTO v_slug_25 FROM public.categories WHERE id = 25;
  IF v_slug_25 IS DISTINCT FROM 'elektryczne-wozki-paletowe' THEN
    RAISE EXCEPTION 'LM55A verify: target category slug mismatch' USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Count validation
  SELECT count(*) INTO v_cat_21_count FROM public.offers WHERE category_id = 21;
  SELECT count(*) INTO v_cat_25_count FROM public.offers WHERE category_id = 25;

  IF v_cat_21_count <> 1 THEN
    RAISE EXCEPTION 'LM55A verify: expected 1 offer in category 21, got %', v_cat_21_count USING ERRCODE = 'check_violation';
  END IF;

  IF v_cat_25_count <> 1 THEN
    RAISE EXCEPTION 'LM55A verify: expected 1 offer in category 25, got %', v_cat_25_count USING ERRCODE = 'check_violation';
  END IF;
END $$;

SELECT 'PASS' AS verify_status;
ROLLBACK;
