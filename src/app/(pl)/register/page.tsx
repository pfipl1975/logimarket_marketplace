import type { Metadata } from "next";
import { AccountLifecyclePage } from "@/app/_shared/AccountLifecyclePage";
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AccountLifecyclePage kind="register" locale="pl" next={next ?? null} />;
}
