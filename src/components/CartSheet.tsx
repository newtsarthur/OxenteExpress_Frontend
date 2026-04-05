import React, { useState } from "react";
import { useCart } from "@/contexts/CartContext";
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
import { ShoppingCart, Plus, Minus, Trash2, Weight, Loader2 } from "lucide-react";
import { BoxImage } from "@/components/media/BoxImage";
import { toast } from "sonner";

export default function CartSheet() {
  const { items, updateQuantity, removeItem, clearCart, subtotal, totalWeight, itemCount } = useCart();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

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
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
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
          <div className="flex-1 overflow-y-auto space-y-3 py-4">
            {items.map((item) => (
              <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
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
          <SheetFooter className="flex-col gap-3 border-t pt-4">
            <div className="w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Weight className="w-3 h-3" /> Peso total
                </span>
                <span className="font-medium">{totalWeight.toFixed(1)} kg</span>
              </div>
            </div>
            <Button
              className="w-full gradient-primary text-primary-foreground font-semibold"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
              ) : (
                <>Finalizar Pedido — R$ {subtotal.toFixed(2)}</>
              )}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
