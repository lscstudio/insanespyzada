-- =====================================================
-- SPA backend completo: dashboards, notifications,
-- subscriptions, payments, library_flags, swipe_favorites
-- =====================================================

-- ============ dashboards ============
CREATE TABLE IF NOT EXISTS public.dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dashboards: read own"   ON public.dashboards FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Dashboards: insert own" ON public.dashboards FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Dashboards: update own" ON public.dashboards FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Dashboards: delete own" ON public.dashboards FOR DELETE TO authenticated USING (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboards TO authenticated;

-- ============ dashboard_libraries (N:N) ============
CREATE TABLE IF NOT EXISTS public.dashboard_libraries (
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  library_id   uuid NOT NULL REFERENCES public.libraries(id)  ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dashboard_id, library_id)
);
ALTER TABLE public.dashboard_libraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DL: read own"   ON public.dashboard_libraries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dashboards d WHERE d.id = dashboard_id AND d.user_id = auth.uid()));
CREATE POLICY "DL: insert own" ON public.dashboard_libraries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.dashboards d WHERE d.id = dashboard_id AND d.user_id = auth.uid()));
CREATE POLICY "DL: delete own" ON public.dashboard_libraries FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dashboards d WHERE d.id = dashboard_id AND d.user_id = auth.uid()));
GRANT SELECT, INSERT, DELETE ON public.dashboard_libraries TO authenticated;

-- ============ library_flags (favorite / hidden por user) ============
CREATE TABLE IF NOT EXISTS public.library_flags (
  library_id uuid NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  favorite   boolean NOT NULL DEFAULT false,
  hidden_from_swipe boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (library_id, user_id)
);
ALTER TABLE public.library_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Flags: read own"   ON public.library_flags FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Flags: insert own" ON public.library_flags FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Flags: update own" ON public.library_flags FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Flags: delete own" ON public.library_flags FOR DELETE TO authenticated USING (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_flags TO authenticated;

-- ============ notifications ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notif: read own"   ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Notif: insert own" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Notif: update own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Notif: delete own" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- ============ subscriptions (1 linha por user) ============
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  method text,
  cycle text,
  renewal_date timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  credits int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sub: read own"   ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Sub: insert own" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Sub: update own" ON public.subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;

-- ============ payments ============
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date timestamptz NOT NULL DEFAULT now(),
  amount numeric(12,2) NOT NULL,
  method text NOT NULL,
  status text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pay: read own"   ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Pay: insert own" ON public.payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Pay: update own" ON public.payments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Pay: delete own" ON public.payments FOR DELETE TO authenticated USING (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;

-- ============ swipe_favorites ============
CREATE TABLE IF NOT EXISTS public.swipe_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, candidate_id)
);
ALTER TABLE public.swipe_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SwipeFav: read own"   ON public.swipe_favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "SwipeFav: insert own" ON public.swipe_favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "SwipeFav: delete own" ON public.swipe_favorites FOR DELETE TO authenticated USING (user_id = auth.uid());
GRANT SELECT, INSERT, DELETE ON public.swipe_favorites TO authenticated;

-- ============ trigger: cria subscription free no signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, credits)
  VALUES (NEW.id, 'free', 'active', 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- backfill para usuários já existentes
INSERT INTO public.subscriptions (user_id, plan, status, credits)
SELECT u.id, 'free', 'active', 0 FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- ============ updated_at triggers ============
CREATE TRIGGER trg_dashboards_updated_at
  BEFORE UPDATE ON public.dashboards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
