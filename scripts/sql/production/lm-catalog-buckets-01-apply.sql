-- STAGED ONLY. DO NOT run on production without separate explicit Owner DB-write approval.
BEGIN;
SET LOCAL statement_timeout = '15000ms';
SET LOCAL lock_timeout = '3000ms';
SET LOCAL TIME ZONE 'UTC';
DO $lm$
DECLARE
  v_existing integer;
  v_root bigint;
  v_group bigint;
  v_id bigint;
  v_parent bigint;
  v_name text;
  v_drift integer;
  v_leaf record;
BEGIN
  -- Serializes this package without locking or updating unrelated taxonomy.
  PERFORM pg_advisory_xact_lock(hashtext('LM-CATALOG-BUCKETS-01'));
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

  SELECT id, parent_id, name INTO v_root, v_parent, v_name
  FROM public.categories WHERE slug = 'maszyny-i-urzadzenia' FOR UPDATE;
  IF v_root IS NULL THEN
    INSERT INTO public.categories(name, slug, parent_id)
    VALUES ('Maszyny i urządzenia', 'maszyny-i-urzadzenia', NULL) RETURNING id INTO v_root;
  ELSIF v_parent IS NOT NULL OR v_name IS DISTINCT FROM 'Maszyny i urządzenia' THEN
    RAISE EXCEPTION 'LM-CATALOG-BUCKETS-01: root drift' USING ERRCODE = 'check_violation';
  END IF;

  SELECT id, parent_id, name INTO v_group, v_parent, v_name
  FROM public.categories WHERE slug = 'osprzet-do-maszyn-budowlanych' FOR UPDATE;
  IF v_group IS NULL THEN
    INSERT INTO public.categories(name, slug, parent_id)
    VALUES ('Osprzęt do maszyn budowlanych', 'osprzet-do-maszyn-budowlanych', v_root)
    RETURNING id INTO v_group;
  ELSIF v_parent IS DISTINCT FROM v_root OR v_name IS DISTINCT FROM 'Osprzęt do maszyn budowlanych' THEN
    RAISE EXCEPTION 'LM-CATALOG-BUCKETS-01: group drift' USING ERRCODE = 'check_violation';
  END IF;

  FOR v_leaf IN SELECT * FROM (VALUES
    ('lyzki-do-koparek', 'Łyżki do koparek'),
    ('lyzki-do-ladowarek', 'Łyżki do ładowarek'),
    ('lyzki-skarpowe-i-profilujace', 'Łyżki skarpowe i profilujące')
  ) AS x(slug, name)
  LOOP
    SELECT id, parent_id, name INTO v_id, v_parent, v_name
    FROM public.categories WHERE slug = v_leaf.slug FOR UPDATE;
    IF v_id IS NULL THEN
      INSERT INTO public.categories(name, slug, parent_id)
      VALUES (v_leaf.name, v_leaf.slug, v_group);
    ELSIF v_parent IS DISTINCT FROM v_group OR v_name IS DISTINCT FROM v_leaf.name THEN
      RAISE EXCEPTION 'LM-CATALOG-BUCKETS-01: leaf drift (%)', v_leaf.slug
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
END;
$lm$;
COMMIT;
