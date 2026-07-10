UPDATE public.push_subscriptions ps
SET driver_id = dc.driver_id
FROM public.driver_credentials dc
WHERE ps.driver_id IS NULL
  AND dc.user_id = ps.user_id;