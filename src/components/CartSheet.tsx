import React, { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { packageApi, getAxiosErrorMessage } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, Trash2, Weight, Loader2, Truck } from "lucide-react";
import { BoxImage } from "@/components/media/BoxImage";
import { toast } from "sonner";

export default function CartSheet() {
  const { items, updateQuantity, removeItem, clearCart, subtotal, totalWeight, itemCount } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);

  // Calcular frete quando o carrinho muda ou modal abre
  useEffect(() => {
    if (!open || items.length === 0) {
      setShippingFee(null);
      return;
    }

    const calculateFee = async () => {
      setCalculatingShipping(true);
      try {
        const orderItems = items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        }));

        const response = await packageApi.calculateShippingFee({
          items: orderItems,
          lat: user?.coordinates ? parseFloat(user.coordinates.split(',')[0]) : undefined,
          lon: user?.coordinates ? parseFloat(user.coordinates.split(',')[1]) : undefined,
        });

        setShippingFee(response.data?.shippingFee ?? 0);
      } catch (err) {
        console.error("Erro ao calcular frete:", err);
        setShippingFee(0); // Se erro, assume frete zero por enquanto
      } finally {
        setCalculatingShipping(false);
      }
    };

    calculateFee();
  }, [open, items, user?.coordinates]);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setLoading(true);

    const orderItems = items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
    }));

    try {
      const res = await packageApi.createOrder({ items: orderItems });
      const deliveryFeeTotal = res.data?.deliveryFeeTotal;
      const message = deliveryFeeTotal
        ? `Pedido realizado com sucesso! Frete total calculado: R$ ${deliveryFeeTotal.toFixed(2)}.`
        : "Pedido realizado com sucesso! 🎉";
      toast.success(message);
      clearCart();
      setOpen(false);
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Não foi possível finalizar o pedido."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" variant="ghost" className="relative text-primary-foreground hover:bg-primary-foreground/20">
          <ShoppingCart className="w-5 h-5" />
          {itemCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-secondary text-secondary-foreground">
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col px-0 overflow-hidden w-full">
        <SheetHeader className="px-6 overflow-hidden">
          <SheetTitle className="flex items-center gap-2 truncate">
            <ShoppingCart className="w-5 h-5 text-primary shrink-0" />
            Carrinho ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
            <div>
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Carrinho vazio</p>
              <p className="text-sm">Adicione itens de uma loja</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 py-4 px-6 overflow-x-hidden">
            {items.map((item) => (
              <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 min-w-0">
                <BoxImage path={item.product.imageUrl || undefined} alt={item.product.name} className="h-14 w-14 shrink-0 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product.name}</p>
                  <p className="text-sm text-primary font-bold">
                    R$ {(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeItem(item.product.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter className="w-full flex-col gap-4 border-t pt-4 px-6 overflow-hidden">
            <div className="w-full space-y-3 overflow-hidden">
              {/* Subtotal */}
              <div className="flex justify-between items-center w-full overflow-hidden">
                <span className="text-sm text-muted-foreground shrink-0">Subtotal</span>
                <span className="font-bold text-sm whitespace-nowrap shrink-0">R$ {subtotal.toFixed(2)}</span>
              </div>

              {/* Peso Total */}
              <div className="flex justify-between items-center w-full overflow-hidden">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Weight className="w-4 h-4 shrink-0" /> Peso total
                </span>
                <span className="font-medium text-sm whitespace-nowrap shrink-0">{totalWeight.toFixed(1)} kg</span>
              </div>

              {/* Frete */}
              <div className="flex justify-between items-center w-full overflow-hidden">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Truck className="w-4 h-4 shrink-0" /> Frete
                </span>
                {calculatingShipping ? (
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">Calculando...</span>
                ) : shippingFee !== null ? (
                  <span className="font-bold text-sm text-secondary whitespace-nowrap shrink-0">R$ {shippingFee.toFixed(2)}</span>
                ) : (
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">—</span>
                )}
              </div>

              {/* Total */}
              {shippingFee !== null && (
                <div className="flex justify-between items-center w-full overflow-hidden pt-3 mt-1 border-t border-border">
                  <span className="text-base font-bold text-foreground shrink-0">Total</span>
                  <span className="text-base font-bold text-primary whitespace-nowrap shrink-0">
                    R$ {(subtotal + shippingFee).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Botão Finalizar */}
            <Button
              className="w-full gradient-primary text-primary-foreground font-semibold text-base py-6 max-w-full overflow-hidden"
              onClick={handleCheckout}
              disabled={loading || shippingFee === null || calculatingShipping}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
              ) : calculatingShipping ? (
                <>Calculando frete...</>
              ) : shippingFee !== null ? (
                <span className="truncate">Finalizar Pedido — R$ {(subtotal + shippingFee).toFixed(2)}</span>
              ) : (
                <>Finalizar Pedido</>
              )}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
