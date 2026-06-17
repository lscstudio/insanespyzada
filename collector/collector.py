"""
AdSpy Collector — esqueleto

Lê libraries ativas, raspa a Meta Ad Library e grava snapshots + creatives
via service role (bypass de RLS). Adapte `parse_library_page` para a
estrutura atual da página da Meta (ela muda com frequência).

USO:
    python collector.py                       # roda 1 vez
    python collector.py --loop --hours 4      # loop infinito a cada N horas

ENV obrigatórias:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""
from __future__ import annotations

import argparse
import hashlib
import os
import random
import sys
import time
import traceback
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any, Iterable

try:
    from supabase import Client, create_client  # type: ignore
except ImportError:
    print("Instale: pip install supabase", file=sys.stderr)
    raise

try:
    from playwright.sync_api import sync_playwright  # type: ignore
except ImportError:
    print("Instale: pip install playwright && playwright install chromium", file=sys.stderr)
    raise


# --------------------------------------------------------------------------- #
# Tipos
# --------------------------------------------------------------------------- #

@dataclass
class CreativeRow:
    library_id: str
    snapshot_id: str | None
    ad_archive_id: str | None
    creative_hash: str | None
    media_type: str | None  # 'image' | 'video' | 'carousel' | ...
    preview_url: str | None
    body_text: str | None
    duplicate_count: int = 1


@dataclass
class SnapshotResult:
    active_ads_count: int
    unique_creatives: int
    top_creative_id: str | None
    top_creative_url: str | None
    top_creative_count: int
    total_results_text: str | None
    creatives: list[CreativeRow]


# --------------------------------------------------------------------------- #
# Supabase
# --------------------------------------------------------------------------- #

def get_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.")
    return create_client(url, key)


def fetch_active_libraries(sb: Client) -> list[dict[str, Any]]:
    res = sb.table("libraries").select("*").eq("status", "active").execute()
    return res.data or []


def insert_snapshot(sb: Client, library_id: str, ok: bool, result: SnapshotResult | None,
                    error: str | None = None) -> str | None:
    payload: dict[str, Any] = {
        "library_id": library_id,
        "scrape_ok": ok,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "active_ads_count": result.active_ads_count if result else 0,
        "unique_creatives": result.unique_creatives if result else 0,
        "top_creative_id": result.top_creative_id if result else None,
        "top_creative_url": result.top_creative_url if result else None,
        "top_creative_count": result.top_creative_count if result else 0,
        "total_results_text": result.total_results_text if result else None,
        "error_message": error,
    }
    res = sb.table("snapshots").insert(payload).execute()
    if not res.data:
        return None
    return res.data[0]["id"]


def insert_creatives(sb: Client, rows: Iterable[CreativeRow]) -> None:
    batch = [asdict(r) for r in rows]
    if not batch:
        return
    # Particiona em 500 pra evitar payloads gigantes
    for i in range(0, len(batch), 500):
        sb.table("creatives").insert(batch[i : i + 500]).execute()


# --------------------------------------------------------------------------- #
# Scraping
# --------------------------------------------------------------------------- #

def stable_hash(*parts: str | None) -> str:
    h = hashlib.sha1()
    for p in parts:
        h.update((p or "").encode("utf-8", errors="ignore"))
        h.update(b"|")
    return h.hexdigest()


def parse_library_page(page) -> SnapshotResult:
    """
    Adapte essa função para a estrutura atual da Meta Ad Library.

    Estratégia recomendada:
    1. Aguarde o contêiner principal dos resultados (`page.wait_for_selector(...)`).
    2. Faça scroll incremental até carregar N anúncios ou o final da lista.
    3. Para cada card visível, extraia:
       - ad_archive_id (do link/atributo data-*)
       - texto do anúncio
       - URL do criativo (imagem/vídeo thumbnail)
       - tipo de mídia
    4. Agrupe por `creative_hash` para contar duplicados.
    5. Calcule `active_ads_count` a partir do header (ex.: "~123 results")
       ou do total enumerado.
    """
    # ---- Placeholder: substitua pelo parsing real ------------------------- #
    text = page.inner_text("body")[:5000]
    results: list[CreativeRow] = []
    active = 0
    unique = 0
    top_url = None
    top_id = None
    top_count = 0
    total_text = None

    # Exemplo de stub — gera 0 criativos mas mantém schema correto.
    return SnapshotResult(
        active_ads_count=active,
        unique_creatives=unique,
        top_creative_id=top_id,
        top_creative_url=top_url,
        top_creative_count=top_count,
        total_results_text=total_text or text[:80],
        creatives=results,
    )


def scrape_one(library: dict[str, Any]) -> SnapshotResult:
    url = library["url"]
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1366, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/126.0 Safari/537.36"
            ),
            locale="pt-BR",
        )
        page = ctx.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45_000)
            # Espera leve — adapte ao seletor real dos resultados
            page.wait_for_timeout(3_500)
            result = parse_library_page(page)
        finally:
            ctx.close()
            browser.close()
    return result


# --------------------------------------------------------------------------- #
# Runner
# --------------------------------------------------------------------------- #

def run_once() -> None:
    sb = get_client()
    libraries = fetch_active_libraries(sb)
    print(f"[{datetime.now().isoformat(timespec='seconds')}] {len(libraries)} biblioteca(s) ativas")

    for lib in libraries:
        lib_id = lib["id"]
        label = lib.get("search_term") or lib.get("page_name") or lib_id
        try:
            result = scrape_one(lib)
            snap_id = insert_snapshot(sb, lib_id, ok=True, result=result)
            if snap_id and result.creatives:
                # Garante library_id + snapshot_id corretos
                for c in result.creatives:
                    c.library_id = lib_id
                    c.snapshot_id = snap_id
                    if not c.creative_hash:
                        c.creative_hash = stable_hash(c.ad_archive_id, c.preview_url, c.body_text)
                insert_creatives(sb, result.creatives)
            print(f"  ✓ {label}: {result.active_ads_count} ativos, {result.unique_creatives} únicos")
        except Exception as exc:  # noqa: BLE001
            traceback.print_exc()
            insert_snapshot(sb, lib_id, ok=False, result=None, error=str(exc)[:500])
            print(f"  ✗ {label}: {exc}")

        # Pausa aleatória para reduzir risco de bloqueio
        time.sleep(random.uniform(2.0, 5.0))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--loop", action="store_true", help="Roda continuamente")
    ap.add_argument("--hours", type=float, default=4.0, help="Intervalo entre rodadas (com --loop)")
    args = ap.parse_args()

    if not args.loop:
        run_once()
        return

    while True:
        try:
            run_once()
        except Exception:
            traceback.print_exc()
        sleep_s = max(60.0, args.hours * 3600)
        print(f"Próxima rodada em {sleep_s / 3600:.1f}h")
        time.sleep(sleep_s)


if __name__ == "__main__":
    main()
