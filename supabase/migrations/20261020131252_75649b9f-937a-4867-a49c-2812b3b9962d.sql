ALTER TABLE public.nationality_message_templates ADD COLUMN nationalities text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.nationality_message_templates ALTER COLUMN nationality SET DEFAULT '';
COMMENT ON COLUMN public.nationality_message_templates.nationalities IS 'Nationalities assigned to a named SMS template; older templates fall back to nationality.';