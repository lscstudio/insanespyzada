import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Search, Flame, Star, AlertTriangle, Loader2 } from "lucide-react";
import { useStore } from "../lib/store";
import { PLANS } from "../lib/plans";
import { supabase } from "@/integrations/supabase/client";
import { Button, Modal, Input, QuotaBar, EmptyState } from "../components/ui";
import { LibraryCard } from "../components/LibraryCard";

const LANGUAGES = [
  { value: "", label: "—" },
  { value: "PT", label: "Português" },
  { value: "EN", label: "English" },
  { value: "ES", label: "Español" },
  { value: "FR", label: "Français" },
  { value: "IT", label: "Italiano" },
  { value: "DE", label: "Deutsch" },
  { value: "OTHER", label: "Outros" },
];

type Filter = "todas" | "escalando" | "favoritas";

export function Bibliotecas() {
  const { libraries, addLibrary, plan, canAddLibrary, libraryLoading, toast } = useStore();
  const p = PLANS[plan];
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [url, setUrl] = useState("");
  const [pageName, setPageName] = useState("");
  const [title, setTitle] = useState("");
  const [niche, setNiche] = useState("");
  const [language, setLanguage] = useState("PT");
  const [notes, setNotes] = useState("");
  const [niches, setNiches] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>("todas");
  const [query, setQuery] = useState("");

  // carrega catálogo de nichos (admin-managed) para sugerir no dropdown
  useEffect(() => {
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("niches")
          .select("name")
          .order("name", { ascending: true });
        if (error) throw error;
        setNiches(((data ?? []) as { name: string }[]).map((n) => n.name));
      } catch {
        // silencioso — usuário pode digitar livremente
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = libraries;
    if (filter === "escalando") list = list.filter((l) => l.isEscalating);
    if (filter === "favoritas") list = list.filter((l) => l.favorite);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (l) => l.pageName.toLowerCase().includes(q) || l.niche.toLowerCase().includes(q),
      );
    }
    return list;
  }, [libraries, filter, query]);

  function resetForm() {
    setUrl("");
    setPageName("");
    setTitle("");
    setNiche("");
    setLanguage("PT");
    setNotes("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    const ok = await addLibrary({
      url,
      page_name: pageName,
      title,
      niche,
      language,
      notes,
    });
    setSubmitting(false);
    if (ok) {
      resetForm();
      setModalOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand dark:text-brand-bright">
            Monitoramento
          </div>
          <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-tight">Bibliotecas</h1>
          <p className="mt-1 text-xs text-ink-2 dark:text-dink-2">
            Suas fontes isoladas por conta (RLS via auth.uid) · coleta a cada {p.pushIntervalMin}{" "}
            min
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-44">
            <QuotaBar used={libraries.length} limit={p.librariesLimit} />
          </div>
          <Button
            onClick={() => {
              if (!canAddLibrary) {
                toast(`Limite do plano ${p.name} atingido.`, "error");
                return;
              }
              setModalOpen(true);
            }}
            disabled={!canAddLibrary}
            title={!canAddLibrary ? "Limite do plano atingido" : undefined}
          >
            <Plus size={13} /> Adicionar biblioteca
          </Button>
        </div>
      </div>

      {!canAddLibrary && (
        <div className="flex items-center gap-3 border border-amber-500/50 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle size={15} className="shrink-0" />
          <span>
            <b>Limite atingido:</b> o plano {p.name} permite {p.librariesLimit} bibliotecas. Remova
            uma biblioteca ou faça upgrade para adicionar novas fontes.
          </span>
        </div>
      )}

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden border border-line dark:border-dline">
          {(
            [
              { id: "todas", label: `Todas (${libraries.length})`, icon: null },
              { id: "escalando", label: "Escalando", icon: Flame },
              { id: "favoritas", label: "Favoritas", icon: Star },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex h-9 items-center gap-1.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors ${
                filter === f.id
                  ? "bg-brand text-white dark:bg-brand-bright"
                  : "text-ink-2 hover:text-brand dark:text-dink-2 dark:hover:text-brand-bright"
              }`}
            >
              {f.icon && <f.icon size={12} />}
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 dark:text-dink-3"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="buscar página ou nicho…"
            className="h-9 w-full border border-line bg-card pl-9 pr-3 font-mono text-xs outline-none placeholder:text-ink-3 focus:border-brand dark:border-dline dark:bg-dcard dark:placeholder:text-dink-3 dark:focus:border-brand-bright"
          />
        </div>
        {libraryLoading && (
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
            <Loader2 size={11} className="animate-spin" /> sincronizando…
          </span>
        )}
      </div>

      {/* grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma biblioteca aqui"
          body={
            filter === "todas"
              ? "Adicione sua primeira biblioteca da Meta Ads Library para começar o monitoramento 24/7."
              : "Nada encontrado com esses filtros."
          }
          action={
            canAddLibrary ? (
              <Button onClick={() => setModalOpen(true)}>
                <Plus size={13} /> Adicionar biblioteca
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((lib) => (
            <LibraryCard key={lib.id} lib={lib} />
          ))}
        </div>
      )}

      {/* modal adicionar — campos completos */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Adicionar biblioteca" wide>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-xs leading-relaxed text-ink-2 dark:text-dink-2">
            Cole o link da <b>Meta Ads Library</b> — pode ser de uma página, anunciante ou termo de
            busca. A primeira coleta dispara na hora e os snapshots ficam disponíveis para análise.
          </p>

          <Input
            label="URL da biblioteca *"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.facebook.com/ads/library/?id=…"
            autoFocus
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Nome da página (opcional)"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              placeholder="Ex: NATURE VISTA POINT"
            />
            <Input
              label="Título interno (opcional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Oferta principal"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-ink-2 dark:text-dink-2">
                Nicho
              </label>
              <input
                list="niches-list"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Ex: Saúde"
                className="h-10 w-full border border-line bg-card px-3 font-mono text-sm text-ink outline-none placeholder:text-ink-3 focus:border-brand dark:border-dline dark:bg-dpaper dark:text-dink dark:placeholder:text-dink-3 dark:focus:border-brand-bright"
              />
              <datalist id="niches-list">
                {niches.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-ink-2 dark:text-dink-2">
                Idioma
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="h-10 w-full border border-line bg-card px-3 font-mono text-sm text-ink outline-none focus:border-brand dark:border-dline dark:bg-dpaper dark:text-dink dark:focus:border-brand-bright"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-ink-2 dark:text-dink-2">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mecanismo, oferta, anotações internas…"
              rows={3}
              className="w-full resize-none border border-line bg-card px-3 py-2 font-mono text-sm text-ink outline-none placeholder:text-ink-3 focus:border-brand dark:border-dline dark:bg-dpaper dark:text-dink dark:placeholder:text-dink-3 dark:focus:border-brand-bright"
            />
          </div>

          <div className="border border-line bg-brand-ghost px-3 py-2 text-[11px] text-ink-2 dark:border-dline dark:text-dink-2">
            Após adicionar, a primeira coleta dispara automaticamente (~10s) e depois roda a cada{" "}
            {p.pushIntervalMin} min.
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!url.trim() || submitting}>
              {submitting && <Loader2 size={13} className="animate-spin" />}
              <Plus size={13} /> Monitorar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
