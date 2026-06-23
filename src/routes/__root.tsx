import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useT } from "@/lib/i18n";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/lib/i18n";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  const t = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{t("Página não encontrada")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("A página que você procura não existe ou foi movida.")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md gradient-violet-cyan px-4 py-2 text-sm font-medium text-white"
          >
            {t("Voltar ao início")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">{t("Esta página não carregou")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Algo deu errado. Tente novamente ou volte ao início.")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md gradient-violet-cyan px-4 py-2 text-sm font-medium text-white"
          >
            {t("Tentar novamente")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("Início")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "InsaneSpy - Você está sendo observado" },
      {
        name: "description",
        content:
          "InsaneSpy — Você está sendo observado. Monitoramento da Meta Ad Library.",
      },
      { property: "og:title", content: "InsaneSpy - Você está sendo observado" },
      {
        property: "og:description",
        content:
          "InsaneSpy — Você está sendo observado. Monitoramento da Meta Ad Library.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "InsaneSpy - Você está sendo observado" },
      { name: "twitter:description", content: "InsaneSpy — Você está sendo observado." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a8d66b62-e7a5-48eb-a131-f9cb032d0166/id-preview-352a3da4--0e595d07-d346-44f1-b286-e2780562b9ee.lovable.app-1781726580901.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a8d66b62-e7a5-48eb-a131-f9cb032d0166/id-preview-352a3da4--0e595d07-d346-44f1-b286-e2780562b9ee.lovable.app-1781726580901.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/insanespy-logo.png" },
      { rel: "apple-touch-icon", href: "/insanespy-logo.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" style={{ colorScheme: "dark" }}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <DomainMovedNotice />
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function DomainMovedNotice() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.18),transparent_60%),radial-gradient(circle_at_50%_80%,rgba(34,211,238,0.12),transparent_60%)]" />
      <div className="relative z-10 mx-auto max-w-lg rounded-2xl border border-border/60 bg-card/70 p-8 text-center shadow-2xl backdrop-blur">
        <img
          src="/insanespy-logo.png"
          alt="InsaneSpy"
          className="mx-auto mb-6 h-16 w-16"
        />
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Mudamos de domínio
        </h1>
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          O InsaneSpy agora está disponível em um novo endereço:
        </p>
        <p className="mt-2 break-all text-lg font-semibold gradient-violet-cyan bg-clip-text text-transparent">
          https://insanespy.com
        </p>
        <a
          href="https://insanespy.com"
          className="mt-8 inline-flex items-center justify-center rounded-md gradient-violet-cyan px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
        >
          Ir para o novo site →
        </a>
      </div>
    </div>
  );
}
