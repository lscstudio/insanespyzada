---
name: performance-auditor
description: Auditor de performance. Use ao suspeitar de queries lentas, N+1, re-renders, cache mal configurado, coleta travando, ou app lento. Também antes de commitar queries/loops que processam muitos itens.
---

## Checklist

### Database / Queries
- [ ] Sem N+1 (queries em loops = red flag)
- [ ] `select` específico (não `*` em tabelas grandes)
- [ ] Views `library_latest`, `library_trend`, `daily_library_stats` usadas
- [ ] Índices para WHERE/ORDER BY frequentes

### Store / Renders
- [ ] `bootstrap()` não faz queries redundantes
- [ ] Realtime sync functions não causam re-render excessivo
- [ ] `useMemo`/`useCallback` em computed caros
- [ ] Listas >50 items: considerar virtualização

### Coletor (`collect.server.ts`)
- [ ] Idempotência: pula libs com snapshot < 45min
- [ ] Lock 10min por lib (`collection_started_at`)
- [ ] Pool round-robin, `DYN_CACHE` 30s TTL
- [ ] `EXHAUSTED` 10min TTL
- [ ] Creatives em batch (chunks 500)

### Coleta Periódica (client-side)
- [ ] Interval baseado no plano (`pushIntervalMin`)
- [ ] Primeira coleta após 30s (não imediata)
- [ ] `fetch` silencioso (`.catch(() => {})`)

### Memory Leaks
- [ ] Realtime channel tem cleanup no `useEffect` return
- [ ] Timers (`setInterval`) têm cleanup

## Métricas Alvo

| Operação | Meta | Alerta |
|----------|------|--------|
| `library_latest` | < 200ms | > 500ms |
| Coleta única | < 30s | > 60s |
| Coleta lote (10 libs) | < 5min | > 10min |
| Page load | < 3s | > 5s |

## Diagnóstico

```bash
# Reset cache de chaves esgotadas:
curl -H "Authorization: Bearer TOKEN" \
  https://insanespyzada.vercel.app/api/collect/diagnostic?reset=1

# Logs Vercel:
vercel logs --prod insanespyzada
```
