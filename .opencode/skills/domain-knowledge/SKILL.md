---
name: domain-knowledge
description: Conhecimento profundo dos conceitos de negócio e termos técnicos internos do InsaneSpy. Use quando precisar entender o que significam Library, Snapshot, Creative, Plano, Swipe, Diamond, Escalação, Score, Coleta, Pool de Chaves, e outros termos específicos do projeto.
---

## O que faço

Sou a enciclopédia do domínio InsaneSpy. Meu papel é garantir que você entenda o negócio antes de codar.

## Conceitos de Negócio

### O Problema Resolvido
Gestores de tráfego precisam espiar os anúncios dos concorrentes no Facebook/Instagram. A Meta Ad Library é pública mas complexa de monitorar sistematicamente. InsaneSpy automatiza isso.

### Biblioteca de Anúncios (Library)
A entidade central. Representa uma página anunciante no Facebook que o usuário quer monitorar.
- URL = busca na Meta Ad Library por nome da empresa/produto
- Um usuário pode ter N bibliotecas (limitado pelo plano)
- Status: `active` (coletando), `paused` (pausado), `archived` (arquivado)

### Snapshot
Fotografia do momento: quantos anúncios ativos essa biblioteca tinha quando o coletor rodou.
- Acumula ao longo do tempo → gráfico de evolução
- `scrape_ok=false` = coleta falhou (erro, bloqueio, etc.)
- A View `library_latest` sempre mostra o snapshot mais recente com `scrape_ok=true`

### Criativo (Creative)
Anúncio individual. Um anunciante pode ter dezenas de criativos diferentes rodando.
- `duplicate_count`: quantas contas estão usando esse mesmo criativo (métrica de escalação)
- `daysActive`: calculado no cliente
- Tipos: video | image

### Escalação
Quando um anunciante aumenta investimento agressivamente. Métricas:
- Delta entre snapshots: active_ads subindo rápido
- `isEscalating`: boolean no Library
- `escalationScore`: score numérico (0-100)
- Badge "escalando" no LibraryCard

### Swipe
Feature inspirada em apps de namoro. Shows criativos de várias bibliotecas para o usuário "deslizar" e descobrir ads virais/escalando. Restrito por plano:
- Free: sem acesso
- Pro: nichos liberados (parcial)
- Unlimited/DIAMOND: acesso total, incluindo bibliotecas ocultas

### Planos

| Codename | ID | Limite | Para quem |
|----------|----|--------|-----------|
| RECON | free | 5 libs, 2 dias histórico | Testar |
| OPERATIVE | pro | 10 libs, 30 dias | Validar antes de escalar |
| DIAMOND | unlimited | ∞ libs, 90 dias | Profissionais |

DIAMOND = plano topo, apenas trimestral, Pix tem desconto (R$237 vs R$247 cartão).

### Pool de Chaves (API Key Pool)
O coletor usa múltiplas chaves Firecrawl/ScraperAPI para paralelismo e failover.
- Firecrawl: funciona para facebook.com
- ScraperAPI: **NÃO funciona para facebook.com** (bloqueio TOS)
- Pool gerenciado pelo Admin em `/painel` → aba "APIs"
- Métricas: créditos restantes, latência, status

### Dashboard (Thematic Dashboard)
Agrupamento de bibliotecas por tema customizado. No schema mas UI não implementada.

### Niche (Nicho)
Tag de categorização criada pelo usuário. Ex: "E-commerce", "Infoprodutos", "Saúde".

## Mapeamento Código → Conceito

| Conceito | Arquivo | Linha/Função |
|---------|---------|-------------|
| Library type | `src/spa/lib/types.ts` | `interface Library` |
| Planos | `src/spa/lib/plans.ts` | `PLANS` constant |
| Store/State | `src/spa/lib/store.tsx` | `bootstrap()`, `mapLibrary()` |
| Coletor | `src/lib/collect.server.ts` | `runCollection()` |
| Pool de chaves | `src/lib/collect.server.ts` | `DYN_CACHE`, `EXHAUSTED` |
| Collections report | `src/lib/collect.server.ts` | `CollectReport`, `PageBreakdown` |
| Escalação score | `src/hooks/use-libraries.ts` | `useLibraryTrend()` |

## Termos que Confundem

**"biblioteca"** = não é uma lib npm. É uma "ad library" — página de anunciante monitorada.

**"snapshot"** = captura pontual (não um git snapshot). Dados de um momento específico.

**"coletor"** = sistema que scraped a Meta Ad Library e grava no banco.

**"painel"** = rota `/painel` (admin panel) — não confundir com dashboard (`/`).

**"creative" vs "criativo"** = mesmo conceito, inglês no código, português na UI.

**"running"** = status de coleta em andamento, não um processo Node.js.

## Atualizando Este Conhecimento

Quando novos conceitos de negócio forem adicionados ao projeto:
1. Adicionar entrada neste arquivo
2. Mapear para arquivo/função no código
3. Commit com mensagem `docs(domain): [conceito adicionado]`
