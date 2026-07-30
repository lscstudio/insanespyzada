/**
 * Meta Ad Library collector — server-only.
 *
 * Estratégia híbrida (precisão máxima):
 *   1. Firecrawl renderiza a página (JS pesado da Meta) e devolve HTML +
 *      markdown + um JSON estruturado extraído por LLM com schema rígido.
 *   2. O LLM lê o DOM renderizado e nos devolve: total de anúncios ativos,
 *      lista de páginas (nome + nº de ativos), lista de criativos com
 *      Library ID, contagem real de "X anúncios usam esta criação", preview
 *      URL, e link direto pro anúncio.
 *   3. Se o JSON falhar, caímos no parser regex como fallback.
 */

import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";

type LibraryRow = Database["public"]["Tables"]["libraries"]["Row"];

export interface PageBreakdown {
  name: string;
  active_ads_count: number;
  page_id?: string | null;
}

interface ParsedCreative {
  creative_hash: string;
  preview_url: string;
  media_type: "image" | "video";
  duplicate_count: number;
  ad_archive_id: string | null;
  page_name: string | null;
  body_text: string | null;
  ad_url: string | null;
}

interface ParsedResult {
  active_ads_count: number;
  total_results_text: string | null;
  unique_creatives: number;
  top_creative_url: string | null;
  top_creative_id: string | null;
  top_creative_count: number;
  creatives: ParsedCreative[];
  pages: PageBreakdown[];
}

export interface CollectReport {
  libraries_total: number;
  libraries_ok: number;
  libraries_failed: number;
  duration_ms: number;
  skipped?: boolean;
  details: Array<{
    library_id: string;
    label: string;
    ok: boolean;
    skipped?: boolean;
    active_ads_count?: number;
    unique_creatives?: number;
    pages_count?: number;
    error?: string;
  }>;
}

function getAdmin(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes no servidor.");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// =====================================================================
// Firecrawl: render + structured JSON extraction
// =====================================================================

interface FirecrawlPayload {
  html: string;
  markdown: string;
  extracted: ExtractedShape | null;
}

interface ExtractedShape {
  active_ads_count?: number | null;
  total_results_text?: string | null;
  pages?: Array<{
    name?: string | null;
    page_id?: string | null;
    active_ads_count?: number | null;
  }> | null;
  creatives?: Array<{
    page_name?: string | null;
    library_id?: string | null;
    preview_url?: string | null;
    media_type?: string | null;
    duplicate_count?: number | null;
    body_text?: string | null;
    ad_url?: string | null;
  }> | null;
}

const EXTRACTION_PROMPT = `Você está lendo uma página da Meta Ad Library (Biblioteca de Anúncios do Facebook).

Extraia com PRECISÃO ABSOLUTA:

1. "active_ads_count" — o número TOTAL de anúncios ativos exibido no topo da página (ex: "~123 resultados", "Sobre 45 resultados", "Showing 12 results"). Converta para inteiro.
2. "total_results_text" — o texto literal exibido (ex: "~123 resultados").
3. "pages" — uma lista de TODAS as páginas distintas do Facebook/Instagram que aparecem rodando anúncios nesta listagem. Para cada página: "name" (nome exibido), "page_id" (se aparecer no link view_all_page_id=NUMERO) e "active_ads_count" (quantos anúncios dessa página específica aparecem nesta listagem).
4. "creatives" — uma lista de até 40 criativos distintos vistos nos cards. Para cada um:
   - "page_name" — nome da página que veicula o anúncio.
   - "library_id" — número de 14-17 dígitos rotulado como "Library ID" / "Identificação da biblioteca" / "Identificador en la biblioteca".
   - "preview_url" — URL do thumbnail/imagem/vídeo do criativo (somente fbcdn.net ou cdninstagram.com, NUNCA emoji/profile/rsrc).
   - "media_type" — "image" ou "video".
   - "duplicate_count" — número que aparece no rótulo "X anúncios usam esta criação e este texto" / "X ads use this creative and text". Se não aparecer, use 1.
   - "body_text" — texto principal do anúncio, máximo 200 caracteres.
   - "ad_url" — URL absoluta para abrir esse anúncio específico (ex: https://www.facebook.com/ads/library/?id=LIBRARY_ID).

REGRAS CRÍTICAS:
- NUNCA invente números. Se não encontrar, use 0 ou null.
- O "duplicate_count" precisa vir do rótulo literal da Meta — não do número de vezes que a imagem aparece no DOM.
- Ordene "creatives" do maior "duplicate_count" pro menor.
- Ordene "pages" do maior "active_ads_count" pro menor.`;

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    active_ads_count: { type: "integer", minimum: 0 },
    total_results_text: { type: ["string", "null"] },
    pages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          page_id: { type: ["string", "null"] },
          active_ads_count: { type: "integer", minimum: 0 },
        },
        required: ["name", "active_ads_count"],
      },
    },
    creatives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          page_name: { type: ["string", "null"] },
          library_id: { type: ["string", "null"] },
          preview_url: { type: ["string", "null"] },
          media_type: { type: "string", enum: ["image", "video"] },
          duplicate_count: { type: "integer", minimum: 1 },
          body_text: { type: ["string", "null"] },
          ad_url: { type: ["string", "null"] },
        },
        required: ["duplicate_count"],
      },
    },
  },
  required: ["active_ads_count", "pages", "creatives"],
} as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// =====================================================================
// Key Pool com failover automático + cache de chaves esgotadas
// =====================================================================

