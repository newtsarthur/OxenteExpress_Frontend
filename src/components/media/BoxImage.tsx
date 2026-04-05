import React, { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveBoxPublicUrl } from "@/lib/storageUrl";
import type { LucideIcon } from "lucide-react";

interface BoxImageProps {
  path: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  cacheKey?: string | number;
  /** Ícone quando não há URL ou falha ao carregar (loja/produto). */
  fallbackIcon?: LucideIcon;
}

/**
 * Imagem do storage Supabase (path relativo) ou URL absoluta; fallback com ícone Lucide.
 */
export function BoxImage({ path, alt, className, imgClassName, cacheKey, fallbackIcon: Icon = Package }: BoxImageProps) {
  const resolved = React.useMemo(() => resolveBoxPublicUrl(path, cacheKey), [path, cacheKey]);
  const [broken, setBroken] = useState(false);

  if (!resolved || broken) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)} aria-hidden={!alt}>
        <Icon className="w-[35%] h-[35%] max-w-12 max-h-12 shrink-0 opacity-60" />
        {alt ? <span className="sr-only">{alt}</span> : null}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <img
        src={resolved}
        alt={alt}
        className={cn("h-full w-full object-cover", imgClassName)}
        onError={() => setBroken(true)}
        loading="lazy"
      />
    </div>
  );
}
