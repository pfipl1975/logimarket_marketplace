import { Metadata } from "next";
import PartnerOfferDetailPage from "@/app/(pl)/partner/[partnerId]/oferty/[offerId]/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default PartnerOfferDetailPage;
