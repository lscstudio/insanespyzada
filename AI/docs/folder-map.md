# InsaneSpy — Mapa de Pastas

```
insanespy/
├── AGENTS.md               # Bootstrap OpenCode (carregado automaticamente)
├── HANDOFF.md              # Estado atual, pendências, histórico de bugs — LER PRIMEIRO
├── AI/
│   ├── AI_INDEX.md         # Índice mestre de documentação (carregado via opencode.json)
│   └── docs/               # Documentação persistente
├── .opencode/
│   └── skills/             # 8 Skills de IA (carregadas on-demand)
├── src/
│   ├── routes/             # File-based routing (TanStack Router)
│   │   ├── __root.tsx      # App shell
│   │   ├── _authenticated/ # Layout guard (sessão obrigatória)
│   │   └── api/            # API routes server-side
│   ├── components/
│   │   ├── ui/             # shadcn/ui — NÃO editar diretamente
│   │   ├── layout/
│   │   │   └── app-shell.tsx  # Shell autenticado (sidebar, nav)
│   │   ├── library-card.tsx
│   │   ├── add-library-modal.tsx
│   │   ├── count-up.tsx
│   │   └── language-switcher.tsx
│   ├── hooks/
│   │   ├── use-auth.ts         # Sessão Supabase
│   │   ├── use-libraries.ts    # TanStack Query p/ bibliotecas/snap/creative
│   │   ├── use-profile.ts      # Perfil + avatar upload
│   │   ├── use-realtime-refresh.ts  # Realtime → invalida cache
│   │   └── use-mobile.tsx      # Breakpoint
│   ├── lib/
│   │   ├── collect.server.ts   # Motor de coleta (871 linhas, server-only)
│   │   ├── *.functions.ts      # Server functions (createServerFn)
│   │   ├── i18n.tsx            # Sistema de tradução pt/en/es
│   │   ├── types.ts            # Tipos compartilhados
│   │   ├── utils.ts            # Utilitários gerais
│   │   └── format.ts           # Formatação de dados
│   ├── integrations/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Client browser (anon)
│   │   │   ├── client.server.ts  # Client server (service role — SERVER ONLY)
│   │   │   ├── auth-middleware.ts  # Valida JWT
│   │   │   ├── auth-attacher.ts
│   │   │   └── types.ts        # Tipos gerados do schema
│   │   └── lovable/            # Google OAuth
│   ├── spa/                    # SPA legacy (páginas antigas)
│   │   ├── pages/              # Componentes de página SPA
│   │   └── lib/
│   │       ├── store.tsx       # Store global (bootstrap + state)
│   │       ├── types.ts        # Tipos do domínio SPA
│   │       ├── plans.ts        # Definição dos planos Free/Pro/Unlimited
│   │       └── mock.ts         # Dados mock (usado em seed)
│   ├── router.tsx              # Configuração do router
│   ├── routeTree.gen.ts        # AUTO-GERADO — não editar
│   ├── server.ts               # Entry SSR
│   └── start.ts                # Entry client
├── supabase/
│   ├── migrations/             # 27 SQL migrations
│   └── config.toml             # project_id = "yigyythppceqyjhxzsav"
├── collector/
│   ├── collector.py            # Coletor externo (Playwright)
│   └── README.md
├── public/                     # Assets estáticos
├── vite.config.ts              # Usa @lovable.dev/vite-tanstack-config
├── tsconfig.json
├── components.json             # shadcn/ui config
├── opencode.json               # Instructions auto-carregadas
└── .env.example                # Documenta vars de ambiente
```

## Arquivos Críticos (Não Quebrar)

| Arquivo | Risco |
|---------|-------|
| `vite.config.ts` | Adicionar plugins duplica e quebra build |
| `src/integrations/supabase/client.ts` | Auto-gerado, lazy Proxy — não remover try/catch em store.tsx |
| `src/spa/lib/store.tsx:bootstrap()` | Envolvido em try/catch/finally — não remover |
| `src/lib/admin-members.functions.ts` | Hardcoda OWNER_EMAIL como super-admin |
| `src/routeTree.gen.ts` | AUTO-GERADO pelo router plugin — nunca editar |
| `.gitignore` | `!.env.example` deve vir DEPOIS de `.env*` — não reordenar |

## Onde Adicionar Novas Features

| Feature | Diretório |
|---------|-----------|
| Nova página | `src/routes/_authenticated/` |
| Nova API route | `src/routes/api/` |
| Novo componente UI | `src/components/` |
| Novo hook Query | `src/hooks/` |
| Nova server function | `src/lib/*.functions.ts` |
| Nova migration | `supabase/migrations/` (via Management API) |
| Novo primitivo shadcn | `src/components/ui/` |
