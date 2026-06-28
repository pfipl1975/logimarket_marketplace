type LogoProps = {
  className?: string;
  variant?: "dark" | "light";
};

export default function Logo({ className = "", variant = "dark" }: LogoProps) {
  const rootClassName = ["flex items-center gap-2.5", className].filter(Boolean).join(" ");
  const textClassName = variant === "light" ? "text-brand-light-gray" : "text-white";
  const labelClassName = variant === "light" ? "text-white/60" : "text-brand-light-gray/70";
  const frameClassName = variant === "light" ? "stroke-white/55" : "stroke-brand-light-gray/70";

  return (
    <span className={rootClassName}>
      <svg
        aria-hidden="true"
        className="h-9 w-9 shrink-0"
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="fill-brand-teal"
          d="M5.5 18.5 24 8l18.5 10.5V42H5.5V18.5Z"
        />
        <path
          className={`${frameClassName} fill-none`}
          d="M5.5 18.5 24 8l18.5 10.5V42H5.5V18.5Z"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          className="fill-brand-navy/25"
          d="M10 23h28v19H10V23Z"
        />
        <path
          className="stroke-white/55 fill-none"
          d="M12 26h24M12 32h24M18 26v14M30 26v14"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <rect className="fill-white/25" x="14" y="28" width="7" height="4" rx="0.8" />
        <rect className="fill-white/25" x="14" y="34" width="7" height="4" rx="0.8" />
        <rect className="fill-white/25" x="26" y="28" width="8" height="4" rx="0.8" />
        <rect className="fill-white/25" x="26" y="34" width="8" height="4" rx="0.8" />
        <path
          className="stroke-white/70 fill-none"
          d="M16 17h16M19 14h10"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          className="fill-brand-navy/35"
          d="M19 38h10v4H19v-4Z"
        />
      </svg>
      <span className="flex flex-col leading-none">
        <span className={`text-lg font-bold ${textClassName}`}>
          LogiMarket<span className="text-brand-teal">.eu</span>
        </span>
        <span className={`mt-1 text-[10px] font-semibold uppercase ${labelClassName}`}>
          GIEŁDA B2B
        </span>
      </span>
    </span>
  );
}
