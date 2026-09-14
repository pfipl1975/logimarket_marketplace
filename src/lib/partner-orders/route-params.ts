import { notFound } from "next/navigation";

export function parseStrictIdOrNotFound(idStr: string | undefined | null): number {
  if (!idStr) notFound();
  if (!/^[1-9]\d*$/.test(idStr)) {
    notFound();
  }
  const parsed = parseInt(idStr, 10);
  if (isNaN(parsed) || parsed < 1) {
    notFound();
  }
  return parsed;
}
