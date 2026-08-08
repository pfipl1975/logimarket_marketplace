import type { RfqStatus } from "@/lib/schema";

export function isRfqStatusTransitionAllowed(current: RfqStatus, target: RfqStatus): boolean {
  if (current === target) {
    return true; // same-state is allowed/idempotent
  }

  switch (current) {
    case "new":
      return target === "in_progress" || target === "responded" || target === "closed";
    case "in_progress":
      return target === "responded" || target === "closed";
    case "responded":
      return target === "closed";
    case "closed":
      return false;
    default:
      return false;
  }
}

export function getAllowedRfqStatusTransitions(current: RfqStatus): RfqStatus[] {
  switch (current) {
    case "new":
      return ["in_progress", "responded", "closed"];
    case "in_progress":
      return ["responded", "closed"];
    case "responded":
      return ["closed"];
    case "closed":
      return [];
    default:
      return [];
  }
}
