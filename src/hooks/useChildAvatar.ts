/**
 * useChildAvatar - Hook for managing child avatar data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  AvatarConfig, 
  AvatarCustomization, 
  DEFAULT_AVATAR,
  AvatarType,
} from '@/types/avatar';
import { cLog, cWarn } from '@/utils/conditionalLogger';

interface UseChildAvatarResult {
  avatar: AvatarConfig | null;
  customization: AvatarCustomization;
  isLoading: boolean;
  error: Error | null;
  saveAvatar: (customization: AvatarCustomization, type?: AvatarType) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  isSaving: boolean;
}

/**
 * Convert database row to AvatarConfig
 */
function rowToConfig(row: Record<string, unknown>): AvatarConfig {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    familyId: row.family_id as string | undefined,
    avatarType: row.avatar_type as AvatarType,
    baseCharacter: (row.base_character as string) || 'kid1',
    skinTone: (row.skin_tone as string) || 'medium',
    hairColor: (row.hair_color as string) || 'brown',
    hairStyle: (row.hair_style as string) || 'short',
    eyeColor: (row.eye_color as string) || 'brown',
    accessory: (row.accessory as string) || 'none',
    outfitColor: (row.outfit_color as string) || 'blue',
    uploadedUrl: row.uploaded_url as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  } as AvatarConfig;
}

export function useChildAvatar(userId: string | undefined, familyId?: string): UseChildAvatarResult {
  const queryClient = useQueryClient();

  // Fetch avatar data
  const { data: avatar, isLoading, error } = useQuery({
    queryKey: ['child-avatar', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('child_avatars')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        cWarn('Error fetching avatar:', error);
        throw error;
      }

      return data ? rowToConfig(data) : null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Save avatar mutation
  const saveMutation = useMutation({
    mutationFn: async ({ 
      customization, 
      type = 'illustrated',
      uploadedUrl,
    }: { 
      customization: AvatarCustomization; 
      type?: AvatarType;
      uploadedUrl?: string;
    }) => {
      if (!userId) throw new Error('User ID required');

      const avatarData = {
        user_id: userId,
        family_id: familyId || null,
        avatar_type: type,
        base_character: customization.baseCharacter,
        skin_tone: customization.skinTone,
        hair_color: customization.hairColor,
        hair_style: customization.hairStyle,
        eye_color: customization.eyeColor,
        accessory: customization.accessory,
        outfit_color: customization.outfitColor,
        uploaded_url: uploadedUrl || null,
      };

      const { error } = await supabase
        .from('child_avatars')
        .upsert(avatarData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false,
        });

      if (error) throw error;
      
      cLog('Avatar saved successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-avatar', userId] });
    },
  });

  // Upload avatar image
  const uploadAvatar = async (file: File): Promise<string> => {
    if (!userId) throw new Error('User ID required');

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // Extract customization from avatar config
  const customization: AvatarCustomization = avatar ? {
    baseCharacter: avatar.baseCharacter,
    skinTone: avatar.skinTone,
    hairColor: avatar.hairColor,
    hairStyle: avatar.hairStyle,
    eyeColor: avatar.eyeColor,
    accessory: avatar.accessory,
    outfitColor: avatar.outfitColor,
  } : DEFAULT_AVATAR;

  return {
    avatar: avatar ?? null,
    customization,
    isLoading,
    error: error as Error | null,
    saveAvatar: async (customization: AvatarCustomization, type?: AvatarType) => {
      await saveMutation.mutateAsync({ customization, type });
    },
    uploadAvatar,
    isSaving: saveMutation.isPending,
  };
}

export default useChildAvatar;
