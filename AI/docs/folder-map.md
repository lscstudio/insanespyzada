# InsaneSpy — Mapa de Pastas

```
insanespy/
├── AGENTS.md               # Bootstrap OpenCode (auto-carregado)
├── opencode.json           # Carrega AI/AI_INDEX.md (auto-carregado)
├── HANDOFF.md              # Estado atual entre sessões — LER PRIMEIRO
├── AI/
│   ├── AI_INDEX.md         # Índice mestre (auto-carregado)
│   ├── PROJECT_STATE.md    # Estado atual do projeto
│   ├── DECISIONS.md        # Log de decisões arquiteturais
│   ├── KNOWN_ISSUES.md     # Bugs, débito técnico, workarounds
│   └── docs/               # Documentação por tema
├── .opencode/
│   └── skills/             # 8 Skills (carregadas on-demand)
├── src/
│   ├── routes/             # TanStack Router (apenas shell + API)
│   │   ├── __root.tsx      # HTML shell, QueryClientProvider, meta tags
│   │   ├── $.tsx           # Catch-all → renderiza src/spa/App.tsx (ssr:false)
│   │   └── api/            # API routes server-side
│   │       ├── collect.tsx          # POST /api/collect
│   │       ├── admin.tsx            # POST /api/admin
│   │       ├── delete-account.tsx   # POST /api/delete-account
│   │       ├── collect/diagnostic.tsx
│   │       └── public/hooks/heartbeat-7f3a9b2e8c1d4a6b.ts
│   ├── spa/                # ★ APLICAÇÃO REAL (SPA auto-contida)
│   │   ├── App.tsx         # BrowserRouter + RequireAuth + routes
│   │   ├── pages/          # Páginas (PascalCase)
│   │   │   ├── Home.tsx              # / (Overview/Dashboard)
│   │   │   ├── Bibliotecas.tsx       # /bibliotecas
│   │   │   ├── BibliotecaDetail.tsx  # /biblioteca/:id
│   │   │   ├── Swipe.tsx             # /swipe
│   │   │   ├── Assinatura.tsx        # /assinatura
│   │   │   ├── Configuracoes.tsx     # /configuracoes
│   │   │   ├── Admin.tsx             # /admin (1103 linhas, tabs: painel/contas/membros/keys/nichos)
│   │   │   ├── Auth.tsx              # /auth
│   │   │   └── ResetPassword.tsx     # /reset-password
│   │   ├── components/     # Componentes SPA (PascalCase)
│   │   │   ├── ui.tsx                 # Primitivos: Badge, Button, Card, Modal, etc.
│   │   │   ├── LibraryCard.tsx        # Card de biblioteca
│   │   │   ├── CreativeThumb.tsx      # Thumbnail de criativo
│   │   │   ├── MecanismosTree.tsx     # Árvore de mecanismos
│   │   │   ├── NotificationsBell.tsx  # Sino de notificações
│   │   │   ├── OverviewChart.tsx      # Gráfico do overview
│   │   │   ├── PremiumLineChart.tsx   # Gráfico de linha premium
│   │   │   ├── charts.tsx             # Wrappers Recharts
│   │   │   ├── Toasts.tsx             # Sistema de toasts
│   │   │   └── layout/AppLayout.tsx   # Shell autenticado (sidebar, nav)
│   │   └── lib/            # State + utils do SPA
│   │       ├── store.tsx              # ★ StoreProvider (1545 linhas) — state central
│   │       ├── types.ts               # Tipos do domínio
│   │       ├── plans.ts               # Planos Free/Pro/Unlimited
│   │       ├── admin.ts               # callAdmin(), useAdminCheck()
│   │       ├── mock.ts                # Dados mock (seed)
│   │       └── format.ts              # Formatação (num, dateBR, timeAgo)
│   ├── lib/                # Server-side (usado por API routes)
│   │   ├── collect.server.ts          # ★ Motor de coleta (server-only, dinâmico import)
│   │   ├── *.functions.ts             # Server functions (createServerFn — scaffold)
│   │   ├── i18n.tsx                   # Sistema de tradução
│   │   ├── types.ts                   # Tipos compartilhados
│   │   ├── utils.ts                   # cn() e utilidades
│   │   └── format.ts                  # Formatação server-side
│   ├── hooks/              # ⚠ Scaffold Lovable (NÃO usado pelo SPA)
│   ├── components/          # ⚠ Scaffold Lovable (NÃO usado pelo SPA)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts              # Client browser (anon) — USADO pelo SPA
│   │       ├── client.server.ts       # Client server (service role) — SERVER ONLY
│   │       ├── auth-middleware.ts     # requireSupabaseAuth
│   │       └── types.ts               # Tipos gerados do schema
│   ├── router.tsx          # Config router
│   ├── routeTree.gen.ts    # AUTO-GERADO — não editar
│   ├── server.ts           # Entry SSR
│   └── start.ts            # Entry client
├── supabase/
│   ├── migrations/         # 27 SQL migrations
│   └── config.toml         # project_id = "yigyythppceqyjhxzsav"
├── collector/
│   └── collector.py        # Coletor externo (Playwright)
├── vite.config.ts          # @lovable.dev/vite-tanstack-config
└── .env.example            # Documenta 5 vars
```

## Arquivos Críticos (Não Quebrar)

| Arquivo | Risco |
|---------|-------|
| `vite.config.ts` | Adicionar plugins duplica e quebra build |
| `src/spa/lib/store.tsx:bootstrap()` | try/catch/finally — não remover |
| `src/integrations/supabase/client.ts` | Auto-gerado, lazy Proxy — não remover try/catch |
| `src/routes/__root.tsx` | `ssr: false` — não mudar para true |
| `src/routes/$.tsx` | Catch-all que monta o SPA — não remover |
| `src/lib/admin-members.functions.ts` | `OWNER_EMAIL` hardcoded — super-admin protegido |
| `src/routeTree.gen.ts` | AUTO-GERADO — nunca editar |
| `.gitignore` | `!.env.example` DEPOIS de `.env*` — não reordenar |

## Onde Adicionar Novas Features

| Feature | Diretório |
|---------|-----------|
| Nova página | `src/spa/pages/` (PascalCase) + rota em `src/spa/App.tsx` |
| Novo componente | `src/spa/components/` (PascalCase) |
| Novo primitivo UI | Adicionar em `src/spa/components/ui.tsx` (arquivo único) |
| Nova API route | `src/routes/api/` |
| Nova migration | `supabase/migrations/` (via Management API) |
| Nova server function | `src/lib/*.functions.ts` (só se usar createServerFn) |
| Hook de data | Adicionar método em `src/spa/lib/store.tsx` (NÃO criar hook separado) |
