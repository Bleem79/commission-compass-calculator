CREATE OR REPLACE FUNCTION public.generate_entry_pass_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year text;
  next_seq integer;
  table_max_seq integer;
BEGIN
  current_year := to_char(now(), 'YYYY');

  SELECT COALESCE(MAX((substring(entry_no from ('^EP-' || current_year || '-([0-9]+)$')))::integer), 0)
  INTO table_max_seq
  FROM public.entry_passes
  WHERE entry_no ~ ('^EP-' || current_year || '-[0-9]+$');

  INSERT INTO public.entry_pass_sequences (year, last_seq)
  VALUES (current_year, table_max_seq + 1)
  ON CONFLICT (year) DO UPDATE
    SET last_seq = GREATEST(public.entry_pass_sequences.last_seq + 1, table_max_seq + 1)
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