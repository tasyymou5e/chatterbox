/**
 * useChildAvatar - Hook for managing child avatar data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { 
  AvatarConfig, 
  AvatarCustomization, 
  DEFAULT_AVATAR,
  AvatarType,
} from '@/types/avatar';
import { cLog, cWarn } from '@/utils/wideLogger';

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
 * Zod schema for validating avatar database rows
 */
const avatarRowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  family_id: z.string().nullable().optional(),
  avatar_type: z.enum(['illustrated', 'uploaded']),
  base_character: z.string().nullable().optional(),
  skin_tone: z.string().nullable().optional(),
  hair_color: z.string().nullable().optional(),
  hair_style: z.string().nullable().optional(),
  eye_color: z.string().nullable().optional(),
  accessory: z.string().nullable().optional(),
  outfit_color: z.string().nullable().optional(),
  uploaded_url: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Convert and validate database row to AvatarConfig
 */
function rowToConfig(row: unknown): AvatarConfig | null {
  const result = avatarRowSchema.safeParse(row);
  
  if (!result.success) {
    cWarn('Invalid avatar config from database:', result.error.flatten());
    return null;
  }
  
  const data = result.data;
  return {
    id: data.id,
    userId: data.user_id,
    familyId: data.family_id ?? undefined,
    avatarType: data.avatar_type as AvatarType,
    baseCharacter: (data.base_character ?? 'kid1') as AvatarConfig['baseCharacter'],
    skinTone: (data.skin_tone ?? 'medium') as AvatarConfig['skinTone'],
    hairColor: (data.hair_color ?? 'brown') as AvatarConfig['hairColor'],
    hairStyle: (data.hair_style ?? 'short') as AvatarConfig['hairStyle'],
    eyeColor: (data.eye_color ?? 'brown') as AvatarConfig['eyeColor'],
    accessory: (data.accessory ?? 'none') as AvatarConfig['accessory'],
    outfitColor: (data.outfit_color ?? 'blue') as AvatarConfig['outfitColor'],
    uploadedUrl: data.uploaded_url ?? undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
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
        .select('id, user_id, family_id, avatar_type, base_character, skin_tone, hair_color, hair_style, eye_color, accessory, outfit_color, uploaded_url, created_at, updated_at')
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
