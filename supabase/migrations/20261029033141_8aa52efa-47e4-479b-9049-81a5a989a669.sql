CREATE TABLE public.driver_residence_links (
  url text PRIMARY KEY,
  lat double precision,
  lng double precision,
  resolved_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.driver_residence_links TO service_role;
ALTER TABLE public.driver_residence_links ENABLE ROW LEVEL SECURITY;

UPDATE public.yango_driver_list SET city = NULL WHERE city IN ('0', '0.0');
UPDATE public.yango_driver_list SET area = NULL WHERE area IN ('0', '0.0');
UPDATE public.yango_driver_list SET google_map = NULL WHERE google_map IN ('0', '0.0');