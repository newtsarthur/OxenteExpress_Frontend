import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Package as PackageType, Order } from "@/data/types";
import { resolveBoxPublicUrl } from "@/lib/storageUrl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bike,
  Package,
  MapPin,
  Weight,
  Box,
  Navigation,
  LogOut,
  AlertCircle,
  Store,
  Loader2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { riderApi, getAxiosErrorMessage } from "@/lib/api";
import { parseRiderPackagesResponse, mapRiderCurrentPackageToOrder, mapStoreApiOrder, type ApiStoreOrder } from "@/lib/packageMappers";
import { UserNavAvatar } from "@/components/UserNavAvatar";
import ProfileSheet from "@/components/ProfileSheet";
import { PersonAvatar } from "@/components/media/PersonAvatar";
import { BoxImage } from "@/components/media/BoxImage";
import { Skeleton } from "@/components/ui/skeleton";

function parseUserLatLon(coordinates: string | null | undefined): { lat: string; lon: string } | null {
  const t = coordinates?.trim();
  if (!t) return null;
  const parts = t.split(",").map((p) => p.trim());
  if (parts.length < 2) return null;
  const lat = parts[0];
  const lon = parts[1];
  if (!lat || !lon || Number.isNaN(Number(lat)) || Number.isNaN(Number(lon))) return null;
  return { lat, lon };
}

