import React, { useState } from "react";
import { UserRole } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, Bike, User, Mail, Lock, Phone, MapPin, ImagePlus, Car, Loader2, Check, X, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { vehicleApi, buildVehicleFormData, getAxiosErrorMessage } from "@/lib/api";
import { geocodeAddressToLatLon, formatCoordinates } from "@/lib/geocode";
import { toast } from "sonner";

const roles: { value: UserRole; label: string; apiLabel: string; icon: React.ElementType }[] = [
  { value: "customer", label: "Cliente", apiLabel: "USER", icon: User },
  { value: "store", label: "Loja", apiLabel: "STORE", icon: Store },
  { value: "rider", label: "Entregador", apiLabel: "RIDER", icon: Bike },
];

type Phase = "role" | "account";

type RegisterWizardMode = "full" | "vehicle-only";

interface RegisterWizardProps {
  onDone: () => void;
  /** `vehicle-only`: só o formulário do veículo (após cadastro RIDER + JWT). Default: fluxo completo. */
  mode?: RegisterWizardMode;
}

export default function RegisterWizard({ onDone, mode = "full" }: RegisterWizardProps) {
  const { registerAccount, user } = useAuth();
  const [phase, setPhase] = useState<Phase>("role");
  const [selectedRole, setSelectedRole] = useState<UserRole>("customer");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [volumeLiters, setVolumeLiters] = useState("50");
  const [weightMaxKg, setWeightMaxKg] = useState("20");
  const [vehicleImage, setVehicleImage] = useState<File | null>(null);

  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);

  const pwdRules = React.useMemo(() => {
    const p = password;
    return {
      minLen: p.length >= 8,
      upper: /[A-Z]/.test(p),
      number: /[0-9]/.test(p),
      special: /[^A-Za-z0-9]/.test(p),
    };
  }, [password]);

  const passwordValid = pwdRules.minLen && pwdRules.upper && pwdRules.number && pwdRules.special;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length <= 11) {
      setPhone(value);
    }
  };

  const handleVehiclePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Only letters and numbers, uppercase
    if (value.length <= 7) {
      setVehiclePlate(value);
    }
  };

  const handleAddressBlur = async () => {
    const q = address.trim();
    if (q.length < 5) return;
    setGeocodeLoading(true);
    try {
      const res = await geocodeAddressToLatLon(q);
      if (res) {
        if (res.formattedAddress) {
          setAddress(res.formattedAddress);
        }
        setCoordinates(formatCoordinates(res.lat, res.lon));
        toast.success("Endereço localizado e formatado.");
      } else {
        toast.message("Não foi possível obter localização para este endereço. Tente ser mais específico ou use o GPS.");
      }
    } finally {
      setGeocodeLoading(false);
    }
  };

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setAvatarFile(f);
      setAvatarPreview(URL.createObjectURL(f));
    }
  };

  const submitAccount = async () => {
    if (!name.trim() || name.length > 60) {
      toast.error("Nome é obrigatório e deve ter no máximo 60 caracteres.");
      return;
    }
    if (!phone.trim() || phone.length !== 11) {
      toast.error("Telefone deve ter exatamente 11 dígitos numéricos.");
      return;
    }
    if (!passwordValid) {
      toast.error("A senha não atende aos requisitos de segurança.");
      return;
    }
    if (!passwordsMatch) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (selectedRole === "store" && !address.trim()) {
      toast.error("Lojas devem informar o endereço fixo.");
      return;
    }
    setAccountSubmitting(true);
    try {
      await registerAccount({
        name,
        email,
        password,
        phone: phone.trim(),
        role: selectedRole,
        address: address.trim() || undefined,
        coordinates: coordinates.trim() || undefined,
        avatarFile,
      });
      if (selectedRole === "rider") {
        toast.success("Conta criada! Falta apenas cadastrar seu veículo.", {
          description: "Redirecionando para a última etapa…",
        });
      } else {
        toast.success("Conta criada com sucesso!");
        onDone();
      }
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Falha no cadastro."));
    } finally {
      setAccountSubmitting(false);
    }
  };

  const submitVehicle = async () => {
    const uid = user?.id;
    if (!uid) {
      toast.error("Sessão inválida. Entre novamente.");
      return;
    }
    if (!vehicleModel.trim() || !vehiclePlate.trim()) {
      toast.error("Modelo e placa são obrigatórios.");
      return;
    }
    if (vehiclePlate.length !== 7) {
      toast.error("Placa deve ter exatamente 7 caracteres.");
      return;
    }
    const vol = parseFloat(volumeLiters);
    const w = parseFloat(weightMaxKg);
    if (Number.isNaN(vol) || Number.isNaN(w) || vol <= 0 || w <= 0) {
      toast.error("Informe capacidade de volume (L) e peso (kg) válidos.");
      return;
    }
    setVehicleSubmitting(true);
    try {
      const fd = buildVehicleFormData({
        model: vehicleModel.trim(),
        plate: vehiclePlate.trim(),
        color: vehicleColor.trim(),
        volumeLiters: vol,
        weightMaxKg: w,
        image: vehicleImage,
      });
      await vehicleApi.create(uid, fd);
      toast.success("Veículo cadastrado! Bem-vindo ao Oxente Express.");
      onDone();
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Não foi possível cadastrar o veículo."));
    } finally {
      setVehicleSubmitting(false);
    }
  };

  if (mode === "vehicle-only") {
    return (
      <div className="space-y-4 animate-slide-up">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
          <div className="flex justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <p className="font-semibold text-foreground">Falta apenas um passo: seu veículo</p>
          <p className="text-sm text-muted-foreground">
            Complete o cadastro para começar a aceitar entregas. Suas credenciais já estão ativas.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Car className="w-4 h-4" />
          Cadastro do veículo
        </div>
        <div className="space-y-2">
          <Label>Modelo</Label>
          <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Ex: Honda CG 160" />
        </div>
        <div className="space-y-2">
          <Label>Placa</Label>
          <Input value={vehiclePlate} onChange={handleVehiclePlateChange} maxLength={7} placeholder="ABC1D23" />
        </div>
        <div className="space-y-2">
          <Label>Cor</Label>
          <Input value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} placeholder="Ex: Vermelha" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Capacidade volume (L)</Label>
            <Input type="number" min={1} step={1} value={volumeLiters} onChange={(e) => setVolumeLiters(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Capacidade peso (kg)</Label>
            <Input type="number" min={1} step={1} value={weightMaxKg} onChange={(e) => setWeightMaxKg(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Foto do veículo (opcional)</Label>
          <Input type="file" accept="image/*" onChange={(e) => setVehicleImage(e.target.files?.[0] ?? null)} />
        </div>
        <Button
          type="button"
          className="w-full gradient-primary text-primary-foreground"
          disabled={vehicleSubmitting}
          onClick={() => void submitVehicle()}
        >
          {vehicleSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Concluir e entrar no app"}
        </Button>
      </div>
    );
  }

  if (phase === "role") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">Escolha o tipo de conta</p>
        <div className="grid grid-cols-3 gap-4">
          {roles.map((r) => {
            const Icon = r.icon;
            const active = selectedRole === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelectedRole(r.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-sm font-medium ${
                  active ? "border-primary bg-primary/10 text-primary shadow-md" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:shadow-sm"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
        <Button type="button" className="w-full gradient-primary text-primary-foreground" onClick={() => setPhase("account")}>
          Continuar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setPhase("role")}>
          ← Tipo de conta
        </Button>
        <span className="text-xs text-muted-foreground">
          {roles.find((r) => r.value === selectedRole)?.label}
        </span>
      </div>

      {selectedRole === "rider" && (
        <div className="rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-2 text-xs text-secondary-foreground leading-relaxed">
          <strong className="text-secondary">Entregador:</strong> após criar a conta, você cadastra o veículo em uma última tela — só então entra no app.
        </div>
      )}

      {accountSubmitting ? (
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground text-center">Criando conta e processando dados…</p>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="reg-name">Nome</Label>
            <Input id="reg-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} maxLength={60} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-phone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="reg-phone" className="pl-10" value={phone} onChange={handlePhoneChange} maxLength={11} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="reg-email" type="email" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="reg-password" type="password" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <ul className="text-[11px] space-y-1 text-muted-foreground">
              {[
                { ok: pwdRules.minLen, label: "Mínimo de 8 caracteres" },
                { ok: pwdRules.upper, label: "Uma letra maiúscula" },
                { ok: pwdRules.number, label: "Um número" },
                { ok: pwdRules.special, label: "Um caractere especial" },
              ].map((r) => (
                <li key={r.label} className="flex items-center gap-1.5">
                  {r.ok ? <Check className="w-3.5 h-3.5 text-success shrink-0" /> : <X className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />}
                  <span className={r.ok ? "text-foreground" : ""}>{r.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-confirm-password">Confirmar senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="reg-confirm-password"
                type="password"
                className="pl-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-[11px] text-destructive">As senhas não coincidem.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-address">Endereço {selectedRole === "store" ? "(obrigatório)" : "(opcional)"}</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="reg-address"
                className="pl-10"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => void handleAddressBlur()}
                placeholder="Rua, número, bairro, cidade…"
                required={selectedRole === "store"}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Ao sair do campo, buscamos automaticamente a localização (OpenStreetMap).</p>
          </div>

          <div className="space-y-2">
            <Label>Localização</Label>
            <p className="text-xs text-muted-foreground">Ao sair do campo, o endereço é padronizado e usado para calcular distâncias.</p>
          </div>

          <div className="space-y-2">
            <Label>Foto de perfil (opcional)</Label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 bg-muted/30">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="h-full max-h-24 object-contain rounded" />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground text-xs py-4">
                  <ImagePlus className="w-8 h-8 mb-1" />
                  Enviar imagem
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </label>
          </div>

          <Button
            type="button"
            className="w-full gradient-primary text-primary-foreground"
            disabled={accountSubmitting || !passwordValid || !passwordsMatch}
            onClick={() => void submitAccount()}
          >
            {selectedRole === "rider" ? "Criar conta e ir para o veículo" : "Criar conta"}
          </Button>
        </>
      )}
    </div>
  );
}
