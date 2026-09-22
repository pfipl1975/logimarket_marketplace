import { Metadata } from "next";
import PartnerOfferEditPage from "@/app/(pl)/partner/[partnerId]/oferty/[offerId]/edytuj/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit offer - LogiMarket Partner",
  robots: { index: false, follow: false, nocache: true },
};

export default PartnerOfferEditPage;
