import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { SOCKET_EVENTS, CUSTOMER_ORDER_ALIASES } from "@/lib/socketEvents";
import { CartProvider } from "@/contexts/CartContext";
import { StoreInfo, Order, OrderStatus } from "@/data/types";
import { resolveBoxPublicUrl } from "@/lib/storageUrl";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonAvatar } from "@/components/media/PersonAvatar";
import { BoxImage } from "@/components/media/BoxImage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Clock, MapPin, User, LogOut, CheckCircle2, Bike, Car } from "lucide-react";
import { toast } from "sonner";
import StoreList from "@/components/StoreList";
import ProductCatalog from "@/components/ProductCatalog";
import CartSheet from "@/components/CartSheet";
import { packageApi, getAxiosErrorMessage } from "@/lib/api";
import type { ApiCustomerPackage } from "@/lib/packageMappers";
import { mapCustomerApiPackage } from "@/lib/packageMappers";
import { UserNavAvatar } from "@/components/UserNavAvatar";
import ProfileSheet from "@/components/ProfileSheet";

const statusSteps: { key: OrderStatus; label: string }[] = [
  { key: "PENDING", label: "Recebido" },
  { key: "PREPARING", label: "Preparando" },
  { key: "READY", label: "Pronto" },
  { key: "PICKING_UP", label: "Coletando" },
  { key: "IN_TRANSIT", label: "Em trânsito" },
  { key: "DELIVERED", label: "Entregue" },
];

function getProgress(status: OrderStatus) {
  if (status === "CANCELLED") return 0;
  const idx = statusSteps.findIndex((s) => s.key === status);
  if (idx < 0) return 15;
  return ((idx + 1) / statusSteps.length) * 100;
}

/** Após PREPARING: bloco de logística (entregador via Batch ou aguardando). */
function showLogisticsSection(status: OrderStatus) {
  return status !== "PENDING" && status !== "PREPARING" && status !== "CANCELLED";
}

