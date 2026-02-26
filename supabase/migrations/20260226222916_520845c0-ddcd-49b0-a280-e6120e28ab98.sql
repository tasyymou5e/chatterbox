-- Fix FK: ai_conversations.user_id should reference profiles.user_id (auth user id), not profiles.id
ALTER TABLE public.ai_conversations DROP CONSTRAINT ai_conversations_user_id_fkey;
ALTER TABLE public.ai_conversations ADD CONSTRAINT ai_conversations_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;