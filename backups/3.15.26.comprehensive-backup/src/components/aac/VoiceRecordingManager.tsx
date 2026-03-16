import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Trash2, Loader2, Check, Mic } from 'lucide-react';
import { toast } from 'sonner';

export interface VoiceRecordingManagerProps {
  phraseKey: string;
  phraseLabel: string;
  familyId: string;
  currentRecordingUrl?: string | undefined;
  onRecordingChange: (url: string | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceRecordingManager({
  phraseKey,
  phraseLabel,
  familyId,
  currentRecordingUrl,
  onRecordingChange,
  open,
  onOpenChange,
}: VoiceRecordingManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file (MP3, WAV, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      // Upload to storage
      const filePath = `${user.id}/${phraseKey}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('parent-voice-recordings')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('parent-voice-recordings')
        .getPublicUrl(filePath);

      // Save to database if familyId is provided
      if (familyId) {
        const { error: dbError } = await supabase
          .from('parent_voice_recordings')
          .upsert({
            user_id: user.id,
            family_id: familyId,
            phrase_key: phraseKey,
            audio_url: publicUrl,
          }, {
            onConflict: 'family_id,phrase_key',
          });

        if (dbError) throw dbError;
      }

      onRecordingChange(publicUrl);
      toast.success('Voice recording uploaded!');
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload recording');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentRecordingUrl) return;

    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete from database
      if (familyId) {
        await supabase
          .from('parent_voice_recordings')
          .delete()
          .eq('family_id', familyId)
          .eq('phrase_key', phraseKey);
      }

      onRecordingChange(null);
      toast.success('Recording deleted');
      onOpenChange(false);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete recording');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Custom Voice for "{phraseLabel}"
          </DialogTitle>
          <DialogDescription>
            Upload your own voice recording to personalize this response button.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentRecordingUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-sm">Custom recording active</span>
              </div>
              <audio 
                src={currentRecordingUrl} 
                controls 
                className="w-full"
              />
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Mic className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No custom recording uploaded</p>
              <p className="text-sm">Using computer voice (TTS)</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Upload Audio File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Supported: MP3, WAV, M4A (max 5MB)
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {currentRecordingUrl && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {currentRecordingUrl ? 'Replace' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
