import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { SessionLog, StepInstruction } from '@/types/skillPlan';

interface SessionState {
  sessionId: string | null;
  steps: StepInstruction[];
  currentStep: number;
  totalSteps: number;
  maxDuration: number;
  elapsedSeconds: number;
  isPaused: boolean;
  isCompleted: boolean;
  aiMessage: string | null;
}

export function useActivitySession() {
  const [session, setSession] = useState<SessionState>({
    sessionId: null,
    steps: [],
    currentStep: 0,
    totalSteps: 0,
    maxDuration: 30,
    elapsedSeconds: 0,
    isPaused: false,
    isCompleted: false,
    aiMessage: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionLog[]>([]);

  const startSession = useCallback(async (catalogItemId: string, planItemId?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-session-helper', {
        body: { action: 'start_session', catalog_item_id: catalogItemId, plan_item_id: planItemId },
      });
      if (error) throw error;
      setSession({
        sessionId: data.session.id,
        steps: data.steps || [],
        currentStep: 0,
        totalSteps: data.steps?.length || 0,
        maxDuration: data.max_duration || 30,
        elapsedSeconds: 0,
        isPaused: false,
        isCompleted: false,
        aiMessage: null,
      });
      return data.session;
    } catch (err) {
      toast({ title: 'Error starting activity', description: String(err), variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProgress = useCallback(async (currentStep: number, durationSeconds: number) => {
    if (!session.sessionId) return;
    try {
      const { data, error } = await supabase.functions.invoke('ai-session-helper', {
        body: {
          action: 'update_progress',
          session_id: session.sessionId,
          current_step: currentStep,
          duration_seconds: durationSeconds,
        },
      });
      if (error) throw error;
      setSession(prev => ({
        ...prev,
        currentStep,
        elapsedSeconds: durationSeconds,
        aiMessage: data.ai_message,
      }));
      if (data.should_pause) {
        toast({ title: '⏸️ Break Time!', description: data.ai_message || 'Time for a short break.' });
      }
      return data;
    } catch (err) {
      console.error('Update progress error:', err);
      return null;
    }
  }, [session.sessionId]);

  const pauseSession = useCallback(async (reason: string = 'child_request') => {
    if (!session.sessionId) return;
    try {
      const { data, error } = await supabase.functions.invoke('ai-session-helper', {
        body: { action: 'pause_session', session_id: session.sessionId, pause_reason: reason },
      });
      if (error) throw error;
      setSession(prev => ({ ...prev, isPaused: true }));
      return data.session;
    } catch (err) {
      toast({ title: 'Error pausing', description: String(err), variant: 'destructive' });
      return null;
    }
  }, [session.sessionId]);

  const resumeSession = useCallback(async () => {
    if (!session.sessionId) return;
    try {
      const { data, error } = await supabase.functions.invoke('ai-session-helper', {
        body: { action: 'resume_session', session_id: session.sessionId },
      });
      if (error) throw error;
      setSession(prev => ({
        ...prev,
        isPaused: false,
        aiMessage: data.ai_message,
      }));
      if (data.ai_message) {
        toast({ title: '🚀 Welcome back!', description: data.ai_message });
      }
      return data.session;
    } catch (err) {
      toast({ title: 'Error resuming', description: String(err), variant: 'destructive' });
      return null;
    }
  }, [session.sessionId]);

  const completeSession = useCallback(async (score?: number) => {
    if (!session.sessionId) return;
    try {
      const { data, error } = await supabase.functions.invoke('ai-session-helper', {
        body: { action: 'complete_session', session_id: session.sessionId, score },
      });
      if (error) throw error;
      setSession(prev => ({ ...prev, isCompleted: true }));
      toast({ title: '🎉 Activity Complete!', description: 'Great job finishing this activity!' });
      return data.session;
    } catch (err) {
      toast({ title: 'Error completing', description: String(err), variant: 'destructive' });
      return null;
    }
  }, [session.sessionId]);

  const fetchSessions = useCallback(async (childId?: string, date?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-session-helper', {
        body: { action: 'get_sessions', child_id: childId, date },
      });
      if (error) throw error;
      setSessions(data?.sessions || []);
      return data?.sessions || [];
    } catch (err) {
      console.error('Fetch sessions error:', err);
      return [];
    }
  }, []);

  return {
    session, sessions, isLoading,
    startSession, updateProgress, pauseSession, resumeSession, completeSession, fetchSessions,
    setSession,
  };
}
