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

interface UserNavAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  size?: "sm" | "md";
  cacheKey?: string | number;
}

export function UserNavAvatar({ name, avatarUrl, className, size = "sm", cacheKey }: UserNavAvatarProps) {
  const dim = size === "md" ? "h-10 w-10" : "h-8 w-8";
  const resolved = React.useMemo(() => resolveBoxPublicUrl(avatarUrl, cacheKey), [avatarUrl, cacheKey]);

  return (
    <Avatar className={cn(dim, "border-2 border-primary-foreground/30", className)}>
      {resolved ? <AvatarImage src={resolved} alt={name} /> : null}
      <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
        {resolved ? (
          <span className="text-xs font-semibold">{initials(name) || "?"}</span>
        ) : (
          <User className={size === "md" ? "w-5 h-5" : "w-4 h-4"} strokeWidth={2} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
