import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ChorePhoto {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  url?: string;
  error?: string;
}

interface UseChorePhotoUploadOptions {
  maxPhotos?: number;
  maxSizeBytes?: number;
  allowedTypes?: string[];
}

const DEFAULT_OPTIONS: UseChorePhotoUploadOptions = {
  maxPhotos: 3,
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

export const useChorePhotoUpload = (options: UseChorePhotoUploadOptions = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const [photos, setPhotos] = useState<ChorePhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    if (!config.allowedTypes?.includes(file.type)) {
      return `Invalid file type. Allowed: ${config.allowedTypes?.join(', ')}`;
    }
    if (file.size > (config.maxSizeBytes || 5242880)) {
      return `File too large. Maximum size: ${Math.round((config.maxSizeBytes || 5242880) / 1024 / 1024)}MB`;
    }
    return null;
  }, [config.allowedTypes, config.maxSizeBytes]);

  const addPhoto = useCallback((file: File) => {
    if (photos.length >= (config.maxPhotos || 3)) {
      toast({
        title: 'Maximum photos reached',
        description: `You can only upload up to ${config.maxPhotos} photos`,
        variant: 'destructive',
      });
      return;
    }

    const error = validateFile(file);
    if (error) {
      toast({
        title: 'Invalid file',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    const newPhoto: ChorePhoto = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      preview,
      uploading: false,
      uploaded: false,
    };

    setPhotos(prev => [...prev, newPhoto]);
  }, [photos.length, config.maxPhotos, validateFile]);

  const removePhoto = useCallback((photoId: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo?.preview) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== photoId);
    });
  }, []);

  const uploadPhotos = useCallback(async (
    userId: string,
    familyId: string,
    assignmentId: string
  ): Promise<string[]> => {
    if (photos.length === 0) return [];

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const photo of photos) {
        if (photo.uploaded && photo.url) {
          uploadedUrls.push(photo.url);
          continue;
        }

        setPhotos(prev => prev.map(p => 
          p.id === photo.id ? { ...p, uploading: true } : p
        ));

        const fileExt = photo.file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}-${photo.id}.${fileExt}`;
        const filePath = `${userId}/${familyId}/${assignmentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chore-photos')
          .upload(filePath, photo.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          setPhotos(prev => prev.map(p => 
            p.id === photo.id ? { ...p, uploading: false, error: uploadError.message } : p
          ));
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('chore-photos')
          .getPublicUrl(filePath);

        const photoUrl = urlData.publicUrl;
        uploadedUrls.push(photoUrl);

        setPhotos(prev => prev.map(p => 
          p.id === photo.id ? { ...p, uploading: false, uploaded: true, url: photoUrl } : p
        ));
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: 'Upload failed',
        description: 'Some photos could not be uploaded',
        variant: 'destructive',
      });
      return uploadedUrls;
    } finally {
      setIsUploading(false);
    }
  }, [photos]);

  const clearPhotos = useCallback(() => {
    photos.forEach(photo => {
      if (photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
    });
    setPhotos([]);
  }, [photos]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => addPhoto(file));
    event.target.value = '';
  }, [addPhoto]);

  return {
    photos,
    isUploading,
    addPhoto,
    removePhoto,
    uploadPhotos,
    clearPhotos,
    handleFileSelect,
    canAddMore: photos.length < (config.maxPhotos || 3),
  };
};
