import type { ApiRiderCurrentPackage } from "@/lib/api";
import type { Order, OrderRider, OrderStatus, Package, Vehicle } from "@/data/types";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "PREPARING",
  "READY",
  "PICKING_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
];

/** Garante comparação de UI mesmo se a API variar maiúsculas/minúsculas. */
export function normalizeOrderStatus(raw: string): OrderStatus {
  const u = String(raw).trim().toUpperCase();
  return (ORDER_STATUSES.includes(u as OrderStatus) ? u : "PENDING") as OrderStatus;
}

export interface ApiPackageItem {
  quantity: number;
  name: string;
  description?: string | null;
  productImage?: string | null;
}

export interface ApiStoreOrder {
  id: string;
  orderNumber: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  deliveryAddress: string;
  pickupCode?: string | null;
  deliveryCode?: string | null;
  storeId: string;
  customerId: string;
  items: ApiPackageItem[];
  customer: { name: string; phone?: string; avatarUrl?: string | null };
  store?: { name: string | null; address: string | null; avatarUrl?: string | null } | null;
  batch?: {
    rider?: {
      id: string;
      name: string;
      avatarUrl?: string | null;
      vehicle?: {
        model: string;
        plate: string;
        color?: string | null;
        vehicleUrl?: string | null;
      } | null;
    } | null;
  } | null;
}

export function mapStoreApiOrder(raw: ApiStoreOrder): Order {
  return {
    id: raw.id,
    orderNumber: raw.orderNumber,
    status: normalizeOrderStatus(raw.status),
    totalPrice: raw.totalPrice,
    customerName: raw.customer?.name ?? "Cliente",
    customerAvatarUrl: raw.customer?.avatarUrl ?? null,
    items: raw.items.map((i) => `${i.quantity}x ${i.name}`),
    pickupCode: raw.pickupCode ?? "",
    deliveryCode: raw.deliveryCode ?? "",
    createdAt: raw.createdAt,
    storeId: raw.storeId,
    storeName: raw.store?.name ?? "",
    storeAddress: raw.store?.address ?? "",
    storeAvatarUrl: raw.store?.avatarUrl ?? null,
    customerAddress: raw.deliveryAddress,
    customerId: raw.customerId,
    riderId: raw.batch?.rider?.id ?? null,
    rider: raw.batch?.rider
      ? {
          id: raw.batch.rider.id,
          name: raw.batch.rider.name,
          avatarUrl: raw.batch.rider.avatarUrl ?? null,
          vehicle: raw.batch.rider.vehicle ? {
            model: raw.batch.rider.vehicle.model,
            plate: raw.batch.rider.vehicle.plate,
            color: raw.batch.rider.vehicle.color ?? undefined,
            vehicleUrl: raw.batch.rider.vehicle.vehicleUrl ?? null,
          } : null,
        }
      : null,
  };
}

export interface ApiCustomerPackage extends ApiStoreOrder {
  batch?: {
    id: string;
    status: string;
    rider?: {
      id: string;
      name: string;
      avatarUrl?: string | null;
      vehicle?: {
        model: string;
        plate: string;
        color?: string | null;
        vehicleUrl?: string | null;
      } | null;
    } | null;
  } | null;
}

function mapVehicle(v: NonNullable<NonNullable<ApiCustomerPackage["batch"]>["rider"]>["vehicle"]): Vehicle | null {
  if (!v) return null;
  return {
    model: v.model,
    plate: v.plate,
    color: v.color ?? undefined,
    vehicleUrl: v.vehicleUrl ?? null,
  };
}

