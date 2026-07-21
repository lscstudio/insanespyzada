import { useRef, useState, type FormEvent } from "react";
import {
  Check,
  KeyRound,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  User as UserIcon,
  Plus,
  LayoutDashboard,
  Flame,
  ChevronRight,
  X,
} from "lucide-react";
import { useStore } from "../lib/store";
import { PLANS } from "../lib/plans";
import { num, dateBR } from "../lib/format";
import { Badge, Button, Card, Input, Modal, EmptyState } from "../components/ui";
import { supabase } from "@/integrations/supabase/client";

type Tab = "perfil" | "dashboards";

const AVATAR_COLORS = ["#0F52BA", "#7c3aed", "#0891b2", "#dc2626", "#059669", "#d97706"];

export function Configuracoes() {
  const [tab, setTab] = useState<Tab>("perfil");

  const TABS: { id: Tab; label: string; icon: typeof UserIcon }[] = [
    { id: "perfil", label: "Perfil", icon: UserIcon },
    { id: "dashboards", label: "Dashboards", icon: LayoutDashboard },
  ];

  return (
    <div className="space-y-6" data-page-fade>
      <div>
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Configurações</h1>
        <p className="mt-1 text-xs text-ink-2 dark:text-dink-2">Gerencie sua conta e dashboards.</p>
      </div>

      <div className="flex flex-wrap overflow-x-auto border-b border-line dark:border-dline">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              tab === t.id
                ? "border-b-2 border-brand text-brand dark:border-brand-bright dark:text-brand-bright"
                : "border-b-2 border-transparent text-ink-2 hover:text-ink dark:text-dink-2 dark:hover:text-dink"
            }`}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      <div data-tab-fade key={tab}>
        {tab === "perfil" && <PerfilTab />}
        {tab === "dashboards" && <DashboardsTab />}
      </div>
    </div>
  );
}

/* ======================================================
 * TAB: PERFIL
 * ====================================================== */
function PerfilTab() {
  const {
    session,
    avatarUrl,
    avatarLoading,
    plan,
    libraries,
    updateProfile,
    uploadAvatar,
    deleteAccount,
    toast,
  } = useStore();
  const p = PLANS[plan];

  const [name, setName] = useState(session?.name ?? "");
  const [email, setEmail] = useState(session?.email ?? "");
  const [hueIdx, setHueIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  if (!session) return null;

  const initials = (name || session.name)
    .split(" ")
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.includes("@")) {
      toast("Verifique nome e e-mail.", "error");
      return;
    }
    setSaving(true);
    await updateProfile(name.trim(), email.trim());
    setSaving(false);
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (currentPass.length < 4) return toast("Informe sua senha atual.", "error");
    if (newPass.length < 6) return toast("A nova senha precisa de ao menos 6 caracteres.", "error");
    if (newPass !== confirmPass) return toast("As senhas não conferem.", "error");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      toast("Senha alterada com sucesso.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao alterar senha", "error");
    }
  }

  function onPickAvatar() {
    fileRef.current?.click();
  }

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
    e.target.value = "";
  }

  async function doDelete() {
    setDeleting(true);
    await deleteAccount();
    setDeleting(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* avatar + resumo */}
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4 py-2">
            <div
              className="flex h-24 w-24 items-center justify-center overflow-hidden border-2 text-3xl font-extrabold text-white"
              style={{
                background: avatarUrl ? "transparent" : AVATAR_COLORS[hueIdx],
                borderColor: AVATAR_COLORS[hueIdx],
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onAvatarFile}
              className="hidden"
            />
            <Button variant="outline" onClick={onPickAvatar} disabled={avatarLoading}>
              {avatarLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              Enviar foto
            </Button>
            {!avatarUrl && (
              <Button
                variant="ghost"
                onClick={() => setHueIdx((i) => (i + 1) % AVATAR_COLORS.length)}
              >
                <RefreshCw size={12} /> Trocar cor
              </Button>
            )}
            <div className="text-center">
              <div className="text-sm font-extrabold uppercase">{session.name}</div>
              <div className="text-[11px] text-ink-3 dark:text-dink-3">{session.email}</div>
              <Badge tone="brand" className="mt-2">
                {p.name} · {p.codename}
              </Badge>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line dark:border-dline dark:bg-dline">
            <div className="bg-card p-3 text-center dark:bg-dcard">
              <div className="text-lg font-extrabold tabular-nums">{libraries.length}</div>
              <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-ink-3 dark:text-dink-3">
                bibliotecas
              </div>
            </div>
            <div className="bg-card p-3 text-center dark:bg-dcard">
              <div className="text-lg font-extrabold tabular-nums">
                {libraries.filter((l) => l.favorite).length}
              </div>
              <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-ink-3 dark:text-dink-3">
                favoritas
              </div>
            </div>
          </div>
        </Card>

        {/* dados básicos */}
        <Card className="p-6">
          <h2 className="text-xl font-extrabold uppercase tracking-tight">Dados básicos</h2>
          <form onSubmit={saveProfile} className="mt-4 space-y-4">
            <div className="relative">
              <UserIcon
                size={14}
                className="absolute right-3 top-[38px] text-ink-3 dark:text-dink-3"
              />
              <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 size={13} className="animate-spin" />}
              <Check size={13} /> Salvar alterações
            </Button>
          </form>
        </Card>

        {/* senha */}
        <Card className="p-6">
          <h2 className="text-xl font-extrabold uppercase tracking-tight">Alterar senha</h2>
          <form onSubmit={changePassword} className="mt-4 space-y-4">
            <Input
              label="Senha atual"
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="••••••••"
            />
            <Input
              label="Nova senha"
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="mín. 6 caracteres"
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="repita a nova senha"
            />
            <Button type="submit" variant="outline" className="w-full">
              <KeyRound size={13} /> Atualizar senha
            </Button>
          </form>
        </Card>
      </div>

      {/* excluir conta */}
      <Card className="border-red-500/40 p-6">
        <h2 className="text-xl font-extrabold uppercase tracking-tight">Excluir conta</h2>
        {!confirmDel ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xl text-xs leading-relaxed text-ink-2 dark:text-dink-2">
              Remove sua conta, bibliotecas, snapshots e o bucket de avatars permanentemente. Ação
              irreversível.
            </p>
            <Button variant="danger" onClick={() => setConfirmDel(true)}>
              <Trash2 size={13} /> Excluir conta
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="border border-red-500/50 bg-red-500/5 px-4 py-3 text-xs text-red-600 dark:text-red-400">
              Tem certeza? Esta ação exclui todos os seus dados e não pode ser desfeita.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDel(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={doDelete} disabled={deleting}>
                {deleting && <Loader2 size={13} className="animate-spin" />}
                <Trash2 size={13} /> Confirmar exclusão
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ======================================================
 * TAB: MECANISMOS
 * ====================================================== */
function DashboardsTab() {
  const {
    dashboards,
    libraries,
    createDashboard,
    deleteDashboard,
    addToDashboard,
    removeFromDashboard,
    toast,
  } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expandedDash, setExpandedDash] = useState<Set<string>>(new Set());
  const [selectedLib, setSelectedLib] = useState<Record<string, string>>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createDashboard(name.trim(), description.trim());
    setName("");
    setDescription("");
    setOpen(false);
  }

  function toggleExpand(id: string) {
    setExpandedDash((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-ink-2 dark:text-dink-2">
            Crie grupos (dashboards) e vincule bibliotecas. A navegação acontece pela sidebar.
            expanda "Dashboards" e clique na biblioteca.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={13} /> Novo dashboard
        </Button>
      </div>

      {dashboards.length === 0 ? (
        <EmptyState
          title="Nenhum dashboard criado"
          body='Crie grupos como "Truque da Gelatina" e vincule bibliotecas para organizá-las na sidebar.'
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus size={13} /> Criar primeiro dashboard
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {dashboards.map((d) => {
            const libs = libraries.filter((l) => d.libraryIds.includes(l.id));
            const available = libraries.filter((l) => !d.libraryIds.includes(l.id));
            const totalAds = libs.reduce((a, l) => a + l.activeAds, 0);
            const escalating = libs.filter((l) => l.isEscalating).length;
            const isExpanded = expandedDash.has(d.id);

            return (
              <Card
                key={d.id}
                className="group transition-colors hover:border-brand dark:hover:border-brand-bright"
              >
                {/* header do mecanismo — click expande/recolhe */}
                <button
                  onClick={() => toggleExpand(d.id)}
                  className="flex w-full items-center gap-3 border-b border-line p-4 text-left dark:border-dline"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-brand text-brand dark:border-brand-bright dark:text-brand-bright">
                    <LayoutDashboard size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold uppercase tracking-tight">
                      {d.name}
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.25em] text-ink-3 dark:text-dink-3">
                      criado em {dateBR(d.createdAt)}
                    </div>
                  </div>
                  {/* KPIs compactos */}
                  <div className="hidden gap-px overflow-hidden border border-line bg-line sm:flex dark:border-dline dark:bg-dline">
                    <div className="bg-card px-3 py-2 text-center dark:bg-dcard">
                      <div className="text-sm font-extrabold tabular-nums">{num(totalAds)}</div>
                      <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-ink-3 dark:text-dink-3">
                        ads
                      </div>
                    </div>
                    <div className="bg-card px-3 py-2 text-center dark:bg-dcard">
                      <div
                        className={`flex items-center justify-center gap-1 text-sm font-extrabold tabular-nums ${
                          escalating > 0 ? "text-brand dark:text-brand-bright" : ""
                        }`}
                      >
                        {escalating > 0 && <Flame size={11} />}
                        {escalating}
                      </div>
                      <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-ink-3 dark:text-dink-3">
                        escalando
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`shrink-0 text-ink-3 transition-transform duration-200 ${
                      isExpanded ? "rotate-90" : ""
                    } dark:text-dink-3`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteDashboard(d.id);
                    }}
                    className="text-ink-3 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-dink-3"
                    title="Excluir dashboard"
                  >
                    <Trash2 size={14} />
                  </button>
                </button>

                {/* conteúdo expandido — descrição + bibliotecas + vinculador */}
                <div
                  className="overflow-hidden transition-all duration-200"
                  style={{
                    maxHeight: isExpanded ? "1000px" : "0px",
                    opacity: isExpanded ? 1 : 0,
                  }}
                >
                  {d.description && (
                    <p className="border-b border-line px-4 py-2.5 text-[11px] leading-relaxed text-ink-2 dark:border-dline dark:text-dink-2">
                      {d.description}
                    </p>
                  )}

                  {/* bibliotecas vinculadas — chips removíveis */}
                  <div className="space-y-2 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3 dark:text-dink-3">
                      Bibliotecas vinculadas ({libs.length})
                    </div>
                    {libs.length === 0 ? (
                      <div className="text-xs italic text-ink-3 dark:text-dink-3">
                        Nenhuma biblioteca vinculada ainda.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {libs.map((lib) => (
                          <div
                            key={lib.id}
                            className="flex items-center gap-1.5 border border-line bg-brand-ghost px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide dark:border-dline"
                          >
                            {lib.isEscalating && (
                              <Flame size={10} className="text-brand dark:text-brand-bright" />
                            )}
                            {lib.pageName}
                            <button
                              onClick={() => void removeFromDashboard(d.id, lib.id)}
                              className="ml-1 text-ink-3 transition-colors hover:text-red-500 dark:text-dink-3"
                              title="Desvincular"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* vinculador */}
                    {available.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 dark:border-dline">
                        <select
                          value={selectedLib[d.id] ?? ""}
                          onChange={(e) =>
                            setSelectedLib((prev) => ({ ...prev, [d.id]: e.target.value }))
                          }
                          className="h-8 flex-1 border border-line bg-card px-2 font-mono text-xs outline-none focus:border-brand dark:border-dline dark:bg-dcard dark:focus:border-brand-bright"
                        >
                          <option value="">vincular biblioteca…</option>
                          {available.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.pageName}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          disabled={!selectedLib[d.id]}
                          onClick={async () => {
                            const libId = selectedLib[d.id];
                            if (!libId) return;
                            await addToDashboard(d.id, libId);
                            setSelectedLib((prev) => ({ ...prev, [d.id]: "" }));
                          }}
                        >
                          <Plus size={11} /> Vincular
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo dashboard">
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Nome do grupo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Ex.: "Truque da Gelatina"'
            autoFocus
          />
          <Input
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="O que você está monitorando neste grupo?"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              <Plus size={13} /> Criar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
