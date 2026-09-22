import { Metadata } from "next";
import PartnerOffersPage from "@/app/(pl)/partner/[partnerId]/oferty/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default PartnerOffersPage;
