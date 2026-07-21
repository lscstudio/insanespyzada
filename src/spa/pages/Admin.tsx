import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Shield,
  Users,
  KeyRound,
  BookOpen,
  Trash2,
  Plus,
  RefreshCw,
  Loader2,
  Flame,
  Eye,
  EyeOff,
  Check,
  X,
  Download,
  Database,
  Activity,
  Ban,
} from "lucide-react";
import { useStore } from "../lib/store";
import { callAdmin, useAdminCheck } from "../lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { num, dateBR, timeAgo } from "../lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  SectionTitle,
  Stat,
  Toggle,
} from "../components/ui";
import { PremiumLineChart } from "../components/PremiumLineChart";

type Tab = "painel" | "contas" | "membros" | "keys" | "nichos";

export function Admin() {
  const { isAdmin, loading } = useAdminCheck();
  const [tab, setTab] = useState<Tab>("painel");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-ink-2 dark:text-dink-2">
        <Loader2 size={18} className="animate-spin" />{" "}
        <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.3em]">
          verificando acesso…
        </span>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <Shield size={28} className="mx-auto text-red-500" />
        <h1 className="mt-3 text-lg font-extrabold uppercase tracking-tight">Acesso restrito</h1>
        <p className="mt-2 text-xs text-ink-2 dark:text-dink-2">
          Esta área é exclusiva do administrador. Se você é o dono, entre com a conta principal.
        </p>
      </Card>
    );
  }

  const TABS: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: "painel", label: "Painel", icon: Activity },
    { id: "contas", label: "Contas & bibliotecas", icon: Users },
    { id: "membros", label: "Membros", icon: Shield },
    { id: "keys", label: "API keys", icon: KeyRound },
    { id: "nichos", label: "Nichos", icon: BookOpen },
  ];

  return (
    <div className="space-y-6" data-page-fade>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand dark:text-brand-bright">
          Área administrativa
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold uppercase tracking-tight">
          <Shield size={22} className="text-brand dark:text-brand-bright" /> Admin
        </h1>
      </div>

      <div className="flex flex-wrap overflow-x-auto border-b border-line dark:border-dline">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              tab === t.id
                ? "border-b-2 border-brand text-brand dark:border-brand-bright dark:text-brand-bright"
                : "border-b-2 border-transparent text-ink-2 hover:text-ink dark:text-dink-2 dark:hover:text-dink"
            }`}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      <div data-tab-fade key={tab}>
        {tab === "painel" && <PainelTab />}
        {tab === "contas" && <ContasTab />}
        {tab === "membros" && <MembrosTab />}
        {tab === "keys" && <KeysTab />}
        {tab === "nichos" && <NichosTab />}
      </div>
    </div>
  );
}

/* ======================================================
 * PAINEL — KPIs + ranking + série diária
 * ====================================================== */
interface UsageRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  libraries_count: number;
  scrapes_30d: number;
  scrapes_ok_30d: number;
  credits_used_30d: number;
}

interface UsageData {
  accounts: UsageRow[];
  series: { day: string; count: number }[];
  totals: {
    total_accounts: number;
    total_libraries: number;
    total_scrapes_30d: number;
    total_credits_used_30d: number;
  };
}

function PainelTab() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const d = await callAdmin<UsageData>("getUsageRanking");
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  if (loading && !data) {
    return <LoadingStripe />;
  }
  if (!data) {
    return <Card className="p-6 text-sm text-ink-2 dark:text-dink-2">Falha ao carregar.</Card>;
  }

  const series = data.series.map((s) => ({
    t: s.day,
    activeAds: s.count,
    uniqueCreatives: 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Contas" value={num(data.totals.total_accounts)} sub="usuários cadastrados" />
        <Stat label="Bibliotecas" value={num(data.totals.total_libraries)} sub="total no sistema" />
        <Stat
          label="Coletas (30d)"
          value={num(data.totals.total_scrapes_30d)}
          sub="snapshots executados"
        />
        <Stat
          label="Créditos usados (30d)"
          value={num(data.totals.total_credits_used_30d)}
          sub="≈ Firecrawl/ScraperAPI"
          accent
        />
      </div>

      <PremiumLineChart
        data={series}
        labelFormat="day"
        title="Coletas por dia"
        subtitle="Últimos 30 dias · atividade consolidada do sistema"
        height={280}
      />

      <Card className="p-6">
        <SectionTitle kicker="ranking" title="Top usuários por créditos consumidos" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[9px] uppercase tracking-[0.25em] text-ink-3 dark:border-dline dark:text-dink-3">
                <th className="pb-2 pr-3 font-bold">Email</th>
                <th className="pb-2 pr-3 font-bold text-right">Bibliotecas</th>
                <th className="pb-2 pr-3 font-bold text-right">Coletas</th>
                <th className="pb-2 pr-3 font-bold text-right">Créditos</th>
                <th className="pb-2 font-bold">Last login</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.slice(0, 15).map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-line/60 last:border-0 dark:border-dline/60"
                >
                  <td className="py-2.5 pr-3 font-bold">{a.email}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{num(a.libraries_count)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{num(a.scrapes_30d)}</td>
                  <td className="py-2.5 pr-3 text-right font-extrabold tabular-nums text-brand dark:text-brand-bright">
                    {num(a.credits_used_30d)}
                  </td>
                  <td className="py-2.5 text-ink-2 dark:text-dink-2">
                    {a.last_sign_in_at ? timeAgo(a.last_sign_in_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ======================================================
 * CONTAS — lista de contas + bibliotecas por conta
 * ====================================================== */
interface AccountRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  libraries_count: number;
}

interface LibRow {
  id: string;
  page_name: string | null;
  search_term: string | null;
  niche: string | null;
  status: string | null;
  url: string;
  created_at: string;
  active_ads_count: number;
  last_captured_at: string | null;
}

function ContasTab() {
  const { toast } = useStore();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [libs, setLibs] = useState<LibRow[]>([]);
  const [libsLoading, setLibsLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const d = await callAdmin<AccountRow[]>("listAccounts");
      setAccounts(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const openAccount = useCallback(async (id: string) => {
    setSelected(id);
    setLibsLoading(true);
    try {
      const d = await callAdmin<LibRow[]>("listLibrariesForAccount", { userId: id });
      setLibs(d);
    } catch (err) {
      console.error(err);
      setLibs([]);
    } finally {
      setLibsLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return accounts;
    const q = query.toLowerCase();
    return accounts.filter((a) => a.email.toLowerCase().includes(q));
  }, [accounts, query]);

  const seedDemo = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      await callAdmin("seedDemoData", { userId });
      toast("3 bibliotecas demo criadas para você.", "success");
      void fetchAccounts();
    } catch (err) {
      toast(err instanceof Error ? err.message : "falha", "error");
    }
  }, [toast, fetchAccounts]);

  if (loading) return <LoadingStripe />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          label=""
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="filtrar por email…"
          className="h-9 max-w-xs font-mono text-xs"
        />
        <Button variant="outline" onClick={() => void fetchAccounts()}>
          <RefreshCw size={12} /> Atualizar
        </Button>
        <div className="flex-1" />
        <Button onClick={() => void seedDemo()}>
          <Plus size={12} /> Popular demo em mim
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[9px] uppercase tracking-[0.25em] text-ink-3 dark:border-dline dark:text-dink-3">
                <th className="px-3 py-2 font-bold">Email</th>
                <th className="px-3 py-2 font-bold text-right">Bibliotecas</th>
                <th className="px-3 py-2 font-bold">Criada</th>
                <th className="px-3 py-2 font-bold">Last login</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-line/60 last:border-0 hover:bg-brand-ghost dark:border-dline/60"
                >
                  <td className="px-3 py-2.5 font-bold">{a.email}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{num(a.libraries_count)}</td>
                  <td className="px-3 py-2.5 text-ink-2 dark:text-dink-2">
                    {dateBR(a.created_at)}
                  </td>
                  <td className="px-3 py-2.5 text-ink-2 dark:text-dink-2">
                    {a.last_sign_in_at ? timeAgo(a.last_sign_in_at) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button variant="ghost" onClick={() => void openAccount(a.id)}>
                      <Eye size={11} /> ver
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-ink-3 dark:text-dink-3">
                    Nenhuma conta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Bibliotecas da conta" wide>
        {libsLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto animate-spin" size={18} />
          </div>
        ) : libs.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-3 dark:text-dink-3">
            Esta conta não tem bibliotecas.
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {libs.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 border border-line px-3 py-2 dark:border-dline"
              >
                <div className="min-w-0">
                  <div className="truncate font-bold">{l.page_name || l.search_term || "—"}</div>
                  <div className="truncate text-[10px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                    {l.niche ?? "—"} · {l.status} · {dateBR(l.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold tabular-nums">{num(l.active_ads_count)}</div>
                  <div className="text-[10px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                    {l.last_captured_at ? timeAgo(l.last_captured_at) : "—"}
                  </div>
                </div>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-7 w-7 items-center justify-center border border-line text-ink-2 dark:border-dline dark:text-dink-2"
                >
                  <Download size={11} />
                </a>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ======================================================
 * MEMBROS — admin role, ban, limit
 * ====================================================== */
interface MemberRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  is_owner: boolean;
  is_banned: boolean;
  library_limit: number | null;
  libraries_count: number;
}

function MembrosTab() {
  const { toast } = useStore();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [limitModal, setLimitModal] = useState<MemberRow | null>(null);
  const [limitVal, setLimitVal] = useState<string>("");
  const [confirmBan, setConfirmBan] = useState<MemberRow | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const d = await callAdmin<MemberRow[]>("listMembers");
      setMembers(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const toggleAdmin = useCallback(
    async (m: MemberRow) => {
      try {
        await callAdmin("setAdminRole", { userId: m.id, makeAdmin: !m.is_admin });
        toast(m.is_admin ? "Admin removido." : "Admin promovido.", "success");
        void fetch();
      } catch (err) {
        toast(err instanceof Error ? err.message : "falha", "error");
      }
    },
    [fetch, toast],
  );

  const ban = useCallback(
    async (m: MemberRow) => {
      try {
        await callAdmin("banMember", { userId: m.id, confirm: true });
        toast("Membro banido.", "info");
        setConfirmBan(null);
        void fetch();
      } catch (err) {
        toast(err instanceof Error ? err.message : "falha", "error");
      }
    },
    [fetch, toast],
  );

  const unban = useCallback(
    async (m: MemberRow) => {
      try {
        await callAdmin("unbanMember", { userId: m.id });
        toast("Membro desbanido.", "success");
        void fetch();
      } catch (err) {
        toast(err instanceof Error ? err.message : "falha", "error");
      }
    },
    [fetch, toast],
  );

  const saveLimit = useCallback(async () => {
    if (!limitModal) return;
    const n = limitVal.trim() === "" ? null : Number(limitVal);
    if (n !== null && (Number.isNaN(n) || n < 0)) return toast("Limite inválido.", "error");
    try {
      await callAdmin("setLibraryLimit", { userId: limitModal.id, limit: n });
      toast("Limite salvo.", "success");
      setLimitModal(null);
      setLimitVal("");
      void fetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : "falha", "error");
    }
  }, [limitModal, limitVal, fetch, toast]);

  if (loading) return <LoadingStripe />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => void fetch()}>
          <RefreshCw size={12} /> Atualizar
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[9px] uppercase tracking-[0.25em] text-ink-3 dark:border-dline dark:text-dink-3">
                <th className="px-3 py-2 font-bold">Email</th>
                <th className="px-3 py-2 font-bold">Role</th>
                <th className="px-3 py-2 font-bold text-right">Bibs</th>
                <th className="px-3 py-2 font-bold">Limite</th>
                <th className="px-3 py-2 font-bold">Status</th>
                <th className="px-3 py-2 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-line/60 last:border-0 hover:bg-brand-ghost dark:border-dline/60"
                >
                  <td className="px-3 py-2.5 font-bold">{m.email}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={m.is_admin ? "brand" : "neutral"}>
                      {m.is_owner ? "owner" : m.is_admin ? "admin" : "user"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{num(m.libraries_count)}</td>
                  <td className="px-3 py-2.5 text-ink-2 dark:text-dink-2">
                    {m.library_limit === null ? "∞" : num(m.library_limit)}
                  </td>
                  <td className="px-3 py-2.5">
                    {m.is_banned ? (
                      <Badge tone="danger">
                        <Ban size={10} /> banido
                      </Badge>
                    ) : (
                      <Badge tone="success">ativo</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => void toggleAdmin(m)}
                        disabled={m.is_owner}
                        title={m.is_owner ? "Dono é sempre admin" : undefined}
                      >
                        {m.is_admin ? "remover admin" : "promover admin"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setLimitModal(m);
                          setLimitVal(m.library_limit === null ? "" : String(m.library_limit));
                        }}
                      >
                        limite
                      </Button>
                      {m.is_banned ? (
                        <Button variant="ghost" onClick={() => void unban(m)} disabled={m.is_owner}>
                          desbanir
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          onClick={() => setConfirmBan(m)}
                          disabled={m.is_owner}
                        >
                          <Ban size={11} /> banir
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!limitModal} onClose={() => setLimitModal(null)} title="Limite de bibliotecas">
        <div className="space-y-3">
          <p className="text-xs text-ink-2 dark:text-dink-2">
            Defina um teto de bibliotecas para <b>{limitModal?.email}</b>. Vazio = ilimitado.
          </p>
          <Input
            label=""
            type="number"
            value={limitVal}
            onChange={(e) => setLimitVal(e.target.value)}
            placeholder="∞ — ilimitado"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setLimitModal(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveLimit()}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmBan} onClose={() => setConfirmBan(null)} title="Banir membro">
        <div className="space-y-3">
          <p className="text-xs text-ink-2 dark:text-dink-2">
            Banir <b>{confirmBan?.email}</b>? Ele não poderá mais logar (~100 anos). Reversível.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmBan(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => confirmBan && void ban(confirmBan)}>
              <Ban size={11} /> Banir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ======================================================
 * KEYS — API pool (Firecrawl/ScraperAPI)
 * ====================================================== */
interface PoolStatus {
  keys: {
    provider: "firecrawl" | "scraperapi";
    name: string;
    label: string;
    configured: boolean;
    working: boolean;
    credits: number | null;
    limit: number | null;
    used: number | null;
    error: string | null;
    latency_ms: number | null;
    source: "env" | "db";
    id?: string | null;
  }[];
  summary: {
    total_slots: number;
    configured: number;
    working: number;
    broken: number;
    total_credits: number;
    firecrawl_credits: number;
    scraperapi_credits: number;
  };
}

function KeysTab() {
  const { toast } = useStore();
  const [pool, setPool] = useState<PoolStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [provider, setProvider] = useState<"firecrawl" | "scraperapi">("firecrawl");
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const d = await callAdmin<PoolStatus>("getApiPoolStatus");
      setPool(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const add = useCallback(async () => {
    setSaving(true);
    try {
      await callAdmin("addApiKey", { provider, label, key });
      toast("Chave adicionada.", "success");
      setAddOpen(false);
      setLabel("");
      setKey("");
      void fetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : "falha", "error");
    } finally {
      setSaving(false);
    }
  }, [provider, label, key, fetch, toast]);

  const toggle = useCallback(
    async (id: string, active: boolean) => {
      try {
        await callAdmin("toggleApiKey", { id, active: !active });
        void fetch();
      } catch (err) {
        toast(err instanceof Error ? err.message : "falha", "error");
      }
    },
    [fetch, toast],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!confirm("Excluir esta chave?")) return;
      try {
        await callAdmin("deleteApiKey", { id });
        toast("Chave excluída.", "info");
        void fetch();
      } catch (err) {
        toast(err instanceof Error ? err.message : "falha", "error");
      }
    },
    [fetch, toast],
  );

  if (loading && !pool) return <LoadingStripe />;
  if (!pool) return <Card className="p-6 text-sm">Falha ao carregar.</Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand dark:text-brand-bright">
            Scraper pool
          </div>
          <p className="mt-1 text-xs text-ink-2 dark:text-dink-2">
            Firecrawl + ScraperAPI — round robin entre as chaves ativas. Créditos verificados ao
            vivo.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={12} /> Adicionar chave
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          label="Chaves"
          value={num(pool.summary.total_slots)}
          sub={`${pool.summary.configured} configuradas`}
        />
        <Stat
          label="Funcionando"
          value={num(pool.summary.working)}
          sub={`${pool.summary.broken} com erro`}
          accent={pool.summary.working > 0}
        />
        <Stat
          label="Firecrawl (créditos)"
          value={num(pool.summary.firecrawl_credits)}
          sub="credit-usage API"
        />
        <Stat
          label="ScraperAPI (créditos)"
          value={num(pool.summary.scraperapi_credits)}
          sub="limite - usado"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {pool.keys.map((k) => (
          <Card
            key={k.id ?? k.name}
            className={`flex flex-col gap-3 p-4 ${!k.working && k.configured ? "border-red-500/40" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={k.provider === "firecrawl" ? "brand" : "neutral"}>
                    {k.provider}
                  </Badge>
                  <span className="text-sm font-extrabold uppercase tracking-tight">{k.label}</span>
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                  {k.source === "db" ? "banco" : "env"} · {k.name}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {k.working ? (
                  <Badge tone="success">
                    <Check size={10} /> operando
                  </Badge>
                ) : k.configured ? (
                  <Badge tone={k.error === "desativada" ? "neutral" : "danger"}>
                    <X size={10} /> {k.error === "desativada" ? "inativa" : "falha"}
                  </Badge>
                ) : (
                  <Badge tone="neutral">não configurada</Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px border border-line bg-line text-center dark:border-dline dark:bg-dline">
              <div className="bg-card px-2 py-2 dark:bg-dcard">
                <div className="text-[9px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                  créditos
                </div>
                <div className="font-extrabold tabular-nums">{k.credits ?? "—"}</div>
              </div>
              <div className="bg-card px-2 py-2 dark:bg-dcard">
                <div className="text-[9px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                  usados
                </div>
                <div className="font-extrabold tabular-nums">{k.used ?? "—"}</div>
              </div>
              <div className="bg-card px-2 py-2 dark:bg-dcard">
                <div className="text-[9px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                  latência
                </div>
                <div className="font-extrabold tabular-nums">
                  {k.latency_ms ? `${k.latency_ms}ms` : "—"}
                </div>
              </div>
            </div>
            {k.error && k.error !== "desativada" && (
              <div className="border border-red-500/40 bg-red-500/5 px-2 py-1 text-[11px] text-red-500">
                {k.error}
              </div>
            )}
            {k.id && (
              <div className="flex items-center justify-end gap-2 border-t border-line pt-2 dark:border-dline">
                <Button variant="ghost" onClick={() => void toggle(k.id!, k.working)}>
                  {k.working ? "desativar" : "ativar"}
                </Button>
                <Button variant="danger" onClick={() => void remove(k.id!)}>
                  <Trash2 size={11} /> excluir
                </Button>
              </div>
            )}
          </Card>
        ))}
        {pool.keys.length === 0 && (
          <EmptyState
            title="Nenhuma chave configurada"
            body="Adicione pelo menos uma chave Firecrawl ou ScraperAPI para iniciar as coletas."
            action={<Button onClick={() => setAddOpen(true)}>Adicionar chave</Button>}
          />
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Adicionar API key">
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-2 dark:text-dink-2">
              Provider
            </div>
            <Toggle
              checked={provider === "scraperapi"}
              onChange={(v) => setProvider(v ? "scraperapi" : "firecrawl")}
              labels={["Firecrawl", "ScraperAPI"]}
            />
          </div>
          <Input
            label="Rótulo (ex: Firecrawl principal)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Input
            label="Chave da API"
            type={showKey ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={provider === "firecrawl" ? "fc-..." : "..."}
          />
          <label className="flex items-center gap-2 text-[11px] text-ink-2 dark:text-dink-2">
            <input
              type="checkbox"
              checked={showKey}
              onChange={(e) => setShowKey(e.target.checked)}
            />
            mostrar chave
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void add()} disabled={saving || !label.trim() || !key.trim()}>
              {saving && <Loader2 size={13} className="animate-spin" />} Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ======================================================
 * NICHOS — CRUD (admins only)
 * ====================================================== */
interface NicheRow {
  id: string;
  name: string;
}

function NichosTab() {
  const { toast } = useStore();
  const [niches, setNiches] = useState<NicheRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("niches")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      setNiches((data ?? []) as NicheRow[]);
    } catch (err) {
      toast(err instanceof Error ? err.message : "falha", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const add = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const { error } = await supabase.from("niches").insert({ name } as never);
      if (error) throw error;
      setNewName("");
      void fetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : "falha", "error");
    }
  }, [newName, fetch, toast]);

  const remove = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Excluir nicho "${name}"?`)) return;
      try {
        const { error } = await supabase.from("niches").delete().eq("id", id);
        if (error) throw error;
        void fetch();
      } catch (err) {
        toast(err instanceof Error ? err.message : "falha", "error");
      }
    },
    [fetch, toast],
  );

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return;
    try {
      const { error } = await supabase
        .from("niches")
        .update({ name } as never)
        .eq("id", editing.id);
      if (error) throw error;
      setEditing(null);
      void fetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : "falha", "error");
    }
  }, [editing, fetch, toast]);

  if (loading) return <LoadingStripe />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand dark:text-brand-bright">
            Catálogo global
          </div>
          <p className="mt-1 text-xs text-ink-2 dark:text-dink-2">
            Nichos disponíveis em todo o sistema. Aparecem como sugestão ao cadastrar bibliotecas.
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Novo nicho…"
            className="h-9 flex-1 border border-line bg-card px-3 font-mono text-sm outline-none focus:border-brand dark:border-dline dark:bg-dcard dark:focus:border-brand-bright"
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
          />
          <Button onClick={() => void add()}>
            <Plus size={12} /> Adicionar
          </Button>
        </div>
      </Card>

      <div className="grid gap-2 md:grid-cols-3">
        {niches.map((n) => (
          <Card key={n.id} className="flex items-center justify-between gap-2 p-3">
            {editing?.id === n.id ? (
              <>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="h-8 flex-1 border border-line bg-card px-2 font-mono text-xs outline-none focus:border-brand dark:border-dline dark:bg-dcard dark:focus:border-brand-bright"
                  autoFocus
                />
                <Button variant="ghost" onClick={() => void saveEdit()}>
                  <Check size={11} />
                </Button>
                <Button variant="ghost" onClick={() => setEditing(null)}>
                  <X size={11} />
                </Button>
              </>
            ) : (
              <>
                <span className="font-bold uppercase tracking-wide">{n.name}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" onClick={() => setEditing({ id: n.id, name: n.name })}>
                    editar
                  </Button>
                  <Button variant="danger" onClick={() => void remove(n.id, n.name)}>
                    <Trash2 size={11} />
                  </Button>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ======================================================
 * helpers
 * ====================================================== */
function LoadingStripe(): ReactNode {
  return (
    <div className="flex items-center justify-center py-12 text-ink-2 dark:text-dink-2">
      <Loader2 size={18} className="animate-spin" />
      <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.3em]">carregando…</span>
    </div>
  );
}
