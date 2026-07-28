DELETE FROM public.driver_surveys a
USING public.driver_surveys b
WHERE a.user_id = b.user_id
  AND a.question = b.question
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS driver_surveys_user_question_unique
ON public.driver_surveys (user_id, question);