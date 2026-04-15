
CREATE TABLE public.user_page_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  page_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, page_key)
);

ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all page permissions"
ON public.user_page_permissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own page permissions"
ON public.user_page_permissions
FOR SELECT
USING (auth.uid() = user_id);
