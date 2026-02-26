import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AIConversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export function useAIChat() {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [quotaLimit, setQuotaLimit] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('id, title, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as AIMessage[]);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, []);

  // Select a conversation
  const selectConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    await fetchMessages(conversationId);
  }, [fetchMessages]);

  // Create a new conversation (will be created server-side on first message)
  const createConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      toast({ title: 'Error', description: 'Failed to delete conversation', variant: 'destructive' });
    }
  }, [activeConversationId]);

  // Send a message with streaming
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isSending) return;

    setIsSending(true);

    // Optimistic: add user message
    const tempUserMsg: AIMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: 'Error', description: 'Please log in to use AI chat', variant: 'destructive' });
        setIsSending(false);
        return;
      }

      const userMessages = [{ role: 'user' as const, content }];

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: userMessages,
          conversationId: activeConversationId,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: 'Request failed' }));
        if (resp.status === 429 && errorData.limit) {
          setQuotaRemaining(0);
          setQuotaLimit(errorData.limit);
          toast({
            title: 'Quota Exceeded',
            description: `You've reached your daily limit of ${errorData.limit} AI messages. Try again tomorrow.`,
            variant: 'destructive',
          });
          setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
          setIsSending(false);
          return;
        }
        throw new Error(errorData.error || `HTTP ${resp.status}`);
      }

      // Check quota from headers
      const quotaRemainingHeader = resp.headers.get('X-Quota-Remaining');
      const quotaLimitHeader = resp.headers.get('X-Quota-Limit');
      if (quotaRemainingHeader !== null && quotaLimitHeader !== null) {
        const remaining = parseInt(quotaRemainingHeader, 10);
        const limit = parseInt(quotaLimitHeader, 10);
        setQuotaRemaining(remaining);
        setQuotaLimit(limit);
        if (remaining > 0 && remaining <= 5) {
          toast({
            title: 'Quota Warning',
            description: `You have ${remaining} AI message${remaining === 1 ? '' : 's'} remaining today.`,
          });
        }
      }

      // Capture conversation ID from header
      const newConvId = resp.headers.get('X-Conversation-Id');
      if (newConvId && !activeConversationId) {
        setActiveConversationId(newConvId);
      }

      // Stream response
      if (!resp.body) throw new Error('No response body');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && last.id.startsWith('stream-')) {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, {
                  id: `stream-${Date.now()}`,
                  role: 'assistant' as const,
                  content: assistantContent,
                  created_at: new Date().toISOString(),
                }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Refresh conversations list to get the new/updated one
      await fetchConversations();

    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('Send message error:', err);
      toast({
        title: 'AI Error',
        description: (err as Error).message || 'Failed to send message',
        variant: 'destructive',
      });
      // Remove optimistic user message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  }, [activeConversationId, isSending, fetchConversations]);

  // Cancel streaming
  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Fetch quota info
  const fetchQuota = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const resp = await fetch(CHAT_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (resp.ok) {
        const data = await resp.json();
        setQuotaRemaining(data.remaining);
        setQuotaLimit(data.limit);
      }
    } catch (err) {
      console.error('Failed to fetch quota:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
    fetchQuota();
  }, [fetchConversations, fetchQuota]);

  return {
    conversations,
    activeConversationId,
    messages,
    isLoading,
    isSending,
    quotaRemaining,
    quotaLimit,
    selectConversation,
    createConversation,
    deleteConversation,
    sendMessage,
    cancelStream,
    fetchConversations,
    fetchQuota,
  };
}
