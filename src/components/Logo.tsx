import Image from "next/image";

type LogoProps = {
  className?: string;
  variant?: "dark" | "light";
  compact?: boolean;
};

const logoSrc = "/images/logo/logimarket-reference-banner.jpg";

export default function Logo({ className = "", variant = "dark", compact = false }: LogoProps) {
  const rootClassName = [
    "block overflow-hidden",
    compact ? "w-[200px] sm:w-[240px] lg:w-[280px]" : "w-full max-w-[520px]",
    variant === "light" ? "bg-white shadow-sm shadow-black/20" : "bg-white",
    className,
  ].filter(Boolean).join(" ");

  return (
    <span className={rootClassName}>
      <Image
        src={logoSrc}
        alt="LogiMarket"
        width={815}
        height={178}
        priority={compact}
        sizes={compact ? "(min-width: 1024px) 280px, (min-width: 640px) 240px, 200px" : "520px"}
        className="h-auto w-full object-contain"
      />
    </span>
  );
}
