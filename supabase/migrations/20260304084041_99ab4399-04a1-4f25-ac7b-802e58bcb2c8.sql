
CREATE TABLE public.video_tutorials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  video_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

ALTER TABLE public.video_tutorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view video tutorials"
ON public.video_tutorials FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert video tutorials"
ON public.video_tutorials FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete video tutorials"
ON public.video_tutorials FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
