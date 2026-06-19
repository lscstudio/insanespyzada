import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "pt" | "en";

const STORAGE_KEY = "insanespy:lang";

// PT (key) -> EN (translation). Missing keys fall through to the PT key.
const DICT: Record<string, string> = {
  // Generic
  "Salvar": "Save",
  "Salvando…": "Saving…",
  "Cancelar": "Cancel",
  "Adicionar": "Add",
  "Editar": "Edit",
  "Excluir": "Delete",
  "Atualizar": "Update",
  "Atualizando...": "Updating...",
  "Atualizar agora": "Update now",
  "Carregando…": "Loading…",
  "Sem dados ainda.": "No data yet.",
  "Sair": "Sign out",
  "Você saiu": "You have signed out",
  "Abrir menu": "Open menu",
  "Recolher sidebar": "Collapse sidebar",
  "Alternar tema": "Toggle theme",
  "Perfil": "Profile",
  "Nova": "New",
  "Adicionar biblioteca": "Add library",
  "Idioma": "Language",
  "Português": "Portuguese",
  "Inglês": "English",
  "Trocar idioma": "Change language",

  // Sidebar / Shell
  "Visão Geral": "Overview",
  "Bibliotecas": "Libraries",
  "Configurações": "Settings",
  "Você está sendo observado": "You are being watched",
  "Bibliotecas novas são mineradas na hora.": "New libraries are mined instantly.",

  // Overview
  "Panorama em tempo quase real das bibliotecas que você monitora.":
    "Near real-time overview of the libraries you monitor.",
  "Bibliotecas ativas": "Active libraries",
  "Anúncios ativos (soma)": "Active ads (sum)",
  "Biblioteca líder": "Leading library",
  "Coletas na última 1h": "Collections in the last 1h",
  "Evolução de anúncios ativos": "Active ads evolution",
  "Soma diária da média de anúncios ativos.": "Daily sum of average active ads.",
  "7 dias": "7 days",
  "14 dias": "14 days",
  "30 dias": "30 days",
  "Mais escaladas": "Top scaled",
  "Top 10 por anúncios ativos": "Top 10 by active ads",
  "Movimentação na última 1h": "Movement in the last 1h",
  "Bibliotecas que subiram ou caíram em anúncios ativos.":
    "Libraries that went up or down in active ads.",
  "Sem variações na última 1h. Tudo estável.": "No variations in the last 1h. All stable.",
  "Nenhuma biblioteca ainda. Vá para": "No libraries yet. Go to",
  "e adicione a primeira.": "and add the first one.",
  "anúncios": "ads",

  // Libraries page
  "monitorada": "monitored",
  "monitoradas": "monitored",
  "de": "of",
  "biblioteca": "library",
  "bibliotecas": "libraries",
  "Buscar por termo, nicho ou observações…": "Search by term, niche or notes…",
  "Nicho": "Niche",
  "Todos os nichos": "All niches",
  "Todos idiomas": "All languages",
  "Status": "Status",
  "Todos status": "All statuses",
  "Ativa": "Active",
  "Pausada": "Paused",
  "Arquivada": "Archived",
  "Visualização em grade": "Grid view",
  "Visualização em lista": "List view",
  "Nenhum resultado para os filtros": "No results for the filters",
  "Comece adicionando sua primeira biblioteca": "Start by adding your first library",
  "Cole o link de uma busca na Biblioteca de Anúncios da Meta. A mineração roda na hora e os números aparecem aqui automaticamente.":
    "Paste a search link from Meta Ad Library. Mining runs instantly and numbers appear here automatically.",
  "Nenhuma biblioteca ativa para atualizar": "No active library to update",
  "biblioteca(s) atualizadas": "library(ies) updated",
  "falha(s)": "failure(s)",
  "Falha ao atualizar": "Failed to update",
  "Erro desconhecido": "Unknown error",

  // Library card
  "Sem título": "Untitled",
  "Anúncios ativos": "Active ads",
  "Atualizado": "Updated",
  "falha": "failed",
  "Pausar": "Pause",
  "Ativar": "Activate",
  "Abrir na Meta": "Open on Meta",
  "Biblioteca pausada": "Library paused",
  "Biblioteca ativada": "Library activated",
  "Biblioteca excluída": "Library deleted",
  "Excluir biblioteca?": "Delete library?",

  // Add library modal
  "Editar biblioteca": "Edit library",
  "Dê um nome curto pra essa biblioteca (oferta, mecanismo, ângulo) e cole o link da Meta Ad Library.":
    "Give this library a short name (offer, mechanism, angle) and paste the Meta Ad Library link.",
  "Título": "Title",
  "Ex: Oferta do azeite — mecanismo digestivo": "Ex: Olive oil offer — digestive mechanism",
  "Aparece em todos os lugares no lugar do link da biblioteca.":
    "Appears everywhere instead of the library link.",
  "Link da biblioteca": "Library link",
  "Termo detectado:": "Detected term:",
  "Selecione um nicho": "Select a niche",
  "Sem nicho": "No niche",
  "Gerencie nichos em Configurações.": "Manage niches in Settings.",
  "Selecione": "Select",
  "Observações": "Notes",
  "Oferta, mecanismo, ângulo…": "Offer, mechanism, angle…",
  "Ao adicionar uma biblioteca ativa, a mineração roda na hora e atualiza os dados ao vivo.":
    "When you add an active library, mining runs instantly and updates data live.",
  "Salvar e minerar": "Save and mine",
  "Adicionar e minerar": "Add and mine",
  "Minerando…": "Mining…",
  "Biblioteca adicionada": "Library added",
  "Biblioteca atualizada": "Library updated",
  "Não foi possível salvar": "Could not save",

  // Profile
  "Gerencie sua conta e preferências.": "Manage your account and preferences.",
  "Nome de exibição": "Display name",
  "Como devemos te chamar?": "How should we call you?",
  "Trocar foto": "Change photo",
  "Selecione uma imagem": "Select an image",
  "Imagem muito grande (máx 5MB)": "Image too large (max 5MB)",
  "Foto atualizada": "Photo updated",
  "Nome atualizado": "Name updated",
  "E-mail": "Email",
  "Você receberá um e-mail de confirmação no novo endereço.":
    "You will receive a confirmation email at the new address.",
  "Verifique seu e-mail": "Check your email",
  "Enviamos um link de confirmação para o novo endereço.":
    "We sent a confirmation link to the new address.",
  "Alterar senha": "Change password",
  "Nova senha": "New password",
  "Confirmar nova senha": "Confirm new password",
  "Senha precisa ter ao menos 6 caracteres": "Password must be at least 6 characters",
  "Senhas não coincidem": "Passwords do not match",
  "Senha alterada": "Password changed",
  "Zona perigosa": "Danger zone",
  "Excluir sua conta remove permanentemente todas as suas bibliotecas, snapshots, criativos e sua foto. Esta ação não pode ser desfeita.":
    "Deleting your account permanently removes all your libraries, snapshots, creatives and your photo. This action cannot be undone.",
  "Excluir minha conta": "Delete my account",
  "Tem certeza?": "Are you sure?",
  "Esta ação é irreversível. Todos os seus dados serão apagados imediatamente.":
    "This action is irreversible. All your data will be deleted immediately.",
  "Sim, excluir": "Yes, delete",
  "Conta excluída": "Account deleted",

  // Settings
  "Coletor, nichos e dados de demonstração.": "Collector, niches and demo data.",
  "Coletor da Meta Ad Library": "Meta Ad Library collector",
  "Roda automaticamente a cada 4 horas. Dispare uma coleta imediata abaixo.":
    "Runs automatically every 4 hours. Trigger an immediate collection below.",
  "Coletando...": "Collecting...",
  "Coletar agora": "Collect now",
  "Última coleta": "Last collection",
  "ativos": "active",
  "únicos": "unique",
  "Nichos": "Niches",
  "Crie, edite e exclua os nichos disponíveis ao adicionar bibliotecas.":
    "Create, edit and delete the niches available when adding libraries.",
  "Ex.: Saúde, Coaching, Imobiliário…": "Ex.: Health, Coaching, Real Estate…",
  "Nenhum nicho ainda. Crie o primeiro acima.": "No niches yet. Create the first one above.",
  "Nicho criado": "Niche created",
  "Nicho atualizado": "Niche updated",
  "Nicho excluído": "Niche deleted",
  "Não foi possível criar": "Could not create",
  "Não foi possível atualizar": "Could not update",
  "Não foi possível excluir": "Could not delete",
  "Dados de demonstração": "Demo data",
  "Insere 3 bibliotecas de exemplo com 14 dias de snapshots fictícios.":
    "Inserts 3 sample libraries with 14 days of fictional snapshots.",
  "Inserir bibliotecas demo": "Insert demo libraries",
  "Remover dados demo": "Remove demo data",
  "Dados de demonstração inseridos": "Demo data inserted",
  "Dados de demonstração removidos": "Demo data removed",

  // Auth
  "Entrar": "Sign in",
  "Criar conta": "Sign up",
  "Continuar com Google": "Continue with Google",
  "ou com email": "or with email",
  "Email": "Email",
  "Senha": "Password",
  "Esqueci a senha": "Forgot password",
  "Enviando...": "Sending...",
  "Mínimo 8 caracteres": "Minimum 8 characters",
  "Email inválido": "Invalid email",
  "O painel é privado. Apenas usuários autenticados acessam os dados.":
    "The dashboard is private. Only authenticated users access the data.",
  "Bem-vindo de volta!": "Welcome back!",
  "Conta criada": "Account created",
  "Você já pode entrar.": "You can now sign in.",
  "Não foi possível autenticar": "Could not authenticate",
  "Não foi possível entrar com Google": "Could not sign in with Google",
  "Erro inesperado": "Unexpected error",
  "Informe seu email acima primeiro": "Enter your email above first",
  "Email enviado": "Email sent",
  "Verifique sua caixa de entrada para redefinir a senha.":
    "Check your inbox to reset your password.",
  "Não foi possível enviar o email": "Could not send email",

  // 404 / Error
  "Página não encontrada": "Page not found",
  "A página que você procura não existe ou foi movida.":
    "The page you are looking for does not exist or has been moved.",
  "Voltar ao início": "Back to home",
  "Esta página não carregou": "This page did not load",
  "Algo deu errado. Tente novamente ou volte ao início.":
    "Something went wrong. Try again or go back home.",
  "Tentar novamente": "Try again",
  "Início": "Home",

  // Sidebar extra
  "Painel": "Dashboard",

  // Painel admin
  "A página que você procura não existe.": "The page you are looking for does not exist.",
  "Painel Administrativo": "Admin Dashboard",
  "APIs, créditos e uso por conta — atualizado em tempo real.":
    "APIs, credits and usage per account — updated in real time.",
  "APIs": "APIs",
  "Contas": "Accounts",
  "APIs Conectadas": "Connected APIs",
  "com erro": "with errors",
  "Funcionando": "Working",
  "configuradas": "configured",
  "Em Uso": "In Use",
  "pool ativo c/ failover": "active pool w/ failover",
  "Créditos Totais": "Total Credits",
  "Créditos por chave": "Credits per key",
  "Distribuição por provider": "Distribution by provider",
  "Status detalhado das chaves": "Detailed key status",
  "Vazia": "Empty",
  "Online": "Online",
  "Falha": "Failed",
  "créditos": "credits",
  "usados": "used",
  "total": "total",
  "Coletas (30d)": "Collections (30d)",
  "Créditos consumidos (30d)": "Credits used (30d)",
  "Coletas por dia (últimos 30 dias)": "Collections per day (last 30 days)",
  "Top consumidores (30d)": "Top consumers (30d)",
  "(sem email)": "(no email)",
  "Todas as contas": "All accounts",
  "Filtrar por email...": "Filter by email...",
  "coletas/30d": "collections/30d",
  "último login": "last login",
  "créditos 30d": "credits 30d",
  "Ver →": "View →",
  "Nenhuma conta encontrada.": "No accounts found.",
  "Voltar": "Back",
  "anúncios ativos": "active ads",
  "Última coleta:": "Last collection:",
  "Sem coletas": "No collections",
  "Sem nome": "No name",
  "ads ativos": "active ads",

  // Library detail
  "Biblioteca não encontrada.": "Library not found.",
  "falha na última coleta": "failure on last collection",
  "Variação vs coleta anterior": "Change vs previous collection",
  "Última coleta": "Last collection",
  "Última coleta falhou": "Last collection failed",
  "Mineração saudável": "Mining healthy",
  "Evolução": "Evolution",
  "Média diária de anúncios ativos.": "Daily average of active ads.",
  "Snapshots crus das últimas {h} horas.": "Raw snapshots from the last {h} hours.",
  "Hora": "Hour",
  "Dia": "Day",
  "Criativo mais escalado": "Top scaled creative",
  "Com mais duplicações conforme a própria Meta exibe.":
    "With most duplications as shown by Meta itself.",
  "Sem criativos no último snapshot.": "No creatives in the last snapshot.",
  "#1 escalado": "#1 scaled",
  "duplicações": "duplications",
  "Abrir criativo na Meta": "Open creative on Meta",
  "Páginas ativas": "Active pages",
  "Ranking por anúncios ativos nesta biblioteca.": "Ranking by active ads in this library.",
  "Sem detecção de páginas no último snapshot.": "No pages detected in the last snapshot.",
  "Histórico de snapshots": "Snapshot history",
  "{n} coletas registradas.": "{n} collections recorded.",
  "Sem snapshots ainda.": "No snapshots yet.",
  "Coletado em": "Captured at",
  "Ativos": "Active",
  "Top": "Top",
  "Únicos": "Unique",
  "OK": "OK",
  "Falhou": "Failed",
  "Página {a} de {b}": "Page {a} of {b}",
  "Anterior": "Previous",
  "Próxima": "Next",
  "Média:": "Average:",
  "Máximo:": "Maximum:",
  "Biblioteca": "Library",
  "Esta ação remove permanentemente": "This action permanently removes",

  // Reset password
  "Redefinir senha": "Reset password",
  "A senha deve ter pelo menos 8 caracteres": "Password must be at least 8 characters",
  "Senha atualizada": "Password updated",
  "Você já pode entrar.": "You can now sign in.",
  "Não foi possível atualizar a senha": "Could not update password",
  "Link inválido ou expirado. Solicite uma nova redefinição na tela de login.":
    "Invalid or expired link. Request a new reset on the login screen.",
  "Confirmar senha": "Confirm password",
  "Salvar nova senha": "Save new password",
};

// Simple template helper: tf("foo {x}", { x: 1 })
export function tf(str: string, vars: Record<string, string | number>) {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}


type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };

const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === "pt" || stored === "en") setLangState(stored);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: string) => (lang === "en" ? DICT[key] ?? key : key),
    [lang],
  );

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // Fallback identity during SSR shell or outside provider
    return { lang: "pt" as Lang, setLang: () => {}, t: (k: string) => k };
  }
  return ctx;
}

export function useT() {
  return useLang().t;
}
