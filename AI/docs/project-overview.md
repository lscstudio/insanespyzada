# InsaneSpy — Visão Geral do Projeto

**Propósito**: Dashboard SaaS para monitorar bibliotecas de anúncios da Meta Ad Library (Facebook/Instagram). Espiona concorrentes, coleta snapshots periódicos de anúncios ativos, detecta escalação, exibe trends e rankings.

**Tagline do produto**: "Você está sendo observado."

## Modelo de Negócio

- **Planos**: Free (5 libs, 1h), Pro (10 libs, 45min, R$47/mês), Unlimited/DIAMOND (ilimitado, 45min, R$247/trimestre)
- **RBAC**: admin (controle total) + user. Owner permanente hardcoded via `OWNER_EMAIL`.
- **Coleta**: baseada em pool de chaves Firecrawl + ScraperAPI gerenciado no painel admin.

## Problema Central

Meta Ad Library é JS-heavy, bloqueia bots simples (ScraperAPI bloqueia facebook.com por TOS). Solução: **Firecrawl** (renderiza JS + extrai JSON estruturado via LLM).

## Estado Atual (25 Jul 2026)

- ✅ App ao vivo, auth funcionando, migrations aplicadas
- ✅ Coleta via Firecrawl (ScraperAPI NÃO funciona para facebook.com)
- ⏳ Google OAuth pendente (botão existe, configs não finalizadas)
- ⏳ Usuário precisa cadastrar chave Firecrawl válida no painel Admin

## Usuários do Sistema

- **Admin**: acesso ao `/painel` (gerenciar API keys, contas, membros)
- **User autenticado**: `/bibliotecas`, `/biblioteca/:id`, `/perfil`, `/configuracoes`
- **Não autenticado**: `/auth`, `/reset-password`

## Para mais detalhes

- Arquitetura técnica: `AI/docs/architecture.md`
- Domínio e conceitos: `AI/docs/domain.md`
- Estado atual e pendências: `HANDOFF.md`
