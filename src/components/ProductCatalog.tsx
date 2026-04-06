import React, { useState, useEffect, useRef } from "react";
import { Product, StoreInfo } from "@/data/types";
import { storeApi, getAxiosErrorMessage } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Package, Store } from "lucide-react";
import { BoxImage } from "@/components/media/BoxImage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ProductCatalogProps {
  store: StoreInfo;
  onBack: () => void;
}

function mapApiToProduct(raw: Record<string, unknown>, storeId: string): Product {
  const img = raw.imageUrl != null ? String(raw.imageUrl).trim() : "";
  return {
    id: String(raw.id),
    storeId,
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    price: Number(raw.price ?? 0),
    imageUrl: img,
    quantity: Number(raw.quantity ?? 0),
    weightKg: Number(raw.weightKg ?? 0),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

export default function ProductCatalog({ store, onBack }: ProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const productsRef = useRef(products.length);
  productsRef.current = products.length;

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await storeApi.getStoreCatalog(store.id);
        const list = Array.isArray(res.data) ? res.data : [];
        setProducts(list.map((p) => mapApiToProduct(p as Record<string, unknown>, store.id)));
      } catch (err) {
        setProducts([]);
        toast.error(getAxiosErrorMessage(err, "Não foi possível carregar o catálogo."));
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [store.id]);

  // Polling: substitui Socket.IO para compatibilidade com Vercel (serverless)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await storeApi.getStoreCatalog(store.id);
        const list = Array.isArray(res.data) ? res.data : [];
        const updated = list.map((p) => mapApiToProduct(p as Record<string, unknown>, store.id));
        const prevCount = productsRef.current;
        if (prevCount > 0 && updated.length !== prevCount) {
          toast.info("Catálogo atualizado");
        }
        setProducts(updated);
      } catch {
        // silent
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [store.id]);

  const handleAdd = (product: Product) => {
    addItem(product);
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar para lojas
      </button>

      <div className="flex items-center gap-3">
        <BoxImage path={store.imageUrl || undefined} alt={store.name} className="h-14 w-14 shrink-0 rounded-xl" fallbackIcon={Store} />
        <div>
          <h2 className="font-bold text-lg">{store.name}</h2>
          <p className="text-sm text-muted-foreground">{store.address}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-32 w-full" />
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum produto disponível</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden shadow-sm animate-slide-up">
              <BoxImage path={product.imageUrl || undefined} alt={product.name} className="h-32 w-full" cacheKey={product.updatedAt} />
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm line-clamp-2 flex-1">{product.name}</p>
                  <Badge variant={product.quantity > 0 ? "default" : "destructive"} className="shrink-0">
                    {product.quantity > 0 ? `${Math.floor(product.quantity)}` : "0"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                {product.quantity === 0 && (
                  <p className="text-xs text-destructive font-medium">Fora de estoque</p>
                )}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-sm font-bold text-primary">R$ {product.price.toFixed(2)}</span>
                  <Button 
                    size="sm" 
                    className="h-8 px-2 shrink-0" 
                    onClick={() => handleAdd(product)}
                    disabled={product.quantity <= 0}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
