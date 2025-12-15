-- Create storage bucket for driver income documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver_income_documents', 'driver_income_documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for driver income documents bucket
CREATE POLICY "Anyone can view driver income documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'driver_income_documents');

CREATE POLICY "Admins can upload driver income documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'driver_income_documents' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete driver income documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'driver_income_documents' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);