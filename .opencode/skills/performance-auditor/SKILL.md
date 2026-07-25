---
name: performance-auditor
description: Auditor de performance para o InsaneSpy. Use quando suspeitar de queries lentas, N+1, re-renders desnecessários, cache mal configurado, coleta travando, ou quando o app parecer lento. Também use antes de commitar queries ou loops que processam muitos itens.
---

## O que faço

Identifico gargalos de performance antes que afetem usuários.

## Checklist de Performance

### Database / Queries

- [ ] N+1 evitado: queries em loops = red flag
  ```typescript
  // ERRADO — N+1:
  for (const lib of libraries) {
    await supabase.from("snapshots").select("*").eq("library_id", lib.id);
  }
  // CERTO — 1 query:
  await supabase.from("snapshots").select("*").in("library_id", ids);
  ```
- [ ] SELECTs especificam apenas colunas necessárias (não `select("*")` em tabelas grandes)
- [ ] Paginação implementada para listas grandes (`.range(from, to)`)
- [ ] Views `library_latest`, `library_trend`, `daily_library_stats` usadas ao invés de joins manuais
- [ ] Índices existem para `WHERE`/`ORDER BY` frequentes (checar migrations)

### TanStack Query / Cache

- [ ] `staleTime` adequado: dados que mudam raramente devem ter staleTime alto
  - `library_latest`: 1-5min (coletas são espaçadas)
  - `daily_stats`: 5-15min (atualiza diariamente)
  - `user_profile`: 10min+ (muda raramente)
- [ ] `refetchInterval` não muito agressivo (< 30s em produção para maioria dos dados)
- [ ] `useRealtimeRefresh` invalida os queryKeys corretos após INSERT
- [ ] Sem `refetchOnWindowFocus: true` em dados que não precisam ser tão frescos
- [ ] QueryKeys estáveis (não criar objetos/arrays inline que causam re-fetch constante)

### React Renders

- [ ] Componentes grandes têm `React.memo` se recebem muitas props estáticas
- [ ] Callbacks em props usam `useCallback` quando passados para listas
- [ ] Computed values caros usam `useMemo`
- [ ] Lists longas (>50 items) consideram virtualização
- [ ] Framer Motion: `animate` só para mudanças visíveis, não em loops

### Coletor (`collect.server.ts`)

- [ ] Coleta em lote não processa libs já coletadas nos últimos 45min (idempotência)
- [ ] Lock por biblioteca (`collection_started_at`, TTL 10min) evita coletas paralelas
- [ ] Pool de chaves usa round-robin, não sempre a primeira chave
- [ ] `DYN_CACHE` tem TTL 30s — não recarrega a cada request
- [ ] Chaves `EXHAUSTED` têm TTL 10min (era 1h, já corrigido)
- [ ] Creatives inseridos em batch (chunks de 500)

### Scheduler / Cron

- [ ] Webhook cron usa `EdgeRuntime.waitUntil` quando disponível (não bloqueia response)
- [ ] Coleta em lote não dispara para todos os usuários simultaneamente (considerar fan-out)

### Bundle / Build

- [ ] Imports de `collect.server.ts` são dinâmicos (`await import(...)`) — dead code elimination
- [ ] shadcn components importados individualmente (não barrel import)
- [ ] Imagens no `public/` otimizadas
- [ ] Recharts: datasets grandes devem ser sampliados antes de renderizar

### Memory Leaks

- [ ] Subscriptions Realtime têm cleanup no `useEffect` return
- [ ] Timers (`setInterval`/`setTimeout`) têm cleanup
- [ ] Event listeners removidos no unmount

## Métricas Alvo

| Operação | Meta | Alerta |
|----------|------|--------|
| `library_latest` query | < 200ms | > 500ms |
| Coleta única (Firecrawl) | < 30s | > 60s |
| Coleta em lote (10 libs) | < 5min | > 10min |
| Initial page load | < 3s | > 5s |
| Query cache hit rate | > 80% | < 50% |

## Diagnóstico de Coleta Lenta

```bash
# Verificar chaves esgotadas (reset cache):
curl -H "Authorization: Bearer TOKEN" https://insanespyzada.vercel.app/api/collect/diagnostic?reset=1

# Verificar logs Vercel:
vercel logs --prod insanespyzada

# Query para ver últimas coletas com erro:
SELECT id, last_collection_error, collection_started_at 
FROM libraries 
WHERE last_collection_error IS NOT NULL 
ORDER BY updated_at DESC LIMIT 10;
```
