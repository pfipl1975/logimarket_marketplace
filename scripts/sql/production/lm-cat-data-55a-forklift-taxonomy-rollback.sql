BEGIN;
SET LOCAL statement_timeout = '15000ms';
SET LOCAL lock_timeout = '3000ms';

DO $$
DECLARE
  v_slug_21 text;
  v_slug_25 text;
  
  -- Zmienne na chronione pola
  v_orig_category_id bigint;
  v_orig_title text;
  v_orig_pub_status varchar(20);
  v_orig_offer_model varchar(20);
  v_orig_partner_id bigint;
  v_orig_price_brutto numeric;
  v_orig_price_on_request boolean;
  v_orig_conversion_type varchar(20);
  v_orig_outbound_url varchar(512);
  v_orig_is_featured boolean;
  v_orig_is_active boolean;
  v_orig_tech_attrs jsonb;
  
  v_updated_rows integer;
  
  -- Zmienne do postchecku
  v_post_category_id bigint;
  v_post_title text;
  v_post_pub_status varchar(20);
  v_post_offer_model varchar(20);
  v_post_partner_id bigint;
  v_post_price_brutto numeric;
  v_post_price_on_request boolean;
  v_post_conversion_type varchar(20);
  v_post_outbound_url varchar(512);
  v_post_is_featured boolean;
  v_post_is_active boolean;
  v_post_tech_attrs jsonb;
  
  v_post_slug_21 text;
  v_post_slug_25 text;
  v_post_offer_1_cat bigint;
