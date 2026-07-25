---
name: security-reviewer
description: Revisor de segurança. Use após mudanças em auth, autorização, endpoints, env vars, RLS, webhooks, uploads. Também antes de commitar feature com input externo.
---

## Checklist

### Auth & Autorização
- [ ] `RequireAuth` em `src/spa/App.tsx` envolve todas as rotas autenticadas
- [ ] `useAdminCheck()` protege página Admin (`/admin`)
- [ ] API routes validam Bearer JWT (`supabase.auth.getUser(token)`)
- [ ] Admin gates usam `has_role(userId, 'admin')` via RPC
- [ ] `OWNER_EMAIL` em `admin-members.functions.ts` preservado

### Service Role (CRÍTICO)
- [ ] `supabaseAdmin` (`client.server.ts`) nunca em `src/spa/`, `src/components/`, `src/hooks/`
- [ ] Apenas em `src/routes/api/*.tsx` e `src/lib/*.server.ts`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` nunca em variável `VITE_*`
- [ ] `*.server.ts` importados dinamicamente: `await import("@/lib/collect.server")`

### RLS
- [ ] Novas tabelas têm `ENABLE ROW LEVEL SECURITY`
- [ ] `snapshots`/`creatives`: escrita apenas service role
- [ ] Políticas `SELECT` scoped por `created_by = auth.uid()`

### Endpoints
- [ ] APIs públicas (`/api/public/`) têm auth própria (apikey header)
- [ ] Webhook cron usa caminho obscurecido + `SUPABASE_PUBLISHABLE_KEY`
- [ ] `/api/collect/diagnostic` gated por admin
- [ ] Input validado (Zod ou type narrowing)

### Env Vars
- [ ] `.env*` no `.gitignore` (exceto `.env.example`)
- [ ] `.env.example` só tem placeholders
- [ ] Sem secrets no código

### Uploads
- [ ] Avatar: validar tipo MIME + tamanho
- [ ] Bucket `avatars` com RLS

## Áreas de Risco

| Área | Mitigação |
|------|-----------|
| `collect.server.ts` | Import dinâmico server-only |
| `admin-members.functions.ts` | `has_role` + `OWNER_EMAIL` |
| Webhook cron | Caminho obscuro + apikey |
| Diagnostic endpoint | Gated por admin |
