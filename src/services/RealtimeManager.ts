// Phase 3: Optimized Realtime with Connection Pooling
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChannelSubscription {
  callback: Function;
  channelName: string;
  filter?: string;
}

class RealtimeManager {
  private static instance: RealtimeManager;
  private channels = new Map<string, RealtimeChannel>();
  private subscribers = new Map<string, Set<Function>>();
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
    callback: Function,
    filter?: string
  ): () => void {
    const subscriptionKey = `${channelName}:${table}:${filter || 'all'}`;
    
    if (!this.subscribers.has(subscriptionKey)) {
      this.subscribers.set(subscriptionKey, new Set());
      this.createChannel(subscriptionKey, channelName, table, filter);
    }

    this.subscribers.get(subscriptionKey)!.add(callback);
    console.log(`RealtimeManager: Added subscriber to ${subscriptionKey}. Total: ${this.subscribers.get(subscriptionKey)!.size}`);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriptionKey, callback);
    };
  }

  // Subscribe to family-specific channel
  subscribeFamilyChannel(
    familyId: string,
    table: string,
    callback: Function,
    filter?: string
  ): () => void {
    const channelName = `family-${familyId}`;
    return this.subscribe(channelName, table, callback, filter);
  }

  // Subscribe to global channel
  subscribeGlobalChannel(
    table: string,
    callback: Function,
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
      console.log(`RealtimeManager: Creating channel ${channelName} for table ${table}`);
      
      const channel = supabase.channel(channelName);
      
      // Configure postgres changes listener
      const config: any = {
        event: '*',
        schema: 'public',
        table: table
      };
      
      if (filter) {
        config.filter = filter;
      }

      channel.on('postgres_changes', config, (payload) => {
        console.log(`RealtimeManager: Received event for ${subscriptionKey}:`, payload);
        const callbacks = this.subscribers.get(subscriptionKey);
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(payload);
            } catch (error) {
              console.error(`RealtimeManager: Error in callback for ${subscriptionKey}:`, error);
            }
          });
        }
      });

      // Handle connection status
      channel.subscribe((status, err) => {
        console.log(`RealtimeManager: Channel ${channelName} status:`, status);
        
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempts = 0; // Reset on successful connection
          console.log(`RealtimeManager: Successfully subscribed to ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`RealtimeManager: Channel error for ${channelName}:`, err);
          this.handleReconnect(subscriptionKey, channelName, table, filter);
        } else if (status === 'TIMED_OUT') {
          console.warn(`RealtimeManager: Channel timeout for ${channelName}`);
          this.handleReconnect(subscriptionKey, channelName, table, filter);
        }
      });

      this.channels.set(subscriptionKey, channel);
      console.log(`RealtimeManager: Channel created and stored for ${subscriptionKey}`);
      
    } catch (error) {
      console.error(`RealtimeManager: Failed to create channel ${channelName}:`, error);
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
      console.error(`RealtimeManager: Max reconnection attempts reached for ${channelName}`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`RealtimeManager: Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} for ${channelName} in ${delay}ms`);
    
    setTimeout(() => {
      // Clean up existing channel
      const existingChannel = this.channels.get(subscriptionKey);
      if (existingChannel) {
        try {
          supabase.removeChannel(existingChannel);
        } catch (error) {
          console.warn(`RealtimeManager: Error removing existing channel:`, error);
        }
        this.channels.delete(subscriptionKey);
      }
      
      // Create new channel
      this.createChannel(subscriptionKey, channelName, table, filter);
    }, delay);
  }

  // Unsubscribe from a channel
  private unsubscribe(subscriptionKey: string, callback: Function): void {
    const callbacks = this.subscribers.get(subscriptionKey);
    if (callbacks) {
      callbacks.delete(callback);
      console.log(`RealtimeManager: Removed subscriber from ${subscriptionKey}. Remaining: ${callbacks.size}`);
      
      // If no more subscribers, clean up the channel
      if (callbacks.size === 0) {
        const channel = this.channels.get(subscriptionKey);
        if (channel) {
          console.log(`RealtimeManager: Cleaning up channel ${subscriptionKey}`);
          try {
            supabase.removeChannel(channel);
          } catch (error) {
            console.warn(`RealtimeManager: Error removing channel:`, error);
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
    console.log('RealtimeManager: Cleaning up all channels');
    
    for (const [key, channel] of this.channels) {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn(`RealtimeManager: Error cleaning up channel ${key}:`, error);
      }
    }
    
    this.channels.clear();
    this.subscribers.clear();
    this.reconnectAttempts = 0;
  }
}

export const realtimeManager = RealtimeManager.getInstance();
export default RealtimeManager;