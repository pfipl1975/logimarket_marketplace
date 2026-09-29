import type { Metadata } from "next";
import { AccountLifecyclePage } from "@/app/_shared/AccountLifecyclePage";
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };
export default function Page() { return <AccountLifecyclePage kind="reset-password" locale="pl" next={null} />; }
