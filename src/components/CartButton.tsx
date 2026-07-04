"use client";

import { useCart } from "@/hooks/useCart";

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="fill-none stroke-current"
        d="M6.5 7h14l-1.7 8.5H8.1L6.5 7ZM6.5 7 5.8 4H3.5M9 19.5h.1M18 19.5h.1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface CartButtonProps {
  label: string;
}

export function CartButton({ label }: CartButtonProps) {
  const { itemCount, setIsOpen } = useCart();

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="relative flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
    >
      <CartIcon />
      <span className="hidden sm:inline">{label}</span>
      {itemCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal text-[10px] font-bold text-white">
          {itemCount}
        </span>
      )}
    </button>
  );
}
