import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { SOCKET_EVENTS, STORE_ORDER_ALIASES, CUSTOMER_ORDER_ALIASES, playNotificationBeep } from "@/lib/socketEvents";
import { Order, OrderStatus } from "@/data/types";
import { resolveBoxPublicUrl } from "@/lib/storageUrl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PersonAvatar } from "@/components/media/PersonAvatar";
import { Package, Clock, CheckCircle, Store, LogOut, AlertCircle, ShoppingBag, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { packageApi, getAxiosErrorMessage } from "@/lib/api";
import type { ApiStoreOrder } from "@/lib/packageMappers";
import { mapStoreApiOrder } from "@/lib/packageMappers";
import StoreInventory from "@/components/StoreInventory";
import { UserNavAvatar } from "@/components/UserNavAvatar";
import ProfileSheet from "@/components/ProfileSheet";

const statusConfig: Partial<Record<OrderStatus, { label: string; color: string }>> = {
  PENDING: { label: "Pendente", color: "bg-muted text-muted-foreground" },
  PREPARING: { label: "Preparando", color: "bg-warning text-warning-foreground" },
  READY: { label: "Pronto", color: "bg-success text-success-foreground" },
  PICKING_UP: { label: "Coletando", color: "bg-secondary text-secondary-foreground" },
  IN_TRANSIT: { label: "Em trânsito", color: "bg-primary text-primary-foreground" },
  DELIVERED: { label: "Entregue", color: "bg-muted text-muted-foreground" },
  CANCELLED: { label: "Cancelado", color: "bg-destructive text-destructive-foreground" },
};

function badgeFor(status: OrderStatus) {
  const c = statusConfig[status];
  return c ?? { label: status, color: "bg-muted text-muted-foreground" };
}

export default function StoreDashboard() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [history, setHistory] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [pickupModal, setPickupModal] = useState<Order | null>(null);
  const [pickupInput, setPickupInput] = useState("");
  const [pickupError, setPickupError] = useState(false);
  const [pickupSubmitting, setPickupSubmitting] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<{ url: string; title: string } | null>(null);

  const openPhotoViewer = (url: string, title: string) => {
    setPhotoViewer({ url: `${url}?t=${Date.now()}`, title });
  };

  const loadOrders = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setOrdersLoading(true);
      try {
        const res = await packageApi.getStoreOrders();
        const raw = res.data as ApiStoreOrder[];
        setOrders(raw.map(mapStoreApiOrder));
      } catch (err) {
        if (!opts?.silent) {
          setOrders([]);
          toast.error(getAxiosErrorMessage(err, "Não foi possível carregar os pedidos."));
        }
      } finally {
        if (!opts?.silent) setOrdersLoading(false);
      }
    },
    [user?.id]
  );

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await packageApi.getStoreHistory();
      const raw = res.data as ApiStoreOrder[];
      setHistory(raw.map(mapStoreApiOrder));
    } catch (err) {
      setHistory([]);
      toast.error(getAxiosErrorMessage(err, "Não foi possível carregar o histórico."));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    void loadHistory();
  }, [loadOrders, loadHistory]);

  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    const onNewOrder = () => {
      playNotificationBeep();
      toast.success("Novo pedido recebido!", { description: "A lista foi atualizada." });
      void loadOrders({ silent: true });
    };
    const onOrderStatus = () => {
      void loadOrders({ silent: true });
      void loadHistory();
    };
    socket.on(SOCKET_EVENTS.STORE_NEW_ORDER, onNewOrder);
    STORE_ORDER_ALIASES.forEach((ev) => socket.on(ev, onNewOrder));
    socket.on(SOCKET_EVENTS.CUSTOMER_ORDER_STATUS, onOrderStatus);
    CUSTOMER_ORDER_ALIASES.forEach((ev) => socket.on(ev, onOrderStatus));
    return () => {
      socket.off(SOCKET_EVENTS.STORE_NEW_ORDER, onNewOrder);
      STORE_ORDER_ALIASES.forEach((ev) => socket.off(ev, onNewOrder));
      socket.off(SOCKET_EVENTS.CUSTOMER_ORDER_STATUS, onOrderStatus);
      CUSTOMER_ORDER_ALIASES.forEach((ev) => socket.off(ev, onOrderStatus));
    };
  }, [socket, loadOrders, loadHistory]);

  const applyStatus = async (orderId: string, newStatus: OrderStatus): Promise<boolean> => {
    try {
      await packageApi.updateStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      return true;
    } catch {
      toast.error("Falha ao atualizar o status. Tente novamente.");
      return false;
    }
  };

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const ok = await applyStatus(orderId, newStatus);
    if (ok) toast.success("Status do pedido atualizado.");
  };

  const handleConfirmPickup = async () => {
    if (!pickupModal) return;
    setPickupSubmitting(true);
    try {
      await packageApi.confirmStorePickup(pickupModal.id, pickupInput.trim());
      setOrders((prev) => prev.map((o) => (o.id === pickupModal.id ? { ...o, status: "IN_TRANSIT" as OrderStatus } : o)));
      setPickupModal(null);
      setPickupInput("");
      setPickupError(false);
      toast.success("Coleta confirmada! Pedido em trânsito.");
    } catch {
      setPickupError(true);
      toast.error("Código inválido ou falha ao confirmar. Verifique e tente novamente.");
    } finally {
      setPickupSubmitting(false);
    }
  };

  const storeOrders = orders;

  const resolvedPhotoUrl = useMemo(() => {
    if (!photoViewer?.url) return undefined;
    return resolveBoxPublicUrl(photoViewer.url);
  }, [photoViewer?.url]);

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Store className="w-5 h-5 text-primary-foreground shrink-0" />
            <UserNavAvatar name={user?.name ?? ""} avatarUrl={user?.avatarUrl} cacheKey={Date.now()} />
            <span className="font-bold text-primary-foreground truncate">{user?.name}</span>
          </div>
          <div className="flex items-center gap-0 shrink-0">
            <ProfileSheet />
            <Button variant="ghost" size="icon" onClick={logout} className="text-primary-foreground hover:bg-primary-foreground/20">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="orders" className="flex items-center gap-1">
              <Package className="w-4 h-4" /> Pedidos
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> Histórico
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1">
              <ShoppingBag className="w-4 h-4" /> Produtos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Pedidos ({storeOrders.length})
            </h2>

            {ordersLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!ordersLoading && storeOrders.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhum pedido ainda</p>
                <p className="text-sm">Novos pedidos aparecerão aqui</p>
              </div>
            )}

            {!ordersLoading &&
              storeOrders.map((order) => {
                const st = badgeFor(order.status);
                return (
                  <Card key={order.id} className="shadow-sm animate-slide-up">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-base">{order.orderNumber}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <PersonAvatar
                              name={order.customerName}
                              imagePath={order.customerAvatarUrl}
                              className="h-9 w-9 border border-border"
                              fallbackClassName="bg-muted"
                            />
                            <p className="text-sm text-muted-foreground truncate">{order.customerName}</p>
                          </div>
                        </div>
                        <Badge className={st.color}>{st.label}</Badge>
                      </div>

                      <div className="text-sm text-muted-foreground mb-3 space-y-1">
                        {order.items.map((item, i) => (
                          <p key={i}>• {item}</p>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <p className="font-bold text-primary text-lg">R$ {order.totalPrice.toFixed(2)}</p>
                      </div>

                      <div className="mt-3 flex gap-2 flex-wrap">
                        {order.status === "PENDING" && (
                          <Button
                            size="sm"
                            className="flex-1 bg-warning text-warning-foreground hover:bg-warning/90"
                            onClick={() => updateStatus(order.id, "PREPARING")}
                          >
                            <ChefHat className="w-4 h-4 mr-1" /> Iniciar preparo
                          </Button>
                        )}
                        {order.status === "PREPARING" && (
                          <Button
                            size="sm"
                            className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                            onClick={() => updateStatus(order.id, "READY")}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Marcar como pronto
                          </Button>
                        )}
                        {order.status === "PICKING_UP" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-secondary text-secondary hover:bg-secondary/10"
                            onClick={() => setPickupModal(order)}
                          >
                            Confirmar coleta
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Histórico de entregas
              </h2>
              <span className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
                {history.length} entregas
              </span>
            </div>

            {historyLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!historyLoading && history.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Ainda não há entregas finalizadas.</p>
                <p className="text-sm">Os pedidos finalizados aparecerão aqui assim que forem entregues.</p>
              </div>
            )}

            {!historyLoading && history.map((order) => (
              <Card key={order.id} className="shadow-sm animate-slide-up">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-base">{order.orderNumber}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => {
                            if (order.customerAvatarUrl) {
                              openPhotoViewer(order.customerAvatarUrl, `Cliente: ${order.customerName}`);
                            }
                          }}
                          className={order.customerAvatarUrl ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                        >
                          <PersonAvatar
                            name={order.customerName}
                            imagePath={order.customerAvatarUrl}
                            cacheKey={Date.now()}
                            className="h-9 w-9 border border-border"
                            fallbackClassName="bg-muted"
                          />
                        </button>
                        <p className="text-sm text-muted-foreground truncate">{order.customerName}</p>
                      </div>
                    </div>
                    <Badge className="bg-muted text-muted-foreground">Entregue</Badge>
                  </div>

                  {order.rider && (
                    <div className="mb-3 rounded-lg border border-border p-3 bg-muted/50">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-semibold">Entregador</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (order.rider?.avatarUrl) {
                              openPhotoViewer(order.rider.avatarUrl, `Entregador: ${order.rider.name}`);
                            }
                          }}
                          className={order.rider.avatarUrl ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                        >
                          <PersonAvatar
                            name={order.rider.name}
                            imagePath={order.rider.avatarUrl}
                            cacheKey={Date.now()}
                            className="h-9 w-9"
                            fallbackClassName="bg-secondary"
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{order.rider.name}</p>
                          <p className="text-xs text-muted-foreground">{order.rider.vehicle?.model}</p>
                        </div>
                        {order.rider.vehicle && (
                          <button
                            onClick={() => {
                              if (order.rider?.vehicle?.vehicleUrl) {
                                setPhotoViewer({ 
                                  url: order.rider.vehicle.vehicleUrl, 
                                  title: `${order.rider.vehicle.color} • ${order.rider.vehicle.plate}` 
                                });
                              }
                            }}
                            className={order.rider.vehicle.vehicleUrl ? "cursor-pointer hover:opacity-80 transition-opacity text-xs text-muted-foreground underline" : ""}
                          >
                            {order.rider.vehicle.vehicleUrl ? "Ver moto" : "Moto"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground mb-3 space-y-1">
                    {order.items.map((item, i) => (
                      <p key={i}>• {item}</p>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      <span>{order.storeName}</span>
                    </div>
                    <p className="font-bold text-primary">R$ {order.totalPrice.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="products">
            <StoreInventory />
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

      <Dialog
        open={!!pickupModal}
        onOpenChange={() => {
          setPickupModal(null);
          setPickupInput("");
          setPickupError(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar coleta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Verifique o entregador e confirme a coleta usando o código.
          </p>

          {pickupModal?.rider ? (
            <div className="rounded-2xl border border-border p-4 mb-4 bg-muted/70">
              <div className="flex items-center gap-3">
                <PersonAvatar
                  name={pickupModal.rider.name}
                  imagePath={pickupModal.rider.avatarUrl}
                  cacheKey={Date.now()}
                  className="h-14 w-14"
                  fallbackClassName="bg-secondary"
                />
                <div className="min-w-0">
                  <p className="font-semibold">{pickupModal.rider.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {pickupModal.rider.vehicle?.model ?? "Moto não disponível"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pickupModal.rider.vehicle?.color ?? "Cor desconhecida"} • {pickupModal.rider.vehicle?.plate ?? "Placa desconhecida"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border p-4 mb-4 bg-muted/50 text-sm text-muted-foreground">
              Identificação do entregador indisponível. Ainda assim confirme o código de coleta abaixo.
            </div>
          )}

          <Input
            value={pickupInput}
            onChange={(e) => {
              setPickupInput(e.target.value);
              setPickupError(false);
            }}
            placeholder="Código de coleta"
            maxLength={12}
            className={pickupError ? "border-destructive" : ""}
          />
          {pickupError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Não foi possível confirmar
            </p>
          )}
          <DialogFooter>
            <Button
              onClick={() => void handleConfirmPickup()}
              className="gradient-primary text-primary-foreground"
              disabled={pickupSubmitting || !pickupInput.trim()}
            >
              {pickupSubmitting ? "Confirmando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
