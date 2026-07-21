import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppNotification,
  Creative,
  Library,
  PaymentIntent,
  PlanId,
  SessionUser,
  Snapshot,
  SwipeCandidate,
  ThematicDashboard,
  Toast,
  ToastKind,
} from "./types";
import { PLANS } from "./plans";
import {
  generateLibrary,
  seedDashboards,
  seedLibraries,
  seedNotifications,
  seedPayments,
  seedSwipeCandidates,
} from "./mock";
import { addDays, uid } from "./format";
import { supabase } from "@/integrations/supabase/client";

type Theme = "light" | "dark";

interface PersistedState {
  theme: Theme;
}

interface LibraryLatestRow {
  id: string;
  url: string;
  title: string | null;
  search_term: string | null;
  page_name: string | null;
  niche: string | null;
  language: string | null;
  notes: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  latest_snapshot_id: string | null;
  captured_at: string | null;
  last_captured_at: string | null;
  active_ads_count: number | null;
  unique_creatives: number | null;
  top_creative_count: number | null;
  top_creative_id: string | null;
  top_creative_url: string | null;
  scrape_ok: boolean | null;
  error_message: string | null;
}

interface LibraryTrendRow {
  library_id: string;
  delta: number | null;
  direction: "up" | "down" | "flat" | null;
}

interface LibraryFlagRow {
  library_id: string;
  favorite: boolean | null;
  hidden_from_swipe: boolean | null;
}

interface DashboardRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  library_ids?: string[];
}

interface NotificationRow {
  id: string;
  type: AppNotification["type"];
  title: string;
  body: string;
  at: string;
  read: boolean;
}

interface SubscriptionRow {
  user_id: string;
  plan: PlanId;
  status: string;
  method: string | null;
  cycle: string | null;
  renewal_date: string | null;
  cancel_at_period_end: boolean;
  credits: number;
}

interface PaymentRow {
  id: string;
  date: string;
  amount: number;
  method: "card" | "pix";
  status: "paid" | "scheduled";
  description: string | null;
}

interface Store extends PersistedState {
  session: SessionUser | null;
  authLoading: boolean;
  avatarUrl: string | null;
  avatarLoading: boolean;
  libraries: Library[];
  libraryLoading: boolean;
  toasts: Toast[];
  swipeCandidates: SwipeCandidate[];
  aggregatedDaily: Snapshot[];
  aggregatedLoading: boolean;
  // dados persistentes vindo do Supabase
  dashboards: ThematicDashboard[];
  notifications: AppNotification[];
  payments: PaymentIntent[];
  plan: PlanId;
  credits: number;
  cancelAtPeriodEnd: boolean;
  renewalDate: string;
  swipeFavorites: string[];
  canAddLibrary: boolean;
  // auth
  signIn: (email: string, name?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  // theme
  toggleTheme: () => void;
  // toast
  toast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: string) => void;
  // libraries
  addLibrary: (values: {
    url: string;
    page_name?: string;
    title?: string;
    niche?: string;
    language?: string;
    notes?: string;
  }) => Promise<boolean>;
  removeLibrary: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  refreshLibrary: (id: string) => void;
  fetchLibraryDetail: (id: string) => Promise<void>;
  toggleHidden: (id: string) => void;
  // dashboards
  createDashboard: (name: string, description: string) => Promise<void>;
  deleteDashboard: (id: string) => Promise<void>;
  addToDashboard: (dashId: string, libId: string) => Promise<void>;
  removeFromDashboard: (dashId: string, libId: string) => Promise<void>;
  // plan / billing
  setPlan: (plan: PlanId, method: "card" | "pix", cycle: "monthly" | "quarterly") => Promise<void>;
  cancelRenewal: () => Promise<void>;
  reactivateRenewal: () => Promise<void>;
  buyCredits: (credits: number, price: number, method: "card" | "pix") => Promise<void>;
  // notifications
  markAllRead: () => Promise<void>;
  pushNotification: (n: Omit<AppNotification, "id" | "at" | "read">) => Promise<void>;
  // swipe
  toggleSwipeFavorite: (id: string) => Promise<void>;
  // profile
  updateProfile: (name: string, email: string) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
const LS_KEY = "insanespy-v1-ui";

function loadUIState(): PersistedState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { theme: "dark" };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return { theme: parsed.theme === "light" ? "light" : "dark" };
  } catch {
    return { theme: "dark" };
  }
}

