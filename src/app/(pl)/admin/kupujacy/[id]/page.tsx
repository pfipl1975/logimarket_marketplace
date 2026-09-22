import { AdminBuyerDetailPage } from "@/app/_shared/AdminBuyerDetailPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kupujący | LogiMarket Admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  }
};

export default async function PlAdminBuyerDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <AdminBuyerDetailPage locale="pl" id={parseInt(resolvedParams.id, 10)} />;
}
