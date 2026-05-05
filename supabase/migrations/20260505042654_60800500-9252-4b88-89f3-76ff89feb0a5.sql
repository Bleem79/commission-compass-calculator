CREATE OR REPLACE FUNCTION public.generate_entry_pass_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  current_year TEXT;
  max_seq INTEGER;
  candidate TEXT;
BEGIN
  current_year := to_char(now(), 'YYYY');

  -- Serialize concurrent inserts for the same year
  PERFORM pg_advisory_xact_lock(hashtext('entry_passes_seq_' || current_year));

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(entry_no FROM 'EP-' || current_year || '-(\d+)') AS INTEGER)
  ), 0)
  INTO max_seq
  FROM public.entry_passes
  WHERE entry_no ~ ('^EP-' || current_year || '-\d+$');

  LOOP
    max_seq := max_seq + 1;
    candidate := 'EP-' || current_year || '-' || LPAD(max_seq::TEXT, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.entry_passes WHERE entry_no = candidate);
  END LOOP;

  NEW.entry_no := candidate;
  RETURN NEW;
END;
$function$;