function num(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Pacote disponível ao entregador (lista READY) — tolera snake_case da API. */
export function parseRiderPackagesResponse(data: unknown): Package[] {
  if (Array.isArray(data)) return data.map((x) => mapRiderApiPackage(x as Record<string, unknown>));
  if (data && typeof data === "object") {
    const r = (data as { results?: unknown[]; packages?: unknown[] }).results ?? (data as { packages?: unknown[] }).packages;
    if (Array.isArray(r)) return r.map((x) => mapRiderApiPackage(x as Record<string, unknown>));
  }
  return [];
}

export function mapRiderCurrentPackageToOrder(raw: ApiRiderCurrentPackage): Order {
  const addr = raw.customerAddress ?? raw.deliveryAddress ?? "";
  return {
    id: raw.id,
    orderNumber: raw.orderNumber,
    status: normalizeOrderStatus(raw.status),
    totalPrice: raw.totalPrice,
    customerName: raw.customerName || "Cliente",
    customerAvatarUrl: null,
    items: Array.isArray(raw.items) ? raw.items : [],
    pickupCode: raw.pickupCode ?? "",
    deliveryCode: raw.deliveryCode ?? "",
    createdAt: raw.createdAt,
    storeId: "",
    storeName: raw.storeName ?? "",
    storeAddress: raw.storeAddress ?? "",
    storeAvatarUrl: raw.storeAvatarUrl ?? null,
    customerAddress: addr,
    customerId: "",
    riderId: null,
    rider: null,
  };
}

export function mapRiderApiPackage(raw: Record<string, unknown>): Package {
  const imgs = raw.productImagePaths ?? raw.product_image_paths;
  const store = raw.store as { name?: string; address?: string } | undefined;
  return {
    id: String(raw.id ?? ""),
    orderId: String(raw.orderId ?? raw.order_id ?? raw.id ?? ""),
    orderNumber: String(raw.orderNumber ?? raw.order_number ?? ""),
    storeName: String(store?.name ?? raw.storeName ?? raw.store_name ?? ""),
    storeAddress: String(store?.address ?? raw.storeAddress ?? raw.store_address ?? ""),
    storeAvatarUrl: String(store?.avatarUrl ?? raw.storeAvatarUrl ?? raw.store_avatar_url ?? null) || null,
    customerAddress: String(
      raw.deliveryAddress ?? raw.customerAddress ?? raw.customer_address ?? ""
    ),
    distanceKm: num(raw.distanceToStore ?? raw.distanceKm ?? raw.distance_km, 0),
    weightKg: num(raw.totalWeightKg ?? raw.weightKg ?? raw.weight_kg, 0),
    volumeL: num(raw.totalVolumeLiters ?? raw.volumeL ?? raw.volume_l, 0),
    totalPrice: num(raw.totalPrice ?? raw.total_price, 0),
    deliveryFee: num(raw.deliveryFee ?? raw.delivery_fee, 0),
    status: String(raw.status ?? "READY"),
    productImagePaths: Array.isArray(imgs) ? (imgs as string[]) : undefined,
  };
}

export function mapCustomerApiPackage(raw: ApiCustomerPackage): Order {
  const rider = raw.batch?.rider;
  let orderRider: OrderRider | null = null;
  if (rider) {
    const vehicle = mapVehicle(rider.vehicle ?? null);
    orderRider = {
      id: rider.id,
      name: rider.name,
      avatarUrl: rider.avatarUrl,
      vehicle,
    };
  }

  return {
    id: raw.id,
    orderNumber: raw.orderNumber,
    status: normalizeOrderStatus(raw.status),
    totalPrice: raw.totalPrice,
    customerName: "",
    customerAvatarUrl: null,
    items: raw.items.map((i) => `${i.quantity}x ${i.name}`),
    pickupCode: raw.pickupCode ?? "",
    deliveryCode: raw.deliveryCode ?? "",
    createdAt: raw.createdAt,
    storeId: raw.storeId,
    storeName: raw.store?.name ?? "",
    storeAddress: raw.store?.address ?? "",
    customerAddress: raw.deliveryAddress,
    customerId: raw.customerId,
    riderId: rider?.id ?? null,
    rider: orderRider,
  };
}