type Provider = "firecrawl" | "scraperapi";
interface PoolKey {
  provider: Provider;
  name: string; // ex: FIRECRAWL_API_KEY_2
  value: string;
}

// Chaves marcadas como sem créditos (TTL curto: 10min). Map<name, expiresAt(ms)>
// Antes era 1h — mas ScraperAPI/Firecrawl em contas novas dão 401/403 shortly
// após cadastro (provisioning delay), o que marcava esgotado por uma hora
// mesmo com créditos disponíveis. 10min dá tempo suficiente pra retried sem
// prender a fila.
const EXHAUSTED = new Map<string, number>();
const EXHAUSTED_TTL_MS = 10 * 60 * 1000;
let RR_OFFSET = 0;

function isExhausted(name: string): boolean {
  const exp = EXHAUSTED.get(name);
  if (!exp) return false;
  if (Date.now() > exp) {
    EXHAUSTED.delete(name);
    return false;
  }
  return true;
}

function markExhausted(name: string) {
  EXHAUSTED.set(name, Date.now() + EXHAUSTED_TTL_MS);
  console.warn(`[collect] chave ${name} marcada como esgotada por 10min.`);
}

// cache curto pra chaves dinâmicas do banco (evita hit no DB a cada scrape)
let DYN_CACHE: { at: number; keys: PoolKey[] } | null = null;
const DYN_TTL_MS = 30_000;

// última falha ao carregar chaves do banco. Quando o pool fica vazio é
// importante distinguir "sem chaves cadastradas" de "falha ao ler o banco".
let lastKeyLoadError: string | null = null;

async function loadDynamicKeys(): Promise<PoolKey[]> {
  if (DYN_CACHE && Date.now() - DYN_CACHE.at < DYN_TTL_MS) return DYN_CACHE.keys;
  try {
    const admin = getAdmin();
    const { data, error } = await admin
      .from("api_keys")
      .select("id, provider, label, key, active")
      .eq("active", true);
    if (error) throw error;
    const keys: PoolKey[] = (data ?? []).map((r) => ({
      provider: r.provider as Provider,
      name: `DB:${r.provider}:${r.label || r.id.slice(0, 6)}`,
      value: r.key,
    }));
    DYN_CACHE = { at: Date.now(), keys };
    lastKeyLoadError = null;
    return keys;
  } catch (e) {
    lastKeyLoadError = (e as Error).message;
    console.warn("[collect] falha ao carregar api_keys do banco:", lastKeyLoadError);
    return DYN_CACHE?.keys ?? [];
  }
}

async function buildPool(): Promise<PoolKey[]> {
  const pool: PoolKey[] = [];
  // Somente chaves adicionadas pelo admin (tabela api_keys). Não usamos mais chaves de ambiente.
  for (const k of await loadDynamicKeys()) {
    if (!isExhausted(k.name)) pool.push(k);
  }
  // Round-robin: rotaciona dentro de cada grupo de provider para distribuir carga,
  // mas mantém Firecrawl antes de ScraperAPI (preferência por qualidade/JSON LLM).
  const fc = pool.filter((p) => p.provider === "firecrawl");
  const sa = pool.filter((p) => p.provider === "scraperapi");
  const rotate = <T>(arr: T[], off: number) =>
    arr.length === 0 ? arr : [...arr.slice(off % arr.length), ...arr.slice(0, off % arr.length)];
  const ordered = [...rotate(fc, RR_OFFSET), ...rotate(sa, RR_OFFSET)];
  RR_OFFSET = (RR_OFFSET + 1) % Math.max(1, Math.max(fc.length, sa.length));
  return ordered;
}

