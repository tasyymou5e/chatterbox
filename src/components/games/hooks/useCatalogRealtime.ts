/**
 * Custom hook for managing real-time catalog subscriptions
 * Extracted from GamesCatalog.tsx for better modularity
 */

import { useEffect, useState, useCallback } from 'react';
import { realtimeManager } from '@/services/RealtimeManager';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { secureLog } from '@/utils/wideLogger';

interface UseCatalogRealtimeOptions {
  userId: string | undefined;
  userFamily: string | null;
  invalidateContentCache: () => void;
}

interface UseCatalogRealtimeReturn {
  realtimeConnected: boolean;
}

/**
 * Manages real-time subscriptions for the catalog
 * Handles both family-specific and global channels
 */
export function useCatalogRealtime({
  userId,
  userFamily,
  invalidateContentCache
}: UseCatalogRealtimeOptions): UseCatalogRealtimeReturn {
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Optimized realtime state updates handler
  const updateCatalogState = useCallback((payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    secureLog.dev('GamesCatalog: Received realtime update:', payload.eventType);
    
    // Type-safe access to payload properties
    const newRecord = payload.eventType !== 'DELETE' ? payload.new as Record<string, unknown> : null;
    
    switch (payload.eventType) {
      case 'INSERT':
        if (newRecord?.approval_status === 'approved' && newRecord?.is_active) {
          invalidateContentCache();
        }
        break;
      case 'UPDATE':
        if (newRecord?.approval_status === 'approved' && newRecord?.is_active) {
          invalidateContentCache();
        }
        break;
      case 'DELETE':
        invalidateContentCache();
        break;
    }
  }, [invalidateContentCache]);

  useEffect(() => {
    if (!userId) return;

    let unsubscribeContent: (() => void) | undefined;
    let unsubscribeCategories: (() => void) | undefined;
    let unsubscribeFamilyAccess: (() => void) | undefined;

    if (userFamily) {
      // Family-specific subscriptions
      console.log(`Setting up family realtime for family: ${userFamily}`);
      
      unsubscribeContent = realtimeManager.subscribeFamilyChannel(
        userFamily,
        'content_items',
        updateCatalogState
      );

      unsubscribeCategories = realtimeManager.subscribeFamilyChannel(
        userFamily,
        'content_categories',
        () => invalidateContentCache()
      );

      unsubscribeFamilyAccess = realtimeManager.subscribeFamilyChannel(
        userFamily,
        'family_content_access',
        () => invalidateContentCache(),
        `family_id=eq.${userFamily}`
      );

      setRealtimeConnected(true);
    } else {
      // Global subscriptions for users without families
      console.log('Setting up global realtime channels');
      
      unsubscribeContent = realtimeManager.subscribeGlobalChannel(
        'content_items',
        updateCatalogState,
        'is_active=eq.true'
      );

      unsubscribeCategories = realtimeManager.subscribeGlobalChannel(
        'content_categories',
        () => invalidateContentCache()
      );

      setRealtimeConnected(true);
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up realtime subscriptions');
      unsubscribeContent?.();
      unsubscribeCategories?.();
      unsubscribeFamilyAccess?.();
      setRealtimeConnected(false);
    };
  }, [userId, userFamily, updateCatalogState, invalidateContentCache]);

  return { realtimeConnected };
}
