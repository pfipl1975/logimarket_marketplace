import { AdminBuyersPage } from "@/app/_shared/AdminBuyersPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kupujący | LogiMarket Admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  }
};

export default async function PlAdminBuyersRoute({
  searchParams,
}: {
  searchParams: Promise<unknown>;
}) {
  const resolvedSearchParams = await searchParams;
  return <AdminBuyersPage locale="pl" searchParams={resolvedSearchParams} />;
}
