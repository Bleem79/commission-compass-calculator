-- Make driver_id nullable so controllers (non-driver users) can register push subscriptions
ALTER TABLE public.push_subscriptions ALTER COLUMN driver_id DROP NOT NULL;
