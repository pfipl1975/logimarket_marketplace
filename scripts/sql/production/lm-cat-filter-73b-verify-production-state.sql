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
    SELECT 5 AS offer_id,
           o.title,
           o.publication_status,
           o.is_active,
           o.offer_model,
           o.category_id,
           o.technical_attributes,
           o.conversion_type
    FROM public.offers o WHERE o.id = 5
    UNION ALL
    SELECT 6 AS offer_id,
           o.title,
           o.publication_status,
           o.is_active,
           o.offer_model,
           o.category_id,
           o.technical_attributes,
           o.conversion_type
    FROM public.offers o WHERE o.id = 6
),
check_category_path AS (
    SELECT 'CATEGORY_PATH'::text AS check_id, 'catalog_structure'::text AS scope,
           CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'MISSING' END AS status,
           'pojemniki-plastikowe-euro'::text AS expected,
           CASE WHEN count(*) = 1 THEN 'pojemniki-plastikowe-euro' ELSE 'not_found' END AS actual,
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
             WHEN (SELECT count(*) FROM target_category) = 0 THEN 'BLOCKED'
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
actual_assignments AS (
    SELECT m.stable_key AS expected_key, caa.attribute_definition_id,
           caa.sort_order, caa.is_filterable, caa.is_comparable, caa.is_required, caa.is_visible, caa.unit_code
    FROM config_manifest m
    LEFT JOIN public.attribute_definitions ad ON ad.stable_key = m.stable_key
    LEFT JOIN target_category tc ON true
    LEFT JOIN public.category_attribute_assignments caa ON caa.attribute_definition_id = ad.id AND caa.category_id = tc.category_id
),
check_exact_category_assignments AS (
    SELECT 'EXACT_CATEGORY_ASSIGNMENTS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) = 0 THEN 'BLOCKED'
             WHEN count(attribute_definition_id) = 8 AND (
                  SELECT count(*) FROM public.category_attribute_assignments caa2 
                  JOIN target_category tc2 ON caa2.category_id = tc2.category_id
             ) = 8 THEN 'PASS'
             WHEN count(attribute_definition_id) = 0 THEN 'MISSING'
             WHEN (SELECT count(*) FROM public.category_attribute_assignments caa2 JOIN target_category tc2 ON caa2.category_id = tc2.category_id) > 8 THEN 'UNEXPECTED'
             WHEN count(attribute_definition_id) < 8 THEN 'PARTIAL'
             ELSE 'DRIFT'
           END AS status,
           'Exactly 8 pilot assignments'::text AS expected,
           concat((SELECT count(*) FROM public.category_attribute_assignments caa2 JOIN target_category tc2 ON caa2.category_id = tc2.category_id), ' assignments found')::text AS actual,
           'Checks if any non-pilot attributes are assigned to this category'::text AS details
    FROM actual_assignments
),
check_attribute_units AS (
    SELECT 'ATTRIBUTE_UNITS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) = 0 THEN 'BLOCKED'
             WHEN count(expected_key) = 8 AND sum(CASE WHEN m.unit_code IS NOT DISTINCT FROM a.unit_code THEN 1 ELSE 0 END) = 8 THEN 'PASS'
             WHEN count(a.attribute_definition_id) = 0 THEN 'MISSING'
             ELSE 'DRIFT'
           END AS status,
           'Exact unit matches'::text AS expected,
           concat(sum(CASE WHEN m.unit_code IS NOT DISTINCT FROM a.unit_code THEN 1 ELSE 0 END), '/8 matched')::text AS actual,
           'Verifies units match the manifest'::text AS details
    FROM config_manifest m
    LEFT JOIN actual_assignments a ON m.stable_key = a.expected_key
),
check_attribute_flags AS (
    SELECT 'ATTRIBUTE_FLAGS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) = 0 THEN 'BLOCKED'
             WHEN count(expected_key) = 8 AND sum(CASE WHEN 
                  m.sort_order = a.sort_order AND
                  m.is_filterable = a.is_filterable AND
                  m.is_comparable = a.is_comparable AND
                  m.is_required = a.is_required AND
                  m.is_visible = a.is_visible
             THEN 1 ELSE 0 END) = 8 THEN 'PASS'
             WHEN count(a.attribute_definition_id) = 0 THEN 'MISSING'
             ELSE 'DRIFT'
           END AS status,
           'Exact flag matches'::text AS expected,
           concat(sum(CASE WHEN m.sort_order = a.sort_order AND m.is_filterable = a.is_filterable AND m.is_comparable = a.is_comparable AND m.is_required = a.is_required AND m.is_visible = a.is_visible THEN 1 ELSE 0 END), '/8 matched')::text AS actual,
           'Verifies boolean flags and sort_order'::text AS details
    FROM config_manifest m
    LEFT JOIN actual_assignments a ON m.stable_key = a.expected_key
),
check_attribute_translations AS (
    SELECT 'ATTRIBUTE_TRANSLATIONS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) = 0 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM public.attribute_definition_translations adt JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id JOIN config_manifest m ON m.stable_key = ad.stable_key) = 56 THEN 'PASS'
             WHEN (SELECT count(*) FROM public.attribute_definition_translations adt JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id JOIN config_manifest m ON m.stable_key = ad.stable_key) = 0 THEN 'MISSING'
             ELSE 'PARTIAL'
           END AS status,
           '56 translations'::text AS expected,
           concat((SELECT count(*) FROM public.attribute_definition_translations adt JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id JOIN config_manifest m ON m.stable_key = ad.stable_key), ' translations')::text AS actual,
           '7 locales per 8 attributes'::text AS details
),
actual_options AS (
    SELECT m.stable_key AS expected_key, cov.stable_key AS actual_key,
           m.is_active AS expected_active, cov.is_active AS actual_active
    FROM option_manifest m
    LEFT JOIN public.attribute_definitions ad ON ad.stable_key = m.attr_key
    LEFT JOIN public.controlled_option_values cov ON cov.attribute_id = ad.id AND cov.stable_key = m.stable_key
),
check_controlled_options AS (
    SELECT 'CONTROLLED_OPTIONS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) = 0 THEN 'BLOCKED'
             WHEN count(expected_key) = count(actual_key) AND sum(CASE WHEN expected_active = actual_active THEN 1 ELSE 0 END) = 2 THEN 'PASS'
             WHEN count(actual_key) = 0 THEN 'MISSING'
             WHEN count(actual_key) < 2 THEN 'PARTIAL'
             ELSE 'DRIFT'
           END AS status,
           '2 options (pp, hdpe)'::text AS expected,
           concat(count(actual_key), ' options found')::text AS actual,
           'Options for material'::text AS details
    FROM actual_options
),
check_controlled_option_translations AS (
    SELECT 'CONTROLLED_OPTION_TRANSLATIONS'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) = 0 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM public.controlled_option_value_translations covt JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id JOIN option_manifest m ON m.stable_key = cov.stable_key) = 14 THEN 'PASS'
             WHEN (SELECT count(*) FROM public.controlled_option_value_translations covt JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id JOIN option_manifest m ON m.stable_key = cov.stable_key) = 0 THEN 'MISSING'
             ELSE 'PARTIAL'
           END AS status,
           '14 translations'::text AS expected,
           concat((SELECT count(*) FROM public.controlled_option_value_translations covt JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id JOIN option_manifest m ON m.stable_key = cov.stable_key), ' translations')::text AS actual,
           '7 locales per 2 options'::text AS details
),
check_controlled_option_ownership AS (
    SELECT 'CONTROLLED_OPTION_OWNERSHIP'::text AS check_id, 'configuration'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM target_category) = 0 THEN 'BLOCKED'
             WHEN (SELECT count(*) FROM public.controlled_option_values cov JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id JOIN option_manifest m ON m.stable_key = cov.stable_key WHERE ad.stable_key <> m.attr_key) = 0 THEN 'PASS'
             ELSE 'DRIFT'
           END AS status,
           'No misaligned ownership'::text AS expected,
           concat((SELECT count(*) FROM public.controlled_option_values cov JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id JOIN option_manifest m ON m.stable_key = cov.stable_key WHERE ad.stable_key <> m.attr_key), ' misaligned')::text AS actual,
           'Options must belong to expected attribute'::text AS details
),
check_offer_5_snapshot AS (
    SELECT 'OFFER_5_SNAPSHOT'::text AS check_id, 'offers'::text AS scope,
           CASE
             WHEN count(*) = 0 THEN 'MISSING'
             WHEN max(title) = 'Pojemnik Euro plastikowy 600x400x220 mm' AND
                  max(publication_status) = 'published' AND
                  bool_and(is_active) = true AND
                  max(offer_model) = 'ecommerce' AND
                  (max(category_id) = (SELECT category_id FROM target_category) OR (SELECT count(*) FROM target_category) = 0) AND
                  max(technical_attributes::text) = '{"Materiał":"PP (Polipropylen)","Pojemność (l)":45,"Wymiary zewnętrzne (mm)":"600x400x220"}'
             THEN 'PASS'
             ELSE 'DRIFT'
           END AS status,
           'Exact offer 5 snapshot'::text AS expected,
           CASE WHEN count(*) = 0 THEN 'Offer missing' ELSE 'Snapshot evaluated' END::text AS actual,
           'Pre-verification of source offer 5'::text AS details
    FROM target_offers WHERE offer_id = 5
),
check_offer_5_conversion_type AS (
    SELECT 'OFFER_5_CONVERSION_TYPE'::text AS check_id, 'offers'::text AS scope,
           CASE WHEN count(*) > 0 THEN 'PASS' ELSE 'MISSING' END AS status,
           'Any value'::text AS expected,
           COALESCE(max(conversion_type), 'NULL')::text AS actual,
           'Observed conversion type'::text AS details
    FROM target_offers WHERE offer_id = 5
),
check_offer_6_snapshot AS (
    SELECT 'OFFER_6_SNAPSHOT'::text AS check_id, 'offers'::text AS scope,
           CASE
             WHEN count(*) = 0 THEN 'MISSING'
             WHEN max(title) = 'Pojemnik Euro plastikowy 400x300x120 mm' AND
                  max(publication_status) = 'published' AND
                  bool_and(is_active) = true AND
                  max(offer_model) = 'ecommerce' AND
                  (max(category_id) = (SELECT category_id FROM target_category) OR (SELECT count(*) FROM target_category) = 0) AND
                  max(technical_attributes::text) = '{"Materiał":"PP (Polipropylen)","Pojemność (l)":10,"Wymiary zewnętrzne (mm)":"400x300x120"}'
             THEN 'PASS'
             ELSE 'DRIFT'
           END AS status,
           'Exact offer 6 snapshot'::text AS expected,
           CASE WHEN count(*) = 0 THEN 'Offer missing' ELSE 'Snapshot evaluated' END::text AS actual,
           'Pre-verification of source offer 6'::text AS details
    FROM target_offers WHERE offer_id = 6
),
check_offer_6_conversion_type AS (
    SELECT 'OFFER_6_CONVERSION_TYPE'::text AS check_id, 'offers'::text AS scope,
           CASE WHEN count(*) > 0 THEN 'PASS' ELSE 'MISSING' END AS status,
           'Any value'::text AS expected,
           COALESCE(max(conversion_type), 'NULL')::text AS actual,
           'Observed conversion type'::text AS details
    FROM target_offers WHERE offer_id = 6
),
actual_oav AS (
    SELECT m.offer_id, m.attribute_key, m.value_number, m.option_key,
           oav.id AS oav_id, oav.value_number AS actual_number, cov.stable_key AS actual_option,
           oav.value_text, oav.value_boolean, oav.value_date, oav.value_year, oav.option_id
    FROM oav_manifest m
    LEFT JOIN public.attribute_definitions ad ON m.attribute_key = ad.stable_key
    LEFT JOIN public.offer_attribute_values oav ON oav.offer_id = m.offer_id AND oav.attribute_id = ad.id
    LEFT JOIN public.controlled_option_values cov ON cov.id = oav.option_id
),
check_oav_expected_rows AS (
    SELECT 'OAV_EXPECTED_ROWS'::text AS check_id, 'backfill'::text AS scope,
           CASE
             WHEN sum(CASE WHEN oav_id IS NOT NULL AND (value_number IS NOT DISTINCT FROM actual_number) AND (option_key IS NOT DISTINCT FROM actual_option) THEN 1 ELSE 0 END) = 10 THEN 'PASS'
             WHEN count(oav_id) = 0 THEN 'MISSING'
             WHEN count(oav_id) < 10 THEN 'PARTIAL'
             ELSE 'DRIFT'
           END AS status,
           '10 exact OAV rows'::text AS expected,
           concat(sum(CASE WHEN oav_id IS NOT NULL AND (value_number IS NOT DISTINCT FROM actual_number) AND (option_key IS NOT DISTINCT FROM actual_option) THEN 1 ELSE 0 END), '/10 matched')::text AS actual,
           'Matches 5 fields for 2 offers'::text AS details
    FROM actual_oav
),
check_oav_missing_rows AS (
    SELECT 'OAV_MISSING_ROWS'::text AS check_id, 'backfill'::text AS scope,
           CASE
             WHEN count(CASE WHEN oav_id IS NULL THEN 1 END) = 0 THEN 'PASS'
             ELSE 'MISSING'
           END AS status,
           '0 missing rows'::text AS expected,
           concat(count(CASE WHEN oav_id IS NULL THEN 1 END), ' missing')::text AS actual,
           'Counts manifested rows missing in DB'::text AS details
    FROM actual_oav
),
check_oav_unexpected_rows AS (
    SELECT 'OAV_UNEXPECTED_ROWS'::text AS check_id, 'backfill'::text AS scope,
           CASE
             WHEN (SELECT count(*) FROM public.offer_attribute_values WHERE offer_id IN (5, 6)) > 10 THEN 'UNEXPECTED'
             ELSE 'PASS'
           END AS status,
           '0 unexpected rows'::text AS expected,
           concat(GREATEST((SELECT count(*) FROM public.offer_attribute_values WHERE offer_id IN (5, 6)) - 10, 0), ' unexpected')::text AS actual,
           'Rows outside the pilot manifest'::text AS details
),
check_oav_duplicates AS (
    SELECT 'OAV_DUPLICATES'::text AS check_id, 'data_integrity'::text AS scope,
           CASE
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
             WHEN count(oav_id) = 0 THEN 'PASS'
             WHEN sum(CASE WHEN num_nonnulls(value_text, actual_number, value_boolean, value_date, value_year, option_id) = 1 THEN 1 ELSE 0 END) = count(oav_id) THEN 'PASS'
             ELSE 'DRIFT'
           END AS status,
           'Strict exclusivity'::text AS expected,
           concat(sum(CASE WHEN num_nonnulls(value_text, actual_number, value_boolean, value_date, value_year, option_id) <> 1 THEN 1 ELSE 0 END), ' violations')::text AS actual,
           'Exactly one typed value per row'::text AS details
    FROM actual_oav
),
check_oaov_expected_zero AS (
    SELECT 'OAOV_EXPECTED_ZERO'::text AS check_id, 'data_integrity'::text AS scope,
           CASE
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
             WHEN (SELECT count(*) FROM public.offer_attribute_values oav JOIN public.controlled_option_values cov ON cov.id = oav.option_id WHERE oav.offer_id IN (5, 6) AND cov.attribute_id <> oav.attribute_id) > 0 THEN 'DRIFT'
             ELSE 'PASS'
           END AS status,
           '0 orphans'::text AS expected,
           concat((SELECT count(*) FROM public.offer_attribute_values oav JOIN public.controlled_option_values cov ON cov.id = oav.option_id WHERE oav.offer_id IN (5, 6) AND cov.attribute_id <> oav.attribute_id), ' orphans found')::text AS actual,
           'Options must belong to the selected attribute'::text AS details
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
             WHEN c_path.status = 'BLOCKED' THEN 'BLOCKED'
             WHEN c_ad.status = 'PASS' AND c_assign.status = 'PASS' AND c_units.status = 'PASS' AND c_flags.status = 'PASS' AND c_trans.status = 'PASS' AND c_opt.status = 'PASS' AND c_optt.status = 'PASS' AND c_own.status = 'PASS' THEN 'PASS'
             WHEN c_ad.status = 'MISSING' OR c_assign.status = 'MISSING' THEN 'MISSING'
             WHEN c_ad.status = 'PARTIAL' OR c_assign.status = 'PARTIAL' THEN 'PARTIAL'
             ELSE 'DRIFT'
           END AS status,
           'EXACT'::text AS expected,
           CASE
             WHEN c_path.status = 'BLOCKED' THEN 'BLOCKED'
             WHEN c_ad.status = 'PASS' AND c_assign.status = 'PASS' AND c_units.status = 'PASS' AND c_flags.status = 'PASS' AND c_trans.status = 'PASS' AND c_opt.status = 'PASS' AND c_optt.status = 'PASS' AND c_own.status = 'PASS' THEN 'EXACT'
             WHEN c_ad.status = 'MISSING' OR c_assign.status = 'MISSING' THEN 'MISSING'
             WHEN c_ad.status = 'PARTIAL' OR c_assign.status = 'PARTIAL' THEN 'PARTIAL'
             ELSE 'DRIFT'
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
             WHEN c_path.status = 'BLOCKED' THEN 'BLOCKED'
             WHEN c_oav_exp.status = 'PASS' AND c_oav_miss.status = 'PASS' AND c_oav_unexp.status = 'PASS' AND c_oav_dup.status = 'PASS' AND c_oav_slot.status = 'PASS' AND c_oaov_zero.status = 'PASS' AND c_orphan.status = 'PASS' THEN 'PASS'
             WHEN c_oav_exp.status = 'MISSING' THEN 'MISSING'
             WHEN c_oav_exp.status = 'PARTIAL' THEN 'PARTIAL'
             ELSE 'DRIFT'
           END AS status,
           'EXACT'::text AS expected,
           CASE
             WHEN c_path.status = 'BLOCKED' THEN 'BLOCKED'
             WHEN c_oav_exp.status = 'PASS' AND c_oav_miss.status = 'PASS' AND c_oav_unexp.status = 'PASS' AND c_oav_dup.status = 'PASS' AND c_oav_slot.status = 'PASS' AND c_oaov_zero.status = 'PASS' AND c_orphan.status = 'PASS' THEN 'EXACT'
             WHEN c_oav_exp.status = 'MISSING' THEN 'MISSING'
             WHEN c_oav_exp.status = 'PARTIAL' THEN 'PARTIAL'
             ELSE 'DRIFT'
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
