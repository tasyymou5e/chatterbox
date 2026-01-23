-- Add tracking columns to llm_providers table
ALTER TABLE public.llm_providers 
ADD COLUMN IF NOT EXISTS api_key_configured BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'unchecked';

-- Add index for faster queries on active providers
CREATE INDEX IF NOT EXISTS idx_llm_providers_active ON public.llm_providers(is_active) WHERE is_active = true;

-- Insert default built-in providers if they don't exist (using JSONB for models)
INSERT INTO public.llm_providers (provider_key, display_name, api_endpoint, models, is_active, is_custom, pricing_config, api_key_configured)
VALUES 
  ('grok', 'Grok (xAI)', 'https://api.x.ai/v1', '["grok-3", "grok-3-mini", "grok-2-audio"]'::jsonb, true, false, '{"inputPricePer1k": 0.005, "outputPricePer1k": 0.015}'::jsonb, false),
  ('openai', 'OpenAI', 'https://api.openai.com/v1', '["gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-3.5-turbo"]'::jsonb, true, false, '{"inputPricePer1k": 0.01, "outputPricePer1k": 0.03}'::jsonb, false),
  ('anthropic', 'Anthropic', 'https://api.anthropic.com/v1', '["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"]'::jsonb, true, false, '{"inputPricePer1k": 0.015, "outputPricePer1k": 0.075}'::jsonb, false),
  ('google', 'Google (Gemini)', 'https://generativelanguage.googleapis.com/v1', '["gemini-pro", "gemini-pro-vision", "gemini-2.5-flash"]'::jsonb, true, false, '{"inputPricePer1k": 0.00025, "outputPricePer1k": 0.0005}'::jsonb, false),
  ('lovable', 'Lovable AI Gateway', 'https://api.lovable.dev/v1', '["google/gemini-2.5-flash", "openai/gpt-5"]'::jsonb, true, false, '{"inputPricePer1k": 0.001, "outputPricePer1k": 0.002}'::jsonb, false)
ON CONFLICT (provider_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  api_endpoint = EXCLUDED.api_endpoint,
  models = EXCLUDED.models,
  pricing_config = EXCLUDED.pricing_config;