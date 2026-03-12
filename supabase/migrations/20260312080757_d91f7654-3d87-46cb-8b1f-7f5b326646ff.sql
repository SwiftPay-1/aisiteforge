UPDATE public.ai_providers SET is_default = false WHERE is_default = true;
UPDATE public.ai_providers SET is_default = true WHERE name = 'groq';