function deriveNameFromEmail(email: string): string {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function pageNameFromRow(row: LibraryLatestRow): string {
  if (row.page_name) {
    return decodeURIComponent(row.page_name)
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 42);
  }
  if (row.title) return row.title.slice(0, 42);
  if (row.search_term) return ('"' + row.search_term + '"').slice(0, 42);
  const host = (row.url || "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
  return host ? decodeURIComponent(host) : "Nova biblioteca";
}

function mapLibrary(
  row: LibraryLatestRow,
  trend: LibraryTrendRow | undefined,
  flag: { favorite?: boolean; hiddenFromSwipe?: boolean },
): Library {
  const activeAds = row.active_ads_count ?? 0;
  const uniqueCreatives = row.unique_creatives ?? 0;
  const delta = trend?.delta ?? 0;
  const direction = trend?.direction ?? "flat";
  const isEscalating = direction === "up" && delta >= 3;
  const base = generateLibrary(row.id, pageNameFromRow(row), row.niche ?? "—");
  const lastIsOk = row.scrape_ok !== false;
  const top: Creative | undefined = base.creatives[0]
    ? {
        ...base.creatives[0],
        duplications: row.top_creative_count ?? base.creatives[0].duplications,
      }
    : undefined;
  return {
    ...base,
    id: row.id,
    pageName: pageNameFromRow(row),
    niche: row.niche ?? "—",
    url: row.url,
    country: "BR",
    activeAds,
    uniqueCreatives,
    isEscalating,
    escalationScore: Math.min(99, Math.round((isEscalating ? 60 : 12) + Math.abs(delta) * 4 + 15)),
    favorite: flag.favorite ?? false,
    hiddenFromSwipe: flag.hiddenFromSwipe ?? false,
    addedAt: row.created_at,
    lastCollection: {
      at: row.captured_at ?? new Date().toISOString(),
      status: lastIsOk ? "success" : "error",
      attempts: 1,
      message: lastIsOk ? "coleta concluída" : (row.error_message ?? "coleta falhou"),
    },
    creatives: top ? [top, ...base.creatives.slice(1)] : base.creatives,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [uiState, setUiState] = useState<PersistedState>(loadUIState);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [aggregatedDaily, setAggregatedDaily] = useState<Snapshot[]>([]);
  const [aggregatedLoading, setAggregatedLoading] = useState(false);
  const [dashboards, setDashboards] = useState<ThematicDashboard[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [payments, setPayments] = useState<PaymentIntent[]>([]);
  const [plan, setPlanState] = useState<PlanId>("free");
  const [credits, setCredits] = useState(0);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [renewalDate, setRenewalDate] = useState<string>(addDays(new Date(), 30).toISOString());
  const [swipeFavorites, setSwipeFavorites] = useState<string[]>([]);
  const swipeCandidates = useMemo(() => seedSwipeCandidates(), []);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(uiState));
  }, [uiState]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", uiState.theme === "dark");
  }, [uiState.theme]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = uid("t");
    setToasts((ts) => [...ts, { id, message, kind }]);
    const t = window.setTimeout(() => {
      setToasts((ts) => ts.filter((x) => x.id !== id));
    }, 3800);
    timers.current.push(t);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((ts) => ts.filter((x) => x.id !== id));
  }, []);

  const pushNotification = useCallback(async (n: Omit<AppNotification, "id" | "at" | "read">) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      const { data, error } = await supabase
        .from("notifications")
        .insert({ user_id: userId, type: n.type, title: n.title, body: n.body })
        .select("*")
        .single();
      if (error) throw error;
      const row = data as NotificationRow;
      setNotifications((list) =>
        [{ ...n, id: row.id, at: row.at, read: false }, ...list].slice(0, 30),
      );
    } catch (err) {
      console.warn("[pushNotification] falhou", err);
    }
  }, []);

  // ===== sync helpers =====
  const syncProfile = useCallback(async (userId: string, fallbackName: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_path")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      const p = data as { display_name?: string | null; avatar_path?: string | null } | null;
      setSession({ name: p?.display_name || fallbackName, email });
      if (p?.avatar_path) {
        const { data: signed } = await supabase.storage
          .from("avatars")
          .createSignedUrl(p.avatar_path, 60 * 60);
        setAvatarUrl(signed?.signedUrl ?? null);
      } else {
        setAvatarUrl(null);
      }
    } catch (err) {
      console.warn("[syncProfile] falhou", err);
      setSession({ name: fallbackName, email });
      setAvatarUrl(null);
    }
  }, []);

  const syncLibraries = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const [{ data: latest, error: e1 }, { data: trend, error: e2 }, { data: flags }] =
        await Promise.all([
          supabase
            .from("library_latest" as never)
            .select("*")
            .order("active_ads_count", { ascending: false, nullsFirst: false }),
          supabase.from("library_trend" as never).select("*"),
          supabase.from("library_flags").select("library_id, favorite, hidden_from_swipe"),
        ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const trendMap = new Map<string, LibraryTrendRow>();
      for (const t of (trend ?? []) as LibraryTrendRow[]) trendMap.set(t.library_id, t);
      const flagsMap = new Map<string, { favorite?: boolean; hiddenFromSwipe?: boolean }>();
      for (const f of (flags ?? []) as LibraryFlagRow[]) {
        flagsMap.set(f.library_id, {
          favorite: f.favorite ?? false,
          hiddenFromSwipe: f.hidden_from_swipe ?? false,
        });
      }
      const mapped = (latest ?? []).map((r) => {
        const row = r as unknown as LibraryLatestRow;
        return mapLibrary(row, trendMap.get(row.id), flagsMap.get(row.id) ?? {});
      });
      setLibraries(mapped);
    } catch (err) {
      console.error("[syncLibraries] falhou", err);
      setLibraries([]);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  const syncDashboards = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("dashboards")
        .select("id, name, description, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as DashboardRow[];
      if (rows.length === 0) {
        setDashboards([]);
        return;
      }
      const { data: links } = await supabase
        .from("dashboard_libraries")
        .select("dashboard_id, library_id");
      const linksRows = (links ?? []) as { dashboard_id: string; library_id: string }[];
      const byDash = new Map<string, string[]>();
      for (const l of linksRows) {
        const arr = byDash.get(l.dashboard_id) ?? [];
        arr.push(l.library_id);
        byDash.set(l.dashboard_id, arr);
      }
      setDashboards(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? "",
          libraryIds: byDash.get(r.id) ?? [],
          createdAt: r.created_at,
        })),
      );
    } catch (err) {
      console.warn("[syncDashboards] falhou", err);
    }
  }, []);

  const syncNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("at", { ascending: false })
        .limit(30);
      if (error) throw error;
      const rows = (data ?? []) as NotificationRow[];
      setNotifications(
        rows.map((r) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          body: r.body,
          at: r.at,
          read: r.read,
        })),
      );
    } catch (err) {
      console.warn("[syncNotifications] falhou", err);
    }
  }, []);

  const syncSubscription = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      const s = data as SubscriptionRow | null;
      if (s) {
        setPlanState(s.plan as PlanId);
        setCredits(s.credits);
        setCancelAtPeriodEnd(s.cancel_at_period_end);
        setRenewalDate(s.renewal_date ?? addDays(new Date(), 30).toISOString());
      }
      const { data: pays } = await supabase
        .from("payments")
        .select("*")
        .order("date", { ascending: false })
        .limit(30);
      const payRows = (pays ?? []) as PaymentRow[];
      setPayments(
        payRows.map((p) => ({
          id: p.id,
          date: p.date,
          amount: Number(p.amount),
          method: p.method,
          status: p.status as "paid" | "scheduled",
          description: p.description ?? "",
        })),
      );
    } catch (err) {
      console.warn("[syncSubscription] falhou", err);
    }
  }, []);

  const syncSwipeFavorites = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("swipe_favorites")
        .select("candidate_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as { candidate_id: string }[];
      setSwipeFavorites(rows.map((r) => r.candidate_id));
    } catch (err) {
      console.warn("[syncSwipeFavorites] falhou", err);
    }
  }, []);

  const fetchAggregatedDaily = useCallback(async () => {
    setAggregatedLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_library_stats" as never)
        .select("library_id, day, avg_active_ads")
        .order("day", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as {
        library_id: string;
        day: string;
        avg_active_ads: number | null;
      }[];
      const byDay = new Map<string, number>();
      for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + (r.avg_active_ads ?? 0));
      const out: Snapshot[] = Array.from(byDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([t, v]) => ({ t, activeAds: Math.round(v), uniqueCreatives: 0 }));
      setAggregatedDaily(out);
    } catch (err) {
      console.warn("[fetchAggregatedDaily] falhou", err);
      setAggregatedDaily([]);
    } finally {
      setAggregatedLoading(false);
    }
  }, []);

  // ===== AUTH bootstrap =====
  useEffect(() => {
    let sub: { subscription: { unsubscribe: () => void } } | undefined;
    let cancelled = false;

    async function bootstrap() {
      const { data: sessData } = await supabase.auth.getSession();
      if (cancelled) return;
      const u = sessData.session?.user ?? null;
      if (u) {
        const fallback =
          (u.user_metadata?.full_name as string) || deriveNameFromEmail(u.email ?? "");
        void syncProfile(u.id, fallback, u.email ?? "");
        void syncLibraries();
        void syncDashboards();
        void syncNotifications();
        void syncSubscription();
        void syncSwipeFavorites();
        void fetchAggregatedDaily();
      } else {
        setSession(null);
        setAvatarUrl(null);
      }
      setAuthLoading(false);

      sub = supabase.auth.onAuthStateChange(async (_event, s) => {
        const user = s?.user ?? null;
        if (user) {
          const fallback =
            (user.user_metadata?.full_name as string) || deriveNameFromEmail(user.email ?? "");
          void syncProfile(user.id, fallback, user.email ?? "");
          void syncLibraries();
          void syncDashboards();
          void syncNotifications();
          void syncSubscription();
          void syncSwipeFavorites();
          void fetchAggregatedDaily();
        } else {
          setSession(null);
          setAvatarUrl(null);
          setLibraries([]);
          setDashboards([]);
          setNotifications([]);
          setPayments([]);
          setSwipeFavorites([]);
          setAggregatedDaily([]);
        }
      }).data;
    }

    void bootstrap();
    return () => {
      cancelled = true;
      sub?.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== REALTIME =====
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("spa-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "snapshots" }, () => {
        void syncLibraries();
        void fetchAggregatedDaily();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "libraries" }, () => {
        void syncLibraries();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "library_flags" }, () => {
        void syncLibraries();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dashboards" }, () => {
        void syncDashboards();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dashboard_libraries" },
        () => {
          void syncDashboards();
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        void syncNotifications();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => {
        void syncSubscription();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        void syncSubscription();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "swipe_favorites" }, () => {
        void syncSwipeFavorites();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ===== Coleta periódica automática =====
  // No Supabase local o pg_cron não roda, então o próprio navegador dispara
  // /api/collect periodicamente — o collector ignora bibliotecas com snapshot
  // recente (janela de idempotência de 45min), o que mantém o ciclo correto.
  useEffect(() => {
    if (!session) return;
    const intervalMin = PLANS[plan].pushIntervalMin;
    const interval = Math.max(2, Math.min(intervalMin, 60)) * 60_000;
    let cancelled = false;
    async function tick() {
      if (cancelled) return;
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        void fetch("/api/collect", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({}),
        }).catch(() => {});
      } catch {
        // silencioso — background
      }
    }
    const first = window.setTimeout(tick, 30_000);
    const id = window.setInterval(tick, interval);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, plan]);

  const signIn = useCallback(
    async (email: string, name?: string): Promise<{ error?: string }> => {
      const isSignup = Boolean(name && name.trim());
      try {
        if (isSignup) {
          const { error } = await supabase.auth.signUp({
            email,
            password: Math.random().toString(36).slice(2) + "A1!",
            options: {
              data: { full_name: name!.trim() },
              emailRedirectTo: `${window.location.origin}/`,
            },
          });
          if (error) return { error: error.message };
          toast("Conta criada. Verifique seu e-mail para confirmar.", "success");
          return {};
        }
        return {};
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro inesperado";
        toast(msg, "error");
        return { error: msg };
      }
    },
    [toast],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAvatarUrl(null);
    setLibraries([]);
    setDashboards([]);
    setNotifications([]);
    setPayments([]);
    setSwipeFavorites([]);
    setAggregatedDaily([]);
  }, []);

  const toggleTheme = useCallback(() => {
    setUiState((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }));
  }, []);

  const canAddLibrary = libraries.length < PLANS[plan].librariesLimit;

  const addLibrary = useCallback(
    async (values: {
      url: string;
      page_name?: string;
      title?: string;
      niche?: string;
      language?: string;
      notes?: string;
    }): Promise<boolean> => {
      const clean = values.url.trim();
      if (!clean) {
        toast("Informe a URL da Meta Ads Library.", "error");
        return false;
      }
      if (libraries.length >= PLANS[plan].librariesLimit) {
        toast(
          `Limite atingido: o plano ${PLANS[plan].name} permite ${PLANS[plan].librariesLimit} bibliotecas.`,
          "error",
        );
        return false;
      }
      try {
        const { data: userData } = await supabase.auth.getUser();
        const insert: Record<string, unknown> = {
          url: clean,
          status: "active",
          created_by: userData.user?.id ?? null,
        };
        if (values.page_name?.trim()) insert.page_name = values.page_name.trim();
        if (values.title?.trim()) insert.title = values.title.trim();
        if (values.niche?.trim()) insert.niche = values.niche.trim();
        if (values.language?.trim()) insert.language = values.language.trim();
        if (values.notes?.trim()) insert.notes = values.notes.trim();

        const ins = await supabase
          .from("libraries")
          .insert(insert as never)
          .select("id")
          .single();
        const error = ins.error as unknown;
        if (error) throw error;
        const newId = (ins.data as { id: string } | null)?.id;
        toast("Biblioteca adicionada. Disparando primeira coleta…", "success");
        void syncLibraries();
        // dispara coleta em background (não bloqueia a UI)
        if (newId) {
          void triggerCollect(newId);
        }
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao adicionar";
        toast(`Erro: ${msg}`, "error");
        return false;
      }
    },
    [libraries.length, plan, toast, syncLibraries],
  );

  const triggerCollect = useCallback(
    async (libraryId: string): Promise<void> => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const res = await fetch("/api/collect", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ libraryId }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          result?: { libraries_ok?: number; details?: { error?: string }[] };
          error?: string;
        };
        if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        const ok = json.result?.libraries_ok ?? 0;
        const detailErr = json.result?.details?.[0]?.error;
        if (ok > 0) {
          toast("Primeira coleta concluída ✔", "success");
        } else if (detailErr) {
          toast(`Coleta falhou: ${detailErr}`, "error");
        }
        void syncLibraries();
        void fetchAggregatedDaily();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "falha background";
        console.warn("[triggerCollect]", msg);
      }
    },
    [syncLibraries, fetchAggregatedDaily, toast],
  );

  const removeLibrary = useCallback(
    async (id: string): Promise<void> => {
      try {
        const { error } = await supabase.from("libraries").delete().eq("id", id);
        if (error) throw error;
        setLibraries((list) => list.filter((l) => l.id !== id));
        toast("Biblioteca removida do monitoramento.", "info");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao remover";
        toast(`Erro: ${msg}`, "error");
      }
    },
    [toast],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const lib = libraries.find((l) => l.id === id);
      if (!lib) return;
      const next = !lib.favorite;
      setLibraries((list) => list.map((l) => (l.id === id ? { ...l, favorite: next } : l)));
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return;
        await supabase.from("library_flags").upsert(
          {
            library_id: id,
            user_id: userId,
            favorite: next,
            hidden_from_swipe: lib.hiddenFromSwipe,
          },
          { onConflict: "library_id,user_id" },
        );
      } catch (err) {
        console.warn("[toggleFavorite]", err);
      }
    },
    [libraries],
  );

  const toggleHidden = useCallback(
    async (id: string) => {
      const lib = libraries.find((l) => l.id === id);
      if (!lib) return;
      const hiddenCount = libraries.filter((l) => l.hiddenFromSwipe).length;
      if (!lib.hiddenFromSwipe && hiddenCount >= PLANS[plan].hiddenSlots) {
        toast(`Limite de ${PLANS[plan].hiddenSlots} bibliotecas ocultas atingido.`, "error");
        return;
      }
      const next = !lib.hiddenFromSwipe;
      setLibraries((list) => list.map((l) => (l.id === id ? { ...l, hiddenFromSwipe: next } : l)));
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return;
        await supabase
          .from("library_flags")
          .upsert(
            { library_id: id, user_id: userId, favorite: lib.favorite, hidden_from_swipe: next },
            { onConflict: "library_id,user_id" },
          );
      } catch (err) {
        console.warn("[toggleHidden]", err);
      }
      toast(
        lib.hiddenFromSwipe
          ? `"${lib.pageName}" voltou a aparecer no Swipe.`
          : `"${lib.pageName}" ocultada do Swipe global.`,
        "success",
      );
    },
    [libraries, plan, toast],
  );

  const refreshLibrary = useCallback(
    (id: string) => {
      const lib = libraries.find((l) => l.id === id);
      if (!lib || lib.lastCollection.status === "running") return;
      setLibraries((list) =>
        list.map((l) =>
          l.id === id
            ? {
                ...l,
                lastCollection: {
                  at: new Date().toISOString(),
                  status: "running",
                  attempts: 1,
                  message: "disparando coleta…",
                },
              }
            : l,
        ),
      );
      (async () => {
        try {
          const { data: sess } = await supabase.auth.getSession();
          const token = sess.session?.access_token;
          const res = await fetch("/api/collect", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ libraryId: id }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as { ok?: boolean; error?: string };
          if (!json.ok) throw new Error(json.error ?? "coleta falhou");
          setLibraries((list) =>
            list.map((l) =>
              l.id === id
                ? {
                    ...l,
                    lastCollection: {
                      at: new Date().toISOString(),
                      status: "success",
                      attempts: 1,
                      message: "coleta disparada para o collector",
                    },
                  }
                : l,
            ),
          );
          toast(`Coleta disparada para "${lib.pageName}".`, "info");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "falha na coleta";
          setLibraries((list) =>
            list.map((l) =>
              l.id === id
                ? {
                    ...l,
                    lastCollection: {
                      at: new Date().toISOString(),
                      status: "error",
                      attempts: 1,
                      message: msg,
                    },
                  }
                : l,
            ),
          );
          toast(`Erro ao coletar: ${msg}`, "error");
        }
        const t = window.setTimeout(() => void syncLibraries(), 4000);
        timers.current.push(t);
      })();
    },
    [libraries, toast, syncLibraries],
  );

  const fetchLibraryDetail = useCallback(
    async (id: string): Promise<void> => {
      try {
        const [{ data: snaps, error: e1 }, { data: latestRow, error: e2 }] = await Promise.all([
          supabase
            .from("snapshots")
            .select("captured_at, active_ads_count, unique_creatives")
            .eq("library_id", id)
            .order("captured_at", { ascending: true }),
          supabase
            .from("library_latest" as never)
            .select("latest_snapshot_id")
            .eq("id", id)
            .maybeSingle(),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        const snapRows = (snaps ?? []) as {
          captured_at: string;
          active_ads_count: number | null;
          unique_creatives: number | null;
        }[];
        const snapshots: Snapshot[] = snapRows.map((s) => ({
          t: s.captured_at,
          activeAds: s.active_ads_count ?? 0,
          uniqueCreatives: s.unique_creatives ?? 0,
        }));
        const snapshots48h = snapshots.slice(-17);

        let creatives: Creative[] = [];
        const snapId = (latestRow as { latest_snapshot_id?: string | null } | null)
          ?.latest_snapshot_id;
        if (snapId) {
          const { data: cr, error: e3 } = await supabase
            .from("creatives")
            .select("*")
            .eq("snapshot_id", snapId)
            .order("duplicate_count", { ascending: false, nullsFirst: false })
            .limit(24);
          if (e3) throw e3;
          creatives = (
            (cr ?? []) as {
              id: string;
              media_type: string | null;
              body_text: string | null;
              preview_url: string | null;
              duplicate_count: number | null;
              captured_at: string;
            }[]
          ).map((c, i) => ({
            id: c.id,
            type: (c.media_type === "video" ? "video" : "image") as "video" | "image",
            headline: c.body_text?.slice(0, 80) || `Criativo ${i + 1}`,
            body: c.body_text ?? "",
            duplications: c.duplicate_count ?? 1,
            daysActive: Math.max(
              1,
              Math.round((Date.now() - new Date(c.captured_at).getTime()) / 86400000),
            ),
            hue: (i * 47) % 360,
            format: c.media_type === "video" ? "9:16" : "1:1",
          }));
        }

        setLibraries((list) =>
          list.map((l) =>
            l.id === id
              ? {
                  ...l,
                  snapshots,
                  snapshots48h,
                  creatives: creatives.length ? creatives : l.creatives,
                }
              : l,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "falha ao carregar detalhe";
        toast(`Erro ao carregar detalhe: ${msg}`, "error");
      }
    },
    [toast],
  );

  // ===== DASHBOARDS CRUD real =====
  const createDashboard = useCallback(
    async (name: string, description: string): Promise<void> => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("Sem sessão");
        const { error } = await supabase
          .from("dashboards")
          .insert({ user_id: userId, name, description });
        if (error) throw error;
        toast(`Dashboard "${name}" criado.`, "success");
        void syncDashboards();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao criar";
        toast(`Erro: ${msg}`, "error");
      }
    },
    [toast, syncDashboards],
  );

  const deleteDashboard = useCallback(
    async (id: string): Promise<void> => {
      try {
        const { error } = await supabase.from("dashboards").delete().eq("id", id);
        if (error) throw error;
        setDashboards((list) => list.filter((d) => d.id !== id));
        toast("Dashboard removido.", "info");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao remover";
        toast(`Erro: ${msg}`, "error");
      }
    },
    [toast],
  );

  const addToDashboard = useCallback(
    async (dashId: string, libId: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from("dashboard_libraries")
          .insert({ dashboard_id: dashId, library_id: libId });
        if (error && error.code !== "23505") throw error;
        setDashboards((list) =>
          list.map((d) =>
            d.id === dashId && !d.libraryIds.includes(libId)
              ? { ...d, libraryIds: [...d.libraryIds, libId] }
              : d,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha";
        toast(`Erro: ${msg}`, "error");
      }
    },
    [toast],
  );

  const removeFromDashboard = useCallback(
    async (dashId: string, libId: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from("dashboard_libraries")
          .delete()
          .eq("dashboard_id", dashId)
          .eq("library_id", libId);
        if (error) throw error;
        setDashboards((list) =>
          list.map((d) =>
            d.id === dashId ? { ...d, libraryIds: d.libraryIds.filter((x) => x !== libId) } : d,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha";
        toast(`Erro: ${msg}`, "error");
      }
    },
    [toast],
  );

  // ===== PLAN / BILLING real =====
  const setPlan = useCallback(
    async (
      nextPlan: PlanId,
      method: "card" | "pix",
      cycle: "monthly" | "quarterly",
    ): Promise<void> => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("Sem sessão");
        const p = PLANS[nextPlan];
        const amount =
          nextPlan === "free"
            ? 0
            : method === "pix"
              ? (p.pixQuarterly ?? p.quarterly ?? p.monthly ?? 0)
              : cycle === "monthly"
                ? (p.monthly ?? 0)
                : (p.quarterly ?? 0);
        const days = cycle === "monthly" ? 30 : 90;
        const renewal = addDays(new Date(), days).toISOString();
        await supabase
          .from("subscriptions")
          .update({
            plan: nextPlan,
            status: nextPlan === "free" ? "active" : "active",
            method: nextPlan === "free" ? null : method,
            cycle: nextPlan === "free" ? null : cycle,
            renewal_date: nextPlan === "free" ? null : renewal,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (nextPlan !== "free") {
          await supabase.from("payments").insert([
            {
              user_id: userId,
              date: renewal,
              amount,
              method,
              status: "scheduled",
              description: `${p.name} (${cycle === "monthly" ? "mensal" : "trimestral"}) — ${
                method === "card" ? "renovação automática via Asaas" : "renovação manual via Pix"
              }`,
            },
            {
              user_id: userId,
              date: new Date().toISOString(),
              amount,
              method,
              status: "paid",
              description: `${p.name} (${cycle === "monthly" ? "mensal" : "trimestral"}) — via ${
                method === "card" ? "Asaas" : "AbacatePay"
              }`,
            },
          ]);
          await pushNotification({
            type: "system",
            title: "Assinatura atualizada",
            body: `Plano ${p.name} ativo. Próxima cobrança em ${days} dias.`,
          });
        } else {
          await supabase.from("payments").delete().eq("user_id", userId).eq("status", "scheduled");
        }
        setPlanState(nextPlan);
        setCancelAtPeriodEnd(false);
        if (nextPlan !== "free") setRenewalDate(renewal);
        toast(
          nextPlan === "free" ? "Você voltou para o plano Free." : `Plano ${p.name} ativado.`,
          "success",
        );
        void syncSubscription();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha";
        toast(`Erro: ${msg}`, "error");
      }
    },
    [toast, pushNotification, syncSubscription],
  );

  const cancelRenewal = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sem sessão");
      await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      await supabase.from("payments").delete().eq("user_id", userId).eq("status", "scheduled");
      setCancelAtPeriodEnd(true);
      toast("Renovação automática cancelada. Acesso mantido até o fim do ciclo.", "info");
      void syncSubscription();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha";
      toast(`Erro: ${msg}`, "error");
    }
  }, [toast, syncSubscription]);

  const reactivateRenewal = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sem sessão");
      await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      setCancelAtPeriodEnd(false);
      toast("Renovação automática reativada.", "success");
      void syncSubscription();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha";
      toast(`Erro: ${msg}`, "error");
    }
  }, [toast, syncSubscription]);

  const buyCredits = useCallback(
    async (nCredits: number, price: number, method: "card" | "pix"): Promise<void> => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("Sem sessão");
        await supabase
          .from("subscriptions")
          .update({ credits: credits + nCredits, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        await supabase.from("payments").insert([
          {
            user_id: userId,
            date: new Date().toISOString(),
            amount: price,
            method,
            status: "paid",
            description: `Pacote de ${nCredits} créditos — via ${method === "card" ? "Asaas" : "AbacatePay"}`,
          },
        ]);
        setCredits((c) => c + nCredits);
        toast(`+${nCredits} créditos adicionados ao saldo.`, "success");
        void syncSubscription();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha";
        toast(`Erro: ${msg}`, "error");
      }
    },
    [credits, toast, syncSubscription],
  );

  // ===== NOTIFICATIONS =====
  const markAllRead = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
      setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.warn("[markAllRead]", err);
    }
  }, []);

  // ===== SWIPE FAVORITES =====
  const toggleSwipeFavorite = useCallback(
    async (candidateId: string): Promise<void> => {
      const has = swipeFavorites.includes(candidateId);
      setSwipeFavorites((list) =>
        has ? list.filter((x) => x !== candidateId) : [...list, candidateId],
      );
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return;
        if (has) {
          await supabase
            .from("swipe_favorites")
            .delete()
            .eq("user_id", userId)
            .eq("candidate_id", candidateId);
        } else {
          await supabase
            .from("swipe_favorites")
            .insert({ user_id: userId, candidate_id: candidateId });
        }
      } catch (err) {
        console.warn("[toggleSwipeFavorite]", err);
      }
    },
    [swipeFavorites],
  );

  // ===== PROFILE =====
  const updateProfile = useCallback(
    async (name: string, email: string): Promise<void> => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) throw new Error("Sem sessão");
        const { error: profErr } = await supabase
          .from("profiles")
          .upsert({ id: user.id, display_name: name.trim() })
          .eq("id", user.id);
        if (profErr) throw profErr;
        await supabase.auth.updateUser({ data: { full_name: name.trim() }, email });
        setSession((s) => (s ? { ...s, name: name.trim(), email } : s));
        toast("Perfil atualizado.", "success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao atualizar perfil";
        toast(`Erro: ${msg}`, "error");
      }
    },
    [toast],
  );

  const uploadAvatar = useCallback(
    async (file: File): Promise<void> => {
      try {
        setAvatarLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) throw new Error("Sem sessão");
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;
        const { error: profErr } = await supabase
          .from("profiles")
          .upsert({ id: user.id, avatar_path: path })
          .eq("id", user.id);
        if (profErr) throw profErr;
        const { data: signed } = await supabase.storage
          .from("avatars")
          .createSignedUrl(path, 60 * 60);
        setAvatarUrl(signed?.signedUrl ?? null);
        toast("Avatar atualizado.", "success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao enviar avatar";
        toast(`Erro: ${msg}`, "error");
      } finally {
        setAvatarLoading(false);
      }
    },
    [toast],
  );

  const deleteAccount = useCallback(async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "falha");
      await supabase.auth.signOut();
      setSession(null);
      setAvatarUrl(null);
      setLibraries([]);
      setDashboards([]);
      setNotifications([]);
      setPayments([]);
      setSwipeFavorites([]);
      setAggregatedDaily([]);
      toast("Conta excluída.", "info");
      window.location.href = "/";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir conta";
      toast(`Erro: ${msg}`, "error");
    }
  }, [toast]);

  // helper interno não utilizado — removido

  const value: Store = {
    theme: uiState.theme,
    session,
    authLoading,
    avatarUrl,
    avatarLoading,
    libraries,
    libraryLoading,
    toasts,
    swipeCandidates,
    aggregatedDaily,
    aggregatedLoading,
    dashboards,
    notifications,
    payments,
    plan,
    credits,
    cancelAtPeriodEnd,
    renewalDate,
    swipeFavorites,
    canAddLibrary,
    signIn,
    signOut,
    toggleTheme,
    toast,
    dismissToast,
    addLibrary,
    removeLibrary,
    toggleFavorite,
    refreshLibrary,
    fetchLibraryDetail,
    toggleHidden,
    createDashboard,
    deleteDashboard,
    addToDashboard,
    removeFromDashboard,
    setPlan,
    cancelRenewal,
    reactivateRenewal,
    buyCredits,
    markAllRead,
    pushNotification,
    toggleSwipeFavorite,
    updateProfile,
    uploadAvatar,
    deleteAccount,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore fora do StoreProvider");
  return ctx;
}
