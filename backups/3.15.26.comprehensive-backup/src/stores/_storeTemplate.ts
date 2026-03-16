/**
 * STANDARD ZUSTAND STORE TEMPLATE
 * 
 * All stores should follow this pattern for consistency.
 * Copy this file when creating new stores.
 * 
 * Key patterns:
 * 1. Always use devtools() middleware with { name: 'StoreName' }
 * 2. Include loading and error states
 * 3. Include clearError action
 * 4. Use StoreResult for mutation operations
 * 5. Handle auth context (userId, familyId) when needed
 * 
 * NOTE: This is a TEMPLATE file - it contains example code that
 * demonstrates the pattern but is not meant to be executed directly.
 * Copy and adapt for actual stores.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  createStoreError, 
  createStoreSuccess,
  type StoreError,
  type StoreResult 
} from '@/services/storeUtils';

// Example item interface - replace with actual type
interface ExampleItem {
  id: string;
  name: string;
  user_id: string;
  family_id: string;
  created_at: string;
}

interface ExampleInput {
  name: string;
}

interface ExampleState {
  // Data
  items: ExampleItem[];
  
  // Loading/Error states (standard pattern)
  loading: boolean;
  error: StoreError | null;
  
  // Context IDs (if needed for RLS)
  userId: string | null;
  familyId: string | null;
  
  // Standard actions
  setUserId: (userId: string | null) => void;
  setFamilyId: (familyId: string | null) => void;
  clearError: () => void;
  
  // Data actions - TEMPLATE signatures
  fetchItems: () => Promise<void>;
  createItem: (data: ExampleInput) => Promise<StoreResult<ExampleItem>>;
  updateItem: (id: string, data: Partial<ExampleInput>) => Promise<StoreResult<ExampleItem>>;
  deleteItem: (id: string) => Promise<StoreResult<void>>;
  refetch: () => Promise<void>;
}

/**
 * TEMPLATE STORE - Copy and adapt this pattern for new stores
 * 
 * Usage example for a real store:
 * 
 * export const useMyStore = create<MyState>()(
 *   devtools(
 *     (set, get) => ({
 *       // ... your state and actions
 *     }),
 *     { name: 'MyStore' }
 *   )
 * );
 */
export const useExampleStore = create<ExampleState>()(
  devtools(
    (set, get) => ({
      // Initial state
      items: [],
      loading: false,
      error: null,
      userId: null,
      familyId: null,
      
      // Standard setters
      setUserId: (userId) => set({ userId }),
      setFamilyId: (familyId) => set({ familyId }),
      clearError: () => set({ error: null }),
      
      // Fetch pattern - always check auth, set loading, handle errors
      // NOTE: Replace 'your_table_name' with actual table
      fetchItems: async () => {
        const { userId, familyId } = get();
        if (!userId || !familyId) return;
        
        set({ loading: true, error: null });
        try {
          // Example: const { data, error } = await supabase
          //   .from('your_table_name')
          //   .select('*')
          //   .eq('family_id', familyId);
          
          // if (error) throw error;
          // set({ items: data || [], loading: false });
          
          // Placeholder for template
          set({ items: [], loading: false });
        } catch (error) {
          const storeError = createStoreError(
            'network',
            error instanceof Error ? error.message : 'Failed to fetch items'
          );
          set({ error: storeError, loading: false });
        }
      },
      
      // Create pattern - return StoreResult for consistent error handling
      createItem: async (data) => {
        const { userId, familyId, fetchItems } = get();
        if (!userId || !familyId) {
          const error = createStoreError('auth', 'Authentication required');
          set({ error });
          return { success: false, error };
        }
        
        try {
          // Example: const { data: result, error } = await supabase
          //   .from('your_table_name')
          //   .insert({ ...data, user_id: userId, family_id: familyId })
          //   .select()
          //   .single();
          
          // Placeholder for template
          const result: ExampleItem = { 
            id: 'new-id', 
            ...data, 
            user_id: userId, 
            family_id: familyId,
            created_at: new Date().toISOString()
          };
          
          await fetchItems();
          return { success: true, result: createStoreSuccess(result) };
        } catch (error) {
          const storeError = createStoreError(
            'network',
            error instanceof Error ? error.message : 'Failed to create item'
          );
          set({ error: storeError });
          return { success: false, error: storeError };
        }
      },
      
      // Update pattern
      updateItem: async (id, data) => {
        const { userId, familyId, fetchItems } = get();
        if (!userId || !familyId) {
          const error = createStoreError('auth', 'Authentication required');
          set({ error });
          return { success: false, error };
        }
        
        try {
          // Example: const { data: result, error } = await supabase
          //   .from('your_table_name')
          //   .update(data)
          //   .eq('id', id)
          //   .eq('family_id', familyId)
          //   .select()
          //   .single();
          
          // Placeholder for template
          const result: ExampleItem = { 
            id, 
            name: data.name || 'Updated', 
            user_id: userId, 
            family_id: familyId,
            created_at: new Date().toISOString()
          };
          
          await fetchItems();
          return { success: true, result: createStoreSuccess(result) };
        } catch (error) {
          const storeError = createStoreError(
            'network',
            error instanceof Error ? error.message : 'Failed to update item'
          );
          set({ error: storeError });
          return { success: false, error: storeError };
        }
      },
      
      // Delete pattern
      deleteItem: async (id) => {
        const { userId, familyId, fetchItems } = get();
        if (!userId || !familyId) {
          const error = createStoreError('auth', 'Authentication required');
          set({ error });
          return { success: false, error };
        }
        
        // Suppress unused variable warnings for template
        void id;
        
        try {
          // Example: const { error } = await supabase
          //   .from('your_table_name')
          //   .delete()
          //   .eq('id', id)
          //   .eq('family_id', familyId);
          
          await fetchItems();
          return { success: true, result: createStoreSuccess(undefined) };
        } catch (error) {
          const storeError = createStoreError(
            'network',
            error instanceof Error ? error.message : 'Failed to delete item'
          );
          set({ error: storeError });
          return { success: false, error: storeError };
        }
      },
      
      // Refetch utility
      refetch: async () => {
        await get().fetchItems();
      },
    }),
    { name: 'ExampleStore' } // Always include store name for DevTools
  )
);
