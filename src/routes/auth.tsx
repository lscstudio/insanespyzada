import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/lib/i18n";


export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar · InsaneSpy" }] }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

function AuthPage() {
  const t = useT();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: { email?: string; password?: string } = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path[0] as "email" | "password"] = i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("Bem-vindo de volta!"));
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success(t("Conta criada"), { description: t("Você já pode entrar.") });
        setMode("signin");
      }
    } catch (err) {
      toast.error(t("Não foi possível autenticar"), {
        description: err instanceof Error ? err.message : t("Erro desconhecido"),
      });
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(t("Não foi possível entrar com Google"), {
          description: result.error.message,
        });
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/" });
    } catch (err) {
      toast.error(t("Erro inesperado"), {
        description: err instanceof Error ? err.message : t("Erro desconhecido"),
      });
    } finally {
      setGoogleLoading(false);
    }
  }

  async function onForgot() {
    if (!email || !z.string().email().safeParse(email).success) {
      toast.error(t("Informe seu email acima primeiro"));
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(t("Email enviado"), {
        description: t("Verifique sua caixa de entrada para redefinir a senha."),
      });
    } catch (err) {
      toast.error(t("Não foi possível enviar o email"), {
        description: err instanceof Error ? err.message : t("Erro desconhecido"),
      });
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher variant="compact" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-primary/30 bg-primary/10 p-[2px]">
            <img src="/insanespy-logo.png" alt="InsaneSpy" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">InsaneSpy</h1>
            <p className="text-xs text-muted-foreground">{t("Você está sendo observado")}</p>
          </div>
        </div>

        <Card className="glass-card border-border/60 p-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t("Entrar")}</TabsTrigger>
              <TabsTrigger value="signup">{t("Criar conta")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            type="button"
            variant="outline"
            onClick={onGoogle}
            disabled={googleLoading}
            className="mt-4 w-full border-border/60"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.45c-.24 1.4-1.66 4.1-5.45 4.1-3.28 0-5.96-2.72-5.96-6.07S8.72 6.06 12 6.06c1.86 0 3.12.79 3.84 1.47l2.62-2.53C16.86 3.5 14.66 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12s4.26 9.5 9.5 9.5c5.48 0 9.12-3.85 9.12-9.27 0-.62-.07-1.1-.16-1.53H12z"
                />
              </svg>
            )}
            {t("Continuar com Google")}
          </Button>

          <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border/60" />
            {t("ou com email")}
            <span className="h-px flex-1 bg-border/60" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("Email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("Senha")}</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={onForgot}
                    disabled={forgotLoading}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {forgotLoading ? t("Enviando...") : t("Esqueci a senha")}
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("Mínimo 8 caracteres")}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-violet-cyan text-white shadow-lg shadow-primary/20"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? t("Entrar") : t("Criar conta")}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("O painel é privado. Apenas usuários autenticados acessam os dados.")}
        </p>
      </motion.div>
    </div>
  );
}
