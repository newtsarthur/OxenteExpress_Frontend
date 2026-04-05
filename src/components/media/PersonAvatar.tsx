import React from "react";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { resolveBoxPublicUrl } from "@/lib/storageUrl";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

interface PersonAvatarProps {
  name: string;
  imagePath?: string | null;
  className?: string;
  fallbackClassName?: string;
  cacheKey?: string | number;
}

/** Avatar circular com storage Supabase; sem foto → ícone User (Lucide). */
export function PersonAvatar({ name, imagePath, className, fallbackClassName, cacheKey }: PersonAvatarProps) {
  const resolved = React.useMemo(() => resolveBoxPublicUrl(imagePath, cacheKey), [imagePath, cacheKey]);

  return (
    <Avatar className={cn(className)}>
      {resolved ? <AvatarImage src={resolved} alt={name} /> : null}
      <AvatarFallback className={cn("text-xs font-semibold", fallbackClassName)}>
        {resolved ? (
          initials(name) || "?"
        ) : (
          <User className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
