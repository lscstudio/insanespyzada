import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLibrary } from "@/hooks/use-libraries";

export const Route = createFileRoute("/biblioteca/$id")({
  head: () => ({
    meta: [{ title: "Detalhe da biblioteca · AdSpy Dashboard" }],
  }),
  component: LibraryDetailPage,
});

function LibraryDetailPage() {
  const { id } = Route.useParams();
  const lib = useLibrary(id);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/bibliotecas">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {lib.data?.search_term || lib.data?.page_name || "Biblioteca"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">ID: {id}</p>
      </div>

      <Card className="border-border/60 bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
            <Construction className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Tela de detalhe em construção</h2>
            <p className="text-sm text-muted-foreground">
              Próxima etapa: gráficos de evolução, top criativos e histórico de snapshots.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
