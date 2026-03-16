import { useState, useRef, useEffect } from 'react';
import { useAIChat } from '@/hooks/useAIChat';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MessageCircle,
  X,
  Send,
  Plus,
  Trash2,
  ChevronLeft,
  Loader2,
  StopCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function AIAssistantChat() {
  const {
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
  } = useAIChat();

  const userRole = useAuthStore((s) => s.userRole);

  const [isOpen, setIsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [input, setInput] = useState('');
  const [quotaPulse, setQuotaPulse] = useState(false);
  const prevQuotaRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect quota decrease and trigger pulse
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (
      prevQuotaRef.current !== null &&
      quotaRemaining !== null &&
      quotaRemaining < prevQuotaRef.current
    ) {
      setQuotaPulse(true);
      timer = setTimeout(() => setQuotaPulse(false), 700);
    }
    prevQuotaRef.current = quotaRemaining;
    return () => { if (timer) clearTimeout(timer); };
  }, [quotaRemaining]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center"
        aria-label="Open AI Assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[560px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          {showSidebar ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSidebar(false)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSidebar(true)} title="Conversation history">
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
          <h3 className="font-semibold text-sm text-foreground">Chatterbox AI</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={createConversation} title="New conversation">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        {showSidebar && (
          <div className="absolute inset-0 z-10 bg-background flex flex-col">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</p>
            </div>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No conversations yet</p>
              ) : (
                <div className="p-2 space-y-1">
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      className={cn(
                        'group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors',
                        activeConversationId === conv.id
                          ? 'bg-primary/10 text-foreground'
                          : 'hover:bg-muted text-muted-foreground'
                      )}
                      onClick={() => {
                        selectConversation(conv.id);
                        setShowSidebar(false);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{conv.title || 'Untitled'}</p>
                        <p className="text-xs text-muted-foreground/70">
                          {format(new Date(conv.updated_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Start a conversation with Chatterbox AI</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages
                .filter(m => m.role !== 'system')
                .map(msg => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Quota indicator */}
      {quotaLimit !== null && quotaLimit !== -1 && quotaRemaining !== null && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'px-3 pt-2 transition-transform duration-500 ease-out cursor-default',
                  quotaPulse && 'scale-105'
                )}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span
                    className={cn(
                      'transition-colors duration-500',
                      quotaPulse ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}
                  >
                    {quotaRemaining === 0
                      ? 'Daily limit reached'
                      : `${quotaRemaining}/${quotaLimit} messages remaining`}
                  </span>
                </div>
                <Progress
                  value={quotaLimit > 0 ? (quotaRemaining / quotaLimit) * 100 : 0}
                  className={cn(
                    'h-1.5',
                    quotaRemaining === 0 && '[&>div]:bg-destructive',
                    quotaRemaining > 0 && quotaRemaining / quotaLimit <= 0.25 && '[&>div]:bg-destructive',
                    quotaRemaining / quotaLimit > 0.25 && quotaRemaining / quotaLimit <= 0.5 && '[&>div]:bg-yellow-500',
                  )}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">
                Role: {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'Unknown'}
              </p>
              <p className="text-muted-foreground">Quota resets daily at midnight UTC</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-3 py-3 border-t border-border flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={quotaRemaining === 0 ? 'Daily limit reached' : 'Type a message...'}
          disabled={isSending || quotaRemaining === 0}
          className="flex-1 text-sm"
        />
        {isSending ? (
          <Button type="button" size="icon" variant="outline" onClick={cancelStream} title="Stop">
            <StopCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim() || quotaRemaining === 0}>
            <Send className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
