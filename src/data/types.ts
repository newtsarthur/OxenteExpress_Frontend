export type UserRole = "customer" | "store" | "rider";

/** Alinhado aos status usados no backend (Package.status). */
export type OrderStatus =
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "PICKING_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

/** Alinhado ao model Vehicle no Prisma. */
export interface Vehicle {
  model: string;
  plate: string;
  color?: string | null;
  vehicleUrl?: string | null;
  volumeLiters?: number | null;
  weightMaxKg?: number | null;
}

/** Entregador vindo de Batch.rider + vehicle */
export interface OrderRider {
  id: string;
  name: string;
  avatarUrl?: string | null;
  vehicle?: Vehicle | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalPrice: number;
  customerName: string;
  customerAvatarUrl?: string | null;
  items: string[];
  pickupCode: string;
  deliveryCode: string;
  createdAt: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeAvatarUrl?: string | null;
  customerAddress: string;
  customerId: string;
  riderId: string | null;
  rider?: OrderRider | null;
}

export interface Package {
  id: string;
  orderId: string;
  orderNumber: string;
  storeName: string;
  storeAddress: string;
  storeAvatarUrl?: string | null;
  customerAddress: string;
  distanceKm: number;
  weightKg: number;
  volumeL: number;
  totalPrice: number;
  deliveryFee?: number;  // Ganho do entregador
  status: string;
  /** Caminhos relativos ao bucket (ex: productImage dos itens) para miniaturas no app do entregador. */
  productImagePaths?: string[];
}
  id: string;
  orderId: string;
  orderNumber: string;
  storeName: string;
  storeAddress: string;
  customerAddress: string;
  distanceKm: number;
  weightKg: number;
  volumeL: number;
  totalPrice: number;
  status: string;
  /** Caminhos relativos ao bucket (ex: productImage dos itens) para miniaturas no app do entregador. */
  productImagePaths?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Tipo retornado pela API (USER, STORE, RIDER, ADMIN). CLIENT vira USER no backend. */
  userType: string;
  avatarUrl?: string | null;
  phone?: string;
  address?: string | null;
  coordinates?: string | null;
}

export interface StoreInfo {
  id: string;
  name: string;
  imageUrl: string;
  address: string;
  distanceKm: number;
  rating?: number;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  quantity: number;
  weightKg: number;
  volumeLiters: number;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
