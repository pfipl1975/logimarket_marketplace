import "server-only";
import { cache } from "react";
import { getCategories } from "@/app/actions";

export const getCachedCategories = cache(async () => {
  return await getCategories();
});