export function invalidateDynamicKeysCache() {
  DYN_CACHE = null;
}

/** Limpa a lista de chaves marcadas como esgotadas (útil para troubleshooting). */
export function resetExhaustedKeys() {
  EXHAUSTED.clear();
}

/** Diagnóstico do pool de chaves — usado pelo endpoint /api/collect/diagnostic. */
export async function _diagnosticPool(): Promise<{
  pool_count: number;
  pool_names: string[];
  last_key_load_error: string | null;
  cache_present: boolean;
  cache_age_ms: number;
  exhausted_names: string[];
}> {
  const before = DYN_CACHE ? Date.now() - DYN_CACHE.at : 0;
  const pool = await buildPool();
  return {
    pool_count: pool.length,
    pool_names: pool.map((p) => p.name),
    last_key_load_error: lastKeyLoadError,
    cache_present: DYN_CACHE !== null,
    cache_age_ms: DYN_CACHE ? before : 0,
    exhausted_names: Array.from(EXHAUSTED.keys()),
  };
}

async function firecrawlScrapeOnce(
  url: string,
  apiKey: string,
  options?: { structured?: boolean },
): Promise<FirecrawlPayload> {
  const structured = options?.structured === true;
  const formats: Array<
    string | { type: "json"; prompt: string; schema: typeof EXTRACTION_SCHEMA }
  > = ["html", "markdown"];
  if (structured) {
    formats.push({
      type: "json",
      prompt: EXTRACTION_PROMPT,
      schema: EXTRACTION_SCHEMA,
    });
  }

  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats,
      onlyMainContent: false,
      waitFor: structured ? 6000 : 2500,
      timeout: structured ? 70000 : 45000,
      maxAge: 0,
      location: { country: "BR", languages: ["pt-BR", "pt"] },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Firecrawl ${res.status}: ${text.slice(0, 300)}`) as Error & {
      status?: number;
      transient?: boolean;
    };
    err.status = res.status;
    err.transient = res.status === 408 || res.status === 429 || res.status >= 500;
    throw err;
  }

  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: { html?: string; markdown?: string; json?: ExtractedShape };
    html?: string;
    markdown?: string;
    json?: ExtractedShape;
  };
  if (json.success === false) throw new Error(json.error || "Firecrawl falhou");
  const html = json.data?.html ?? json.html ?? "";
  const markdown = json.data?.markdown ?? json.markdown ?? "";
  const extracted = json.data?.json ?? json.json ?? null;
  if (!html && !markdown && !extracted) {
    const err = new Error("Firecrawl não retornou conteúdo renderizado") as Error & {
      transient?: boolean;
    };
    err.transient = true;
    throw err;
  }
  return { html, markdown, extracted };
}

function isCreditsExhausted(err: unknown): boolean {
  const e = err as { status?: number; message?: string } | null;
  if (!e) return false;
  if (e.status === 402) return true;
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("insufficient credits") ||
    msg.includes("payment required") ||
    msg.includes("out of credits") ||
    msg.includes("no credits") ||
    msg.includes("credit limit") ||
    msg.includes("quota exceeded")
  );
}

/**
 * Erro transiente de auth do ScraperAPI (401/403) em contas novas —
 * a API leva alguns minutos para "provisionar" a chave. NÃO marcar como
 * esgotada; apenas retentar após pequeno backoff.
 */
function isScraperApiAuthTransient(err: unknown): boolean {
  const e = err as { status?: number; message?: string } | null;
  if (!e) return false;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("scraperapi 401") || msg.includes("scraperapi 403");
}

/**
 * ScraperAPI bloqueia scraping de Facebook/Instagram por TOS — retorna
 * 403 "Scraping this url is not allowed". É definitivo: tentar outras
 * chaves ScraperAPI não adianta. A única solução é cadastrar Firecrawl.
 */
function isScraperApiUrlBlocked(err: unknown): boolean {
  const e = err as { message?: string } | null;
  if (!e) return false;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("scraping this url is not allowed") || msg.includes("scraperapi recusou");
}

function isDefinitive(err: unknown): boolean {
  const e = err as { status?: number; message?: string } | null;
  if (!e) return false;
  const s = e.status;
  if (s === 404 || s === 400) return true;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("invalid url") || msg.includes("url is invalid");
}

async function scraperApiScrapeOnce(url: string, apiKey: string): Promise<FirecrawlPayload> {
  const endpoint = new URL("https://api.scraperapi.com/");
  endpoint.searchParams.set("api_key", apiKey);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("render", "true");
  endpoint.searchParams.set("country_code", "br");
  endpoint.searchParams.set("device_type", "desktop");
  const res = await fetch(endpoint.toString(), {
    method: "GET",
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // ScraperAPI bloqueia scrap de facebook/instagram por TOS (HTTP 403 com
    // mensagem "Scraping this url is not allowed"). Não é transiente nem
    // esgotamento — é política da casa. Avisar o usuário para usar Firecrawl.
    if (res.status === 403 && /scraping this url is not allowed/i.test(text)) {
      const err = new Error(
        "ScraperAPI recusou: 'Scraping this url is not allowed'. ScraperAPI proíbe scraping de Facebook/Instagram por TOS. Cadastre uma chave Firecrawl (em Admin → Chaves de API) para coletar da Meta Ad Library.",
      ) as Error & { status?: number; transient?: boolean };
      err.status = 403;
      err.transient = false;
      throw err;
    }
    const err = new Error(`ScraperAPI ${res.status}: ${text.slice(0, 300)}`) as Error & {
      status?: number;
      transient?: boolean;
    };
    err.status = res.status;
    err.transient = res.status === 408 || res.status === 429 || res.status >= 500;
    throw err;
  }
  const html = await res.text();
  if (!html || html.length < 500) {
    const err = new Error("ScraperAPI retornou HTML vazio/curto demais") as Error & {
      transient?: boolean;
    };
    err.transient = true;
    throw err;
  }
  return { html, markdown: "", extracted: null };
}

async function tryKeyWithRetry(
  key: PoolKey,
  url: string,
  options?: { structured?: boolean },
): Promise<FirecrawlPayload> {
  // ScraperAPI em contas novas pode dar 401/403 (provisioning delay) —
  // retenta com backoff maior em vez de falhar imediato.
  const MAX_RETRY = 1; // tenta rápido e faz failover para outra chave sem travar a fila
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      if (key.provider === "firecrawl") return await firecrawlScrapeOnce(url, key.value, options);
      return await scraperApiScrapeOnce(url, key.value);
    } catch (err) {
      lastErr = err;
      if (isCreditsExhausted(err) || isDefinitive(err)) throw err;
      // ScraperAPI 401/403 transiente: backoff maior e retenta.
      if (isScraperApiAuthTransient(err)) {
        if (attempt < MAX_RETRY) {
          await sleep(3000);
          continue;
        }
        throw err;
      }
      const transient = (err as { transient?: boolean }).transient ?? true;
      if (!transient || attempt === MAX_RETRY) throw err;
      await sleep(1200);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Pool de chaves com failover automático.
 * Ordem: FC1→FC2→FC3→FC4→SA1→SA2→SA3 (com round-robin).
 * - Sem créditos (402/quota): marca chave como esgotada por 10min e pula pra próxima imediatamente.
 * - Erro transitório (5xx/429/timeout): retenta na mesma chave 2x antes de pular.
 * - ScraperAPI 401/403 (conta nova): NÃO marca esgotada; apenas pula pra próxima.
 * - Erro definitivo (404/URL inválida): falha imediato.
 */
async function scrapePage(
  url: string,
  options?: { structured?: boolean },
): Promise<FirecrawlPayload> {
  const pool = await buildPool();
  if (pool.length === 0) {
    if (lastKeyLoadError) {
      throw new Error(
        `Sem chaves de scraping disponíveis no momento. Não foi possível ler a tabela api_keys do banco: ${lastKeyLoadError}`,
      );
    }
    throw new Error(
      "Nenhuma chave de scraping cadastrada ativa. Adicione uma chave (Firecrawl ou ScraperAPI) em Admin → Chaves de API.",
    );
  }
  const errors: string[] = [];
  for (const key of pool) {
    try {
      const result = await tryKeyWithRetry(key, url, options);
      if (errors.length > 0) {
        console.log(`[collect] ✓ sucesso com ${key.name} após falhar em: ${errors.join(", ")}`);
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // ScraperAPI bloqueou Facebook por TOS — definitivo. Não adianta tentar
      // outra chave ScraperAPI (todas darão 403). Lança imediatamente com a
      // mensagem explicando que o usuário precisa cadastrar Firecrawl.
      if (isScraperApiUrlBlocked(err)) {
        throw err;
      }
      if (isScraperApiAuthTransient(err)) {
        // Não marcar como esgotada — é transiente de conta nova. Loga e pula,
        // mas permite que a mesma chave volte a ser usada na próxima execução.
        errors.push(`${key.name}(auth provisório)`);
        continue;
      }
      if (isCreditsExhausted(err)) {
        markExhausted(key.name);
        errors.push(`${key.name}(sem créditos)`);
        continue;
      }
      if (isDefinitive(err)) {
        // Erro fatal da URL — não adianta tentar outras chaves.
        throw err;
      }
      errors.push(`${key.name}(${msg.slice(0, 80)})`);
      continue;
    }
  }
  // Se todas falharam por auth provisório do ScraperAPI (ou outros erros),
  // mas não houve bloqueio definitivo, dá mensagem genérica. Mas se só há
  // ScraperAPI no pool e o Facebook foi bloqueado, preferimos já ter lançado.
  throw new Error(`Todas as ${pool.length} chave(s) falharam para ${url}: ${errors.join(" | ")}`);
}

function hash(...parts: Array<string | null | undefined>): string {
  return crypto
    .createHash("sha1")
    .update(parts.filter(Boolean).join("|"))
    .digest("hex")
    .slice(0, 16);
}

const CDN_RE =
  /^https?:\/\/(?:scontent[\w.-]*\.fbcdn\.net|video[\w.-]*\.fbcdn\.net|(?!static\.)[\w.-]+\.cdninstagram\.com)\//i;
const SKIP_RE = /\/(emoji|rsrc\.php|safe_image|profile|p[0-9]+x[0-9]+)\//i;

function normalizeFromLLM(extracted: ExtractedShape): ParsedResult {
  const seenHash = new Set<string>();
  const creatives: ParsedCreative[] = [];

  for (const c of extracted.creatives ?? []) {
    const url = (c.preview_url ?? "").trim();
    if (!url || !CDN_RE.test(url) || SKIP_RE.test(url)) continue;
    const norm = url.split("?")[0];
    const h = hash(norm);
    if (seenHash.has(h)) continue;
    seenHash.add(h);
    const media: "image" | "video" =
      c.media_type === "video" || /\.mp4(\?|$)/i.test(url) ? "video" : "image";
    const dup = Math.max(1, c.duplicate_count ?? 1);
    const adUrl =
      c.ad_url ??
      (c.library_id ? `https://www.facebook.com/ads/library/?id=${c.library_id}` : null);
    creatives.push({
      creative_hash: h,
      preview_url: url,
      media_type: media,
      duplicate_count: dup,
      ad_archive_id: c.library_id ?? null,
      page_name: c.page_name ?? null,
      body_text: c.body_text?.slice(0, 500) ?? null,
      ad_url: adUrl,
    });
  }
  creatives.sort((a, b) => b.duplicate_count - a.duplicate_count);

  const pages: PageBreakdown[] = (extracted.pages ?? [])
    .filter((p): p is { name: string; page_id?: string | null; active_ads_count: number } =>
      Boolean(p && p.name && typeof p.active_ads_count === "number"),
    )
    .map((p) => ({
      name: p.name.trim(),
      page_id: p.page_id ?? null,
      active_ads_count: Math.max(0, p.active_ads_count),
    }))
    .sort((a, b) => b.active_ads_count - a.active_ads_count);

  const top = creatives[0];
  return {
    active_ads_count: Math.max(0, extracted.active_ads_count ?? 0),
    total_results_text: extracted.total_results_text ?? null,
    unique_creatives: creatives.length,
    top_creative_url: top?.preview_url ?? null,
    top_creative_id: top?.ad_archive_id ?? top?.creative_hash ?? null,
    top_creative_count: top?.duplicate_count ?? 0,
    creatives,
    pages,
  };
}

