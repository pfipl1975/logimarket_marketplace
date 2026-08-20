import type { RfqStatus } from "@/lib/schema";

export type RfqStatusLabels = {
  status_new: string;
  status_in_progress: string;
  status_responded: string;
  status_closed: string;
};

export function getRfqStatusLabel(
  status: RfqStatus,
  dict: RfqStatusLabels
): string {
  switch (status) {
    case "new":
      return dict.status_new;
    case "in_progress":
      return dict.status_in_progress;
    case "responded":
      return dict.status_responded;
    case "closed":
      return dict.status_closed;
  }
}