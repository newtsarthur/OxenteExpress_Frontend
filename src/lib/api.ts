import axios from "axios";
import type { ApiUser, BackendUserType } from "@/lib/authMap";

/** API REST local — desenvolvimento. Para outro host, use `VITE_API_URL` no `.env`. */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const TOKEN_KEY = "oxente_token";
export const USER_KEY = "oxente_user";
export const USER_TYPE_KEY = "oxente_user_type";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(USER_TYPE_KEY);
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export function getAxiosErrorMessage(err: unknown, fallback = "Algo deu errado. Tente novamente.") {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) return msg.join(", ");
  }
  return fallback;
}

const REGISTER_PATH = import.meta.env.VITE_REGISTER_PATH || "/cadastro";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: ApiUser }>("/login", { email, password }),
  /** multipart: name, email, password, phone, type (USER|STORE|RIDER|CLIENT), address?, coordinates?, image? — default POST /cadastro; override com VITE_REGISTER_PATH se o backend usar outro (ex. /user). */
  register: (formData: FormData) =>
    api.post<{ token: string; user: ApiUser }>(REGISTER_PATH, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export function buildRegisterFormData(params: {
  name: string;
  email: string;
  password: string;
  phone: string;
  type: BackendUserType;
  address?: string;
  coordinates?: string;
  image?: File | null;
}): FormData {
  const fd = new FormData();
  fd.append("name", params.name);
  fd.append("email", params.email);
  fd.append("password", params.password);
  fd.append("phone", params.phone);
  fd.append("type", params.type);
  if (params.address?.trim()) fd.append("address", params.address.trim());
  if (params.coordinates?.trim()) fd.append("coordinates", params.coordinates.trim());
  if (params.image) fd.append("image", params.image);
  return fd;
}

/** FormData para cadastro de veículo (campos + `image` opcional, alinhado ao multer do backend). */
export function buildVehicleFormData(params: {
  model: string;
  plate: string;
  color?: string;
  volumeLiters: number;
  weightMaxKg: number;
  image?: File | null;
}): FormData {
  const fd = new FormData();
  fd.append("model", params.model);
  fd.append("plate", params.plate.trim());
  if (params.color?.trim()) fd.append("color", params.color.trim());
  fd.append("volumeLiters", String(params.volumeLiters));
  fd.append("weightMaxKg", String(params.weightMaxKg));
  if (params.image) fd.append("image", params.image);
  return fd;
}

export const userApi = {
  updateProfile: (formData: FormData) =>
    api.put("/update", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  /**
   * `DELETE /delete-user/:id` — no OxenteExpress_Backend o controller já remove avatar/imagens do Supabase pelo DB.
   * Body opcional apenas se outro backend esperar metadados extras.
   */
  deleteAccount: (userId: string, body?: { avatarStoragePath?: string }) =>
    api.delete(`/delete-user/${userId}`, { data: body }),
};

// Store routes (autenticadas)
export const storeApi = {
  getStores: (body: Record<string, unknown> = {}) => api.post("/stores", body),
  getProducts: () => api.get("/products"),
  getStoreCatalog: (storeId: string) => api.get(`/store/${storeId}/products`),
  createProduct: (formData: FormData) =>
    api.post("/product/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateProduct: (
    id: string,
    data: FormData | { price?: number; quantity?: number; name?: string; description?: string; weightKg?: number; volumeLiters?: number; unit?: string }
  ) =>
    data instanceof FormData
      ? api.put(`/product/${id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      : api.put(`/product/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/product/${id}`),
};

export const packageApi = {
  calculateShippingFee: (data: {
    items: { productId: string; quantity: number }[];
    address?: string;
    lat?: number;
    lon?: number;
  }) => api.post("/package/calculate-shipping", data),
  createOrder: (data: {
    storeId?: string;
    items: { productId: string; quantity: number }[];
    address?: string;
    lat?: number;
    lon?: number;
  }) => api.post("/package/order", data),
  updateStatus: (packageId: string, newStatus: string) =>
    api.patch("/package/status", { packageId, newStatus }),
  getStoreOrders: () => api.get("/store/orders"),
  getStoreHistory: () => api.get("/store/history"),
  getCustomerOrders: () => api.get("/package/customer"),
  confirmStorePickup: (packageId: string, pickupCode: string) =>
    api.post("/store/confirm-pickup", { packageId, pickupCode }),
};

export const vehicleApi = {
  getCurrent: () => api.get('/vehicle'),
  create: (userId: string, formData: FormData) => {
    const override = import.meta.env.VITE_VEHICLE_CREATE_PATH?.trim();
    if (override === "/vehicle" || override === "vehicle") {
      const merged = new FormData();
      formData.forEach((value, key) => merged.append(key, value));
      merged.append("userId", userId);
      return api.post("/vehicle", merged, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    return api.post(`/${userId}/cadastro_veiculo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  update: (formData: FormData) =>
    api.put("/vehicle/update", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  // FIPE - Busca de veículos
  searchFipe: (query: string) =>
    api.get<{ vehicles: Array<{ brand: string; model: string; label: string; brandId: string; modelId: string }> }>(
      `/vehicle/fipe/search?q=${encodeURIComponent(query)}`
    ),
  getFipeBrands: () =>
    api.get<{ brands: Array<{ id: string; name: string }> }>(
      `/vehicle/fipe/brands`
    ),
  // Busca anos disponíveis para um modelo
  getFipeYears: (brandId: string, modelId: string) =>
    api.get<{ years: Array<{ id: string; year: string }> }>(
      `/vehicle/fipe/years?brandId=${brandId}&modelId=${modelId}`
    ),
  // Busca detalhes (preço, combustível, etc) do veículo
  getFipeDetails: (brandId: string, modelId: string, yearId: string) =>
    api.get<{ details: { model: string; brand: string; year: string; fuel: string; price: string; referenceMonth: string } }>(
      `/vehicle/fipe/details?brandId=${brandId}&modelId=${modelId}&yearId=${yearId}`
    ),
};

/** OxenteExpress_Backend: `GET /rider/packages?lat=&lon=&maxDistance=` (private.js). */
const RIDER_PACKAGES_PATH = import.meta.env.VITE_RIDER_PACKAGES_PATH || "/rider/packages";

/** Resposta de `GET /rider/current-delivery` — pacote PICKING_UP | IN_TRANSIT do entregador logado. */
export interface ApiRiderCurrentPackage {
  id: string;
  orderNumber: string;
  status: string;
  pickupCode?: string;
  deliveryCode?: string;
  totalPrice: number;
  deliveryAddress: string;
  createdAt: string;
  storeName: string;
  storeAddress: string;
  customerName: string;
  customerAddress?: string;
  items?: string[];
}

export const riderApi = {
  acceptPackage: (packageId: string) =>
    api.post<{ pickupCode?: string; orderNumber?: string; store?: { name?: string; address?: string } }>(
      "/rider/accept-package",
      { packageId }
    ),
  getCurrentDelivery: () => api.get<{ package: ApiRiderCurrentPackage | null }>("/rider/current-delivery"),
  finishDelivery: (packageId: string, deliveryCode: string) =>
    api.post<{ message?: string; orderNumber?: string; status?: string }>("/rider/finish-delivery", {
      packageId,
      deliveryCode,
    }),
  getDeliveryHistory: () => api.get("/rider/history"),
  getAvailablePackages: (params: { lat: string; lon: string; maxDistance?: number }) =>
    api.get<unknown>(RIDER_PACKAGES_PATH, {
      params: {
        lat: params.lat,
        lon: params.lon,
        maxDistance: params.maxDistance ?? 15,
      },
    }),
};

export default api;
