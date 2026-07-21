import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useT } from "@/lib/i18n";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  const t = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 text-ink dark:bg-dpaper dark:text-dink">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold text-brand dark:text-brand-bright">404</h1>
        <h2 className="mt-4 text-xl font-bold uppercase tracking-tight">
          {t("Página não encontrada")}
        </h2>
        <p className="mt-2 text-sm text-ink-2 dark:text-dink-2">
          {t("A página que você procura não existe ou foi movida.")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border border-brand bg-brand px-4 py-2 text-sm font-bold uppercase tracking-wider text-white dark:border-brand-bright dark:bg-brand-bright"
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
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 text-ink dark:bg-dpaper dark:text-dink">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold uppercase tracking-tight">
          {t("Esta página não carregou")}
        </h1>
        <p className="mt-2 text-sm text-ink-2 dark:text-dink-2">
          {t("Algo deu errado. Tente novamente ou volte ao início.")}
        </p>
        <pre className="mt-4 max-h-48 overflow-auto border border-line bg-card p-3 text-left text-[11px] text-red-500 dark:border-dline dark:bg-dcard">
          {error.message}
        </pre>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center border border-brand bg-brand px-4 py-2 text-sm font-bold uppercase tracking-wider text-white dark:border-brand-bright dark:bg-brand-bright"
          >
            {t("Tentar novamente")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center border border-line bg-card px-4 py-2 text-sm font-bold uppercase tracking-wider text-ink transition-colors hover:border-brand dark:border-dline dark:bg-dcard dark:text-dink"
          >
            {t("Início")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: false,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "InsaneSpy — Inteligência de Anúncios" },
      {
        name: "description",
        content:
          "InsaneSpy — Inteligência competitiva de anúncios. Monitoramento 24/7 da Meta Ad Library.",
      },
      { property: "og:title", content: "InsaneSpy — Inteligência de Anúncios" },
      {
        property: "og:description",
        content:
          "InsaneSpy — Inteligência competitiva de anúncios. Monitoramento 24/7 da Meta Ad Library.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "InsaneSpy" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230000D4'/%3E%3Cellipse cx='16' cy='16' rx='9.5' ry='6' fill='none' stroke='white' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='2.6' fill='white'/%3E%3C/svg%3E",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
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
      <Outlet />
    </QueryClientProvider>
  );
}
