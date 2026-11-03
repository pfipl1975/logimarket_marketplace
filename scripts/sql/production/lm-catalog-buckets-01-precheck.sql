-- READ ONLY. Gate before any production data change.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15000ms';
SET LOCAL lock_timeout = '3000ms';
SET LOCAL TIME ZONE 'UTC';
DO $lm$
DECLARE
  v_existing integer;
  v_roots integer;
  v_drift integer;
BEGIN
  SELECT count(*) INTO v_existing FROM public.categories WHERE slug IN ('maszyny-i-urzadzenia', 'osprzet-do-maszyn-budowlanych', 'lyzki-do-koparek', 'lyzki-do-ladowarek', 'lyzki-skarpowe-i-profilujace');
  IF v_existing NOT IN (0, 5) THEN
    RAISE EXCEPTION 'LM-CATALOG-BUCKETS-01: partial target taxonomy (% of 5)', v_existing
      USING ERRCODE = 'check_violation';
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
  SELECT count(*) INTO v_roots FROM public.categories WHERE parent_id IS NULL;
  IF (v_existing = 0 AND v_roots <> 6) OR (v_existing = 5 AND v_roots <> 7) THEN
    RAISE EXCEPTION 'LM-CATALOG-BUCKETS-01: expected 6 roots before / 7 after, got %, target rows %', v_roots, v_existing
      USING ERRCODE = 'check_violation';
  END IF;
END;
$lm$;
SELECT 'PASS' AS precheck_status,
       (SELECT count(*)::int FROM public.categories WHERE slug IN ('maszyny-i-urzadzenia', 'osprzet-do-maszyn-budowlanych', 'lyzki-do-koparek', 'lyzki-do-ladowarek', 'lyzki-skarpowe-i-profilujace')) AS existing_target_rows,
       (SELECT count(*)::int FROM public.categories WHERE parent_id IS NULL) AS total_root_sections;
ROLLBACK;
