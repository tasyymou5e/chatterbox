-- Create table for custom LLM providers
CREATE TABLE IF NOT EXISTS public.llm_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  models JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT true,
  pricing_config JSONB DEFAULT '{"inputPricePer1k": 0.001, "outputPricePer1k": 0.002}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.llm_providers ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can manage LLM providers" ON public.llm_providers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Create trigger for updated_at
CREATE TRIGGER update_llm_providers_updated_at
  BEFORE UPDATE ON public.llm_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default providers (read-only)
INSERT INTO public.llm_providers (provider_key, display_name, api_endpoint, models, is_custom, pricing_config)
VALUES 
  ('grok', 'Grok (xAI)', 'https://api.x.ai/v1', '["grok-3", "grok-3-mini", "grok-2-audio"]'::jsonb, false, '{"inputPricePer1k": 0.005, "outputPricePer1k": 0.015}'::jsonb),
  ('openai', 'OpenAI', 'https://api.openai.com/v1', '["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"]'::jsonb, false, '{"inputPricePer1k": 0.03, "outputPricePer1k": 0.06}'::jsonb),
  ('anthropic', 'Anthropic', 'https://api.anthropic.com/v1', '["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"]'::jsonb, false, '{"inputPricePer1k": 0.015, "outputPricePer1k": 0.075}'::jsonb),
  ('google', 'Google (Gemini)', 'https://generativelanguage.googleapis.com/v1', '["gemini-pro", "gemini-1.5-pro", "gemini-1.5-flash"]'::jsonb, false, '{"inputPricePer1k": 0.00025, "outputPricePer1k": 0.0005}'::jsonb)
ON CONFLICT (provider_key) DO NOTHING;