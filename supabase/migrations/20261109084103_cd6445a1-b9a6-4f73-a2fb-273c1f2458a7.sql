CREATE TABLE public.training_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_path text NOT NULL UNIQUE,
  video_tutorial_id uuid REFERENCES public.video_tutorials(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_documents TO authenticated;
GRANT ALL ON public.training_documents TO service_role;
ALTER TABLE public.training_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view training documents" ON public.training_documents FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins insert training documents" ON public.training_documents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND uploaded_by = auth.uid());
CREATE POLICY "Admins update training documents" ON public.training_documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete training documents" ON public.training_documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.validate_training_document()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.title := btrim(NEW.title);
  IF length(NEW.title) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Title must contain 1 to 200 characters'; END IF;
  IF NEW.file_type NOT IN ('pdf','docx') THEN RAISE EXCEPTION 'Only PDF or Word (.docx) templates are allowed'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER validate_training_document BEFORE INSERT OR UPDATE ON public.training_documents FOR EACH ROW EXECUTE FUNCTION public.validate_training_document();

CREATE TABLE public.training_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.training_documents(id) ON DELETE SET NULL,
  document_title text NOT NULL DEFAULT '',
  user_id uuid NOT NULL,
  driver_id text NOT NULL,
  driver_name text,
  agreed boolean NOT NULL DEFAULT false,
  signature_data text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, driver_id)
);
GRANT SELECT, INSERT, DELETE ON public.training_acknowledgments TO authenticated;
GRANT ALL ON public.training_acknowledgments TO service_role;
ALTER TABLE public.training_acknowledgments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers view own acknowledgments, staff view all" ON public.training_acknowledgments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'advanced'::public.app_role));
CREATE POLICY "Drivers sign own acknowledgment" ON public.training_acknowledgments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND driver_id IN (SELECT dc.driver_id FROM public.driver_credentials dc WHERE dc.user_id = auth.uid()));
CREATE POLICY "Admins delete acknowledgments" ON public.training_acknowledgments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.validate_training_acknowledgment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  IF NEW.agreed IS NOT TRUE THEN RAISE EXCEPTION 'Please tick Yes to accept the declaration'; END IF;
  IF NEW.signature_data IS NULL OR NEW.signature_data NOT LIKE 'data:image/png;base64,%' OR length(NEW.signature_data) NOT BETWEEN 200 AND 700000 THEN
    RAISE EXCEPTION 'A valid signature is required';
  END IF;
  SELECT title INTO v_title FROM public.training_documents WHERE id = NEW.document_id;
  IF v_title IS NULL THEN RAISE EXCEPTION 'This declaration is no longer available'; END IF;
  NEW.document_title := v_title;
  NEW.driver_name := NULLIF(left(btrim(COALESCE(NEW.driver_name, '')), 200), '');
  NEW.signed_at := now();
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER validate_training_acknowledgment BEFORE INSERT ON public.training_acknowledgments FOR EACH ROW EXECUTE FUNCTION public.validate_training_acknowledgment();

CREATE POLICY "Signed-in users read training documents files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'training-documents');
CREATE POLICY "Admins upload training documents files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'training-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete training documents files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'training-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role));