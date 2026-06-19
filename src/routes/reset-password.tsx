import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir senha · InsaneSpy" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const t = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setReady(true);
    } else {
      supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t("A senha deve ter pelo menos 8 caracteres"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("Senhas não coincidem"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("Senha atualizada"), { description: t("Você já pode entrar.") });
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(t("Não foi possível atualizar a senha"), {
        description: err instanceof Error ? err.message : t("Erro desconhecido"),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-violet-cyan shadow-lg">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold">{t("Redefinir senha")}</h1>
        </div>

        <Card className="glass-card border-border/60 p-6">
          {!ready ? (
            <p className="text-sm text-muted-foreground">
              {t("Link inválido ou expirado. Solicite uma nova redefinição na tela de login.")}
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t("Nova senha")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("Mínimo 8 caracteres")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{t("Confirmar senha")}</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full gradient-violet-cyan text-white shadow-lg shadow-primary/20"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("Salvar nova senha")}
              </Button>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
