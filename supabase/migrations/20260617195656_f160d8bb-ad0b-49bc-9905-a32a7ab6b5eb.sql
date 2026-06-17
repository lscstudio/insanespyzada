CREATE TABLE public.niches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.niches TO authenticated;
GRANT ALL ON public.niches TO service_role;

ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read niches" ON public.niches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert niches" ON public.niches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update niches" ON public.niches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete niches" ON public.niches FOR DELETE TO authenticated USING (true);

CREATE TRIGGER set_niches_updated_at BEFORE UPDATE ON public.niches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();