import React, { useState, useEffect, useRef } from "react";
import { Product } from "@/data/types";
import { storeApi, getAxiosErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Package, Loader2, ImagePlus, Trash2 } from "lucide-react";
import { BoxImage } from "@/components/media/BoxImage";
import { toast } from "sonner";

export default function StoreInventory() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editVolume, setEditVolume] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newVolume, setNewVolume] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string>("");
  const [createSaving, setCreateSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [user?.id]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await storeApi.getProducts();
      setProducts(res.data);
    } catch (err) {
      setProducts([]);
      toast.error(getAxiosErrorMessage(err, "Não foi possível carregar os produtos."));
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (product: Product) => {
    setEditProduct(product);
    setEditName(product.name);
    setEditDesc(product.description ?? "");
    setEditPrice(product.price.toString());
    setEditQty(product.quantity.toString());
    setEditWeight(product.weightKg?.toString() ?? "");
    setEditVolume((product as Product & { volumeLiters?: number }).volumeLiters?.toString() ?? "");
    setEditImage(null);
    setEditImagePreview("");
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImage(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEdit = async () => {
    if (!editProduct) return;
    setEditSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", editName);
      fd.append("description", editDesc);
      fd.append("price", editPrice);
      fd.append("quantity", editQty);
      if (editWeight !== "") fd.append("weightKg", editWeight);
      if (editVolume !== "") fd.append("volumeLiters", editVolume);
      if (editImage) fd.append("image", editImage);

      await storeApi.updateProduct(editProduct.id, fd);
      await fetchProducts();
      toast.success("Produto atualizado!");
      setEditProduct(null);
      setEditImage(null);
      setEditImagePreview("");
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Não foi possível atualizar o produto."));
    } finally {
      setEditSaving(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      setNewImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
    setCreateSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", newName);
      formData.append("description", newDesc);
      formData.append("price", newPrice);
      formData.append("quantity", newQty);
      formData.append("weightKg", newWeight);
      formData.append("volumeLiters", newVolume);
      formData.append("storeId", user?.id || "");
      if (newImage) formData.append("image", newImage);

      await storeApi.createProduct(formData);
      toast.success("Produto criado com sucesso!");
      fetchProducts();
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Não foi possível criar o produto."));
    } finally {
      setCreateSaving(false);
      setShowCreate(false);
      resetCreateForm();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await storeApi.deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success("Produto excluído com sucesso.");
      setDeleteTarget(null);
    } catch {
      toast.error("Não foi possível excluir o produto. Tente novamente.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetCreateForm = () => {
    setNewName("");
    setNewDesc("");
    setNewPrice("");
    setNewQty("");
    setNewWeight("");
    setNewVolume("");
    setNewImage(null);
    setNewImagePreview("");
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="w-16 h-16 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Meus Produtos ({products.length})
        </h2>
        <Button
          size="sm"
          className="gradient-primary text-primary-foreground"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4 mr-1" /> Novo
        </Button>
      </div>

      {products.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum produto cadastrado</p>
          <p className="text-sm">Adicione seus produtos para começar a vender</p>
        </div>
      )}

      {products.map((product) => (
        <Card key={product.id} className="shadow-sm animate-slide-up">
          <CardContent className="p-4 flex items-center gap-3">
            <BoxImage path={product.imageUrl || undefined} alt={product.name} cacheKey={product.updatedAt} className="h-16 w-16 shrink-0 rounded-lg" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground truncate">{product.description}</p>
              <div className="flex flex-wrap gap-3 items-center mt-1 text-xs text-muted-foreground">
                <span className="font-bold text-primary">R$ {product.price.toFixed(2)}</span>
                <span>Estoque: {product.quantity}</span>
                <span>Peso: {product.weightKg.toFixed(1)} kg</span>
                <span>Volume: {product.volumeLiters.toFixed(1)} L</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => openEdit(product)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteTarget(product)}
                aria-label="Excluir produto"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O produto <strong>{deleteTarget?.name}</strong> será removido do seu catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLoading}
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="space-y-4">
              <p className="font-medium text-sm">{editProduct.name}</p>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome do produto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Descrição</Label>
                <Textarea
                  id="edit-desc"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Descrição do produto"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Nova foto do produto (opcional)</Label>
                <div className="flex gap-3 items-center">
                  <BoxImage
                    path={editImagePreview || editProduct.imageUrl || undefined}
                    alt={editProduct.name}
                    className="h-20 w-20 rounded-lg shrink-0"
                  />
                  <label className="flex flex-col items-center justify-center flex-1 min-h-[5rem] border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 bg-muted/30 px-2">
                    <ImagePlus className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-[11px] text-muted-foreground text-center">Trocar imagem</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditImageChange} />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Preço (R$)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-qty">Quantidade em estoque</Label>
                  <Input
                    id="edit-qty"
                    type="number"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weight">Peso (kg)</Label>
                  <Input
                    id="edit-weight"
                    type="number"
                    step="0.1"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-volume">Volume (L)</Label>
                <Input
                  id="edit-volume"
                  type="number"
                  step="0.1"
                  value={editVolume}
                  onChange={(e) => setEditVolume(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleEdit} className="gradient-primary text-primary-foreground" disabled={editSaving}>
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={() => { setShowCreate(false); resetCreateForm(); }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Imagem</Label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                {newImagePreview ? (
                  <img src={newImagePreview} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ImagePlus className="w-8 h-8 mb-1" />
                    <span className="text-xs">Clique para enviar</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome</Label>
              <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do produto" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-desc">Descrição</Label>
              <Textarea id="new-desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição do produto" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-price">Preço (R$)</Label>
                <Input id="new-price" type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-qty">Quantidade</Label>
                <Input id="new-qty" type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-weight">Peso (kg)</Label>
              <Input id="new-weight" type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-volume">Volume (L)</Label>
              <Input id="new-volume" type="number" step="0.1" value={newVolume} onChange={(e) => setNewVolume(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              className="gradient-primary text-primary-foreground"
              disabled={createSaving || !newName || !newPrice}
            >
              {createSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