// =====================================================================
// Fallback regex parser (mantido pra casos em que o LLM volte vazio)
// =====================================================================

export function parseAdLibraryPage(html: string, markdown: string): ParsedResult {
  const corpus = `${markdown}\n${html}`;
  const countPatterns = [
    /[~≈]\s*([\d.,]+)\s*(?:results?|resultados?|anúncios?|ads)/i,
    /(?:showing|mostrando|exibindo)\s*([\d.,]+)\s*(?:results?|resultados?|anúncios?|ads)/i,
    /(?:about|sobre|aproximadamente|cerca de)\s*([\d.,]+)\s*(?:results?|resultados?|anúncios?|ads)/i,
    /([\d.,]+)\s*(?:results?|resultados?|anúncios? ativos|ads found)/i,
  ];
  let totalText: string | null = null;
  let count = 0;
  for (const re of countPatterns) {
    const m = corpus.match(re);
    if (m) {
      totalText = m[0].trim();
      count = parseInt(m[1].replace(/[.,]/g, ""), 10) || 0;
      break;
    }
  }

  const tokenRe = new RegExp(
    "(?:Library ID|Identifica[çc][aã]o da biblioteca|Identificaci[oó]n de la biblioteca|ID de la biblioteca|Identifiant de la biblioth[eè]que)\\s*[:#]?\\s*([0-9]{14,17})" +
      "|" +
      "([0-9][0-9.,]*)\\s*(?:an[úu]ncios?\\s+usam\\s+esta\\s+cria[çc][aã]o(?:\\s+e\\s+este\\s+texto)?|ads?\\s+use\\s+this\\s+(?:ad\\s+)?creative(?:\\s+and\\s+text)?|anuncios?\\s+usan\\s+esta\\s+(?:creatividad|cre[aá]tividad)(?:\\s+y\\s+este\\s+texto)?|varia[çc][õo]es?\\s+(?:desse|deste)\\s+an[úu]ncio|vers[õo]es?\\s+(?:desse|deste)\\s+an[úu]ncio|versions?\\s+of\\s+this\\s+ad)" +
      "|" +
      "(https?:\\/\\/(?:scontent[\\w.-]*\\.fbcdn\\.net|video[\\w.-]*\\.fbcdn\\.net|(?!static\\.)[\\w.-]+\\.cdninstagram\\.com)\\/[^\\s\"'<>)]+?\\.(?:jpe?g|png|webp|mp4|gif)(?:\\?[^\\s\"'<>)]*)?)",
    "gi",
  );

  interface CreativeAgg {
    url: string;
    count: number;
    media: "image" | "video";
    ad_ids: string[];
  }
  const found = new Map<string, CreativeAgg>();
  const variationByAdId = new Map<string, number>();
  let lastLibraryId: string | null = null;

  for (const m of html.matchAll(tokenRe)) {
    if (m[1]) {
      lastLibraryId = m[1];
      continue;
    }
    if (m[2]) {
      const n = parseInt(m[2].replace(/[.,]/g, ""), 10);
      if (lastLibraryId && Number.isFinite(n) && n > 0) {
        const prev = variationByAdId.get(lastLibraryId) ?? 0;
        if (n > prev) variationByAdId.set(lastLibraryId, n);
      }
      continue;
    }
    const u = m[3];
    if (!u || SKIP_RE.test(u)) continue;
    const norm = u.split("?")[0];
    const media: "image" | "video" = /\.mp4(\?|$)/i.test(u) ? "video" : "image";
    const cur = found.get(norm);
    if (cur) {
      cur.count += 1;
      if (lastLibraryId && !cur.ad_ids.includes(lastLibraryId)) cur.ad_ids.push(lastLibraryId);
    } else {
      found.set(norm, {
        url: u,
        count: 1,
        media,
        ad_ids: lastLibraryId ? [lastLibraryId] : [],
      });
    }
  }

  const creativesArr: ParsedCreative[] = Array.from(found.values())
    .map((c) => {
      const metaMax = c.ad_ids.reduce((acc, id) => Math.max(acc, variationByAdId.get(id) ?? 0), 0);
      const effective = Math.max(metaMax, c.count, 1);
      const adId = c.ad_ids[0] ?? null;
      return {
        creative_hash: hash(c.url),
        preview_url: c.url,
        media_type: c.media,
        duplicate_count: effective,
        ad_archive_id: adId,
        page_name: null,
        body_text: null,
        ad_url: adId ? `https://www.facebook.com/ads/library/?id=${adId}` : null,
      };
    })
    .sort((a, b) => b.duplicate_count - a.duplicate_count)
    .slice(0, 60);

  const top = creativesArr[0];
  return {
    active_ads_count: count,
    total_results_text: totalText,
    unique_creatives: creativesArr.length,
    top_creative_url: top?.preview_url ?? null,
    top_creative_id: top?.ad_archive_id ?? top?.creative_hash ?? null,
    top_creative_count: top?.duplicate_count ?? 0,
    creatives: creativesArr,
    pages: [],
  };
}

