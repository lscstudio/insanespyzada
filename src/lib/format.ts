export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function formatPercent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function extractSearchTerm(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get("q");
  } catch {
    return null;
  }
}

export function isMetaAdLibraryUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)facebook\.com$/i.test(u.hostname) && u.pathname.startsWith("/ads/library");
  } catch {
    return false;
  }
}

export const LANGUAGES = [
  { value: "PT", label: "Português" },
  { value: "EN", label: "English" },
  { value: "ES", label: "Español" },
  { value: "FR", label: "Français" },
  { value: "IT", label: "Italiano" },
  { value: "DE", label: "Deutsch" },
  { value: "OTHER", label: "Outros" },
];
