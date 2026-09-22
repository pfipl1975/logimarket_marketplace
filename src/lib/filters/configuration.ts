import "server-only";

import { db } from "@/lib/db";
import { getCatalogFilterConfigurationCore } from "./configuration-core";
import type { CatalogFilterConfigurationInput } from "./configuration-types";

export function getCatalogFilterConfigurationFromDb(input: CatalogFilterConfigurationInput) {
  return getCatalogFilterConfigurationCore(db, input);
}
