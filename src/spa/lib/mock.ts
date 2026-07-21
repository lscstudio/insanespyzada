import type {
  AppNotification,
  Creative,
  Library,
  PaymentIntent,
  Snapshot,
  SwipeCandidate,
  ThematicDashboard,
} from "./types";
import { addDays } from "./format";

// RNG determinístico (mulberry32) para dados estáveis entre reloads
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const HEADLINES = [
  "O truque que derruba o açúcar em 9 dias",
  "Médicos odeiam este truque da gelatina",
  "Perca medidas sem cortar o jantar",
  "O protocolo de 21 dias que virou febre",
  "Ela eliminou 14kg com 1 colher por dia",
  "O chá que seca enquanto você dorme",
  "Reative seu metabolismo em 72 horas",
  "O ritual matinal das mulheres magras",
  "Fim da retenção: método japonês",
  "O segredo das farmácias escondido",
  "Ganhe 3x mais com a mesma banca",
  "O robô que opera sozinho 24/7",
  "Renda extra com 20min por dia",
  "O app que organiza sua vida financeira",
  "Método validado por 12.400 alunos",
  "A planilha que virou aplicativo",
];

const BODIES = [
  "Clique e veja o vídeo completo antes que saia do ar.",
  "Mais de 40 mil pessoas já testaram. Veja o passo a passo.",
  "Disponível por tempo limitado. Toque em Saiba mais.",
  "Resultados reais de alunos. Sem promessa milagrosa.",
  "Assista à apresentação gratuita até o final.",
  "O método completo revelado em 12 minutos.",
];

const NICHES = [
  "Emagrecimento",
  "Finanças",
  "iGaming",
  "Saúde",
  "Relacionamento",
  "Nutrição",
  "Educação",
  "Beleza",
];

const PAGES = [
  "Truque da Gelatina",
  "Encanto Milionário",
  "Protocolo Visão 20/20",
  "Método Cápsula Verde",
  "Renda Turbo Digital",
  "Robô Pix Automático",
  "Chá Seca Barriga",
  "Detox 21 Dias",
  "Fórmula do Sono",
  "Gluco Control Plus",
];

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

function buildSnapshots(r: () => number, days: number, base: number, growth: number): Snapshot[] {
  const out: Snapshot[] = [];
  let v = base;
  for (let i = days; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    v = Math.max(2, Math.round(v + growth + (r() - 0.48) * 4));
    out.push({
      t: d.toISOString(),
      activeAds: v,
      uniqueCreatives: Math.max(1, Math.round(v * (0.28 + r() * 0.12))),
    });
  }
  return out;
}

function buildSnapshots48h(r: () => number, current: number): Snapshot[] {
  const out: Snapshot[] = [];
  let v = current - Math.round(r() * 10);
  for (let i = 16; i >= 0; i--) {
    const d = new Date(Date.now() - i * 3 * 3600 * 1000);
    v = Math.max(2, Math.round(v + (r() - 0.44) * 3));
    out.push({
      t: d.toISOString(),
      activeAds: v,
      uniqueCreatives: Math.max(1, Math.round(v * 0.33)),
    });
  }
  return out;
}

function buildCreatives(r: () => number, count: number): Creative[] {
  const list: Creative[] = [];
  for (let i = 0; i < count; i++) {
    const isVideo = r() > 0.3;
    list.push({
      id: `cr_${Math.floor(r() * 1e9).toString(36)}`,
      type: isVideo ? "video" : "image",
      headline: pick(r, HEADLINES),
      body: pick(r, BODIES),
      duplications: Math.round(2 + r() * r() * 120),
      daysActive: Math.round(1 + r() * 45),
      hue: Math.floor(r() * 360),
      format: isVideo ? (r() > 0.5 ? "9:16" : "1:1") : r() > 0.5 ? "4:5" : "1:1",
    });
  }
  return list.sort((a, b) => b.duplications - a.duplications);
}

export function generateLibrary(id: string, pageName: string, niche: string): Library {
  const r = rng(hashStr(id + pageName));
  const growth = r() > 0.55 ? 1.6 + r() * 2.4 : -1 + r() * 1.8;
  const base = 8 + Math.round(r() * 30);
  const snapshots = buildSnapshots(r, 30, base, growth * 0.4);
  const last = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  const creatives = buildCreatives(r, 6 + Math.floor(r() * 5));
  const isEscalating = last.activeAds - prev.activeAds >= 3 || growth > 2.4;
  const minutesAgo = Math.floor(r() * 50) + 4;
  return {
    id,
    pageName,
    niche,
    url: `https://www.facebook.com/ads/library/?id=${id.replace(/\D/g, "") || "10" + (hashStr(pageName) % 1e8)}`,
    country: "BR",
    activeAds: last.activeAds,
    uniqueCreatives: last.uniqueCreatives,
    isEscalating,
    escalationScore: Math.min(99, Math.round((isEscalating ? 62 : 18) + r() * 35)),
    favorite: r() > 0.72,
    hiddenFromSwipe: false,
    addedAt: addDays(new Date(), -Math.floor(r() * 60) - 2).toISOString(),
    lastCollection: {
      at: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      status: "success",
      attempts: r() > 0.8 ? 2 : 1,
      message: "coleta concluída",
    },
    snapshots,
    snapshots48h: buildSnapshots48h(r, last.activeAds),
    creatives,
  };
}

