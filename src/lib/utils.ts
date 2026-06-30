import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: string | null, onRequest: boolean, fallbackLabel: string): string {
  if (onRequest || price == null) return fallbackLabel;
  const value = Number(price);
  if (Number.isNaN(value)) return fallbackLabel;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
  }).format(value);
}
