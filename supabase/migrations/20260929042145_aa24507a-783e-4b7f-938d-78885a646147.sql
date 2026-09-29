CREATE TABLE public.request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.driver_requests(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_by_name text,
  admin_response text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rsh_request ON public.request_status_history(request_id, changed_at DESC);
GRANT SELECT ON public.request_status_history TO authenticated;
GRANT ALL ON public.request_status_history TO service_role;
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View history of visible requests" ON public.request_status_history
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.driver_requests r WHERE r.id = request_id));

CREATE OR REPLACE FUNCTION public.log_request_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.admin_response IS DISTINCT FROM OLD.admin_response THEN
    SELECT COALESCE(raw_user_meta_data->>'username', email) INTO v_name FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.request_status_history(request_id, old_status, new_status, changed_by, changed_by_name, admin_response)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), v_name, NEW.admin_response);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_log_request_status AFTER UPDATE ON public.driver_requests
FOR EACH ROW EXECUTE FUNCTION public.log_request_status_change();