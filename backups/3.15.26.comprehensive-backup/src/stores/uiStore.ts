import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  // Global loading states
  globalLoading: boolean;
  loadingStates: Record<string, boolean>;
  
  // Error states
  globalError: string | null;
  errors: Record<string, string | null>;
  
  // Modal states
  modals: Record<string, boolean>;
  
  // Notification states
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    description?: string;
    timestamp: number;
  }>;

  // Actions
  setGlobalLoading: (loading: boolean) => void;
  setLoading: (key: string, loading: boolean) => void;
  getLoading: (key: string) => boolean;
  
  setGlobalError: (error: string | null) => void;
  setError: (key: string, error: string | null) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
  
  openModal: (key: string) => void;
  closeModal: (key: string) => void;
  toggleModal: (key: string) => void;
  isModalOpen: (key: string) => boolean;
  
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      globalLoading: false,
      loadingStates: {},
      globalError: null,
      errors: {},
      modals: {},
      notifications: [],

      // Loading actions
      setGlobalLoading: (globalLoading) => set({ globalLoading }),
      
      setLoading: (key, loading) =>
        set((state) => ({
          loadingStates: {
            ...state.loadingStates,
            [key]: loading,
          },
        })),
      
      getLoading: (key) => get().loadingStates[key] || false,

      // Error actions
      setGlobalError: (globalError) => set({ globalError }),
      
      setError: (key, error) =>
        set((state) => ({
          errors: {
            ...state.errors,
            [key]: error,
          },
        })),
      
      clearError: (key) =>
        set((state) => {
          const { [key]: _, ...rest } = state.errors;
          return { errors: rest };
        }),
      
      clearAllErrors: () => set({ errors: {}, globalError: null }),

      // Modal actions
      openModal: (key) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [key]: true,
          },
        })),
      
      closeModal: (key) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [key]: false,
          },
        })),
      
      toggleModal: (key) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [key]: !state.modals[key],
          },
        })),
      
      isModalOpen: (key) => get().modals[key] || false,

      // Notification actions
      addNotification: (notification) => {
        const id = Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now();
        
        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...notification, id, timestamp },
          ],
        }));

        // Auto-remove notification after 5 seconds for non-error types
        if (notification.type !== 'error') {
          setTimeout(() => {
            get().removeNotification(id);
          }, 5000);
        }
      },
      
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      
      clearNotifications: () => set({ notifications: [] }),
    }),
    { name: 'UIStore' }
  )
);