/**
 * QuickNeedsChatBar - Persistent bottom bar with one-tap AAC communication buttons
 * Each button triggers text-to-speech output for non-verbal children
 * Based on ConnectSphere research (NDBI/ESDM framework)
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Volume2 } from 'lucide-react';

interface NeedButton {
  id: string;
  emoji: string;
  label: string;
  phrase: string;
  color: string;
}

const DEFAULT_NEEDS: NeedButton[] = [
  { id: 'help', emoji: '🆘', label: 'Help', phrase: 'I need help please', color: 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800/50 border-red-300 dark:border-red-700' },
  { id: 'hungry', emoji: '🍽️', label: 'Hungry', phrase: 'I am hungry', color: 'bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-800/50 border-orange-300 dark:border-orange-700' },
  { id: 'thirsty', emoji: '💧', label: 'Thirsty', phrase: 'I am thirsty', color: 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/50 border-blue-300 dark:border-blue-700' },
  { id: 'potty', emoji: '🚽', label: 'Potty', phrase: 'I need to use the bathroom', color: 'bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800/50 border-green-300 dark:border-green-700' },
  { id: 'done', emoji: '✅', label: 'All Done', phrase: 'I am all done', color: 'bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-800/50 border-purple-300 dark:border-purple-700' },
  { id: 'hurt', emoji: '🤕', label: 'Hurt', phrase: 'Something hurts', color: 'bg-pink-100 dark:bg-pink-900/40 hover:bg-pink-200 dark:hover:bg-pink-800/50 border-pink-300 dark:border-pink-700' },
];

export function QuickNeedsChatBar() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const speak = useCallback((need: NeedButton) => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(need.phrase);
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    
    setSpeakingId(need.id);
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    
    window.speechSynthesis.speak(utterance);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t-2 border-purple-200 dark:border-purple-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] safe-area-pb">
      <div className="container mx-auto px-2 py-2">
        <div className="flex items-center gap-1.5 justify-center overflow-x-auto scrollbar-hide">
          <Volume2 className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
          {DEFAULT_NEEDS.map((need) => (
            <button
              key={need.id}
              onClick={() => speak(need)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-2 transition-all min-w-[64px]',
                'active:scale-95 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                need.color,
                speakingId === need.id && 'ring-2 ring-primary scale-105 shadow-lg'
              )}
              aria-label={`Say: ${need.phrase}`}
            >
              <span className="text-2xl leading-none" role="img" aria-hidden="true">
                {need.emoji}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-foreground/80 leading-tight">
                {need.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
