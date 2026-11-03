-- STAGED ONLY. Destructive: Owner must separately approve exact environment and IDs.
-- Safe only if precheck showed target rows absent before the original apply.
BEGIN;
SET LOCAL statement_timeout = '15000ms';
SET LOCAL lock_timeout = '3000ms';
SET LOCAL TIME ZONE 'UTC';
DO $lm$
DECLARE
  v_existing integer;
  v_drift integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('LM-CATALOG-BUCKETS-01'));
  SELECT count(*) INTO v_existing FROM public.categories WHERE slug IN ('maszyny-i-urzadzenia', 'osprzet-do-maszyn-budowlanych', 'lyzki-do-koparek', 'lyzki-do-ladowarek', 'lyzki-skarpowe-i-profilujace');
  IF v_existing = 0 THEN RETURN; END IF;
  IF v_existing <> 5 THEN
    RAISE EXCEPTION 'LM-CATALOG-BUCKETS-01 rollback: incomplete target taxonomy' USING ERRCODE = 'check_violation';
  END IF;

  WITH planned(slug, expected_name, parent_slug) AS (VALUES
    ('maszyny-i-urzadzenia', 'Maszyny i urządzenia', NULL),
    ('osprzet-do-maszyn-budowlanych', 'Osprzęt do maszyn budowlanych', 'maszyny-i-urzadzenia'),
    ('lyzki-do-koparek', 'Łyżki do koparek', 'osprzet-do-maszyn-budowlanych'),
    ('lyzki-do-ladowarek', 'Łyżki do ładowarek', 'osprzet-do-maszyn-budowlanych'),
    ('lyzki-skarpowe-i-profilujace', 'Łyżki skarpowe i profilujące', 'osprzet-do-maszyn-budowlanych')
  ),
  state AS (
    SELECT p.slug, p.expected_name, p.parent_slug, c.id, c.name actual_name,
           parent.slug actual_parent
    FROM planned p
    LEFT JOIN public.categories c ON c.slug = p.slug
    LEFT JOIN public.categories parent ON parent.id = c.parent_id
  )
  SELECT count(*) INTO v_drift FROM state
  WHERE id IS NOT NULL
    AND (actual_name IS DISTINCT FROM expected_name OR actual_parent IS DISTINCT FROM parent_slug);
  IF v_drift > 0 THEN
    RAISE EXCEPTION 'LM-CATALOG-BUCKETS-01: existing slug/name/parent conflict (% nodes)', v_drift
      USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.offers
             WHERE category_id IN (SELECT id FROM public.categories WHERE slug IN ('maszyny-i-urzadzenia', 'osprzet-do-maszyn-budowlanych', 'lyzki-do-koparek', 'lyzki-do-ladowarek', 'lyzki-skarpowe-i-profilujace'))) THEN
    RAISE EXCEPTION 'LM-CATALOG-BUCKETS-01 rollback: categories have offers' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.category_attribute_assignments
             WHERE category_id IN (SELECT id FROM public.categories WHERE slug IN ('maszyny-i-urzadzenia', 'osprzet-do-maszyn-budowlanych', 'lyzki-do-koparek', 'lyzki-do-ladowarek', 'lyzki-skarpowe-i-profilujace'))) THEN
    RAISE EXCEPTION 'LM-CATALOG-BUCKETS-01 rollback: categories have attribute assignments'
      USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.categories
             WHERE parent_id IN (SELECT id FROM public.categories WHERE slug IN ('maszyny-i-urzadzenia', 'osprzet-do-maszyn-budowlanych', 'lyzki-do-koparek', 'lyzki-do-ladowarek', 'lyzki-skarpowe-i-profilujace'))
               AND slug NOT IN ('maszyny-i-urzadzenia', 'osprzet-do-maszyn-budowlanych', 'lyzki-do-koparek', 'lyzki-do-ladowarek', 'lyzki-skarpowe-i-profilujace')) THEN
    RAISE EXCEPTION 'LM-CATALOG-BUCKETS-01 rollback: unplanned descendants exist'
      USING ERRCODE = 'check_violation';
  END IF;
  DELETE FROM public.categories WHERE slug IN
    ('lyzki-do-koparek','lyzki-do-ladowarek','lyzki-skarpowe-i-profilujace');
  DELETE FROM public.categories WHERE slug = 'osprzet-do-maszyn-budowlanych';
  DELETE FROM public.categories WHERE slug = 'maszyny-i-urzadzenia';
END;
$lm$;
COMMIT;
