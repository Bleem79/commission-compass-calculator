ALTER FUNCTION public.sign_declaration_for_driver(uuid, text, text) SET SCHEMA app_private;
REVOKE ALL ON FUNCTION app_private.sign_declaration_for_driver(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.sign_declaration_for_driver(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sign_declaration_for_driver(p_document_id uuid, p_driver_id text, p_signature text)
 RETURNS TABLE(id uuid, document_id uuid, signed_at timestamptz)
 LANGUAGE sql
 SET search_path TO 'public'
AS $$ SELECT * FROM app_private.sign_declaration_for_driver(p_document_id, p_driver_id, p_signature); $$;
REVOKE ALL ON FUNCTION public.sign_declaration_for_driver(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sign_declaration_for_driver(uuid, text, text) TO authenticated, service_role;