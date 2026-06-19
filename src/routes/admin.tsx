import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Users, Library as LibIcon, ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  checkIsAdmin,
  listAccounts,
  listLibrariesForAccount,
} from "@/lib/admin.functions";

function NotFoundView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md gradient-violet-cyan px-4 py-2 text-sm font-medium text-white"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  component: AdminPanel,
  notFoundComponent: NotFoundView,
});

function AdminPanel() {
  const checkFn = useServerFn(checkIsAdmin);
  const accountsFn = useServerFn(listAccounts);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null);

  const adminQuery = useQuery({
    queryKey: ["admin", "isAdmin"],
    queryFn: () => checkFn({}),
    staleTime: 60_000,
  });

  if (adminQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!adminQuery.data?.isAdmin || adminQuery.isError) {
    return <NotFoundView />;
  }

  if (selectedUser) {
    return (
      <AccountDetail user={selectedUser} onBack={() => setSelectedUser(null)} />
    );
  }

  return <AccountsList accountsFn={accountsFn} onSelect={setSelectedUser} />;
}

function AccountsList({
  accountsFn,
  onSelect,
}: {
  accountsFn: (...args: any[]) => Promise<any>;
  onSelect: (u: { id: string; email: string }) => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "accounts"],
    queryFn: () => accountsFn({}),
    refetchInterval: 30_000,
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Users className="h-6 w-6" /> Painel Admin
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão geral de todas as contas e bibliotecas monitoradas.
          </p>
        </div>
        <Badge variant="secondary">{data?.length ?? 0} contas</Badge>
      </header>

      {isLoading && (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <Card><CardContent className="p-4 text-sm text-destructive">{(error as Error).message}</CardContent></Card>
      )}

      <div className="grid gap-3">
        {(data ?? []).map((u: any) => (
          <button
            key={u.id}
            onClick={() => onSelect({ id: u.id, email: u.email })}
            className="group flex items-center justify-between rounded-lg border border-border/60 bg-card/50 p-4 text-left transition hover:border-primary/50 hover:bg-card"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{u.email || "(sem email)"}</div>
              <div className="text-xs text-muted-foreground">
                Criada em {new Date(u.created_at).toLocaleString("pt-BR")}
                {u.last_sign_in_at && (
                  <> · último login {new Date(u.last_sign_in_at).toLocaleString("pt-BR")}</>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1">
                <LibIcon className="h-3 w-3" />
                {u.libraries_count} bibliotecas
              </Badge>
              <span className="text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
                Ver →
              </span>
            </div>
          </button>
        ))}
        {!isLoading && (data ?? []).length === 0 && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</CardContent></Card>
        )}
      </div>
    </div>
  );
}

function AccountDetail({
  user,
  onBack,
}: {
  user: { id: string; email: string };
  onBack: () => void;
}) {
  const listFn = useServerFn(listLibrariesForAccount);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "libraries", user.id],
    queryFn: () => listFn({ data: { userId: user.id } }),
    refetchInterval: 30_000,
  });

  const totalAds = (data ?? []).reduce((acc: number, l: any) => acc + (l.active_ads_count ?? 0), 0);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="space-y-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{user.email}</h1>
            <p className="text-sm text-muted-foreground">
              {data?.length ?? 0} bibliotecas · {totalAds} anúncios ativos no total
            </p>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <Card><CardContent className="p-4 text-sm text-destructive">{(error as Error).message}</CardContent></Card>
      )}

      <div className="grid gap-3">
        {(data ?? []).map((l: any) => (
          <div
            key={l.id}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{l.page_name || l.search_term || "Sem nome"}</span>
                {l.niche && <Badge variant="outline" className="text-xs">{l.niche}</Badge>}
                <Badge variant={l.status === "active" ? "default" : "secondary"} className="text-xs">
                  {l.status}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {l.last_captured_at
                  ? `Última coleta: ${new Date(l.last_captured_at).toLocaleString("pt-BR")}`
                  : "Sem coletas ainda"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-semibold tabular-nums">{l.active_ads_count}</div>
                <div className="text-xs text-muted-foreground">ads ativos</div>
              </div>
              {l.url && (
                <a href={l.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        ))}
        {!isLoading && (data ?? []).length === 0 && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Esta conta ainda não criou bibliotecas.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
