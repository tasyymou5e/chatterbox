import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ConnectionRole = 'therapist' | 'teacher' | 'grandparent' | 'family_friend';

export interface FamilyConnection {
  id: string;
  family_id: string;
  connected_user_id: string;
  connection_role: ConnectionRole;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  permissions: {
    can_view_progress: boolean;
    can_comment: boolean;
    can_assign_tasks: boolean;
  };
  connection_metadata: Record<string, any>;
  expires_at?: string;
  connected_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  connected_user_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface FamilyInvitation {
  id: string;
  family_id: string;
  invited_email: string;
  connection_role: ConnectionRole;
  invited_by: string;
  invitation_message?: string;
  permissions: {
    can_view_progress: boolean;
    can_comment: boolean;
    can_assign_tasks: boolean;
  };
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

interface ConnectionState {
  // State
  connections: FamilyConnection[];
  invitations: FamilyInvitation[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchConnections: (familyId: string) => Promise<void>;
  fetchInvitations: (familyId: string) => Promise<void>;
  sendInvitation: (invitation: Omit<FamilyInvitation, 'id' | 'created_at' | 'expires_at'>) => Promise<{ error: any }>;
  updateConnection: (connectionId: string, updates: Partial<FamilyConnection>) => Promise<{ error: any }>;
  removeConnection: (connectionId: string) => Promise<{ error: any }>;
  acceptInvitation: (invitationId: string) => Promise<{ error: any }>;
  declineInvitation: (invitationId: string) => Promise<{ error: any }>;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        connections: [],
        invitations: [],
        loading: false,
        error: null,

        // Fetch connections for a family
        fetchConnections: async (familyId: string) => {
          set({ loading: true, error: null });
          
          try {
            const { data, error } = await supabase
              .from('family_connections')
              .select(`
                *,
                connected_user_profile:profiles!connected_user_id(first_name, last_name, email)
              `)
              .eq('family_id', familyId)
              .order('created_at', { ascending: false });

            if (error) throw error;

            // Type assertion with proper error handling for profile data
            const connections = (data || [])
              .filter(conn => 
                ['therapist', 'teacher', 'grandparent', 'family_friend'].includes(conn.connection_role)
              )
              .map(conn => ({
                id: conn.id,
                family_id: conn.family_id,
                connected_user_id: conn.connected_user_id,
                connection_role: conn.connection_role as ConnectionRole,
                invited_by: conn.invited_by,
                status: conn.status as 'pending' | 'accepted' | 'declined' | 'revoked',
                permissions: typeof conn.permissions === 'object' && conn.permissions !== null
                  ? conn.permissions as { can_view_progress: boolean; can_comment: boolean; can_assign_tasks: boolean; }
                  : { can_view_progress: true, can_comment: false, can_assign_tasks: false },
                connection_metadata: conn.connection_metadata || {},
                expires_at: conn.expires_at || undefined,
                connected_at: conn.connected_at || undefined,
                created_at: conn.created_at,
                updated_at: conn.updated_at,
                connected_user_profile: Array.isArray(conn.connected_user_profile) && conn.connected_user_profile.length > 0
                  ? {
                      first_name: conn.connected_user_profile[0]?.first_name || '',
                      last_name: conn.connected_user_profile[0]?.last_name || '',
                      email: conn.connected_user_profile[0]?.email || ''
                    }
                  : undefined
              })) as FamilyConnection[];

            set({ connections, loading: false });
          } catch (error) {
            console.error('Error fetching connections:', error);
            set({ error: (error as Error).message, loading: false });
          }
        },

        // Fetch invitations for a family
        fetchInvitations: async (familyId: string) => {
          set({ loading: true, error: null });
          
          try {
            const { data, error } = await supabase
              .from('family_invitations')
              .select('*')
              .eq('family_id', familyId)
              .order('created_at', { ascending: false });

            if (error) throw error;

            // Type assertion with explicit typing
            const invitations = (data || [])
              .filter(inv => 
                ['therapist', 'teacher', 'grandparent', 'family_friend'].includes(inv.connection_role)
              )
              .map(inv => ({
                id: inv.id,
                family_id: inv.family_id,
                invited_email: inv.invited_email,
                connection_role: inv.connection_role as ConnectionRole,
                invited_by: inv.invited_by,
                invitation_message: inv.invitation_message || undefined,
                permissions: typeof inv.permissions === 'object' && inv.permissions !== null
                  ? inv.permissions as { can_view_progress: boolean; can_comment: boolean; can_assign_tasks: boolean; }
                  : { can_view_progress: true, can_comment: false, can_assign_tasks: false },
                expires_at: inv.expires_at,
                accepted_at: inv.accepted_at || undefined,
                created_at: inv.created_at
              })) as FamilyInvitation[];

            set({ invitations, loading: false });
          } catch (error) {
            console.error('Error fetching invitations:', error);
            set({ error: (error as Error).message, loading: false });
          }
        },

        // Send invitation to connect with family
        sendInvitation: async (invitation) => {
          set({ loading: true, error: null });
          
          try {
            const { data, error } = await supabase
              .from('family_invitations')
              .insert(invitation)
              .select()
              .single();

            if (error) throw error;

            // Refresh invitations
            await get().fetchInvitations(invitation.family_id);
            
            set({ loading: false });
            return { error: null };
          } catch (error) {
            console.error('Error sending invitation:', error);
            const errorMessage = (error as Error).message;
            set({ error: errorMessage, loading: false });
            return { error: errorMessage };
          }
        },

        // Update connection permissions/settings
        updateConnection: async (connectionId: string, updates) => {
          set({ loading: true, error: null });
          
          try {
            const { error } = await supabase
              .from('family_connections')
              .update(updates)
              .eq('id', connectionId);

            if (error) throw error;

            // Update local state
            const connections = get().connections.map(conn => 
              conn.id === connectionId ? { ...conn, ...updates } : conn
            );
            
            set({ connections, loading: false });
            return { error: null };
          } catch (error) {
            console.error('Error updating connection:', error);
            const errorMessage = (error as Error).message;
            set({ error: errorMessage, loading: false });
            return { error: errorMessage };
          }
        },

        // Remove/revoke connection
        removeConnection: async (connectionId: string) => {
          set({ loading: true, error: null });
          
          try {
            const { error } = await supabase
              .from('family_connections')
              .update({ status: 'revoked' })
              .eq('id', connectionId);

            if (error) throw error;

            // Update local state
            const connections = get().connections.map(conn => 
              conn.id === connectionId ? { ...conn, status: 'revoked' as const } : conn
            );
            
            set({ connections, loading: false });
            return { error: null };
          } catch (error) {
            console.error('Error removing connection:', error);
            const errorMessage = (error as Error).message;
            set({ error: errorMessage, loading: false });
            return { error: errorMessage };
          }
        },

        // Accept invitation (when user receives an invite)
        acceptInvitation: async (invitationId: string) => {
          set({ loading: true, error: null });
          
          try {
            // First get invitation details
            const { data: invitation, error: inviteError } = await supabase
              .from('family_invitations')
              .select('*')
              .eq('id', invitationId)
              .single();

            if (inviteError) throw inviteError;

            // Get current user ID
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('User not authenticated');

            // Create connection
            const { error: connectionError } = await supabase
              .from('family_connections')
              .insert({
                family_id: invitation.family_id,
                connected_user_id: user.id,
                connection_role: invitation.connection_role,
                invited_by: invitation.invited_by,
                status: 'accepted',
                permissions: invitation.permissions,
                connected_at: new Date().toISOString(),
              });

            if (connectionError) throw connectionError;

            // Mark invitation as accepted
            const { error: updateError } = await supabase
              .from('family_invitations')
              .update({ accepted_at: new Date().toISOString() })
              .eq('id', invitationId);

            if (updateError) throw updateError;

            set({ loading: false });
            return { error: null };
          } catch (error) {
            console.error('Error accepting invitation:', error);
            const errorMessage = (error as Error).message;
            set({ error: errorMessage, loading: false });
            return { error: errorMessage };
          }
        },

        // Decline invitation
        declineInvitation: async (invitationId: string) => {
          set({ loading: true, error: null });
          
          try {
            const { error } = await supabase
              .from('family_invitations')
              .delete()
              .eq('id', invitationId);

            if (error) throw error;

            // Update local state
            const invitations = get().invitations.filter(inv => inv.id !== invitationId);
            set({ invitations, loading: false });
            return { error: null };
          } catch (error) {
            console.error('Error declining invitation:', error);
            const errorMessage = (error as Error).message;
            set({ error: errorMessage, loading: false });
            return { error: errorMessage };
          }
        },

        // Utility functions
        setLoading: (loading: boolean) => set({ loading }),
        setError: (error: string | null) => set({ error }),
        clearError: () => set({ error: null }),
      }),
      {
        name: 'connection-store',
        partialize: (state) => ({
          // Only persist non-sensitive data
          connections: [],
          invitations: [],
        }),
      }
    ),
    { name: 'ConnectionStore' }
  )
);