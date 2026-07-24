import { splitEventNameForDisplay } from "../eventNameDisplay";

interface HeroBannerProps {
  name: string;
  subtitle: string | null;
  compact?: boolean;
}

export function HeroBanner({ name, subtitle, compact = false }: Readonly<HeroBannerProps>) {
  const { prefix, emphasized } = splitEventNameForDisplay(name);

  return (
    <div className={`relative mt-6 mb-2 text-center overflow-hidden rounded-2xl px-4 ${compact ? "py-4" : "py-8"}`}>
      {/* Background glow effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-40 h-40 bg-accent-magenta/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-accent-cyan/15 rounded-full blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-accent-violet/10 rounded-full blur-[60px]" />
      </div>

      {/* Sparkle icon */}
      {!compact && <div className="text-accent-cyan text-2xl mb-2">&#10022;</div>}

      {prefix && (
        <p className={`${compact ? "text-xs" : "text-sm md:text-base"} font-semibold tracking-wide uppercase text-text-secondary`}>
          {prefix}
        </p>
      )}
      <h2 className={`${compact ? "text-2xl md:text-3xl" : "text-4xl md:text-5xl lg:text-6xl"} font-black uppercase gradient-title leading-tight mt-1`}>
        {emphasized}
      </h2>
      {subtitle && (
        <p className={`text-text-muted ${compact ? "text-xs mt-1" : "text-sm mt-2"}`}>{subtitle}</p>
      )}
    </div>
  );
}
