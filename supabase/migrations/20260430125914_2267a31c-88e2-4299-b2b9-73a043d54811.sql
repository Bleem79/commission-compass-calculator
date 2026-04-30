
-- 1) Remove duplicate trigger/function
DROP TRIGGER IF EXISTS generate_entry_passes_entry_no ON public.entry_passes;
DROP FUNCTION IF EXISTS public.generate_entry_no();

-- 2) Backfill: renumber duplicates (keep oldest, renumber the rest to next available)
DO $$
DECLARE
  r RECORD;
  v_year TEXT;
  v_max INTEGER;
  v_new TEXT;
BEGIN
  FOR r IN
    SELECT id, entry_no, created_at,
           ROW_NUMBER() OVER (PARTITION BY entry_no ORDER BY created_at ASC, id ASC) AS rn
    FROM public.entry_passes
  LOOP
    IF r.rn > 1 THEN
      v_year := split_part(r.entry_no, '-', 2);
      SELECT COALESCE(MAX(CAST(SUBSTRING(entry_no FROM 'EP-' || v_year || '-(\d+)') AS INTEGER)), 0)
      INTO v_max
      FROM public.entry_passes
      WHERE entry_no LIKE 'EP-' || v_year || '-%';
      v_new := 'EP-' || v_year || '-' || LPAD((v_max + 1)::TEXT, 5, '0');
      UPDATE public.entry_passes SET entry_no = v_new WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- 3) Add unique constraint
ALTER TABLE public.entry_passes
  ADD CONSTRAINT entry_passes_entry_no_unique UNIQUE (entry_no);

-- 4) Make generator concurrency-safe with advisory lock
CREATE OR REPLACE FUNCTION public.generate_entry_pass_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  current_year TEXT;
  max_seq INTEGER;
  new_seq TEXT;
BEGIN
  current_year := to_char(now(), 'YYYY');

  -- Serialize concurrent inserts for the same year
  PERFORM pg_advisory_xact_lock(hashtext('entry_passes_seq_' || current_year));

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(entry_no FROM 'EP-' || current_year || '-(\d+)') AS INTEGER)
  ), 0)
  INTO max_seq
  FROM public.entry_passes
  WHERE entry_no LIKE 'EP-' || current_year || '-%';

  new_seq := LPAD((max_seq + 1)::TEXT, 5, '0');
  NEW.entry_no := 'EP-' || current_year || '-' || new_seq;
  RETURN NEW;
END;
$function$;
