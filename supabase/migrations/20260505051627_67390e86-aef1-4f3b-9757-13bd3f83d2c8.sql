CREATE TABLE IF NOT EXISTS public.entry_pass_sequences (
  year text PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0
);

ALTER TABLE public.entry_pass_sequences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'entry_pass_sequences'
      AND policyname = 'Admins can view entry pass sequences'
  ) THEN
    CREATE POLICY "Admins can view entry pass sequences"
    ON public.entry_pass_sequences
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

INSERT INTO public.entry_pass_sequences (year, last_seq)
SELECT seq_year, max_seq
FROM (
  SELECT
    substring(entry_no from '^EP-(\d{4})-\d+$') AS seq_year,
    max((substring(entry_no from '^EP-\d{4}-(\d+)$'))::integer) AS max_seq
  FROM public.entry_passes
  WHERE entry_no ~ '^EP-\d{4}-\d+$'
  GROUP BY substring(entry_no from '^EP-(\d{4})-\d+$')
) existing
WHERE seq_year IS NOT NULL
ON CONFLICT (year) DO UPDATE
SET last_seq = GREATEST(public.entry_pass_sequences.last_seq, EXCLUDED.last_seq);

CREATE OR REPLACE FUNCTION public.generate_entry_pass_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_year text;
  next_seq integer;
BEGIN
  current_year := to_char(now(), 'YYYY');

  INSERT INTO public.entry_pass_sequences (year, last_seq)
  VALUES (
    current_year,
    COALESCE((
      SELECT max((substring(entry_no from '^EP-' || current_year || '-(\d+)$'))::integer)
      FROM public.entry_passes
      WHERE entry_no ~ ('^EP-' || current_year || '-\d+$')
    ), 0) + 1
  )
  ON CONFLICT (year) DO UPDATE
    SET last_seq = GREATEST(
      public.entry_pass_sequences.last_seq + 1,
      COALESCE((
        SELECT max((substring(entry_no from '^EP-' || current_year || '-(\d+)$'))::integer)
        FROM public.entry_passes
        WHERE entry_no ~ ('^EP-' || current_year || '-\d+$')
      ), 0) + 1
    )
  RETURNING last_seq INTO next_seq;

  NEW.entry_no := 'EP-' || current_year || '-' || lpad(next_seq::text, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_entry_pass_number ON public.entry_passes;
CREATE TRIGGER set_entry_pass_number
BEFORE INSERT ON public.entry_passes
FOR EACH ROW
EXECUTE FUNCTION public.generate_entry_pass_number();