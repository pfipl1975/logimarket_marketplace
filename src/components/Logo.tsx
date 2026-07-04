import Image from "next/image";

type LogoProps = {
  className?: string;
  variant?: "dark" | "light";
  compact?: boolean;
  markOnly?: boolean;
};

const fullLogoSrc = "/images/brand/baner_marketplace.png";
const markLogoSrc = "/images/brand/logimarket_mark.png";

export default function Logo({
  className = "",
  variant = "dark",
  compact = false,
  markOnly = false,
}: LogoProps) {
  const logoSrc = markOnly ? markLogoSrc : fullLogoSrc;

  const dimensionsClass = markOnly
    ? compact
      ? "h-[87px] w-[87px] sm:h-[107px] sm:w-[107px] lg:h-[140px] lg:w-[140px] xl:h-[160px] xl:w-[160px] 2xl:h-[174px] 2xl:w-[174px]"
      : "h-[140px] w-[140px] md:h-[174px] md:w-[174px]"
    : compact
      ? "h-[87px] w-[260px] sm:h-[107px] sm:w-[320px] lg:h-[140px] lg:w-[420px] xl:h-[160px] xl:w-[480px] 2xl:h-[174px] 2xl:w-[520px]"
      : "h-[140px] w-full max-w-[420px] md:h-[174px] md:max-w-[520px]";

  const rootClassName = [
    "inline-flex shrink-0 items-center justify-center overflow-hidden",
    "rounded-[var(--radius-industrial)]",
    dimensionsClass,
    variant === "light" ? "shadow-[0_10px_24px_rgba(0,0,0,0.22)]" : "shadow-[0_8px_18px_rgba(20,28,44,0.12)]",
    className,
  ].filter(Boolean).join(" ");

  const imageSizes = markOnly
    ? compact
      ? "(min-width: 1536px) 174px, (min-width: 1280px) 160px, (min-width: 1024px) 140px, (min-width: 640px) 107px, 87px"
      : "(min-width: 768px) 174px, 140px"
    : compact
      ? "(min-width: 1536px) 520px, (min-width: 1280px) 480px, (min-width: 1024px) 420px, (min-width: 640px) 320px, 260px"
      : "(min-width: 768px) 520px, 420px";

  return (
    <span className={rootClassName}>
      <Image
        src={logoSrc}
        alt="LogiMarket"
        width={markOnly ? 500 : 2172}
        height={markOnly ? 500 : 724}
        priority={compact}
        sizes={imageSizes}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