// =====================================================================
// Collector pipeline
// =====================================================================

async function collectOne(
  sb: SupabaseClient<Database>,
  lib: LibraryRow,
  options?: { structured?: boolean },
): Promise<{ ok: boolean; parsed?: ParsedResult; error?: string }> {
  try {
    let { html, markdown, extracted } = await scrapePage(lib.url, { structured: false });

    // Caminho rápido: renderiza a página e usa parser local. Só acionamos a
    // extração estruturada mais lenta quando uma coleta individual não trouxe nada.
    let parsed: ParsedResult | null = parseAdLibraryPage(html, markdown);
    if (parsed.active_ads_count === 0 && parsed.creatives.length === 0 && options?.structured) {
      ({ html, markdown, extracted } = await scrapePage(lib.url, { structured: true }));
      if (extracted && (extracted.creatives?.length || (extracted.active_ads_count ?? 0) > 0)) {
        parsed = normalizeFromLLM(extracted);
      } else {
        parsed = parseAdLibraryPage(html, markdown);
      }
    }
    if (
      parsed.active_ads_count === 0 &&
      parsed.creatives.length === 0 &&
      !parsed.total_results_text
    ) {
      const err = new Error("Nenhum dado confiável foi extraído da biblioteca") as Error & {
        transient?: boolean;
      };
      err.transient = true;
      throw err;
    }

    const snapshotPayload: TablesInsert<"snapshots"> = {
      library_id: lib.id,
      captured_at: new Date().toISOString(),
      scrape_ok: true,
      active_ads_count: parsed.active_ads_count,
      unique_creatives: parsed.unique_creatives,
      top_creative_id: parsed.top_creative_id,
      top_creative_url: parsed.top_creative_url,
      top_creative_count: parsed.top_creative_count,
      total_results_text: parsed.total_results_text,
      error_message: null,
      pages: parsed.pages as unknown as TablesInsert<"snapshots">["pages"],
    };

    const { data: snap, error: snapErr } = await sb
      .from("snapshots")
      .insert(snapshotPayload)
      .select()
      .single();
    if (snapErr) throw snapErr;

    // Build creatives rows + optional page_name update, then dispatch
    // both independent writes in parallel.
    const creativesRows: TablesInsert<"creatives">[] =
      parsed.creatives.length > 0
        ? parsed.creatives.map((c) => ({
            library_id: lib.id,
            snapshot_id: snap.id,
            captured_at: snap.captured_at,
            ad_archive_id: c.ad_archive_id,
            creative_hash: c.creative_hash,
            preview_url: c.preview_url,
            media_type: c.media_type,
            duplicate_count: c.duplicate_count,
            page_name: c.page_name,
            body_text: c.body_text,
            ad_url: c.ad_url,
          }))
        : [];

    const writes: Promise<void>[] = [];
    if (creativesRows.length > 0) {
      writes.push(
        (async () => {
          const { error: crErr } = await sb.from("creatives").insert(creativesRows);
          if (crErr) {
            console.warn(`[collect] creatives insert falhou para ${lib.id}: ${crErr.message}`);
          }
        })(),
      );
    }
    if (parsed.pages.length === 1 && parsed.pages[0].name && !lib.page_name) {
      writes.push(
        (async () => {
          const { error: upErr } = await sb
            .from("libraries")
            .update({ page_name: parsed.pages[0].name })
            .eq("id", lib.id);
          if (upErr) {
            console.warn(`[collect] page_name update falhou para ${lib.id}: ${upErr.message}`);
          }
        })(),
      );
    }
    if (writes.length > 0) await Promise.all(writes);

    return { ok: true, parsed };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Coleta com retry. firecrawlScrape já tenta 4x internamente, mas pode haver
 * falha de DB ou de parsing. Tentamos a coleta inteira até `LIBRARY_RETRIES`
 * vezes antes de gravar o snapshot de falha (assim o histórico fica limpo).
 */
async function collectOneRobust(
  sb: SupabaseClient<Database>,
  lib: LibraryRow,
  options?: { structured?: boolean; maxAttempts?: number },
): Promise<{ ok: boolean; parsed?: ParsedResult; error?: string }> {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 1);
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const r = await collectOne(sb, lib, { structured: options?.structured });
    if (r.ok) return r;
    lastError = r.error;
    if (attempt < maxAttempts) await sleep(2500);
  }
  // Grava snapshot de falha apenas após esgotar as tentativas.
  const { error: failSnapErr } = await sb.from("snapshots").insert({
    library_id: lib.id,
    captured_at: new Date().toISOString(),
    scrape_ok: false,
    active_ads_count: 0,
    unique_creatives: 0,
    top_creative_count: 0,
    error_message: (lastError ?? "unknown").slice(0, 500),
  });
  if (failSnapErr)
    console.warn(`[collect] falha ao gravar snapshot de erro ${lib.id}: ${failSnapErr.message}`);
  return { ok: false, error: lastError };
}

