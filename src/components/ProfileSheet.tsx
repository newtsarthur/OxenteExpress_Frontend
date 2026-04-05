import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { userApi, getAxiosErrorMessage, vehicleApi, buildVehicleFormData } from "@/lib/api";
import { mapApiUserToUser, type ApiUser } from "@/lib/authMap";
import type { Vehicle } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Loader2, ImagePlus, Trash2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveBoxPublicUrl, getBoxRelativePath } from "@/lib/storageUrl";
import { geocodeAddressToLatLon, formatCoordinates } from "@/lib/geocode";
import { toast } from "sonner";

export default function ProfileSheet() {
  const { user, updateLocalUser, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [addressGeocodeLoading, setAddressGeocodeLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [avatarCacheKey, setAvatarCacheKey] = useState<number>(() => Date.now());
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleEditing, setVehicleEditing] = useState(false);
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleVolume, setVehicleVolume] = useState("");
  const [vehicleWeight, setVehicleWeight] = useState("");
  const [vehicleImageFile, setVehicleImageFile] = useState<File | null>(null);
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone ?? "");
    setAddress(user.address ?? "");
    setCoordinates(user.coordinates ?? "");
    setNewPassword("");
    setAvatarFile(null);
    setPreview(user.avatarUrl || "");
    setAvatarCacheKey(Date.now());
    setVehicleEditing(false);
    setVehicleImageFile(null);
    if (user.role === "rider") {
      void loadVehicle();
    } else {
      setVehicle(null);
    }
  }, [open, user]);

  const avatarDisplaySrc = useMemo(() => {
    const t = preview.trim();
    if (!t) return undefined;
    if (t.startsWith("blob:")) return t;
    return resolveBoxPublicUrl(t, avatarCacheKey);
  }, [preview, avatarCacheKey]);

  const handleAddressBlur = async () => {
    const q = address.trim();
    if (q.length < 5) return;
    setAddressGeocodeLoading(true);
    try {
      const res = await geocodeAddressToLatLon(q);
      if (res) {
        setCoordinates(formatCoordinates(res.lat, res.lon));
        toast.success("Endereço localizado.");
      }
    } finally {
      setAddressGeocodeLoading(false);
    }
  };

  const loadVehicle = async () => {
    if (!user) return;
    setVehicleLoading(true);
    try {
      const { data } = await vehicleApi.getCurrent();
      setVehicle(data.vehicle as Vehicle);
      setVehicleModel(data.vehicle.model ?? "");
      setVehiclePlate(data.vehicle.plate ?? "");
      setVehicleColor(data.vehicle.color ?? "");
      setVehicleVolume(String(data.vehicle.volumeLiters ?? ""));
      setVehicleWeight(String(data.vehicle.weightMaxKg ?? ""));
      // vehicle preview image is not shown in this view, only saved to backend if uploaded
    } catch {
      setVehicle(null);
    } finally {
      setVehicleLoading(false);
    }
  };

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setAvatarFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleVehicleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setVehicleImageFile(f);
    }
  };

  const handleSaveVehicle = async () => {
    if (!user) return;
    if (!vehicleModel.trim() || !vehiclePlate.trim()) {
      toast.error("Modelo e placa são obrigatórios para o veículo.");
      return;
    }

    setVehicleSubmitting(true);
    try {
      const fd = buildVehicleFormData({
        model: vehicleModel.trim(),
        plate: vehiclePlate.trim(),
        color: vehicleColor.trim(),
        volumeLiters: Number(vehicleVolume) || 0,
        weightMaxKg: Number(vehicleWeight) || 0,
        image: vehicleImageFile,
      });

      if (vehicle) {
        await vehicleApi.update(fd);
      } else {
        await vehicleApi.create(user.id, fd);
      }

      toast.success("Veículo salvo com sucesso!");
      setVehicleEditing(false);
      await loadVehicle();
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Falha ao salvar o veículo."));
    } finally {
      setVehicleSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (name.trim()) fd.append("name", name.trim());
      if (email.trim()) fd.append("email", email.trim());
      if (phone.trim()) fd.append("phone", phone.trim());
      if (address.trim()) fd.append("address", address.trim());
      if (coordinates.trim()) fd.append("coordinates", coordinates.trim());
      if (newPassword.trim()) fd.append("password", newPassword.trim());
      if (avatarFile) fd.append("image", avatarFile);

      const { data } = await userApi.updateProfile(fd);
      const u = data.user as ApiUser & { coordinates?: string | null };
      const mapped = mapApiUserToUser({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        type: (u as ApiUser).type ?? user.userType,
        avatarUrl: u.avatarUrl ? `${u.avatarUrl}?t=${Date.now()}` : undefined,
        address: u.address,
        coordinates: u.coordinates ?? user.coordinates,
      });
      updateLocalUser(mapped);
      setAvatarCacheKey(Date.now());
      toast.success("Perfil atualizado!");
      setOpen(false);
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Erro ao atualizar perfil."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const avatarStoragePath = getBoxRelativePath(user.avatarUrl);
      await userApi.deleteAccount(user.id, avatarStoragePath ? { avatarStoragePath } : undefined);
      toast.success("Conta excluída com sucesso.");
      setDeleteDialogOpen(false);
      setOpen(false);
      logout();
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Não foi possível excluir a conta."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20 shrink-0" aria-label="Meu perfil">
          <User className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configurações da conta</SheetTitle>
        </SheetHeader>
        {!user ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="mt-6 space-y-4 pb-8">
            <div className="flex justify-center">
              <label className="relative cursor-pointer">
                <Avatar className="h-28 w-28 border-2 border-dashed border-border">
                  {avatarDisplaySrc ? <AvatarImage src={avatarDisplaySrc} alt="" className="object-cover" /> : null}
                  <AvatarFallback className="bg-muted">
                    <ImagePlus className="w-8 h-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </label>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Tipo: <strong>{user.userType}</strong>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting} />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => void handleAddressBlur()}
                disabled={submitting || addressGeocodeLoading}
                placeholder="Ao sair do campo, buscamos latitude e longitude automaticamente"
              />
            </div>
            <div className="space-y-2">
              <Label>Coordenadas (automático)</Label>
              <Input
                readOnly
                value={coordinates}
                className="font-mono text-xs bg-muted/50"
                placeholder={addressGeocodeLoading ? "Buscando…" : "Preenchido pelo endereço"}
                disabled={submitting}
              />
            </div>

            {user.role === "rider" && (
              <div className="rounded-2xl border border-border bg-muted/70 p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">Dados do veículo</p>
                    <p className="text-xs text-muted-foreground">Mostrados ao lojista e usados para confirmação.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVehicleEditing((prev) => !prev);
                      if (!vehicleEditing) {
                        setVehicleModel(vehicle?.model ?? "");
                        setVehiclePlate(vehicle?.plate ?? "");
                        setVehicleColor(vehicle?.color ?? "");
                        setVehicleVolume(String(vehicle?.volumeLiters ?? ""));
                        setVehicleWeight(String(vehicle?.weightMaxKg ?? ""));
                      }
                    }}
                    disabled={vehicleLoading}
                  >
                    {vehicle ? (vehicleEditing ? "Cancelar edição" : "Editar Veículo") : "Cadastrar veículo"}
                  </Button>
                </div>

                {vehicleLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <div className="space-y-4">
                    {vehicle ? (
                      <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                        <p className="text-sm font-medium">Veículo atual</p>
                        <div className="grid gap-2 text-sm text-muted-foreground">
                          <p>
                            <strong>Modelo:</strong> {vehicle.model}
                          </p>
                          <p>
                            <strong>Cor:</strong> {vehicle.color ?? "—"}
                          </p>
                          <p>
                            <strong>Placa:</strong> {vehicle.plate}
                          </p>
                          <p>
                            <strong>Capacidade:</strong> {vehicle.weightMaxKg ?? 0} kg · {vehicle.volumeLiters ?? 0} L
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                        Nenhum veículo cadastrado. Clique em "Cadastrar veículo" para adicionar sua moto.
                      </div>
                    )}

                    {vehicleEditing && (
                      <div className="grid gap-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Modelo da moto</Label>
                            <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} disabled={vehicleSubmitting} />
                          </div>
                          <div className="space-y-2">
                            <Label>Placa</Label>
                            <Input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} disabled={vehicleSubmitting} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Cor</Label>
                          <Input value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} disabled={vehicleSubmitting} />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Volume (L)</Label>
                            <Input value={vehicleVolume} onChange={(e) => setVehicleVolume(e.target.value)} disabled={vehicleSubmitting} />
                          </div>
                          <div className="space-y-2">
                            <Label>Peso Máximo (kg)</Label>
                            <Input value={vehicleWeight} onChange={(e) => setVehicleWeight(e.target.value)} disabled={vehicleSubmitting} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Imagem do veículo</Label>
                          <Input type="file" accept="image/*" onChange={handleVehicleImage} disabled={vehicleSubmitting} />
                        </div>

                        <Button className="w-full gradient-primary text-primary-foreground" onClick={() => void handleSaveVehicle()} disabled={vehicleSubmitting}>
                          {vehicleSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Veículo"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Nova senha (opcional)</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Deixe em branco para não alterar"
                disabled={submitting}
              />
            </div>
            <Button className="w-full gradient-primary text-primary-foreground" onClick={() => void handleSave()} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar alterações"}
            </Button>

            <Separator className="my-2" />

            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-destructive">Zona de perigo</p>
              <p className="text-xs text-muted-foreground">
                Excluir a conta remove seus dados de forma permanente. Esta ação não pode ser desfeita.
              </p>
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={submitting || deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir minha conta
              </Button>
            </div>
          </div>
        )}
      </SheetContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os seus dados serão apagados. Você perderá acesso ao Oxente Express imediatamente. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteAccount();
              }}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sim, excluir minha conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