export function trendOf(lib: Library): "up" | "down" | "flat" {
  const s = lib.snapshots;
  const diff = s[s.length - 1].activeAds - s[s.length - 2].activeAds;
  if (diff > 0) return "up";
  if (diff < 0) return "down";
  return "flat";
}

export function seedLibraries(): Library[] {
  return PAGES.map((name, i) =>
    generateLibrary(`lib_${1000 + i}`, name, NICHES[i % NICHES.length]),
  );
}

export function seedSwipeCandidates(): SwipeCandidate[] {
  const r = rng(42);
  const list: SwipeCandidate[] = [];
  for (let i = 0; i < 14; i++) {
    list.push({
      id: `sw_${i}`,
      pageName: pick(r, PAGES) + (r() > 0.6 ? " Oficial" : ""),
      niche: pick(r, NICHES),
      headline: pick(r, HEADLINES),
      type: r() > 0.25 ? "video" : "image",
      duplications: Math.round(5 + r() * r() * 220),
      escalationScore: Math.round(35 + r() * 64),
      visibleToPro: r() > 0.42,
      hue: Math.floor(r() * 360),
      daysActive: Math.round(2 + r() * 60),
    });
  }
  return list.sort((a, b) => b.escalationScore - a.escalationScore);
}

export function seedNotifications(): AppNotification[] {
  return [
    {
      id: "ntf_1",
      type: "escalating",
      title: "Biblioteca escalando",
      body: '"Truque da Gelatina" entrou em escalação: +7 anúncios ativos nas últimas 24h.',
      at: new Date(Date.now() - 42 * 60000).toISOString(),
      read: false,
    },
    {
      id: "ntf_2",
      type: "renewal",
      title: "Renovação em 3 dias",
      body: "Sua assinatura Unlimited renova em breve. Valor: R$ 247,00 (cartão).",
      at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      read: false,
    },
    {
      id: "ntf_3",
      type: "collection",
      title: "Coleta concluída",
      body: "10/10 bibliotecas coletadas com sucesso no ciclo das 14:00.",
      at: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
      read: true,
    },
    {
      id: "ntf_4",
      type: "system",
      title: "Bem-vindo ao InsaneSpy",
      body: "Adicione sua primeira biblioteca e comece a monitorar em minutos.",
      at: addDays(new Date(), -2).toISOString(),
      read: true,
    },
  ];
}

export function seedPayments(): PaymentIntent[] {
  const now = new Date();
  return [
    {
      id: "pi_next",
      date: addDays(now, 3).toISOString(),
      amount: 247,
      method: "card",
      status: "scheduled",
      description: "Unlimited (trimestral) — renovação automática",
    },
    {
      id: "pi_1",
      date: addDays(now, -87).toISOString(),
      amount: 247,
      method: "card",
      status: "paid",
      description: "Unlimited (trimestral) — via Asaas",
    },
    {
      id: "pi_2",
      date: addDays(now, -118).toISOString(),
      amount: 47,
      method: "card",
      status: "paid",
      description: "Pro (mensal) — via Asaas",
    },
    {
      id: "pi_3",
      date: addDays(now, -149).toISOString(),
      amount: 19,
      method: "pix",
      status: "paid",
      description: "Pacote de 100 créditos — via AbacatePay",
    },
  ];
}

export function seedDashboards(libraries: Library[]): ThematicDashboard[] {
  return [
    {
      id: "dash_1",
      name: "Truque da Gelatina",
      description: "Todos os players do nicho gelatina/emagrecimento em um só radar.",
      libraryIds: libraries.slice(0, 3).map((l) => l.id),
      createdAt: addDays(new Date(), -21).toISOString(),
    },
    {
      id: "dash_2",
      name: "Ofertas de Renda",
      description: "Monitoramento das páginas de renda extra e robôs.",
      libraryIds: libraries.slice(4, 6).map((l) => l.id),
      createdAt: addDays(new Date(), -9).toISOString(),
    },
  ];
}
