CREATE TABLE public.sms_send_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid NOT NULL,
  sent_by_name text,
  message text NOT NULL,
  template_title text,
  nationalities text[] NOT NULL DEFAULT '{}',
  recipient_ids text[] NOT NULL DEFAULT '{}',
  failed_ids text[] NOT NULL DEFAULT '{}',
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.sms_send_history TO authenticated;
GRANT ALL ON public.sms_send_history TO service_role;
ALTER TABLE public.sms_send_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view sms history" ON public.sms_send_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'advanced'::app_role) OR public.has_role(auth.uid(),'user'::app_role));
CREATE POLICY "Staff log own sms sends" ON public.sms_send_history FOR INSERT TO authenticated
WITH CHECK (sent_by = auth.uid() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'advanced'::app_role) OR public.has_role(auth.uid(),'user'::app_role)));
CREATE POLICY "Admins delete sms history" ON public.sms_send_history FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role));