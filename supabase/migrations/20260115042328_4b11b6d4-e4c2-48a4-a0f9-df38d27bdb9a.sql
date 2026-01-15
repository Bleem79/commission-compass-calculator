-- Create push_subscriptions table for storing push notification subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  driver_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_endpoint UNIQUE (user_id, endpoint)
);

-- Enable Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own subscriptions
CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all subscriptions (for sending notifications)
CREATE POLICY "Admins can view all subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_push_subscriptions_updated_at();