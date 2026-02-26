
-- AI Conversations table
CREATE TABLE public.ai_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- AI Messages table
CREATE TABLE public.ai_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  tokens_used integer,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_at ON public.ai_messages(created_at);

-- RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- ai_conversations policies
CREATE POLICY "Users can view their own conversations"
  ON public.ai_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversations"
  ON public.ai_conversations FOR DELETE
  USING (user_id = auth.uid());

-- ai_messages policies (join through conversation ownership)
CREATE POLICY "Users can view messages in their conversations"
  ON public.ai_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert messages in their conversations"
  ON public.ai_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete messages in their conversations"
  ON public.ai_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
  ));

-- Updated_at trigger for conversations
CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert AI site settings
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES
  ('ai_provider', '"lovable"', 'Active AI provider key'),
  ('ai_model', '"google/gemini-3-flash-preview"', 'Active AI model'),
  ('ai_enabled', 'true', 'Whether AI assistant is enabled'),
  ('ai_system_prompt', '"You are Chatterbox AI, a friendly and helpful assistant for families. Keep responses clear, concise, and family-friendly. Help with questions about chores, activities, and family organization."', 'System prompt for AI assistant')
ON CONFLICT (setting_key) DO NOTHING;
