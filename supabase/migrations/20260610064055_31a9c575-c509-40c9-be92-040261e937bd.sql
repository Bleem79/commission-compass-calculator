CREATE TABLE public.payment_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  driver_id TEXT NOT NULL,
  driver_name TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AED',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  checkout_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.payment_collections TO authenticated;
GRANT ALL ON public.payment_collections TO service_role;

ALTER TABLE public.payment_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their own payment collections"
ON public.payment_collections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Drivers can create their own payment collections"
ON public.payment_collections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages payment collections"
ON public.payment_collections
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER set_payment_collections_updated_at
BEFORE UPDATE ON public.payment_collections
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE INDEX idx_payment_collections_user_id ON public.payment_collections(user_id);
CREATE INDEX idx_payment_collections_session ON public.payment_collections(stripe_session_id);