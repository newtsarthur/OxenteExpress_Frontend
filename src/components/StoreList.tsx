import React, { useState, useEffect } from "react";
import { StoreInfo } from "@/data/types";
import { storeApi, getAxiosErrorMessage } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Star, Store } from "lucide-react";
import { toast } from "sonner";
import { BoxImage } from "@/components/media/BoxImage";

interface StoreListProps {
  onSelectStore: (store: StoreInfo) => void;
}

interface NearbyProductRow {
  storeId: string;
  storeName: string;
  storeImage: string | null;
  storeAddress: string;
  distanceKm: number;
}

function aggregateStores(results: NearbyProductRow[]): StoreInfo[] {
  const map = new Map<string, StoreInfo>();
  for (const r of results) {
    if (!map.has(r.storeId)) {
      const img = r.storeImage?.trim();
      map.set(r.storeId, {
        id: r.storeId,
        name: r.storeName,
        imageUrl: img || "",
        address: r.storeAddress,
        distanceKm: r.distanceKm,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.distanceKm - b.distanceKm);
}

export default function StoreList({ onSelectStore }: StoreListProps) {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        const res = await storeApi.getStores({});
        const results = (res.data?.results ?? []) as NearbyProductRow[];
        setStores(aggregateStores(results));
      } catch (err) {
        setStores([]);
        toast.error(getAxiosErrorMessage(err, "Não foi possível carregar as lojas."));
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-40 w-full" />
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stores.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhuma loja encontrada</p>
          <p className="text-sm">Cadastre um endereço no perfil ou informe localização</p>
        </div>
      )}
      {stores.map((store) => (
        <Card
          key={store.id}
          className="overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow animate-slide-up"
          onClick={() => onSelectStore(store)}
        >
          <div className="h-40 bg-muted relative">
            <BoxImage path={store.imageUrl || undefined} alt={store.name} className="absolute inset-0 h-full w-full" fallbackIcon={Store} />
            <div className="absolute bottom-2 right-2">
              <span className="bg-background/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" />
                {store.distanceKm} km
              </span>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">{store.name}</h3>
              {store.rating && (
                <span className="flex items-center gap-1 text-sm text-warning">
                  <Star className="w-4 h-4 fill-current" />
                  {store.rating}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{store.address}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
