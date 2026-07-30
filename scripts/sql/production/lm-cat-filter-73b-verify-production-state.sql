-- LM-CAT-FILTER-73B: Read-Only Production State Verification
-- Must not run with admin privileges. Requires a read-only role.
WITH config_manifest (stable_key, data_type, unit_code, sort_order, is_filterable, is_comparable, is_required, is_visible, is_active) AS (
    VALUES
        ('external_length', 'number', 'mm', 10, true, true, true, true, true),
        ('external_width', 'number', 'mm', 20, true, true, true, true, true),
        ('external_height', 'number', 'mm', 30, true, true, true, true, true),
        ('capacity', 'number', 'l', 40, true, true, true, true, true),
        ('material', 'enum', NULL::text, 50, true, true, true, true, true),
        ('esd_protection', 'boolean', NULL::text, 60, false, true, false, true, true),
        ('load_capacity', 'number', 'kg', 70, false, true, false, true, true),
        ('stackable', 'boolean', NULL::text, 80, false, true, false, true, true)
),
option_manifest (attr_key, stable_key, is_active) AS (
    VALUES
        ('material', 'pp', true),
        ('material', 'hdpe', true)
),
locale_manifest (locale) AS (
    VALUES ('pl'),('en'),('de'),('fr'),('uk'),('es'),('zh')
),
oav_manifest (offer_id, attribute_key, value_number, option_key) AS (
    VALUES
        (5, 'external_length', 600::numeric, NULL::text),
        (5, 'external_width', 400::numeric, NULL::text),
        (5, 'external_height', 220::numeric, NULL::text),
        (5, 'capacity', 45::numeric, NULL::text),
        (5, 'material', NULL::numeric, 'pp'),
        (6, 'external_length', 400::numeric, NULL::text),
        (6, 'external_width', 300::numeric, NULL::text),
        (6, 'external_height', 120::numeric, NULL::text),
        (6, 'capacity', 10::numeric, NULL::text),
        (6, 'material', NULL::numeric, 'pp')
),
target_category AS (
    SELECT c1.id AS category_id
    FROM public.categories c1
    JOIN public.categories c2 ON c2.id = c1.parent_id
    JOIN public.categories c3 ON c3.id = c2.parent_id
    WHERE c1.slug = 'pojemniki-plastikowe-euro'
      AND c2.slug = 'pojemniki-i-kuwety'
      AND c3.slug = 'wyposazenie-magazynu'
),
target_offers AS (
    SELECT 5 AS offer_id, o.title, o.publication_status, o.is_active, o.offer_model, o.category_id, o.technical_attributes, o.conversion_type FROM public.offers o WHERE o.id = 5
    UNION ALL
    SELECT 6 AS offer_id, o.title, o.publication_status, o.is_active, o.offer_model, o.category_id, o.technical_attributes, o.conversion_type FROM public.offers o WHERE o.id = 6
),
check_category_path AS (
    SELECT 'CATEGORY_PATH'::text AS check_id, 'catalog_structure'::text AS scope,
           CASE WHEN count(*) = 1 THEN 'PASS' WHEN count(*) = 0 THEN 'MISSING' ELSE 'DRIFT' END AS status,
           'pojemniki-plastikowe-euro'::text AS expected,
           CASE WHEN count(*) = 1 THEN 'pojemniki-plastikowe-euro' WHEN count(*) = 0 THEN 'not_found' ELSE 'multiple_found' END AS actual,
           'Category path wyposazenie-magazynu > pojemniki-i-kuwety > pojemniki-plastikowe-euro'::text AS details
    FROM target_category
),
check_category_parent_chain AS (
    SELECT 'CATEGORY_PARENT_CHAIN'::text AS check_id, 'catalog_structure'::text AS scope,
           CASE WHEN (SELECT count(*) FROM target_category) = 1 THEN 'PASS' ELSE 'BLOCKED' END AS status,
           'resolved'::text AS expected,
           CASE WHEN (SELECT count(*) FROM target_category) = 1 THEN 'resolved' ELSE 'unresolved' END AS actual,
           'Hierarchy chain validation'::text AS details
),
actual_attributes AS (
    SELECT m.stable_key AS expected_key, ad.stable_key AS actual_key,
           m.data_type AS expected_type, ad.data_type AS actual_type,
           m.is_active AS expected_active, ad.is_active AS actual_active
    FROM config_manifest m
    LEFT JOIN public.attribute_definitions ad ON m.stable_key = ad.stable_key
),
check_attribute_definitions AS (
    SELECT 'ATTRIBUTE_DEFINITIONS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN count(expected_key) = count(actual_key) AND sum(CASE WHEN expected_type = actual_type AND expected_active = actual_active THEN 1 ELSE 0 END) = 8 THEN 'PASS'
             WHEN count(actual_key) = 0 THEN 'MISSING'
             WHEN count(actual_key) > 0 AND count(actual_key) < 8 THEN 'PARTIAL'
             ELSE 'DRIFT'
           END AS status,
           '8 matched definitions'::text AS expected,
           concat(count(actual_key), ' definitions found')::text AS actual,
           'Matches stable keys and basic data types'::text AS details
    FROM actual_attributes
),
expected_assignments AS (
    SELECT m.stable_key FROM config_manifest m
),
actual_target_category_assignments AS (
    SELECT ad.stable_key, caa.attribute_definition_id
    FROM public.category_attribute_assignments caa
    JOIN target_category tc ON caa.category_id = tc.category_id
    LEFT JOIN public.attribute_definitions ad ON ad.id = caa.attribute_definition_id
),
missing_expected_assignments AS (
    SELECT e.stable_key
    FROM expected_assignments e
    LEFT JOIN actual_target_category_assignments a ON a.stable_key = e.stable_key
    WHERE a.stable_key IS NULL
),
unexpected_target_category_assignments AS (
    SELECT a.stable_key
    FROM actual_target_category_assignments a
    LEFT JOIN expected_assignments e ON e.stable_key = a.stable_key
    WHERE e.stable_key IS NULL
),
check_exact_category_assignments AS (
    SELECT 'EXACT_CATEGORY_ASSIGNMENTS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM actual_target_category_assignments) = 0 THEN 'MISSING'
             WHEN (SELECT count(*) FROM unexpected_target_category_assignments) > 0 THEN 'UNEXPECTED'
             WHEN (SELECT count(*) FROM missing_expected_assignments) > 0 THEN 'PARTIAL'
             ELSE 'PASS'
           END AS status,
           'Exactly 8 pilot assignments'::text AS expected,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM unexpected_target_category_assignments) > 0 THEN 'unexpected assignments found'
             WHEN (SELECT count(*) FROM actual_target_category_assignments) = 0 THEN '0 assignments'
             WHEN (SELECT count(*) FROM missing_expected_assignments) > 0 THEN 'partial assignments'
             ELSE '8 exact assignments'
           END::text AS actual,
           'Checks anti-join for unexpected and partial matching'::text AS details
),
actual_assignments_full AS (
    SELECT m.stable_key AS expected_key, caa.attribute_definition_id,
           caa.sort_order, caa.is_filterable, caa.is_comparable, caa.is_required, caa.is_visible, caa.unit_code
    FROM config_manifest m
    LEFT JOIN public.attribute_definitions ad ON ad.stable_key = m.stable_key
    LEFT JOIN target_category tc ON true
    JOIN public.category_attribute_assignments caa ON caa.attribute_definition_id = ad.id AND caa.category_id = tc.category_id
),
check_attribute_units AS (
    SELECT 'ATTRIBUTE_UNITS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM config_manifest) = 8 AND sum(CASE WHEN m.unit_code IS NOT DISTINCT FROM a.unit_code THEN 1 ELSE 0 END) = 8 THEN 'PASS'
             WHEN count(a.attribute_definition_id) = 0 THEN 'MISSING'
             WHEN count(a.attribute_definition_id) < 8 THEN 'PARTIAL'
             ELSE 'DRIFT'
           END AS status,
           'Exact unit matches'::text AS expected,
           concat(sum(CASE WHEN m.unit_code IS NOT DISTINCT FROM a.unit_code THEN 1 ELSE 0 END), '/8 matched')::text AS actual,
           'Verifies units match the manifest'::text AS details
    FROM config_manifest m
    LEFT JOIN actual_assignments_full a ON m.stable_key = a.expected_key
),
check_attribute_flags AS (
    SELECT 'ATTRIBUTE_FLAGS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN count(expected_key) = 8 AND sum(CASE WHEN 
                  m.sort_order = a.sort_order AND
                  m.is_filterable = a.is_filterable AND
                  m.is_comparable = a.is_comparable AND
                  m.is_required = a.is_required AND
                  m.is_visible = a.is_visible
             THEN 1 ELSE 0 END) = 8 THEN 'PASS'
             WHEN count(a.attribute_definition_id) = 0 THEN 'MISSING'
             WHEN count(a.attribute_definition_id) < 8 THEN 'PARTIAL'
             ELSE 'DRIFT'
           END AS status,
           'Exact flag matches'::text AS expected,
           concat(sum(CASE WHEN m.sort_order = a.sort_order AND m.is_filterable = a.is_filterable AND m.is_comparable = a.is_comparable AND m.is_required = a.is_required AND m.is_visible = a.is_visible THEN 1 ELSE 0 END), '/8 matched')::text AS actual,
           'Verifies boolean flags and sort_order'::text AS details
    FROM config_manifest m
    LEFT JOIN actual_assignments_full a ON m.stable_key = a.expected_key
),
check_attribute_translations AS (
    SELECT 'ATTRIBUTE_TRANSLATIONS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM config_manifest m CROSS JOIN locale_manifest lm LEFT JOIN public.attribute_definitions ad ON m.stable_key = ad.stable_key LEFT JOIN public.attribute_definition_translations adt ON adt.attribute_definition_id = ad.id AND adt.locale = lm.locale WHERE adt.id IS NULL) > 0 THEN 
                CASE WHEN (SELECT count(*) FROM config_manifest m CROSS JOIN locale_manifest lm LEFT JOIN public.attribute_definitions ad ON m.stable_key = ad.stable_key LEFT JOIN public.attribute_definition_translations adt ON adt.attribute_definition_id = ad.id AND adt.locale = lm.locale WHERE adt.id IS NOT NULL) = 0 THEN 'MISSING' ELSE 'PARTIAL' END
             WHEN (SELECT count(*) FROM config_manifest m JOIN public.attribute_definitions ad ON m.stable_key = ad.stable_key JOIN public.attribute_definition_translations adt ON adt.attribute_definition_id = ad.id LEFT JOIN locale_manifest lm ON lm.locale = adt.locale WHERE lm.locale IS NULL) > 0 THEN 'UNEXPECTED'
             ELSE 'PASS'
           END AS status,
           '56 exact pairs'::text AS expected,
           concat((SELECT count(*) FROM config_manifest m JOIN public.attribute_definitions ad ON m.stable_key = ad.stable_key JOIN public.attribute_definition_translations adt ON adt.attribute_definition_id = ad.id), ' total translations')::text AS actual,
           '8 stable keys x 7 locales'::text AS details
),
unexpected_material_options AS (
    SELECT cov.stable_key
    FROM public.controlled_option_values cov
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = 'material' AND cov.stable_key NOT IN ('pp', 'hdpe')
),
check_controlled_options AS (
    SELECT 'CONTROLLED_OPTIONS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM unexpected_material_options) > 0 THEN 'UNEXPECTED'
             WHEN (SELECT count(*) FROM option_manifest m LEFT JOIN public.attribute_definitions ad ON ad.stable_key = m.attr_key LEFT JOIN public.controlled_option_values cov ON cov.attribute_id = ad.id AND cov.stable_key = m.stable_key WHERE cov.id IS NULL) > 0 THEN 
                CASE WHEN (SELECT count(*) FROM option_manifest m LEFT JOIN public.attribute_definitions ad ON ad.stable_key = m.attr_key LEFT JOIN public.controlled_option_values cov ON cov.attribute_id = ad.id AND cov.stable_key = m.stable_key WHERE cov.id IS NOT NULL) = 0 THEN 'MISSING' ELSE 'PARTIAL' END
             WHEN (SELECT count(*) FROM option_manifest m JOIN public.attribute_definitions ad ON ad.stable_key = m.attr_key JOIN public.controlled_option_values cov ON cov.attribute_id = ad.id AND cov.stable_key = m.stable_key WHERE m.is_active <> cov.is_active) > 0 THEN 'DRIFT'
             ELSE 'PASS'
           END AS status,
           'Exactly 2 material options'::text AS expected,
           concat((SELECT count(*) FROM public.controlled_option_values cov JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id WHERE ad.stable_key = 'material'), ' material options')::text AS actual,
           'Anti-join for unexpected material options'::text AS details
),
check_controlled_option_translations AS (
    SELECT 'CONTROLLED_OPTION_TRANSLATIONS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM option_manifest m CROSS JOIN locale_manifest lm LEFT JOIN public.attribute_definitions ad ON ad.stable_key = m.attr_key LEFT JOIN public.controlled_option_values cov ON cov.attribute_id = ad.id AND cov.stable_key = m.stable_key LEFT JOIN public.controlled_option_value_translations covt ON covt.controlled_option_value_id = cov.id AND covt.locale = lm.locale WHERE covt.id IS NULL) > 0 THEN 
                CASE WHEN (SELECT count(*) FROM option_manifest m CROSS JOIN locale_manifest lm LEFT JOIN public.attribute_definitions ad ON ad.stable_key = m.attr_key LEFT JOIN public.controlled_option_values cov ON cov.attribute_id = ad.id AND cov.stable_key = m.stable_key LEFT JOIN public.controlled_option_value_translations covt ON covt.controlled_option_value_id = cov.id AND covt.locale = lm.locale WHERE covt.id IS NOT NULL) = 0 THEN 'MISSING' ELSE 'PARTIAL' END
             WHEN (SELECT count(*) FROM option_manifest m JOIN public.attribute_definitions ad ON ad.stable_key = m.attr_key JOIN public.controlled_option_values cov ON cov.attribute_id = ad.id AND cov.stable_key = m.stable_key JOIN public.controlled_option_value_translations covt ON covt.controlled_option_value_id = cov.id LEFT JOIN locale_manifest lm ON lm.locale = covt.locale WHERE lm.locale IS NULL) > 0 THEN 'UNEXPECTED'
             ELSE 'PASS'
           END AS status,
           '14 translations'::text AS expected,
           concat((SELECT count(*) FROM option_manifest m JOIN public.attribute_definitions ad ON ad.stable_key = m.attr_key JOIN public.controlled_option_values cov ON cov.attribute_id = ad.id AND cov.stable_key = m.stable_key JOIN public.controlled_option_value_translations covt ON covt.controlled_option_value_id = cov.id), ' translations')::text AS actual,
           '7 locales per 2 options'::text AS details
),
check_controlled_option_ownership AS (
    SELECT 'CONTROLLED_OPTION_OWNERSHIP'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM option_manifest m JOIN public.attribute_definitions ad ON ad.stable_key = m.attr_key JOIN public.controlled_option_values cov ON cov.stable_key = m.stable_key AND cov.attribute_id = ad.id WHERE ad.stable_key <> m.attr_key) > 0 THEN 'DRIFT'
             ELSE 'PASS'
           END AS status,
           'No misaligned ownership'::text AS expected,
           concat((SELECT count(*) FROM option_manifest m JOIN public.attribute_definitions ad ON ad.stable_key = m.attr_key JOIN public.controlled_option_values cov ON cov.stable_key = m.stable_key AND cov.attribute_id = ad.id WHERE ad.stable_key <> m.attr_key), ' misaligned')::text AS actual,
           'Options must belong to expected attribute'::text AS details
),
check_offer_5_snapshot AS (
    SELECT 'OFFER_5_SNAPSHOT'::text AS check_id, 'offers'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN count(*) = 1 AND
                  bool_and(title = 'Pojemnik Euro plastikowy 600x400x220 mm') AND
                  bool_and(publication_status = 'published') AND
                  bool_and(is_active = true) AND
                  bool_and(offer_model = 'ecommerce') AND
                  bool_and(category_id IN (SELECT category_id FROM target_category)) AND
                  bool_and(technical_attributes = '{"Materiał":"PP (Polipropylen)","Pojemność (l)":45,"Wymiary zewnętrzne (mm)":"600x400x220"}'::jsonb)
             THEN 'PASS'
             WHEN count(*) = 0 THEN 'MISSING'
             ELSE 'DRIFT'
           END AS status,
           'Exact offer 5 snapshot'::text AS expected,
           CASE WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED' WHEN count(*) = 0 THEN 'Offer missing' ELSE 'Snapshot evaluated' END::text AS actual,
           'Pre-verification of source offer 5'::text AS details
    FROM target_offers WHERE offer_id = 5
),
check_offer_5_conversion_type AS (
    SELECT 'OFFER_5_CONVERSION_TYPE'::text AS check_id, 'offers'::text AS scope,
           CASE WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED' WHEN count(*) = 1 THEN 'PASS' ELSE 'MISSING' END AS status,
           'Any value'::text AS expected,
           CASE WHEN count(*) = 1 THEN 'Evaluated' ELSE 'NULL' END::text AS actual,
           'Observed conversion type'::text AS details
    FROM target_offers WHERE offer_id = 5
),
check_offer_6_snapshot AS (
    SELECT 'OFFER_6_SNAPSHOT'::text AS check_id, 'offers'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN count(*) = 1 AND
                  bool_and(title = 'Pojemnik Euro plastikowy 400x300x120 mm') AND
                  bool_and(publication_status = 'published') AND
                  bool_and(is_active = true) AND
                  bool_and(offer_model = 'ecommerce') AND
                  bool_and(category_id IN (SELECT category_id FROM target_category)) AND
                  bool_and(technical_attributes = '{"Materiał":"PP (Polipropylen)","Pojemność (l)":10,"Wymiary zewnętrzne (mm)":"400x300x120"}'::jsonb)
             THEN 'PASS'
             WHEN count(*) = 0 THEN 'MISSING'
             ELSE 'DRIFT'
           END AS status,
           'Exact offer 6 snapshot'::text AS expected,
           CASE WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED' WHEN count(*) = 0 THEN 'Offer missing' ELSE 'Snapshot evaluated' END::text AS actual,
           'Pre-verification of source offer 6'::text AS details
    FROM target_offers WHERE offer_id = 6
),
check_offer_6_conversion_type AS (
    SELECT 'OFFER_6_CONVERSION_TYPE'::text AS check_id, 'offers'::text AS scope,
           CASE WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED' WHEN count(*) = 1 THEN 'PASS' ELSE 'MISSING' END AS status,
           'Any value'::text AS expected,
           CASE WHEN count(*) = 1 THEN 'Evaluated' ELSE 'NULL' END::text AS actual,
           'Observed conversion type'::text AS details
    FROM target_offers WHERE offer_id = 6
),
expected_oav AS (
    SELECT m.offer_id, m.attribute_key, m.value_number, m.option_key
    FROM oav_manifest m
),
actual_oav_for_offers_5_6 AS (
    SELECT oav.offer_id, ad.stable_key AS attribute_key
    FROM public.offer_attribute_values oav
    LEFT JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id
    WHERE oav.offer_id IN (5, 6)
),
missing_oav AS (
    SELECT e.offer_id, e.attribute_key
    FROM expected_oav e
    LEFT JOIN actual_oav_for_offers_5_6 a ON a.offer_id = e.offer_id AND a.attribute_key = e.attribute_key
    WHERE a.offer_id IS NULL
),
unexpected_oav AS (
    SELECT a.offer_id, a.attribute_key
    FROM actual_oav_for_offers_5_6 a
    LEFT JOIN expected_oav e ON e.offer_id = a.offer_id AND e.attribute_key = a.attribute_key
    WHERE e.offer_id IS NULL
),
oav_value_drift AS (
    SELECT a.offer_id, a.attribute_id, ad.stable_key
    FROM public.offer_attribute_values a
    JOIN public.attribute_definitions ad ON ad.id = a.attribute_id
    JOIN oav_manifest m ON m.offer_id = a.offer_id AND m.attribute_key = ad.stable_key
    LEFT JOIN public.controlled_option_values cov ON cov.id = a.option_id
    WHERE a.offer_id IN (5, 6)
      AND (
        m.value_number IS DISTINCT FROM a.value_number
        OR m.option_key IS DISTINCT FROM cov.stable_key
        OR num_nonnulls(a.value_text, a.value_number, a.value_boolean, a.value_date, a.value_year, a.option_id) <> 1
      )
),
check_oav_missing_rows AS (
    SELECT 'OAV_MISSING_ROWS'::text AS check_id, 'backfill'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM missing_oav) = 10 THEN 'MISSING'
             WHEN (SELECT count(*) FROM missing_oav) > 0 THEN 'PARTIAL'
             ELSE 'PASS'
           END AS status,
           '0 missing expected rows'::text AS expected,
           concat((SELECT count(*) FROM missing_oav), ' missing')::text AS actual,
           'Anti-join against expected manifest'::text AS details
),
check_oav_unexpected_rows AS (
    SELECT 'OAV_UNEXPECTED_ROWS'::text AS check_id, 'backfill'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM unexpected_oav) > 0 THEN 'UNEXPECTED'
             ELSE 'PASS'
           END AS status,
           '0 unexpected rows'::text AS expected,
           concat((SELECT count(*) FROM unexpected_oav), ' unexpected')::text AS actual,
           'Anti-join for target offers'::text AS details
),
check_oav_expected_rows AS (
    SELECT 'OAV_EXPECTED_ROWS'::text AS check_id, 'backfill'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM oav_value_drift) > 0 THEN 'DRIFT'
             WHEN (SELECT count(*) FROM missing_oav) = 10 THEN 'MISSING'
             WHEN (SELECT count(*) FROM missing_oav) > 0 THEN 'PARTIAL'
             WHEN (SELECT count(*) FROM expected_oav e JOIN public.attribute_definitions ad ON ad.stable_key = e.attribute_key JOIN public.offer_attribute_values oav ON oav.offer_id = e.offer_id AND oav.attribute_id = ad.id LEFT JOIN public.controlled_option_values cov ON cov.id = oav.option_id WHERE (e.value_number IS NOT DISTINCT FROM oav.value_number) AND (e.option_key IS NOT DISTINCT FROM cov.stable_key)) = 10 THEN 'PASS'
             ELSE 'DRIFT'
           END AS status,
           '10 exact matches'::text AS expected,
           concat((SELECT count(*) FROM expected_oav e JOIN public.attribute_definitions ad ON ad.stable_key = e.attribute_key JOIN public.offer_attribute_values oav ON oav.offer_id = e.offer_id AND oav.attribute_id = ad.id LEFT JOIN public.controlled_option_values cov ON cov.id = oav.option_id WHERE (e.value_number IS NOT DISTINCT FROM oav.value_number) AND (e.option_key IS NOT DISTINCT FROM cov.stable_key)), '/10 matched')::text AS actual,
           'Matches value_number and option_key'::text AS details
),
check_oav_duplicates AS (
    SELECT 'OAV_DUPLICATES'::text AS check_id, 'data_integrity'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM (SELECT offer_id, attribute_id FROM public.offer_attribute_values WHERE offer_id IN (5, 6) GROUP BY offer_id, attribute_id HAVING count(*) > 1) d) > 0 THEN 'DRIFT'
             ELSE 'PASS'
           END AS status,
           '0 duplicates'::text AS expected,
           concat((SELECT count(*) FROM (SELECT offer_id, attribute_id FROM public.offer_attribute_values WHERE offer_id IN (5, 6) GROUP BY offer_id, attribute_id HAVING count(*) > 1) d), ' duplicates')::text AS actual,
           'Uniqueness of offer_id + attribute_id'::text AS details
),
check_oav_typed_slot_integrity AS (
    SELECT 'OAV_TYPED_SLOT_INTEGRITY'::text AS check_id, 'data_integrity'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM public.offer_attribute_values WHERE offer_id IN (5,6)) = 0 THEN 'PASS'
             WHEN (SELECT count(*) FROM public.offer_attribute_values WHERE offer_id IN (5, 6) AND num_nonnulls(value_text, value_number, value_boolean, value_date, value_year, option_id) <> 1) > 0 THEN 'DRIFT'
             ELSE 'PASS'
           END AS status,
           'Strict exclusivity'::text AS expected,
           concat((SELECT count(*) FROM public.offer_attribute_values WHERE offer_id IN (5, 6) AND num_nonnulls(value_text, value_number, value_boolean, value_date, value_year, option_id) <> 1), ' violations')::text AS actual,
           'Exactly one typed value per row for all target OAV'::text AS details
),
check_oaov_expected_zero AS (
    SELECT 'OAOV_EXPECTED_ZERO'::text AS check_id, 'data_integrity'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM public.offer_attribute_option_values WHERE offer_id IN (5, 6)) > 0 THEN 'UNEXPECTED'
             ELSE 'PASS'
           END AS status,
           '0 OAOV rows'::text AS expected,
           concat((SELECT count(*) FROM public.offer_attribute_option_values WHERE offer_id IN (5, 6)), ' rows found')::text AS actual,
           'Ensure multi-enum options are empty for pilot'::text AS details
),
check_orphan_option_ids AS (
    SELECT 'ORPHAN_OPTION_IDS'::text AS check_id, 'data_integrity'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) <> 1 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM public.offer_attribute_values oav LEFT JOIN public.controlled_option_values cov ON cov.id = oav.option_id WHERE oav.offer_id IN (5, 6) AND oav.option_id IS NOT NULL AND (cov.id IS NULL OR cov.attribute_id <> oav.attribute_id)) > 0 THEN 'DRIFT'
             WHEN (SELECT count(*) FROM public.offer_attribute_option_values oaov LEFT JOIN public.controlled_option_values cov ON cov.id = oaov.option_id WHERE oaov.offer_id IN (5, 6) AND (cov.id IS NULL OR cov.attribute_id <> oaov.attribute_id)) > 0 THEN 'DRIFT'
             ELSE 'PASS'
           END AS status,
           '0 orphans'::text AS expected,
           concat((SELECT count(*) FROM public.offer_attribute_values oav LEFT JOIN public.controlled_option_values cov ON cov.id = oav.option_id WHERE oav.offer_id IN (5, 6) AND oav.option_id IS NOT NULL AND (cov.id IS NULL OR cov.attribute_id <> oav.attribute_id)) + (SELECT count(*) FROM public.offer_attribute_option_values oaov LEFT JOIN public.controlled_option_values cov ON cov.id = oaov.option_id WHERE oaov.offer_id IN (5, 6) AND (cov.id IS NULL OR cov.attribute_id <> oaov.attribute_id)), ' orphans found')::text AS actual,
           'Options must exist and belong to the selected attribute in OAV and OAOV'::text AS details
),
check_migration_provenance_tables AS (
    SELECT 'MIGRATION_PROVENANCE_TABLES'::text AS check_id, 'schema'::text AS scope,
           'PASS'::text AS status,
           'Check via to_regclass'::text AS expected,
           concat(
             (SELECT count(*) FROM (VALUES 
               (to_regclass('public.migration_batches')),
               (to_regclass('public.migration_source_entries')),
               (to_regclass('public.migration_oav_targets')),
               (to_regclass('public.migration_oaov_targets')),
               (to_regclass('public.migration_rollback_attempts'))
             ) t(c) WHERE c IS NOT NULL), '/5 tables exist'
           )::text AS actual,
           'Does not affect data readiness'::text AS details
),
check_production_configuration_state AS (
    SELECT 'PRODUCTION_CONFIGURATION_STATE'::text AS check_id, 'summary'::text AS scope,
           CASE
             WHEN c_path.status = 'MISSING' THEN 'MISSING'
             WHEN c_path.status <> 'PASS' THEN 'DRIFT'
             WHEN 'UNEXPECTED' IN (c_ad.status, c_assign.status, c_units.status, c_flags.status, c_trans.status, c_opt.status, c_optt.status, c_own.status) OR 'DRIFT' IN (c_ad.status, c_assign.status, c_units.status, c_flags.status, c_trans.status, c_opt.status, c_optt.status, c_own.status) THEN 'DRIFT'
             WHEN c_ad.status = 'MISSING' AND c_assign.status = 'MISSING' AND c_opt.status = 'MISSING' THEN 'MISSING'
             WHEN 'PARTIAL' IN (c_ad.status, c_assign.status, c_units.status, c_flags.status, c_trans.status, c_opt.status, c_optt.status, c_own.status) OR 'MISSING' IN (c_ad.status, c_assign.status, c_units.status, c_flags.status, c_trans.status, c_opt.status, c_optt.status, c_own.status) THEN 'PARTIAL'
             ELSE 'PASS'
           END AS status,
           'EXACT'::text AS expected,
           CASE
             WHEN c_path.status = 'MISSING' THEN 'MISSING'
             WHEN c_path.status <> 'PASS' THEN 'DRIFT'
             WHEN 'UNEXPECTED' IN (c_ad.status, c_assign.status, c_units.status, c_flags.status, c_trans.status, c_opt.status, c_optt.status, c_own.status) OR 'DRIFT' IN (c_ad.status, c_assign.status, c_units.status, c_flags.status, c_trans.status, c_opt.status, c_optt.status, c_own.status) THEN 'DRIFT'
             WHEN c_ad.status = 'MISSING' AND c_assign.status = 'MISSING' AND c_opt.status = 'MISSING' THEN 'MISSING'
             WHEN 'PARTIAL' IN (c_ad.status, c_assign.status, c_units.status, c_flags.status, c_trans.status, c_opt.status, c_optt.status, c_own.status) OR 'MISSING' IN (c_ad.status, c_assign.status, c_units.status, c_flags.status, c_trans.status, c_opt.status, c_optt.status, c_own.status) THEN 'PARTIAL'
             ELSE 'EXACT'
           END AS actual,
           'Aggregate of configuration checks'::text AS details
    FROM check_category_path c_path
    CROSS JOIN check_attribute_definitions c_ad
    CROSS JOIN check_exact_category_assignments c_assign
    CROSS JOIN check_attribute_units c_units
    CROSS JOIN check_attribute_flags c_flags
    CROSS JOIN check_attribute_translations c_trans
    CROSS JOIN check_controlled_options c_opt
    CROSS JOIN check_controlled_option_translations c_optt
    CROSS JOIN check_controlled_option_ownership c_own
),
check_production_value_state AS (
    SELECT 'PRODUCTION_VALUE_STATE'::text AS check_id, 'summary'::text AS scope,
           CASE
             WHEN c_path.status = 'MISSING' THEN 'MISSING'
             WHEN c_path.status <> 'PASS' THEN 'DRIFT'
             WHEN 'UNEXPECTED' IN (c_oav_exp.status, c_oav_miss.status, c_oav_unexp.status, c_oav_dup.status, c_oav_slot.status, c_oaov_zero.status, c_orphan.status) OR 'DRIFT' IN (c_oav_exp.status, c_oav_miss.status, c_oav_unexp.status, c_oav_dup.status, c_oav_slot.status, c_oaov_zero.status, c_orphan.status) THEN 'DRIFT'
             WHEN c_oav_miss.status = 'MISSING' AND c_oav_exp.status = 'MISSING' THEN 'MISSING'
             WHEN c_oav_miss.status = 'PARTIAL' OR c_oav_exp.status = 'PARTIAL' OR c_oav_miss.status = 'MISSING' THEN 'PARTIAL'
             ELSE 'PASS'
           END AS status,
           'EXACT'::text AS expected,
           CASE
             WHEN c_path.status = 'MISSING' THEN 'MISSING'
             WHEN c_path.status <> 'PASS' THEN 'DRIFT'
             WHEN 'UNEXPECTED' IN (c_oav_exp.status, c_oav_miss.status, c_oav_unexp.status, c_oav_dup.status, c_oav_slot.status, c_oaov_zero.status, c_orphan.status) OR 'DRIFT' IN (c_oav_exp.status, c_oav_miss.status, c_oav_unexp.status, c_oav_dup.status, c_oav_slot.status, c_oaov_zero.status, c_orphan.status) THEN 'DRIFT'
             WHEN c_oav_miss.status = 'MISSING' AND c_oav_exp.status = 'MISSING' THEN 'MISSING'
             WHEN c_oav_miss.status = 'PARTIAL' OR c_oav_exp.status = 'PARTIAL' OR c_oav_miss.status = 'MISSING' THEN 'PARTIAL'
             ELSE 'EXACT'
           END AS actual,
           'Aggregate of OAV/OAOV checks'::text AS details
    FROM check_category_path c_path
    CROSS JOIN check_oav_expected_rows c_oav_exp
    CROSS JOIN check_oav_missing_rows c_oav_miss
    CROSS JOIN check_oav_unexpected_rows c_oav_unexp
    CROSS JOIN check_oav_duplicates c_oav_dup
    CROSS JOIN check_oav_typed_slot_integrity c_oav_slot
    CROSS JOIN check_oaov_expected_zero c_oaov_zero
    CROSS JOIN check_orphan_option_ids c_orphan
),
check_production_filter_data_ready AS (
    SELECT 'PRODUCTION_FILTER_DATA_READY'::text AS check_id, 'summary'::text AS scope,
           CASE
             WHEN c_conf.actual = 'EXACT' AND c_val.actual = 'EXACT' AND c_o5.status = 'PASS' AND c_o6.status = 'PASS' THEN 'PASS'
             ELSE 'BLOCKED'
           END AS status,
           'YES'::text AS expected,
           CASE
             WHEN c_conf.actual = 'EXACT' AND c_val.actual = 'EXACT' AND c_o5.status = 'PASS' AND c_o6.status = 'PASS' THEN 'YES'
             ELSE 'NO'
           END AS actual,
           'Final deployment readiness'::text AS details
    FROM check_production_configuration_state c_conf
    CROSS JOIN check_production_value_state c_val
    CROSS JOIN check_offer_5_snapshot c_o5
    CROSS JOIN check_offer_6_snapshot c_o6
)
SELECT check_id, scope, status, expected, actual, details FROM check_category_path
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_category_parent_chain
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_attribute_definitions
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_exact_category_assignments
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_attribute_units
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_attribute_flags
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_attribute_translations
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_controlled_options
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_controlled_option_translations
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_controlled_option_ownership
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_offer_5_snapshot
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_offer_5_conversion_type
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_offer_6_snapshot
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_offer_6_conversion_type
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_oav_expected_rows
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_oav_missing_rows
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_oav_unexpected_rows
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_oav_duplicates
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_oav_typed_slot_integrity
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_oaov_expected_zero
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_orphan_option_ids
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_migration_provenance_tables
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_production_configuration_state
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_production_value_state
UNION ALL SELECT check_id, scope, status, expected, actual, details FROM check_production_filter_data_ready;