BEGIN
  -- 1. Deterministyczne blokowanie kategorii (rosnąco po ID)
  PERFORM id FROM public.categories WHERE id IN (21, 25) ORDER BY id FOR UPDATE;
  
  -- Weryfikacja slugów kategorii po zablokowaniu
  SELECT slug INTO v_slug_21 FROM public.categories WHERE id = 21;
  IF v_slug_21 IS DISTINCT FROM 'wozki-widlowe-elektryczne' THEN
    RAISE EXCEPTION 'LM55A rollback: source category slug mismatch or category missing' USING ERRCODE = 'check_violation';
  END IF;
  
  SELECT slug INTO v_slug_25 FROM public.categories WHERE id = 25;
  IF v_slug_25 IS DISTINCT FROM 'elektryczne-wozki-paletowe' THEN
    RAISE EXCEPTION 'LM55A rollback: target category slug mismatch or category missing' USING ERRCODE = 'check_violation';
  END IF;

  -- 2. Lock and fetch offer 8
  SELECT category_id, title, publication_status, offer_model, partner_id, price_brutto,
         price_on_request, conversion_type, outbound_url, is_featured, is_active, technical_attributes
  INTO v_orig_category_id, v_orig_title, v_orig_pub_status, v_orig_offer_model, v_orig_partner_id, v_orig_price_brutto,
       v_orig_price_on_request, v_orig_conversion_type, v_orig_outbound_url, v_orig_is_featured, v_orig_is_active, v_orig_tech_attrs
  FROM public.offers
  WHERE id = 8
  FOR UPDATE;

  -- 3. Wykrywanie braku rekordu przez IF NOT FOUND
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LM55A rollback: offer 8 not found' USING ERRCODE = 'check_violation';
  END IF;

  -- Weryfikacja metadanych oferty pod kątem dryfu przed zmianą
  IF v_orig_title IS DISTINCT FROM 'Elektryczny wózek paletowy LogiTrans L-18'
     OR v_orig_pub_status IS DISTINCT FROM 'draft'
     OR v_orig_offer_model IS DISTINCT FROM 'rfq'
     OR v_orig_partner_id IS DISTINCT FROM 1
     OR v_orig_price_brutto IS DISTINCT FROM 8900.00
     OR v_orig_price_on_request IS DISTINCT FROM false
     OR v_orig_conversion_type IS DISTINCT FROM 'outbound'
     OR v_orig_is_featured IS DISTINCT FROM false
     OR v_orig_is_active IS DISTINCT FROM false
     OR v_orig_tech_attrs IS DISTINCT FROM '{"Bateria":"Li-Ion 24V/30Ah","Udźwig (kg)":1800,"Długość wideł (mm)":1150}'::jsonb THEN
    RAISE EXCEPTION 'LM55A rollback: DRIFT_DETECTED. Metadata mismatch' USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Obsługa trzech stanów
  IF v_orig_category_id = 21 THEN
    -- Stan ALREADY_ROLLED_BACK
    RAISE NOTICE 'LM55A rollback: ALREADY_ROLLED_BACK. Offer 8 is already in category 21.';
  ELSIF v_orig_category_id = 25 THEN
    -- Wykonaj UPDATE 25 -> 21
    UPDATE public.offers
    SET category_id = 21,
        updated_at = now()
    WHERE id = 8 AND category_id = 25;
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN
      RAISE EXCEPTION 'LM55A rollback: expected 1 row updated, got %', v_updated_rows USING ERRCODE = 'check_violation';
    END IF;
    RAISE NOTICE 'LM55A rollback: SUCCESS. Offer 8 category restored from 25 to 21.';
  ELSE
    -- Dryf kategorii (inna wartość)
    RAISE EXCEPTION 'LM55A rollback: DRIFT_DETECTED. Offer 8 is in category %, expected 21 or 25', v_orig_category_id USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Pełny postcheck przed COMMIT
  SELECT category_id, title, publication_status, offer_model, partner_id, price_brutto,
         price_on_request, conversion_type, outbound_url, is_featured, is_active, technical_attributes
  INTO v_post_category_id, v_post_title, v_post_pub_status, v_post_offer_model, v_post_partner_id, v_post_price_brutto,
       v_post_price_on_request, v_post_conversion_type, v_post_outbound_url, v_post_is_featured, v_post_is_active, v_post_tech_attrs
  FROM public.offers
  WHERE id = 8;

  IF v_post_category_id IS DISTINCT FROM 21 THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: category_id is %, expected 21', v_post_category_id USING ERRCODE = 'check_violation';
  END IF;

  -- Walidacja wszystkich chronionych pól
  IF v_post_title IS DISTINCT FROM v_orig_title THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: title changed' USING ERRCODE = 'check_violation';
  END IF;
  IF v_post_pub_status IS DISTINCT FROM v_orig_pub_status THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: publication_status changed' USING ERRCODE = 'check_violation';
  END IF;
  IF v_post_offer_model IS DISTINCT FROM v_orig_offer_model THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: offer_model changed' USING ERRCODE = 'check_violation';
  END IF;
  IF v_post_partner_id IS DISTINCT FROM v_orig_partner_id THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: partner_id changed' USING ERRCODE = 'check_violation';
  END IF;
  IF v_post_price_brutto IS DISTINCT FROM v_orig_price_brutto THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: price_brutto changed' USING ERRCODE = 'check_violation';
  END IF;
  IF v_post_price_on_request IS DISTINCT FROM v_orig_price_on_request THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: price_on_request changed' USING ERRCODE = 'check_violation';
  END IF;
  IF v_post_conversion_type IS DISTINCT FROM v_orig_conversion_type THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: conversion_type changed' USING ERRCODE = 'check_violation';
  END IF;
  IF v_post_outbound_url IS DISTINCT FROM v_orig_outbound_url THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: outbound_url changed' USING ERRCODE = 'check_violation';
  END IF;
  IF v_post_is_featured IS DISTINCT FROM v_orig_is_featured THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: is_featured changed' USING ERRCODE = 'check_violation';
  END IF;
  IF v_post_is_active IS DISTINCT FROM v_orig_is_active THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: is_active changed' USING ERRCODE = 'check_violation';
  END IF;
  IF v_post_tech_attrs IS DISTINCT FROM v_orig_tech_attrs THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: technical_attributes changed' USING ERRCODE = 'check_violation';
  END IF;

  -- Weryfikacja slugów kategorii w postchecku
  SELECT slug INTO v_post_slug_21 FROM public.categories WHERE id = 21;
  IF v_post_slug_21 IS DISTINCT FROM 'wozki-widlowe-elektryczne' THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: source category slug mutated' USING ERRCODE = 'check_violation';
  END IF;
  SELECT slug INTO v_post_slug_25 FROM public.categories WHERE id = 25;
  IF v_post_slug_25 IS DISTINCT FROM 'elektryczne-wozki-paletowe' THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: target category slug mutated' USING ERRCODE = 'check_violation';
  END IF;

  -- Weryfikacja oferty ID 1
  SELECT category_id INTO v_post_offer_1_cat FROM public.offers WHERE id = 1;
  IF v_post_offer_1_cat IS DISTINCT FROM 21 THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: offer 1 category changed to %', v_post_offer_1_cat USING ERRCODE = 'check_violation';
  END IF;
END $$;

COMMIT;
