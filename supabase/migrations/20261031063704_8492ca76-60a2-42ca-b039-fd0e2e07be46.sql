CREATE TABLE public.driver_request_daily_slots (
  driver_id text NOT NULL,
  submission_day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (driver_id, submission_day)
);
GRANT ALL ON public.driver_request_daily_slots TO service_role;
ALTER TABLE public.driver_request_daily_slots ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS driver_requests_driver_created_at_idx ON public.driver_requests(driver_id, created_at);

CREATE OR REPLACE FUNCTION public.enforce_driver_request_daily_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_day date;
  v_start timestamptz;
  v_end timestamptz;
  v_claimed integer;
BEGIN
  v_day := (v_now AT TIME ZONE 'Asia/Dubai')::date;
  v_start := v_day::timestamp AT TIME ZONE 'Asia/Dubai';
  v_end := (v_day + 1)::timestamp AT TIME ZONE 'Asia/Dubai';
  INSERT INTO public.driver_request_daily_slots(driver_id, submission_day)
  VALUES (NEW.driver_id, v_day)
  ON CONFLICT (driver_id, submission_day) DO NOTHING;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 OR EXISTS (
    SELECT 1 FROM public.driver_requests r
    WHERE r.driver_id = NEW.driver_id AND r.created_at >= v_start AND r.created_at < v_end
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DAILY_REQUEST_LIMIT: You can submit only one request per day, regardless of request type. Please try again after midnight Dubai time.';
  END IF;
  NEW.created_at := v_now;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_driver_request_daily_limit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_enforce_driver_request_daily_limit BEFORE INSERT ON public.driver_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_driver_request_daily_limit();

-- Regression checks run inside a rolled-back subtransaction, leaving no test records.
DO $$
DECLARE
  v_driver text := 'daily-limit-test-' || gen_random_uuid()::text;
  v_first timestamptz;
BEGIN
  BEGIN
    INSERT INTO public.driver_requests(driver_id, request_type, subject, description, status, request_no, created_at)
    VALUES(v_driver, 'vehicle_change', 'Daily limit test', 'Test', 'rejected', v_driver || '-1', now() - interval '10 days')
    RETURNING created_at INTO v_first;
    IF abs(extract(epoch FROM (clock_timestamp() - v_first))) > 5 THEN
      RAISE EXCEPTION 'Regression: submission timestamp was not enforced';
    END IF;
    BEGIN
      INSERT INTO public.driver_requests(driver_id, request_type, subject, description, status, request_no)
      VALUES(v_driver, 'day_off', 'Day Off Request - 01 Nov 2026', 'Test', 'approved', v_driver || '-2');
      RAISE EXCEPTION 'Regression: second request of a different type/status was allowed';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM NOT LIKE 'DAILY_REQUEST_LIMIT:%' THEN RAISE; END IF;
    END;
    DELETE FROM public.driver_requests WHERE driver_id = v_driver;
    BEGIN
      INSERT INTO public.driver_requests(driver_id, request_type, subject, description, status, request_no)
      VALUES(v_driver, 'vehicle_change', 'Test', 'Test', 'pending', v_driver || '-3');
      RAISE EXCEPTION 'Regression: deletion reopened the daily slot';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM NOT LIKE 'DAILY_REQUEST_LIMIT:%' THEN RAISE; END IF;
    END;
    INSERT INTO public.driver_requests(driver_id, request_type, subject, description, status, request_no)
    VALUES(v_driver || '-other', 'vehicle_change', 'Test', 'Test', 'pending', v_driver || '-other');
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'Rollback successful regression fixtures';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
END;
$$;