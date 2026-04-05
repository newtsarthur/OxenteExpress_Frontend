import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Mail, Lock, ArrowRight } from "lucide-react";
import RegisterWizard from "@/components/auth/RegisterWizard";
import { getAxiosErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Bem-vindo de volta!");
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Não foi possível entrar."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-extrabold gradient-primary-text">OxenteExpress</h1>
          </div>
          <p className="text-muted-foreground text-sm">Entregas rápidas com jeitinho nordestino</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center">{isRegister ? "Criar conta" : "Entrar"}</CardTitle>
          </CardHeader>
          <CardContent>
            {isRegister ? (
              <RegisterWizard
                onDone={() => {
                  setIsRegister(false);
                }}
              />
            ) : (
              <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-10"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Entrar</>}
                </Button>
              </form>
            )}

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-sm text-secondary hover:underline"
              >
                {isRegister ? "Já tem conta? Entrar" : "Não tem conta? Cadastre-se"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
