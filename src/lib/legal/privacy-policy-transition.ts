import { PUBLIC_CORE_LEGAL_EFFECTIVE_INSTANT } from "./public-legal-documents";

/** Server-side clock decision shared by the stable Polish privacy URL and tests. */
export function selectPrivacyPolicyPresentation(now: Date): "legacy" | "canonical" {
  return now.getTime() < Date.parse(PUBLIC_CORE_LEGAL_EFFECTIVE_INSTANT) ? "legacy" : "canonical";
}
