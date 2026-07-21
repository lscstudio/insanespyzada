import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { useStore } from "../lib/store";
import { Button, Input } from "../components/ui";
import { supabase } from "@/integrations/supabase/client";

export function ResetPassword() {
  const { toast } = useStore();
  const [params] = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return toast("Informe um e-mail válido.", "error");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast(`Link de recuperação enviado para ${email}.`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar";
      toast(`Erro: ${msg}`, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6 text-ink dark:bg-dpaper dark:text-dink">
      <div className="w-full max-w-sm border border-line bg-card p-6 dark:border-dline dark:bg-dcard">
        <h1 className="mb-5 text-xl font-extrabold uppercase tracking-tight">Recuperar senha</h1>

        {sent ? (
          <div className="space-y-4">
            <div className="border border-emerald-500/50 bg-emerald-500/5 px-3 py-3 text-xs leading-relaxed text-emerald-600 dark:text-emerald-400">
              Se existir uma conta para <b>{email}</b>, você receberá um link de redefinição em
              alguns minutos. Verifique também o spam.
            </div>
            <Link
              to={`/auth${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand hover:underline dark:text-brand-bright"
            >
              <ArrowLeft size={12} /> Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-xs leading-relaxed text-ink-2 dark:text-dink-2">
              Informe o e-mail da sua conta para receber o link de redefinição de senha.
            </p>
            <div className="relative">
              <Mail size={14} className="absolute right-3 top-[38px] text-ink-3 dark:text-dink-3" />
              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@dominio.com"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 size={13} className="animate-spin" />}
              Enviar link de recuperação
            </Button>
            <div className="text-center">
              <Link
                to={`/auth${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="text-xs text-ink-2 underline decoration-brand/50 underline-offset-4 hover:text-brand dark:text-dink-2"
              >
                <ArrowLeft size={11} className="mr-1 inline" /> Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
