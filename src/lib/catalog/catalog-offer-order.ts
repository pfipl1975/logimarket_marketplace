import { desc } from "drizzle-orm";
import { offers } from "@/lib/schema";

export const catalogOfferOrder = () => [desc(offers.isFeatured), desc(offers.createdAt), desc(offers.id)] as const;
