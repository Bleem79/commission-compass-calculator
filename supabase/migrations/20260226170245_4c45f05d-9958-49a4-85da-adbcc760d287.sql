
-- Create a function to generate the next entry pass number
CREATE OR REPLACE FUNCTION public.generate_entry_pass_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  max_seq INTEGER;
  new_seq TEXT;
BEGIN
  current_year := to_char(now(), 'YYYY');
  
  -- Find the max sequence number for the current year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(entry_no FROM 'EP-' || current_year || '-(\d+)') AS INTEGER)
  ), 0)
  INTO max_seq
  FROM public.entry_passes
  WHERE entry_no LIKE 'EP-' || current_year || '-%';
  
  -- Increment by 1 and pad to 5 digits
  new_seq := LPAD((max_seq + 1)::TEXT, 5, '0');
  
  NEW.entry_no := 'EP-' || current_year || '-' || new_seq;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-set entry_no on insert
DROP TRIGGER IF EXISTS set_entry_pass_number ON public.entry_passes;
CREATE TRIGGER set_entry_pass_number
  BEFORE INSERT ON public.entry_passes
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_entry_pass_number();
