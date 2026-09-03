"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock, Mail, ShieldCheck, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { destinoPosLoginSeguro } from "@/lib/safe-navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const next = destinoPosLoginSeguro(searchParams.get("next"));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.signIn.email(
      { email, password },
      { onRequest: () => {} },
    );
    setLoading(false);
    if (error) {
      toast.error("Falha na autenticação", {
        description: error.message ?? "E-mail ou senha incorretos.",
      });
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md border-border/70 bg-card/95 shadow-xl backdrop-blur-md">
      <CardHeader className="space-y-3 text-center pb-4">
        {/* Logo Oficial Trilink com Tag Syspro ERP */}
        <div className="flex flex-col items-center justify-center gap-2">
          <img
            src="/logo-escura.png"
            alt="Trilink Software"
            className="h-9 w-auto block dark:hidden object-contain"
          />
          <img
            src="/logo-clara.png"
            alt="Trilink Software"
            className="h-9 w-auto hidden dark:block object-contain"
          />
          <Badge
            variant="outline"
            className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 bg-primary/10 border-primary/30 text-primary"
          >
            Syspro ERP
          </Badge>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-xl font-extrabold tracking-tight text-foreground">
            Portal de Inteligência Comercial
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Acesse para consultar as vendas e relatórios executivos
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">
              E-mail Corporativo
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com.br"
                className="pl-9 text-xs"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold">
                Senha de Acesso
              </Label>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 text-xs"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full text-xs font-bold gap-2 shadow-sm shadow-primary/20 cursor-pointer"
            disabled={loading}
          >
            <span>{loading ? "Autenticando..." : "Entrar no Sistema"}</span>
            {!loading && <ArrowRight className="size-4" />}
          </Button>
        </form>

        <div className="border-t border-border/50 pt-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>Acesso restrito e monitorado via Syspro ERP</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      {/* Botão de tema no canto superior */}
      <div className="absolute top-4 right-4">
        <ThemeToggle variant="switch" />
      </div>

      <Suspense
        fallback={
          <Card className="w-full max-w-md border-border/70 p-8 text-center text-xs text-muted-foreground">
            Carregando portal de acesso...
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
