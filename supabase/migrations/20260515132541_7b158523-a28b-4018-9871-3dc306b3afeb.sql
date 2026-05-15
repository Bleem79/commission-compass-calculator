CREATE TABLE IF NOT EXISTS public.target_trips_settings (
  id text PRIMARY KEY DEFAULT 'default',
  config jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.target_trips_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view target_trips_settings"
ON public.target_trips_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert target_trips_settings"
ON public.target_trips_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update target_trips_settings"
ON public.target_trips_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.target_trips_settings (id, config)
VALUES ('default', '{"numberOfDays":31,"tiers":{"Base":{"24H":250,"12H":190},"Base+1":{"24H":350,"12H":265},"Base+2":{"24H":450,"12H":340},"Base+3":{"24H":550,"12H":415},"Base+4":{"24H":650,"12H":490},"Base+5":{"24H":850,"12H":640}}}'::jsonb)
ON CONFLICT (id) DO NOTHING;