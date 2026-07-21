import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Mail,
  KeyRound,
  User as UserIcon,
  Eye,
  EyeOff,
  Radar,
  Zap,
  Flame,
  Loader2,
} from "lucide-react";
import { useStore } from "../lib/store";
import { Button, Input } from "../components/ui";
import { supabase } from "@/integrations/supabase/client";

const FEATURES = [
  { icon: Radar, text: "Monitoramento 24/7 de páginas e anunciantes" },
  { icon: Flame, text: "Detecção automática de criativos escalando" },
  { icon: Zap, text: "Alertas em tempo real quando algo muda" },
];

export function Auth() {
  const { toast } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) return setError("Informe um e-mail válido.");
    if (password.length < 4) return setError("Senha muito curta (mín. 4 caracteres).");
    setLoading(true);
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        toast("Bem-vindo de volta!", "success");
        navigate(next, { replace: true });
      } else {
        if (!name.trim()) return setError("Informe seu nome.");
        const { error: err, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (err) throw err;
        if (data.session) {
          toast("Conta criada!", "success");
          navigate(next, { replace: true });
        } else {
          toast("Verifique seu e-mail para confirmar a conta.", "info");
          setMode("login");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function oauth() {
    setGoogleLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}${next && next !== "/" ? next : "/"}` },
      });
      if (err) throw err;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro no Google";
      setError(msg);
      setGoogleLoading(false);
    }
  }

  async function forgot() {
    if (!email.includes("@")) return setError("Informe seu e-mail acima primeiro.");
    setError("");
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      toast(`Link de recuperação enviado para ${email}.`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar";
      setError(msg);
    }
  }

  return (
    <div className="flex min-h-screen bg-paper text-ink dark:bg-dpaper dark:text-dink">
      {/* painel esquerdo */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden border-r border-line p-10 lg:flex dark:border-dline">
        <div className="bg-grid pointer-events-none absolute inset-0 text-ink dark:text-dink" />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white dark:bg-brand-bright">
              <Radar size={17} />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Insane<span className="text-brand dark:text-brand-bright">Spy</span>
            </span>
          </div>
          <h1 className="mt-12 max-w-md text-3xl font-extrabold uppercase leading-tight tracking-tight">
            Veja o que seus concorrentes{" "}
            <span className="text-brand dark:text-brand-bright">estão escalando</span> antes de todo
            mundo.
          </h1>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li
                key={f.text}
                className="flex items-center gap-3 text-sm text-ink-2 dark:text-dink-2"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand text-brand dark:border-brand-bright dark:text-brand-bright">
                  <f.icon size={13} />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
          <div className="mt-12 flex gap-3">
            {[
              ["2,4k+", "bibliotecas monitoradas"],
              ["45min", "intervalo de coleta"],
              ["24/7", "vigilância contínua"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-lg border border-line px-4 py-3 dark:border-dline">
                <div className="text-lg font-extrabold tabular-nums text-brand dark:text-brand-bright">
                  {v}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-ink-3 dark:text-dink-3">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-[10px] font-bold uppercase tracking-[0.3em] text-ink-3 dark:text-dink-3">
          Inteligência competitiva de anúncios · BR
        </div>
      </div>

      {/* formulário */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="text-lg font-extrabold tracking-tight">
              Insane<span className="text-brand dark:text-brand-bright">Spy</span>
            </span>
          </div>

          <div className="mb-6 flex overflow-hidden border border-line dark:border-dline">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`h-10 flex-1 text-xs font-bold uppercase tracking-widest transition-colors ${
                  mode === m
                    ? "bg-brand text-white dark:bg-brand-bright"
                    : "text-ink-2 hover:text-brand dark:text-dink-2"
                }`}
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <h2 className="mb-5 text-lg font-extrabold tracking-tight">
            {mode === "login" ? "Acesse sua conta" : "Crie sua conta grátis"}
          </h2>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <UserIcon
                  size={14}
                  className="absolute right-3 top-[38px] text-ink-3 dark:text-dink-3"
                />
                <Input
                  label="Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
            )}
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-[38px] text-ink-3 hover:text-ink dark:text-dink-3"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <Input
                label="Senha"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="border border-red-500/50 bg-red-500/5 px-3 py-2 text-xs text-red-500">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 size={13} className="animate-spin" />}
              {mode === "login" ? "Entrar →" : "Criar conta →"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-ink-3 dark:text-dink-3">
            <span className="h-px flex-1 bg-line dark:bg-dline" /> ou{" "}
            <span className="h-px flex-1 bg-line dark:bg-dline" />
          </div>

          <Button variant="outline" className="w-full" onClick={oauth} disabled={googleLoading}>
            {googleLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.14.01-3.1 2.4-.04.13C3.8 21.3 7.6 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.2 14.4c-.25-.7-.4-1.5-.4-2.4s.15-1.6.4-2.4l-.01-.16-3.14-2.4-.1.05C1.3 8.6 1 10.2 1 12s.3 3.4.95 4.9l3.25-2.5z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.6c2.2 0 3.7 1 4.6 1.8l3.3-3.2C17.9 1.2 15.2 0 12 0 7.6 0 3.8 2.7 1.95 7l3.25 2.5c1-2.9 3.7-4.9 6.8-4.9z"
                />
              </svg>
            )}
            Entrar com Google
          </Button>

          {mode === "login" && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={forgot}
                className="text-xs text-ink-2 underline decoration-brand/50 underline-offset-4 hover:text-brand dark:text-dink-2 dark:hover:text-brand-bright"
              >
                <KeyRound size={11} className="mr-1 inline" />
                Esqueci minha senha
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to={next !== "/" ? `/?next=${encodeURIComponent(next)}` : "/"}
              className="text-[10px] uppercase tracking-widest text-ink-3 hover:text-brand dark:text-dink-3 dark:hover:text-brand-bright"
            >
              voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
