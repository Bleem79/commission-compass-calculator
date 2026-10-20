CREATE TABLE public.nationality_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nationality TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nationality_message_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nationality_message_templates TO authenticated;
GRANT ALL ON public.nationality_message_templates TO service_role;

ALTER TABLE public.nationality_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view templates"
ON public.nationality_message_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can create templates"
ON public.nationality_message_templates
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update templates"
ON public.nationality_message_templates
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete templates"
ON public.nationality_message_templates
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER set_nationality_message_templates_updated_at
BEFORE UPDATE ON public.nationality_message_templates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();