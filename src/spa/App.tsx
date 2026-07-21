import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { AppLayout } from "./components/layout/AppLayout";
import { Toasts } from "./components/Toasts";
import { Auth } from "./pages/Auth";
import { ResetPassword } from "./pages/ResetPassword";
import { Home } from "./pages/Home";
import { Bibliotecas } from "./pages/Bibliotecas";
import { BibliotecaDetail } from "./pages/BibliotecaDetail";
import { Swipe } from "./pages/Swipe";
import { Assinatura } from "./pages/Assinatura";
import { Configuracoes } from "./pages/Configuracoes";
import { Admin } from "./pages/Admin";

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, authLoading } = useStore();
  const location = useLocation();
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink-2 dark:bg-dpaper dark:text-dink-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] pulse-dot">
          inicializando insanespy…
        </span>
      </div>
    );
  }
  if (!session) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}

function AuthRedirect({ children }: { children: ReactNode }) {
  const { session, authLoading } = useStore();
  const location = useLocation();
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink-2 dark:bg-dpaper dark:text-dink-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] pulse-dot">
          inicializando insanespy…
        </span>
      </div>
    );
  }
  if (session) {
    const params = new URLSearchParams(location.search);
    return <Navigate to={params.get("next") || "/"} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/auth"
            element={
              <AuthRedirect>
                <Auth />
              </AuthRedirect>
            }
          />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/bibliotecas" element={<Bibliotecas />} />
            <Route path="/biblioteca/:id" element={<BibliotecaDetail />} />
            <Route path="/swipe" element={<Swipe />} />
            <Route path="/assinatura" element={<Assinatura />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/admin" element={<Admin />} />
            {/* redirects das rotas antigas */}
            <Route path="/dashboards" element={<Navigate to="/configuracoes" replace />} />
            <Route path="/dashboards/:id" element={<Navigate to="/configuracoes" replace />} />
            <Route path="/planos" element={<Navigate to="/assinatura" replace />} />
            <Route path="/minha-assinatura" element={<Navigate to="/assinatura" replace />} />
            <Route path="/onboarding" element={<Navigate to="/" replace />} />
            <Route path="/perfil" element={<Navigate to="/configuracoes" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toasts />
      </BrowserRouter>
    </StoreProvider>
  );
}
