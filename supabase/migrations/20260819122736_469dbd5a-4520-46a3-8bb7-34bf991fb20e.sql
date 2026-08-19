CREATE TABLE public.yango_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  driver_id text,
  driver_name text,
  mobile_no text NOT NULL,
  phone_type text NOT NULL,
  has_data text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.yango_responses TO authenticated;
GRANT ALL ON public.yango_responses TO service_role;

ALTER TABLE public.yango_responses ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX yango_responses_user_unique ON public.yango_responses(user_id);

CREATE POLICY "Users can insert their own yango response"
ON public.yango_responses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own yango response"
ON public.yango_responses FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins and staff can view all yango responses"
ON public.yango_responses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advanced'));

CREATE POLICY "Admins can delete yango responses"
ON public.yango_responses FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.driver_portal_settings (feature_key, feature_name, is_enabled)
VALUES ('yango', 'Yango', true)
ON CONFLICT DO NOTHING;