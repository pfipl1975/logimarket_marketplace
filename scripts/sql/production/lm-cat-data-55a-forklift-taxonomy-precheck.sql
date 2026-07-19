BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15000ms';
SET LOCAL lock_timeout = '3000ms';

DO $$
DECLARE
  v_target_cat_count integer;
  v_source_cat_count integer;
  
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
BEGIN
  -- 1. Check target category 25
  SELECT count(*) INTO v_target_cat_count FROM public.categories WHERE id = 25 AND slug = 'elektryczne-wozki-paletowe';
  IF v_target_cat_count <> 1 THEN
    RAISE EXCEPTION 'LM55A precheck: target category 25 with slug elektryczne-wozki-paletowe does not exist' USING ERRCODE = 'check_violation';
  END IF;

  -- 2. Check source category 21
  SELECT count(*) INTO v_source_cat_count FROM public.categories WHERE id = 21 AND slug = 'wozki-widlowe-elektryczne';
  IF v_source_cat_count <> 1 THEN
    RAISE EXCEPTION 'LM55A precheck: source category 21 with slug wozki-widlowe-elektryczne does not exist' USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Get offer 8 details
  SELECT title, category_id, publication_status, offer_model,
         partner_id, price_brutto, price_on_request, conversion_type,
         is_featured, is_active, technical_attributes
  INTO v_title, v_category_id, v_pub_status, v_offer_model,
       v_partner_id, v_price_brutto, v_price_on_request, v_conversion_type,
       v_is_featured, v_is_active, v_tech_attrs
  FROM public.offers WHERE id = 8;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LM55A precheck: expected exactly one offer with ID 8, but not found' USING ERRCODE = 'check_violation';
  END IF;

  IF v_title <> 'Elektryczny wózek paletowy LogiTrans L-18' THEN
    RAISE EXCEPTION 'LM55A precheck: expected title "Elektryczny wózek paletowy LogiTrans L-18", got "%"', v_title USING ERRCODE = 'check_violation';
  END IF;

  IF v_category_id IS DISTINCT FROM 21 THEN
    RAISE EXCEPTION 'LM55A precheck: expected category_id 21, got %', v_category_id USING ERRCODE = 'check_violation';
  END IF;

  IF v_pub_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'LM55A precheck: expected publication_status "draft", got "%"', v_pub_status USING ERRCODE = 'check_violation';
  END IF;

  IF v_offer_model IS DISTINCT FROM 'rfq' THEN
    RAISE EXCEPTION 'LM55A precheck: expected offer_model "rfq", got "%"', v_offer_model USING ERRCODE = 'check_violation';
  END IF;

  IF v_partner_id IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'LM55A precheck: expected partner_id 1, got %', v_partner_id USING ERRCODE = 'check_violation';
  END IF;

  IF v_price_brutto IS DISTINCT FROM 8900.00 THEN
    RAISE EXCEPTION 'LM55A precheck: expected price_brutto 8900.00, got %', v_price_brutto USING ERRCODE = 'check_violation';
  END IF;

  IF v_price_on_request IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'LM55A precheck: expected price_on_request false, got %', v_price_on_request USING ERRCODE = 'check_violation';
  END IF;

  IF v_conversion_type IS DISTINCT FROM 'outbound' THEN
    RAISE EXCEPTION 'LM55A precheck: expected conversion_type "outbound", got "%"', v_conversion_type USING ERRCODE = 'check_violation';
  END IF;

  IF v_is_featured IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'LM55A precheck: expected is_featured false, got %', v_is_featured USING ERRCODE = 'check_violation';
  END IF;

  IF v_is_active IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'LM55A precheck: expected is_active false, got %', v_is_active USING ERRCODE = 'check_violation';
  END IF;

  IF v_tech_attrs IS DISTINCT FROM '{"Bateria":"Li-Ion 24V/30Ah","Udźwig (kg)":1800,"Długość wideł (mm)":1150}'::jsonb THEN
    RAISE EXCEPTION 'LM55A precheck: technical_attributes mismatch, got %', v_tech_attrs USING ERRCODE = 'check_violation';
  END IF;
END $$;

SELECT 'PASS' AS precheck_status;
ROLLBACK;
