import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export interface ConversationMessage {
  role: string;
  content: string;
}

/**
 * Resolve or create a conversation, returning the conversation ID and existing messages.
 */
export async function resolveConversation(
  conversationId: string | null,
  userId: string,
  messages: ConversationMessage[],
  userClient: SupabaseClient,
  serviceClient: SupabaseClient,
): Promise<{ conversationId: string; existingMessages: ConversationMessage[] }> {
  if (conversationId) {
    const { data: existingMessages } = await userClient
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    return { conversationId, existingMessages: existingMessages || [] };
  }

  // Create new conversation
  const firstUserMsg = messages.find(m => m.role === 'user');
  const title = firstUserMsg
    ? firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
    : 'New conversation';

  // Ensure user has a profile row (FK requirement)
  const { data: profileExists } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profileExists) {
    const { data: authUser } = await serviceClient.auth.admin.getUserById(userId);
    await serviceClient.from('profiles').insert({
      user_id: userId,
      first_name: authUser?.user?.user_metadata?.first_name || 'User',
      last_name: authUser?.user?.user_metadata?.last_name || '',
    });
  }

  const { data: newConv, error: convError } = await userClient
    .from('ai_conversations')
    .insert({ user_id: userId, title })
    .select('id')
    .single();

  if (convError || !newConv) {
    throw new Error('Failed to create conversation');
  }

  return { conversationId: newConv.id, existingMessages: [] };
}

/**
 * Save a user message to a conversation.
 */
export async function saveUserMessage(
  conversationId: string,
  content: string,
  userClient: SupabaseClient,
): Promise<void> {
  await userClient.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content,
  });
}

/**
 * Save an assistant message and update conversation timestamp.
 */
export async function saveAssistantMessage(
  conversationId: string,
  content: string,
  model: string,
  tokensUsed: number | null,
  serviceClient: SupabaseClient,
): Promise<void> {
  if (content) {
    await serviceClient.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content,
      tokens_used: tokensUsed,
      model,
    });
  }

  await serviceClient
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}
