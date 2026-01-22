/**
 * AvatarBuilder - Interactive avatar customization interface
 * Allows children/parents to customize illustrated characters
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Palette, User, Shirt, Sparkles, Upload, Check } from 'lucide-react';
import { AvatarCharacter } from './AvatarCharacter';
import {
  AvatarCustomization,
  SkinTone,
  HairColor,
  HairStyle,
  EyeColor,
  Accessory,
  OutfitColor,
  BaseCharacter,
  SKIN_TONE_COLORS,
  HAIR_COLORS,
  EYE_COLORS,
  OUTFIT_COLORS,
  SKIN_TONE_LABELS,
  HAIR_COLOR_LABELS,
  HAIR_STYLE_LABELS,
  ACCESSORY_LABELS,
  CHARACTER_LABELS,
  DEFAULT_AVATAR,
} from '@/types/avatar';

interface AvatarBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCustomization?: AvatarCustomization;
  onSave: (customization: AvatarCustomization) => Promise<void>;
  onUpload?: (file: File) => Promise<string>;
  isSaving?: boolean;
  allowUpload?: boolean;
}

type ColorOption<T extends string> = {
  value: T;
  label: string;
  color: string;
};

function ColorSelector<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ColorOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'w-10 h-10 rounded-full border-2 transition-all',
              'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              value === option.value 
                ? 'border-primary ring-2 ring-primary ring-offset-2' 
                : 'border-transparent'
            )}
            style={{ backgroundColor: option.color }}
            title={option.label}
            aria-label={option.label}
          >
            {value === option.value && (
              <Check className="w-4 h-4 mx-auto text-white drop-shadow-md" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StyleSelector<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(option.value)}
            className="text-xs"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function AvatarBuilder({
  open,
  onOpenChange,
  initialCustomization = DEFAULT_AVATAR,
  onSave,
  onUpload,
  isSaving = false,
  allowUpload = true,
}: AvatarBuilderProps) {
  const [customization, setCustomization] = useState<AvatarCustomization>(initialCustomization);
  const [activeTab, setActiveTab] = useState('character');
  const [isUploading, setIsUploading] = useState(false);

  const updateCustomization = useCallback(<K extends keyof AvatarCustomization>(
    key: K,
    value: AvatarCustomization[K]
  ) => {
    setCustomization(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    await onSave(customization);
    onOpenChange(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    setIsUploading(true);
    try {
      await onUpload(file);
      onOpenChange(false);
    } finally {
      setIsUploading(false);
    }
  };

  // Build options
  const skinToneOptions: ColorOption<SkinTone>[] = Object.entries(SKIN_TONE_COLORS).map(
    ([value, color]) => ({ value: value as SkinTone, label: SKIN_TONE_LABELS[value as SkinTone], color })
  );

  const hairColorOptions: ColorOption<HairColor>[] = Object.entries(HAIR_COLORS).map(
    ([value, color]) => ({ value: value as HairColor, label: HAIR_COLOR_LABELS[value as HairColor], color })
  );

  const eyeColorOptions: ColorOption<EyeColor>[] = Object.entries(EYE_COLORS).map(
    ([value, color]) => ({ value: value as EyeColor, label: value.charAt(0).toUpperCase() + value.slice(1), color })
  );

  const outfitColorOptions: ColorOption<OutfitColor>[] = Object.entries(OUTFIT_COLORS).map(
    ([value, color]) => ({ value: value as OutfitColor, label: value.charAt(0).toUpperCase() + value.slice(1), color })
  );

  const hairStyleOptions = Object.entries(HAIR_STYLE_LABELS).map(
    ([value, label]) => ({ value: value as HairStyle, label })
  );

  const accessoryOptions = Object.entries(ACCESSORY_LABELS).map(
    ([value, label]) => ({ value: value as Accessory, label })
  );

  const characterOptions = Object.entries(CHARACTER_LABELS).map(
    ([value, label]) => ({ value: value as BaseCharacter, label })
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Create Your Avatar
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Preview */}
          <div className="flex-shrink-0 flex flex-col items-center gap-4">
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6">
              <AvatarCharacter
                customization={customization}
                size="xl"
                animated
              />
            </div>
            <p className="text-sm text-muted-foreground">Your avatar preview</p>
          </div>

          {/* Customization Tabs */}
          <div className="flex-1 min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="character" className="text-xs">
                  <User className="h-4 w-4 mr-1" />
                  Face
                </TabsTrigger>
                <TabsTrigger value="hair" className="text-xs">
                  <Palette className="h-4 w-4 mr-1" />
                  Hair
                </TabsTrigger>
                <TabsTrigger value="outfit" className="text-xs">
                  <Shirt className="h-4 w-4 mr-1" />
                  Outfit
                </TabsTrigger>
                <TabsTrigger value="extras" className="text-xs">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Extras
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[280px] mt-4 pr-4">
                <TabsContent value="character" className="space-y-4 mt-0">
                  <StyleSelector
                    label="Character"
                    options={characterOptions}
                    value={customization.baseCharacter}
                    onChange={(v) => updateCustomization('baseCharacter', v)}
                  />
                  <ColorSelector
                    label="Skin Tone"
                    options={skinToneOptions}
                    value={customization.skinTone}
                    onChange={(v) => updateCustomization('skinTone', v)}
                  />
                  <ColorSelector
                    label="Eye Color"
                    options={eyeColorOptions}
                    value={customization.eyeColor}
                    onChange={(v) => updateCustomization('eyeColor', v)}
                  />
                </TabsContent>

                <TabsContent value="hair" className="space-y-4 mt-0">
                  <ColorSelector
                    label="Hair Color"
                    options={hairColorOptions}
                    value={customization.hairColor}
                    onChange={(v) => updateCustomization('hairColor', v)}
                  />
                  <StyleSelector
                    label="Hair Style"
                    options={hairStyleOptions}
                    value={customization.hairStyle}
                    onChange={(v) => updateCustomization('hairStyle', v)}
                  />
                </TabsContent>

                <TabsContent value="outfit" className="space-y-4 mt-0">
                  <ColorSelector
                    label="Outfit Color"
                    options={outfitColorOptions}
                    value={customization.outfitColor}
                    onChange={(v) => updateCustomization('outfitColor', v)}
                  />
                </TabsContent>

                <TabsContent value="extras" className="space-y-4 mt-0">
                  <StyleSelector
                    label="Accessory"
                    options={accessoryOptions}
                    value={customization.accessory}
                    onChange={(v) => updateCustomization('accessory', v)}
                  />

                  {allowUpload && onUpload && (
                    <div className="pt-4 border-t">
                      <Label className="text-sm font-medium">Or upload a photo</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Upload your own photo instead of using an illustrated avatar
                      </p>
                      <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                        {isUploading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {isUploading ? 'Uploading...' : 'Choose photo'}
                        </span>
                      </label>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Avatar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AvatarBuilder;
