import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNiches, useSaveLibrary } from "@/hooks/use-libraries";
import { triggerCollection } from "@/lib/collect.functions";
import { LANGUAGES, extractSearchTerm, isMetaAdLibraryUrl } from "@/lib/format";
import type { LibraryLatest } from "@/lib/types";

const schema = z.object({
  title: z.string().trim().max(120).optional().nullable(),
  url: z
    .string()
    .trim()
    .min(1, "Informe o link da biblioteca")
    .refine(isMetaAdLibraryUrl, "URL deve ser de facebook.com/ads/library"),
  niche: z.string().trim().max(80).optional().nullable(),
  language: z.string().min(1, "Selecione um idioma"),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["active", "paused", "archived"]),
});

type FormValues = z.infer<typeof schema>;

const NONE_NICHE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  library?: LibraryLatest | null;
}

export function AddLibraryModal({ open, onOpenChange, library }: Props) {
  const save = useSaveLibrary();
  const niches = useNiches();
  const collect = useServerFn(triggerCollection);
  const qc = useQueryClient();
  const [mining, setMining] = useState(false);

  const defaults = useMemo<FormValues>(
    () => ({
      title: library?.title ?? "",
      url: library?.url ?? "",
      niche: library?.niche ?? "",
      language: library?.language ?? "PT",
      notes: library?.notes ?? "",
      status: (library?.status as FormValues["status"]) ?? "active",
    }),
    [library],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) form.reset(defaults);
  }, [open, defaults, form]);

  const url = form.watch("url");
  const searchTermPreview = useMemo(() => {
    if (!url) return null;
    return extractSearchTerm(url);
  }, [url]);

  async function onSubmit(values: FormValues) {
    try {
      const saved = await save.mutateAsync({
        id: library?.id,
        values: {
          ...values,
          title: values.title?.trim() || null,
          niche: values.niche || null,
          search_term: searchTermPreview ?? null,
        },
      });

      if (saved.status === "active") {
        setMining(true);
        toast.loading("Minerando biblioteca agora…", {
          id: `collect-${saved.id}`,
          description: "Buscando anúncios ativos e criativos reais na Meta.",
        });
        try {
          const report = await collect({ data: { libraryId: saved.id } });
          const detail = report.details[0];
          await qc.invalidateQueries();
          if (detail?.ok) {
            toast.success("Biblioteca minerada ao vivo", {
              id: `collect-${saved.id}`,
              description: `${detail.active_ads_count ?? 0} anúncios ativos · ${detail.unique_creatives ?? 0} criativos únicos.`,
            });
          } else {
            toast.error("Biblioteca salva, mas a mineração falhou", {
              id: `collect-${saved.id}`,
              description: detail?.error?.slice(0, 120) ?? "A Meta não retornou dados para essa URL agora.",
            });
          }
        } catch (e) {
          toast.error("Biblioteca salva, mas a mineração falhou", {
            id: `collect-${saved.id}`,
            description: e instanceof Error ? e.message.slice(0, 120) : "Erro desconhecido na mineração.",
          });
        } finally {
          setMining(false);
        }
      } else {
        toast.success(library ? "Biblioteca atualizada" : "Biblioteca adicionada");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error("Não foi possível salvar", {
        description: e instanceof Error ? e.message : "Erro desconhecido",
      });
    }
  }

  const nicheValue = form.watch("niche") || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl">
              {library ? "Editar biblioteca" : "Adicionar biblioteca"}
            </DialogTitle>
            <DialogDescription>
              Dê um nome curto pra essa biblioteca (oferta, mecanismo, ângulo) e cole o link da Meta Ad Library.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Ex: Oferta do azeite — mecanismo digestivo"
                {...form.register("title")}
              />
              <p className="text-[11px] text-muted-foreground">
                Aparece em todos os lugares no lugar do link da biblioteca.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Link da biblioteca</Label>
              <Input
                id="url"
                placeholder="https://www.facebook.com/ads/library/?q=..."
                {...form.register("url")}
              />
              {form.formState.errors.url && (
                <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
              )}
              {searchTermPreview && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground"
                >
                  Termo detectado: <span className="text-foreground font-medium">{searchTermPreview}</span>
                </motion.p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nicho</Label>
                <Select
                  value={nicheValue || NONE_NICHE}
                  onValueChange={(v) =>
                    form.setValue("niche", v === NONE_NICHE ? "" : v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um nicho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_NICHE}>Sem nicho</SelectItem>
                    {(niches.data ?? []).map((n) => (
                      <SelectItem key={n.id} value={n.name}>
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Gerencie nichos em Configurações.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select
                  value={form.watch("language")}
                  onValueChange={(v) => form.setValue("language", v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder="Oferta, mecanismo, ângulo…"
                {...form.register("notes")}
              />
            </div>

            <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Ao adicionar uma biblioteca ativa, a mineração roda na hora e atualiza os dados ao vivo.
            </p>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending || mining}>
                {(save.isPending || mining) && <Loader2 className="h-4 w-4 animate-spin" />}
                {mining ? "Minerando…" : save.isPending ? "Salvando…" : library ? "Salvar e minerar" : "Adicionar e minerar"}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
