export type PlanId = "free" | "pro" | "unlimited";

export interface Plan {
  id: PlanId;
  name: string;
  codename: string;
  tagline: string;
  monthly?: number; // R$/mês no cartão (recorrente)
  quarterly?: number; // R$ trimestre no cartão
  pixQuarterly?: number; // R$ trimestre no Pix
  librariesLimit: number; // Infinity = ilimitado
  pushIntervalMin: number;
  historyDays: number;
  swipe: "none" | "partial" | "full";
  hiddenSlots: number;
  videoExtraction: boolean;
  quarterlyOnly?: boolean;
  features: string[];
}

export type Trend = "up" | "down" | "flat";

export interface Snapshot {
  t: string; // ISO
  activeAds: number;
  uniqueCreatives: number;
}

export interface CollectionLog {
  at: string;
  status: "success" | "running" | "error";
  attempts: number;
  message: string;
}

export interface Creative {
  id: string;
  type: "video" | "image";
  headline: string;
  body: string;
  duplications: number;
  daysActive: number;
  hue: number;
  format: string;
}

export interface Library {
  id: string;
  pageName: string;
  niche: string;
  url: string;
  country: string;
  activeAds: number;
  uniqueCreatives: number;
  isEscalating: boolean;
  escalationScore: number;
  favorite: boolean;
  hiddenFromSwipe: boolean;
  addedAt: string;
  lastCollection: CollectionLog;
  snapshots: Snapshot[]; // evolução diária
  snapshots48h: Snapshot[]; // granular últimas 48h
  creatives: Creative[];
}

export interface ThematicDashboard {
  id: string;
  name: string;
  description: string;
  libraryIds: string[];
  createdAt: string;
}

export interface PaymentIntent {
  id: string;
  date: string;
  amount: number;
  method: "card" | "pix";
  status: "paid" | "scheduled";
  description: string;
}

export interface AppNotification {
  id: string;
  type: "escalating" | "renewal" | "collection" | "system";
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export interface SwipeCandidate {
  id: string;
  pageName: string;
  niche: string;
  headline: string;
  type: "video" | "image";
  duplications: number;
  escalationScore: number;
  visibleToPro: boolean;
  hue: number;
  daysActive: number;
}

export interface CreditPack {
  id: string;
  credits: number;
  price: number;
}

export interface SessionUser {
  name: string;
  email: string;
}

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}
