ALTER TABLE public.training_acknowledgments ADD COLUMN IF NOT EXISTS collected_by uuid;

CREATE OR REPLACE FUNCTION public.validate_training_acknowledgment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_title text;
BEGIN
  IF NEW.agreed IS NOT TRUE THEN RAISE EXCEPTION 'Please tick Yes to accept the declaration'; END IF;
  IF NEW.signature_data IS NULL OR NEW.signature_data NOT LIKE 'data:image/png;base64,%' OR length(NEW.signature_data) NOT BETWEEN 200 AND 700000 THEN
    RAISE EXCEPTION 'A valid signature is required';
  END IF;
  SELECT title INTO v_title FROM public.training_documents WHERE id = NEW.document_id;
  IF v_title IS NULL THEN RAISE EXCEPTION 'This declaration is no longer available'; END IF;
  -- Drivers signing for themselves can never claim a collector.
  IF NEW.user_id = auth.uid() THEN NEW.collected_by := NULL; END IF;
  NEW.document_title := v_title;
  NEW.driver_name := NULLIF(left(btrim(COALESCE(NEW.driver_name, '')), 200), '');
  NEW.signed_at := now();
  NEW.created_at := now();
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.sign_declaration_for_driver(p_document_id uuid, p_driver_id text, p_signature text)
 RETURNS TABLE(id uuid, document_id uuid, signed_at timestamptz)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_driver text := btrim(COALESCE(p_driver_id, ''));
  v_user uuid;
  v_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT app_private.is_training_manager() THEN
    RAISE EXCEPTION 'Only the Training Department or an administrator can collect signatures' USING ERRCODE = '42501';
  END IF;
  IF v_driver = '' OR length(v_driver) > 50 THEN RAISE EXCEPTION 'Please enter a valid Driver ID'; END IF;

  SELECT dc.user_id INTO v_user FROM public.driver_credentials dc WHERE dc.driver_id = v_driver AND dc.user_id IS NOT NULL LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Driver ID % has no portal account', v_driver; END IF;

  SELECT t.driver_name INTO v_name FROM public.driver_trainings t
   WHERE t.driver_id = v_driver AND NULLIF(btrim(t.driver_name), '') IS NOT NULL
   ORDER BY t.created_at DESC LIMIT 1;
  IF v_name IS NULL THEN
    SELECT m.driver_name INTO v_name FROM public.driver_master_file m WHERE m.driver_id = v_driver LIMIT 1;
  END IF;

  BEGIN
    RETURN QUERY
    INSERT INTO public.training_acknowledgments AS a (document_id, user_id, driver_id, driver_name, agreed, signature_data, collected_by)
    VALUES (p_document_id, v_user, v_driver, v_name, true, p_signature, auth.uid())
    RETURNING a.id, a.document_id, a.signed_at;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Driver % has already signed this declaration', v_driver USING ERRCODE = '23505';
  END;
END $function$;

REVOKE ALL ON FUNCTION public.sign_declaration_for_driver(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sign_declaration_for_driver(uuid, text, text) TO authenticated, service_role;