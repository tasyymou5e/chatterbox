// Phase 3: Optimized Realtime with Connection Pooling
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { cError } from '@/utils/wideLogger';

// Typed callback for realtime subscriptions
type RealtimeCallback = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;

class RealtimeManager {
  private static instance: RealtimeManager;
  private channels = new Map<string, RealtimeChannel>();
  private subscribers = new Map<string, Set<RealtimeCallback>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  // Subscribe to a channel with automatic pooling
  subscribe(
    channelName: string, 
    table: string,
    callback: RealtimeCallback,
    filter?: string
  ): () => void {
    const subscriptionKey = `${channelName}:${table}:${filter || 'all'}`;
    
    if (!this.subscribers.has(subscriptionKey)) {
      this.subscribers.set(subscriptionKey, new Set());
      this.createChannel(subscriptionKey, channelName, table, filter);
    }

    this.subscribers.get(subscriptionKey)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriptionKey, callback);
    };
  }

  // Subscribe to family-specific channel
  subscribeFamilyChannel(
    familyId: string,
    table: string,
    callback: RealtimeCallback,
    filter?: string
  ): () => void {
    const channelName = `family-${familyId}`;
    return this.subscribe(channelName, table, callback, filter);
  }

  // Subscribe to global channel
  subscribeGlobalChannel(
    table: string,
    callback: RealtimeCallback,
    filter?: string
  ): () => void {
    return this.subscribe('global-catalog', table, callback, filter);
  }

  // Create a new channel with connection management
  private createChannel(
    subscriptionKey: string,
    channelName: string,
    table: string,
    filter?: string
  ): void {
    try {
      const channel = supabase.channel(channelName);
      
      // Configure postgres changes listener using the Supabase SDK pattern
      const config = {
        event: '*' as const,
        schema: 'public' as const,
        table: table,
        ...(filter && { filter })
      };

      channel.on('postgres_changes', config, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const callbacks = this.subscribers.get(subscriptionKey);
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(payload);
            } catch (error) {
              cError('RealtimeManager: Callback execution failed', error);
            }
          });
        }
      });

      // Handle connection status
      channel.subscribe((status, _err) => {
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempts = 0; // Reset on successful connection
        } else if (status === 'CHANNEL_ERROR') {
          this.handleReconnect(subscriptionKey, channelName, table, filter);
        } else if (status === 'TIMED_OUT') {
          this.handleReconnect(subscriptionKey, channelName, table, filter);
        }
      });

      this.channels.set(subscriptionKey, channel);
      
    } catch (error) {
      this.handleReconnect(subscriptionKey, channelName, table, filter);
    }
  }

  // Handle reconnection with exponential backoff
  private handleReconnect(
    subscriptionKey: string,
    channelName: string,
    table: string,
    filter?: string
  ): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    setTimeout(() => {
      // Clean up existing channel
      const existingChannel = this.channels.get(subscriptionKey);
      if (existingChannel) {
        try {
          supabase.removeChannel(existingChannel);
        } catch (error) {
          cError('RealtimeManager: Failed to remove channel during reconnect', error);
        }
        this.channels.delete(subscriptionKey);
      }
      
      // Create new channel
      this.createChannel(subscriptionKey, channelName, table, filter);
    }, delay);
  }

  // Unsubscribe from a channel
  private unsubscribe(subscriptionKey: string, callback: RealtimeCallback): void {
    const callbacks = this.subscribers.get(subscriptionKey);
    if (callbacks) {
      callbacks.delete(callback);
      
      // If no more subscribers, clean up the channel
      if (callbacks.size === 0) {
        const channel = this.channels.get(subscriptionKey);
        if (channel) {
          try {
            supabase.removeChannel(channel);
          } catch (error) {
            cError('RealtimeManager: Failed to remove channel during unsubscribe', error);
          }
          this.channels.delete(subscriptionKey);
        }
        this.subscribers.delete(subscriptionKey);
      }
    }
  }

  // Get connection statistics
  getStats() {
    return {
      activeChannels: this.channels.size,
      totalSubscriptions: Array.from(this.subscribers.values()).reduce((total, callbacks) => total + callbacks.size, 0),
      reconnectAttempts: this.reconnectAttempts,
      channels: Array.from(this.channels.keys())
    };
  }

  // Manual cleanup for all connections
  cleanup(): void {
    for (const [_key, channel] of this.channels) {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        cError('RealtimeManager: Failed to remove channel during cleanup', error);
      }
    }
    
    this.channels.clear();
    this.subscribers.clear();
    this.reconnectAttempts = 0;
  }
}

export const realtimeManager = RealtimeManager.getInstance();
export default RealtimeManager;