
INSERT INTO public.llm_providers (provider_key, display_name, api_endpoint, models, is_active, api_key_configured, health_status)
VALUES
  ('kimi', 'Kimi 2 (Moonshot AI)', 'https://api.moonshot.cn/v1', '["kimi-2", "moonshot-v1-8k", "moonshot-v1-32k"]'::jsonb, false, false, 'unchecked'),
  ('huggingface', 'Hugging Face (Ensemble)', 'https://api-inference.huggingface.co/v1', '["meta-llama/Llama-3-70b", "mistralai/Mixtral-8x7B"]'::jsonb, false, false, 'unchecked'),
  ('local', 'Local Model (Ollama)', 'http://localhost:11434/v1', '["llama3", "mistral", "codellama"]'::jsonb, false, false, 'unchecked')
ON CONFLICT (provider_key) DO NOTHING;
