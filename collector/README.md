# AdSpy Collector — esqueleto do coletor externo

Este script roda **fora do app** (na sua máquina, num VPS, GitHub Actions, Railway, etc.).
Ele lê as `libraries` ativas no banco, abre cada URL da Meta Ad Library,
extrai métricas e grava `snapshots` + `creatives` usando a **service role key**
(bypass de RLS).

## Variáveis de ambiente

```bash
export SUPABASE_URL="https://SEU_PROJETO.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ...service_role..."   # NUNCA exponha no frontend
```

> A `SUPABASE_URL` é a mesma do app. A **service role key** está em
> Lovable → Backend → Project Settings → API. Guarde fora do repositório.

## Instalar

```bash
pip install supabase playwright python-dateutil
playwright install chromium
```

## Rodar

```bash
python collector.py                 # roda uma vez
python collector.py --loop --hours 4   # roda em loop a cada 4 horas
```

## Cron sugerido

A cada 1–4 horas. Os gráficos de "dia/hora" do dashboard dependem de
ter snapshots em intervalos regulares.

```cron
0 */4 * * * cd /opt/adspy && /usr/bin/python collector.py >> collector.log 2>&1
```

## Retenção

Periodicamente, chame `purge_old_snapshots(days)` no banco para limpar
histórico antigo (a função só pode ser executada pela service role):

```sql
select public.purge_old_snapshots(90);
```

## ⚠️ Importante

- Respeite os Termos de Uso da Meta e os limites de requisição.
- Use proxy rotativo e atrasos aleatórios para evitar bloqueios.
- O parser HTML/JSON da Meta muda com frequência — adapte `parse_library_page`.
- Em caso de erro, grave `scrape_ok=false` + `error_message` (o dashboard
  mostra um badge "falha na última coleta" no card da biblioteca).
