DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.offer_attribute_values AS oav
    WHERE oav.option_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.controlled_option_values AS cov
        WHERE cov.id = oav.option_id
          AND cov.attribute_id = oav.attribute_id
      )
  ) THEN
    RAISE EXCEPTION 'offer_attribute_values contains an option assigned to a different attribute'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.offer_attribute_option_values AS oaov
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.controlled_option_values AS cov
      WHERE cov.id = oaov.option_id
        AND cov.attribute_id = oaov.attribute_id
    )
  ) THEN
    RAISE EXCEPTION 'offer_attribute_option_values contains an option assigned to a different attribute'
      USING ERRCODE = 'check_violation';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "controlled_option_values" ADD CONSTRAINT "uq_cov_attribute_id_pair" UNIQUE("attribute_id","id");--> statement-breakpoint
ALTER TABLE "offer_attribute_option_values" ADD CONSTRAINT "fk_oaov_attribute_option_pair" FOREIGN KEY ("attribute_id","option_id") REFERENCES "public"."controlled_option_values"("attribute_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_values" ADD CONSTRAINT "fk_oav_attribute_option_pair" FOREIGN KEY ("attribute_id","option_id") REFERENCES "public"."controlled_option_values"("attribute_id","id") ON DELETE no action ON UPDATE no action;