export default function RiderDashboard() {
  const { user, logout } = useAuth();
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [history, setHistory] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeDelivery, setActiveDelivery] = useState<Order | null>(null);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [deliveryInput, setDeliveryInput] = useState("");
  const [deliveryError, setDeliveryError] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [riderTab, setRiderTab] = useState<"available" | "delivery" | "history">("available");
  const [photoViewer, setPhotoViewer] = useState<{ url: string; title: string } | null>(null);
  const openPhotoViewer = (url: string, title: string) => {
    setPhotoViewer({ url: `${url}?t=${Date.now()}`, title });
  };

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await riderApi.getDeliveryHistory();
      const raw = res.data as ApiStoreOrder[];
      setHistory(raw.map(mapStoreApiOrder));
    } catch (err) {
      setHistory([]);
      toast.error(getAxiosErrorMessage(err, "Não foi possível carregar o histórico de entregas."));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const syncFromServer = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setPackagesLoading(true);
      let currentPkgId: string | null = null;
      try {
        const cur = await riderApi.getCurrentDelivery();
        const pkg = cur.data?.package;
        if (pkg) {
          currentPkgId = pkg.id;
          setActiveDelivery(mapRiderCurrentPackageToOrder(pkg));
          setPickupCode(pkg.pickupCode ?? null);
          if (!opts?.silent) setRiderTab("delivery");
        } else {
          setActiveDelivery(null);
          setPickupCode(null);
          if (!opts?.silent) setRiderTab("available");
        }
      } catch (err) {
        if (!opts?.silent) {
          toast.error(getAxiosErrorMessage(err, "Não foi possível sincronizar sua entrega ativa."));
          setActiveDelivery(null);
          setPickupCode(null);
        }
      }

      try {
        const coords = parseUserLatLon(user?.coordinates ?? undefined);
        if (!coords) {
          setPackages([]);
          if (!opts?.silent) {
            toast.error(
              "Informe seu endereço no perfil e aguarde a localização automática para listar pacotes próximos."
            );
          }
          return;
        }
        const res = await riderApi.getAvailablePackages(coords);
        let list = parseRiderPackagesResponse(res.data);
        if (currentPkgId) list = list.filter((p) => p.id !== currentPkgId);
        setPackages(list);
      } catch (err) {
        setPackages([]);
        if (!opts?.silent) {
          toast.error(
            getAxiosErrorMessage(err, "Não foi possível carregar os pacotes. Verifique o servidor e sua localização.")
          );
        }
      } finally {
        if (!opts?.silent) setPackagesLoading(false);
      }
    },
    [user?.coordinates]
  );

  useEffect(() => {
    void syncFromServer();
    void loadHistory();
  }, [syncFromServer, loadHistory]);

  // Polling: substitui Socket.IO para compatibilidade com Vercel (serverless)
  useEffect(() => {
    const interval = setInterval(() => {
      void syncFromServer({ silent: true });
      void loadHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, [syncFromServer, loadHistory]);

  const handleAccept = async (pkg: PackageType) => {
    setAccepting(pkg.id);
    try {
      await riderApi.acceptPackage(pkg.id);
      toast.success("Pedido aceito! Dirija-se à loja.");
      await syncFromServer({ silent: true });
      setRiderTab("delivery");
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Não foi possível aceitar o pedido."));
    } finally {
      setAccepting(null);
    }
  };

  const mapPhase = activeDelivery?.status === "IN_TRANSIT" ? "to-customer" : "to-store";
  const showFinishButton = activeDelivery?.status === "IN_TRANSIT";

  const resolvedPhotoUrl = useMemo(() => {
    if (!photoViewer?.url) return undefined;
    return resolveBoxPublicUrl(photoViewer.url);
  }, [photoViewer?.url]);

  const handleFinishDelivery = async () => {
    if (!activeDelivery) return;
    setFinishing(true);
    setDeliveryError(false);
    try {
      await riderApi.finishDelivery(activeDelivery.id, deliveryInput.trim());
      toast.success("Entrega finalizada com sucesso!");
      setDeliveryModal(false);
      setDeliveryInput("");
      await syncFromServer({ silent: true });
    } catch (err) {
      setDeliveryError(true);
      toast.error(getAxiosErrorMessage(err, "Código inválido ou falha ao finalizar."));
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Bike className="w-5 h-5 text-primary-foreground shrink-0" />
            <UserNavAvatar name={user?.name ?? ""} avatarUrl={user?.avatarUrl} />
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
        <Tabs value={riderTab} onValueChange={(v) => setRiderTab(v as "available" | "delivery")} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="available">Disponíveis</TabsTrigger>
            <TabsTrigger value="delivery" disabled={!activeDelivery}>
              Minha Entrega
            </TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4">
            {packagesLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!packagesLoading && packages.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhum pacote disponível</p>
                <p className="text-sm">Aguarde novos pedidos</p>
              </div>
            )}

            {!packagesLoading &&
              packages.map((pkg) => (
                <Card key={pkg.id} className="shadow-sm animate-slide-up">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              if (pkg.storeAvatarUrl) {
                                openPhotoViewer(pkg.storeAvatarUrl, `Loja: ${pkg.storeName}`);
                              }
                            }}
                            className={pkg.storeAvatarUrl ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                          >
                            <PersonAvatar
                              name={pkg.storeName}
                              imagePath={pkg.storeAvatarUrl}
                              className="h-10 w-10"
                              fallbackClassName="bg-muted"
                            />
                          </button>
                          <div className="min-w-0">
                            <p className="font-bold truncate">{pkg.orderNumber}</p>
                            <p className="text-sm text-muted-foreground truncate">{pkg.storeName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">Ganho</p>
                        <p className="text-lg font-bold text-secondary">R$ {(pkg.deliveryFee ?? 0).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-4 h-4 text-secondary" />
                        <span>{pkg.distanceKm} km</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Weight className={`w-4 h-4 ${pkg.weightKg > 10 ? "text-destructive" : "text-muted-foreground"}`} />
                        <span className={pkg.weightKg > 10 ? "text-destructive font-bold" : ""}>{pkg.weightKg} kg</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Box className="w-4 h-4 text-muted-foreground" />
                        <span>{pkg.volumeL} L</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mb-3 space-y-1">
                      <p className="flex items-center gap-1">
                        <Store className="w-3 h-3" /> {pkg.storeAddress}
                      </p>
                      <p className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {pkg.customerAddress}
                      </p>
                    </div>

                    {pkg.productImagePaths && pkg.productImagePaths.length > 0 && (
                      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                        {pkg.productImagePaths.map((p, i) => (
                          <BoxImage
                            key={`${pkg.id}-img-${i}`}
                            path={p}
                            alt={`Item ${i + 1}`}
                            className="h-14 w-14 shrink-0 rounded-md"
                          />
                        ))}
                      </div>
                    )}

                    <Button
                      className="w-full gradient-primary text-primary-foreground"
                      onClick={() => handleAccept(pkg)}
                      disabled={!!activeDelivery || accepting === pkg.id}
                    >
                      {accepting === pkg.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aceitando...
                        </>
                      ) : (
                        "Aceitar Pedido"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="delivery">
            {activeDelivery && (
              <div className="space-y-4 animate-slide-up">
                <Card className="overflow-hidden">
                  <div className="h-52 bg-muted relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-primary/10" />
                    <div className="relative z-10 text-center px-2">
                      <Navigation className="w-10 h-10 mx-auto mb-2 text-secondary animate-pulse-soft" />
                      <p className="font-semibold text-sm">
                        {mapPhase === "to-store" ? "Indo até a loja" : "Indo até o cliente"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {mapPhase === "to-store" ? activeDelivery.storeAddress : activeDelivery.customerAddress}
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <div className="w-3 h-3 rounded-full bg-secondary" />
                        <div className="w-16 h-0.5 bg-secondary/50 rounded" />
                        <div className="w-2 h-2 rounded-full bg-secondary/50" />
                        <div className="w-16 h-0.5 bg-primary/50 rounded" />
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="font-bold">{activeDelivery.orderNumber}</p>
                      <Badge className="bg-secondary text-secondary-foreground">
                        {activeDelivery.status === "PICKING_UP" ? "Coletando" : "Em trânsito"}
                      </Badge>
                    </div>

                    {pickupCode && activeDelivery.status === "PICKING_UP" && (
                      <div className="bg-accent p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground mb-1">Código de coleta</p>
                        <p className="text-2xl font-extrabold tracking-widest text-secondary">{pickupCode}</p>
                        <p className="text-xs text-muted-foreground mt-1">Informe este código na loja</p>
                      </div>
                    )}

                    {activeDelivery.status === "PICKING_UP" && (
                      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                          Aguarde a loja confirmar a coleta com o código acima. Quando confirmar, o status passa para{" "}
                          <strong className="text-foreground">em trânsito</strong> e você poderá seguir para o cliente.
                        </p>
                      </div>
                    )}

                    {activeDelivery.items.length > 0 && (
                      <div className="text-sm text-muted-foreground space-y-1">
                        {activeDelivery.items.map((line, i) => (
                          <p key={i}>• {line}</p>
                        ))}
                      </div>
                    )}

                    <div className="text-sm space-y-3 text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            if (activeDelivery.storeAvatarUrl) {
                              openPhotoViewer(activeDelivery.storeAvatarUrl, `Loja: ${activeDelivery.storeName}`);
                            }
                          }}
                          className={activeDelivery.storeAvatarUrl ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                        >
                          <PersonAvatar
                            name={activeDelivery.storeName}
                            imagePath={activeDelivery.storeAvatarUrl}
                            className="h-10 w-10"
                            fallbackClassName="bg-muted"
                          />
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{activeDelivery.storeName}</p>
                          <p className="text-xs text-muted-foreground truncate">{activeDelivery.storeAddress}</p>
                        </div>
                      </div>
                      <p>
                        <strong>Cliente:</strong> {activeDelivery.customerName}
                      </p>
                      <p>
                        <strong>Valor:</strong> R$ {activeDelivery.totalPrice.toFixed(2)}
                      </p>
                    </div>

                    {showFinishButton && (
                      <Button className="w-full gradient-primary text-primary-foreground" onClick={() => setDeliveryModal(true)}>
                        Finalizar Entrega
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
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
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhuma entrega finalizada ainda.</p>
                <p className="text-sm">Assim que você concluir entregas elas aparecerão aqui.</p>
              </div>
            )}

            {!historyLoading && history.map((order) => (
              <Card key={order.id} className="shadow-sm animate-slide-up">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{order.storeName}</p>
                    </div>
                    <Badge className="bg-muted text-muted-foreground">Entregue</Badge>
                  </div>

                  <div className="text-sm text-muted-foreground mb-3 space-y-1">
                    {order.items.map((item, i) => (
                      <p key={i}>• {item}</p>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                    <p className="font-bold text-primary">R$ {order.totalPrice.toFixed(2)}</p>
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

      <Dialog
        open={deliveryModal}
        onOpenChange={(open) => {
          setDeliveryModal(open);
          if (!open) {
            setDeliveryInput("");
            setDeliveryError(false);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Finalizar Entrega</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Solicite o <strong>código de entrega</strong> ao cliente:
          </p>
          <Input
            value={deliveryInput}
            onChange={(e) => {
              setDeliveryInput(e.target.value);
              setDeliveryError(false);
            }}
            placeholder="Código informado ao cliente"
            maxLength={32}
            className={deliveryError ? "border-destructive" : ""}
          />
          {deliveryError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Código incorreto ou falha na confirmação
            </p>
          )}
          <DialogFooter>
            <Button
              onClick={() => void handleFinishDelivery()}
              className="gradient-primary text-primary-foreground"
              disabled={finishing || !deliveryInput.trim()}
            >
              {finishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirmando…
                </>
              ) : (
                "Confirmar Entrega"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
