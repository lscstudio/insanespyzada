import type { CreditPack, Plan, PlanId } from "./types";

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    codename: "RECON",
    tagline: "Para espiar por cima do muro.",
    librariesLimit: 5,
    pushIntervalMin: 60,
    historyDays: 2,
    swipe: "none",
    hiddenSlots: 0,
    videoExtraction: false,
    features: [
      "5 bibliotecas monitoradas",
      "Coleta automática a cada 1h",
      "Histórico de 2 dias",
      "Alertas de escalação in-app",
      "Sem acesso ao Swipe",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    codename: "OPERATIVE",
    tagline: "Para quem valida antes de escalar.",
    monthly: 47,
    quarterly: 127,
    librariesLimit: 10,
    pushIntervalMin: 45,
    historyDays: 30,
    swipe: "partial",
    hiddenSlots: 0,
    videoExtraction: false,
    features: [
      "10 bibliotecas monitoradas",
      "Coleta automática a cada 45min",
      "Histórico de 30 dias",
      "Swipe parcial (nichos liberados)",
      "Alertas de escalação in-app + e-mail",
    ],
  },
  unlimited: {
    id: "unlimited",
    name: "Unlimited",
    codename: "DIAMOND",
    tagline: "Acesso total ao campo de batalha.",
    quarterly: 247,
    pixQuarterly: 237,
    quarterlyOnly: true,
    librariesLimit: Infinity,
    pushIntervalMin: 45,
    historyDays: 90,
    swipe: "full",
    hiddenSlots: 5,
    videoExtraction: true,
    features: [
      "Bibliotecas ilimitadas",
      "Coleta automática a cada 45min",
      "Histórico de 90 dias",
      "Swipe total (todos os nichos)",
      "Até 5 bibliotecas ocultas do Swipe",
      "Extração de vídeo (MP4 real)",
    ],
  },
};

export const PLAN_LIST: Plan[] = [PLANS.free, PLANS.pro, PLANS.unlimited];

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack-100", credits: 100, price: 19 },
  { id: "pack-300", credits: 300, price: 49 },
  { id: "pack-1000", credits: 1000, price: 129 },
];