function CustomerDashboardInner() {
  const { user, logout } = useAuth();
  const [selectedStore, setSelectedStore] = useState<StoreInfo | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [photoViewer, setPhotoViewer] = useState<{ url: string; title: string } | null>(null);

  const loadOrders = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setOrdersLoading(true);
      try {
        const res = await packageApi.getCustomerOrders();
        const raw = res.data as ApiCustomerPackage[];
        setCustomerOrders(raw.map(mapCustomerApiPackage));
      } catch (err) {
        if (!opts?.silent) {
          setCustomerOrders([]);
          toast.error(getAxiosErrorMessage(err, "Não foi possível carregar seus pedidos."));
        }
      } finally {
        if (!opts?.silent) setOrdersLoading(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (user?.id) void loadOrders();
  }, [user?.id, loadOrders]);

  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    const onStatus = (payload?: { orderId?: string; status?: OrderStatus }) => {
      if (payload?.orderId && payload?.status) {
        setCustomerOrders((prev) =>
          prev.map((o) => (o.id === payload.orderId ? { ...o, status: payload.status! } : o))
        );
      } else {
        void loadOrders({ silent: true });
      }
    };
    socket.on(SOCKET_EVENTS.CUSTOMER_ORDER_STATUS, onStatus);
    CUSTOMER_ORDER_ALIASES.forEach((ev) => socket.on(ev, onStatus));

    // Real-time Everywhere: Atualizar informações da loja quando mudar
    const onStoreUpdated = (data: { action: string; user?: any }) => {
      if (data.action === 'update' && data.user) {
        // Atualiza loja nos pedidos se houver mudança
        setCustomerOrders((prev) =>
          prev.map((order) =>
            order.storeId === data.user.id
              ? {
                  ...order,
                  storeName: data.user.name || order.storeName,
                  storeAddress: data.user.address || order.storeAddress,
                }
              : order
          )
        );
      }
    };
    socket.on('user_updated', onStoreUpdated);

    return () => {
      socket.off(SOCKET_EVENTS.CUSTOMER_ORDER_STATUS, onStatus);
      CUSTOMER_ORDER_ALIASES.forEach((ev) => socket.off(ev, onStatus));
      socket.off('user_updated', onStoreUpdated);
    };
  }, [socket, loadOrders]);

  const resolvedPhotoUrl = useMemo(() => {
    if (!photoViewer?.url) return undefined;
    return resolveBoxPublicUrl(photoViewer.url);
  }, [photoViewer?.url]);

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <User className="w-5 h-5 text-primary-foreground shrink-0" />
            <UserNavAvatar name={user?.name ?? ""} avatarUrl={user?.avatarUrl} />
            <span className="font-bold text-primary-foreground truncate">{user?.name}</span>
          </div>
          <div className="flex items-center gap-0 shrink-0">
            <CartSheet />
            <ProfileSheet />
            <Button variant="ghost" size="icon" onClick={logout} className="text-primary-foreground hover:bg-primary-foreground/20">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <Tabs defaultValue="stores" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="stores">Lojas</TabsTrigger>
            <TabsTrigger value="orders">Meus Pedidos</TabsTrigger>
          </TabsList>

          <TabsContent value="stores">
            {selectedStore ? (
              <ProductCatalog store={selectedStore} onBack={() => setSelectedStore(null)} />
            ) : (
              <StoreList onSelectStore={setSelectedStore} />
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {ordersLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!ordersLoading && customerOrders.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhum pedido</p>
                <p className="text-sm">Seus pedidos aparecerão aqui</p>
              </div>
            )}

            {!ordersLoading &&
              customerOrders.map((order) => (
                <Card key={order.id} className="shadow-sm animate-slide-up">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-base">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">{order.storeName}</p>
                      </div>
                      <p className="font-bold text-primary">R$ {order.totalPrice.toFixed(2)}</p>
                    </div>

                    <div>
                      <Progress value={getProgress(order.status)} className="h-2 mb-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        {statusSteps.map((step) => {
                          const currentIdx = statusSteps.findIndex((s) => s.key === order.status);
                          const stepIdx = statusSteps.findIndex((s) => s.key === step.key);
                          const isActive = stepIdx <= currentIdx;
                          return (
                            <span key={step.key} className={`${isActive ? "text-primary font-semibold" : ""} hidden sm:inline`}>
                              {step.label}
                            </span>
                          );
                        })}
                      </div>
                      <p className="text-sm font-semibold text-primary sm:hidden mt-1">
                        {statusSteps.find((s) => s.key === order.status)?.label ?? order.status}
                      </p>
                    </div>

                    {showLogisticsSection(order.status) && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <Bike className="w-4 h-4" />
                          Entrega
                        </div>
                        {order.rider ? (
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => {
                                if (order.rider?.avatarUrl) {
                                  setPhotoViewer({ url: order.rider.avatarUrl, title: `Entregador: ${order.rider.name}` });
                                }
                              }}
                              className={order.rider.avatarUrl ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                            >
                              <PersonAvatar
                                name={order.rider.name}
                                imagePath={order.rider.avatarUrl}
                                className="h-14 w-14 border-2 border-primary/30 shrink-0"
                                fallbackClassName="bg-primary/10 text-primary"
                              />
                            </button>
                            <div className="min-w-0 flex-1 space-y-2">
                              <p className="font-bold truncate">{order.rider.name}</p>
                              {order.rider.vehicle && (
                                <div className="space-y-2 text-sm text-muted-foreground">
                                  <p className="flex items-center gap-2">
                                    <Car className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-foreground font-medium">
                                      {order.rider.vehicle.model}
                                      {order.rider.vehicle.color ? ` · ${order.rider.vehicle.color}` : ""}
                                    </span>
                                  </p>
                                  <button
                                    onClick={() => {
                                      if (order.rider?.vehicle?.vehicleUrl) {
                                        setPhotoViewer({ 
                                          url: order.rider.vehicle.vehicleUrl,
                                          title: `${order.rider.vehicle.color ?? "Moto"} • ${order.rider.vehicle.plate}`
                                        });
                                      }
                                    }}
                                    className={order.rider.vehicle.vehicleUrl ? "cursor-pointer hover:opacity-80 transition-opacity w-full" : ""}
                                  >
                                    <BoxImage
                                      path={order.rider.vehicle.vehicleUrl}
                                      alt="Veículo"
                                      className="w-full max-h-28 rounded-md border border-border"
                                      fallbackIcon={Car}
                                    />
                                  </button>
                                  <p>
                                    <Badge variant="secondary" className="font-mono tracking-wider">
                                      {order.rider.vehicle.plate}
                                    </Badge>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Aguardando entregador para aceitar o pedido…</p>
                        )}
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground">
                      {order.items.map((item, i) => (
                        <p key={i}>• {item}</p>
                      ))}
                    </div>

                    {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                      <div className="bg-accent p-4 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground mb-1">Seu código de entrega</p>
                        <p className="text-3xl font-extrabold tracking-[0.3em] text-secondary">{order.deliveryCode}</p>
                        <p className="text-xs text-muted-foreground mt-2">Informe este código ao entregador na hora da entrega</p>
                      </div>
                    )}

                    {order.status === "DELIVERED" && (
                      <div className="flex items-center gap-2 text-success text-sm font-medium">
                        <CheckCircle2 className="w-5 h-5" />
                        Pedido entregue com sucesso!
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {order.customerAddress}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!photoViewer} onOpenChange={() => setPhotoViewer(null)}>
        <DialogContent className="max-w-sm p-0 border-0 bg-black/80">
          <div className="relative w-full max-h-[80vh] flex items-center justify-center">
            <button
              onClick={() => setPhotoViewer(null)}
              className="absolute top-0 right-0 z-10 text-white hover:text-gray-300 p-2"
              aria-label="Fechar"
            >
              ✕
            </button>
            {resolvedPhotoUrl && (
              <img src={resolvedPhotoUrl} alt={photoViewer?.title} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            )}
          </div>
          {photoViewer?.title && (
            <div className="text-center text-sm text-muted-foreground bg-background p-3 rounded-b-lg">
              {photoViewer.title}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CustomerDashboard() {
  return (
    <CartProvider>
      <CustomerDashboardInner />
    </CartProvider>
  );
}
