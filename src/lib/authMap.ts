import type { User, UserRole } from "@/data/types";

export type BackendUserType = "USER" | "STORE" | "RIDER" | "ADMIN" | "CLIENT";

export function backendTypeToRole(t: string): UserRole {
  const n = t === "CLIENT" ? "USER" : t;
  switch (n) {
    case "STORE":
      return "store";
    case "RIDER":
      return "rider";
    case "ADMIN":
      return "customer";
    case "USER":
    default:
      return "customer";
  }
}

export function roleToBackendType(role: UserRole): Exclude<BackendUserType, "CLIENT" | "ADMIN"> {
  switch (role) {
    case "store":
      return "STORE";
    case "rider":
      return "RIDER";
    default:
      return "USER";
  }
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  type: string;
  phone?: string;
  address?: string | null;
  coordinates?: string | null;
  createdAt?: string;
}

export function mapApiUserToUser(u: ApiUser): User {
  const rawType = String(u.type);
  const normalized = rawType === "CLIENT" ? "USER" : rawType;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl ?? null,
    role: backendTypeToRole(rawType),
    userType: normalized,
    phone: u.phone,
    address: u.address ?? null,
    coordinates: u.coordinates ?? null,
  };
}