export async function runCollection(opts?: {
  libraryId?: string;
  userId?: string;
  force?: boolean;
}): Promise<CollectReport> {
  const started = Date.now();
  const sb = getAdmin();
  const nowIso = new Date().toISOString();
  const manualRun = Boolean(opts?.libraryId || opts?.userId || opts?.force);

  let query = sb.from("libraries").select("*").eq("status", "active");
  if (opts?.libraryId) query = query.eq("id", opts.libraryId);
  // Filtra por dono apenas em coletas em lote ("atualizar tudo"). Quando
  // um libraryId específico é passado (refresh manual), não filtrar por
  // created_by — isso garante que o refresh funcione mesmo se houver
  // inconsistência na autoria do registro (ex.: libs criadas antes do
  // trigger set_created_by, ou migradas).
  if (opts?.userId && !opts?.libraryId) query = query.eq("created_by", opts.userId);
  const { data: libraries, error } = await query;
  if (error) throw error;

  let list = libraries ?? [];
  const requestedTotal = list.length;

  // Per-library idempotency: para o cron horário (sem opts), pulamos apenas
  // bibliotecas que JÁ têm um snapshot bem-sucedido nos últimos 45 minutos.
  // Isso permite que os retries (:03 e :08) completem libs que falharam na
  // janela :00, garantindo que toda biblioteca seja atualizada a cada hora.
  if (!manualRun && list.length > 0) {
    const since = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    const { data: recent } = await sb
      .from("snapshots")
      .select("library_id")
      .eq("scrape_ok", true)
      .gte("captured_at", since)
      .in(
        "library_id",
        list.map((l) => l.id),
      );
    const done = new Set((recent ?? []).map((r) => r.library_id));
    const before = list.length;
    list = list.filter((l) => !done.has(l.id));
    if (list.length < before) {
      console.log(
        `[collect] pulando ${before - list.length} libs já coletadas na última hora; processando ${list.length}.`,
      );
    }
    if (list.length === 0) {
      return {
        libraries_total: requestedTotal,
        libraries_ok: 0,
        libraries_failed: 0,
        duration_ms: Date.now() - started,
        skipped: true,
        details: [],
      };
    }
  }

  const details: CollectReport["details"] = [];
  let ok = 0;
  let failed = 0;
  let skippedLocked = 0;

  const CONCURRENCY = Math.max(1, Math.min(8, list.length));
  let cursor = 0;
  async function worker() {
    while (cursor < list.length) {
      const idx = cursor++;
      const lib = list[idx];
      const label = lib.title || lib.search_term || lib.page_name || lib.id;
      // Refresh manual de UMA biblioteca: sempre limpa o lock e força a coleta.
      // Coleta em lote (cron ou "atualizar tudo"): respeita lock de 10min.
      const isSingleManual = Boolean(opts?.libraryId);
      if (isSingleManual) {
        await sb
          .from("libraries")
          .update({ collection_started_at: nowIso, last_collection_error: null })
          .eq("id", lib.id);
      } else {
        const lockExpiry = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: locked, error: lockErr } = await sb
          .from("libraries")
          .update({ collection_started_at: nowIso, last_collection_error: null })
          .eq("id", lib.id)
          .or(`collection_started_at.is.null,collection_started_at.lt.${lockExpiry}`)
          .select("id")
          .maybeSingle();
        if (lockErr || !locked) {
          skippedLocked += 1;
          details.push({
            library_id: lib.id,
            label,
            ok: false,
            skipped: true,
            error: lockErr?.message ?? "Coleta já em andamento",
          });
          continue;
        }
      }

      const r = await collectOneRobust(sb, lib, {
        structured: manualRun,
        maxAttempts: isSingleManual ? 3 : 2,
      });
      if (r.ok) {
        ok += 1;
        await sb
          .from("libraries")
          .update({
            collection_started_at: null,
            last_collection_ok_at: new Date().toISOString(),
            last_collection_error: null,
          })
          .eq("id", lib.id);
        details.push({
          library_id: lib.id,
          label,
          ok: true,
          active_ads_count: r.parsed!.active_ads_count,
          unique_creatives: r.parsed!.unique_creatives,
          pages_count: r.parsed!.pages.length,
        });
      } else {
        failed += 1;
        await sb
          .from("libraries")
          .update({
            collection_started_at: null,
            last_collection_error: (r.error ?? "unknown").slice(0, 500),
          })
          .eq("id", lib.id);
        details.push({ library_id: lib.id, label, ok: false, error: r.error });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, () => worker()));

  return {
    libraries_total: requestedTotal,
    libraries_ok: ok,
    libraries_failed: failed + skippedLocked,
    duration_ms: Date.now() - started,
    details,
  };
}
