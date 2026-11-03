-- READ ONLY: validates the exact new hierarchy and leaves all existing categories untouched.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15000ms';
SET LOCAL lock_timeout = '3000ms';
SET LOCAL TIME ZONE 'UTC';
DO $lm$
DECLARE
  v_existing integer;
  v_drift integer;
BEGIN
  SELECT count(*) INTO v_existing FROM public.categories WHERE slug IN ('maszyny-i-urzadzenia', 'osprzet-do-maszyn-budowlanych', 'lyzki-do-koparek', 'lyzki-do-ladowarek', 'lyzki-skarpowe-i-profilujace');
  IF v_existing <> 5 THEN
    RAISE EXCEPTION 'LM-CATALOG-BUCKETS-01 verify: expected 5 nodes, got %', v_existing
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
END;
$lm$;
SELECT 'PASS' AS verify_status, c.id, c.slug, c.name, p.slug AS parent_slug
FROM public.categories c LEFT JOIN public.categories p ON p.id = c.parent_id
WHERE c.slug IN ('maszyny-i-urzadzenia', 'osprzet-do-maszyn-budowlanych', 'lyzki-do-koparek', 'lyzki-do-ladowarek', 'lyzki-skarpowe-i-profilujace')
ORDER BY CASE c.slug
  WHEN 'maszyny-i-urzadzenia' THEN 0
  WHEN 'osprzet-do-maszyn-budowlanych' THEN 1
  WHEN 'lyzki-do-koparek' THEN 2
  WHEN 'lyzki-do-ladowarek' THEN 3
  ELSE 4 END;
ROLLBACK;
