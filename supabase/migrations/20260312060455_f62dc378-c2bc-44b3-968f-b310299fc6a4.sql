
-- AI Providers table
CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  base_url text NOT NULL,
  models jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- AI API Keys table
CREATE TABLE public.ai_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  label text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

-- Admins can manage providers
CREATE POLICY "Admins can manage providers" ON public.ai_providers
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Authenticated users can read active providers (for model selector)
CREATE POLICY "Users can read active providers" ON public.ai_providers
  FOR SELECT TO authenticated USING (is_active = true);

-- Only admins can manage API keys
CREATE POLICY "Admins can manage api keys" ON public.ai_api_keys
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed providers
INSERT INTO public.ai_providers (name, display_name, base_url, models, is_default, sort_order) VALUES
('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1/chat/completions', '[{"id":"deepseek-chat","name":"DeepSeek V3"},{"id":"deepseek-coder","name":"DeepSeek Coder"},{"id":"deepseek-reasoner","name":"DeepSeek R1"}]'::jsonb, true, 1),
('openai', 'OpenAI', 'https://api.openai.com/v1/chat/completions', '[{"id":"gpt-4o","name":"GPT-4o"},{"id":"gpt-4o-mini","name":"GPT-4o Mini"},{"id":"gpt-4.1-mini","name":"GPT-4.1 Mini"},{"id":"o4-mini","name":"o4-mini"}]'::jsonb, false, 2),
('groq', 'Groq', 'https://api.groq.com/openai/v1/chat/completions', '[{"id":"llama-3.3-70b-versatile","name":"Llama 3.3 70B"},{"id":"mixtral-8x7b-32768","name":"Mixtral 8x7B"},{"id":"gemma2-9b-it","name":"Gemma 2 9B"}]'::jsonb, false, 3),
('google', 'Google AI', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', '[{"id":"gemini-2.5-flash","name":"Gemini 2.5 Flash"},{"id":"gemini-2.0-flash","name":"Gemini 2.0 Flash"},{"id":"gemini-1.5-pro","name":"Gemini 1.5 Pro"}]'::jsonb, false, 4),
('xai', 'xAI (Grok)', 'https://api.x.ai/v1/chat/completions', '[{"id":"grok-3-mini","name":"Grok 3 Mini"},{"id":"grok-2","name":"Grok 2"}]'::jsonb, false, 5),
('huggingface', 'Hugging Face', 'https://api-inference.huggingface.co/v1/chat/completions', '[{"id":"meta-llama/Llama-3.3-70B-Instruct","name":"Llama 3.3 70B"},{"id":"mistralai/Mixtral-8x7B-Instruct-v0.1","name":"Mixtral 8x7B"}]'::jsonb, false, 6),
('replicate', 'Replicate', 'https://api.replicate.com/v1/', '[{"id":"meta/llama-3-70b-instruct","name":"Llama 3 70B"}]'::jsonb, false, 7),
('elevenlabs', 'ElevenLabs', 'https://api.elevenlabs.io/v1/', '[]'::jsonb, false, 8);
