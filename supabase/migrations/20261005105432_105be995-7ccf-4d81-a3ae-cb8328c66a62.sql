CREATE TABLE public.driver_request_blocks (
  driver_id text PRIMARY KEY,
  is_blocked boolean NOT NULL DEFAULT true,
  reason text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.driver_request_blocks TO authenticated;
GRANT ALL ON public.driver_request_blocks TO service_role;
ALTER TABLE public.driver_request_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read blocks" ON public.driver_request_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert blocks" ON public.driver_request_blocks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update blocks" ON public.driver_request_blocks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.driver_request_block_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id text NOT NULL,
  action text NOT NULL,
  reason text,
  changed_by uuid,
  changed_by_name text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.driver_request_block_history TO authenticated;
GRANT ALL ON public.driver_request_block_history TO service_role;
ALTER TABLE public.driver_request_block_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read block history" ON public.driver_request_block_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advanced') OR public.has_role(auth.uid(),'user'));

CREATE OR REPLACE FUNCTION public.log_driver_request_block()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
    SELECT COALESCE(raw_user_meta_data->>'username', email) INTO v_name FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.driver_request_block_history(driver_id, action, reason, changed_by, changed_by_name)
    VALUES (NEW.driver_id, CASE WHEN NEW.is_blocked THEN 'blocked' ELSE 'unblocked' END, NEW.reason, auth.uid(), v_name);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.log_driver_request_block() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_log_driver_request_block AFTER INSERT OR UPDATE ON public.driver_request_blocks
FOR EACH ROW EXECUTE FUNCTION public.log_driver_request_block();

CREATE OR REPLACE FUNCTION public.prevent_blocked_driver_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.driver_request_blocks WHERE driver_id = NEW.driver_id AND is_blocked) THEN
    RAISE EXCEPTION 'You are blocked from submitting requests. Please contact your Revenue Controller.';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.prevent_blocked_driver_request() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_prevent_blocked_driver_request BEFORE INSERT ON public.driver_requests
FOR EACH ROW EXECUTE FUNCTION public.prevent_blocked_driver_request();