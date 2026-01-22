/**
 * Avatar system types for customizable child avatars
 */

export type AvatarType = 'illustrated' | 'uploaded';

export type SkinTone = 'light' | 'medium' | 'tan' | 'dark';
export type HairColor = 'brown' | 'black' | 'blonde' | 'red' | 'blue' | 'purple' | 'green' | 'pink';
export type HairStyle = 'short' | 'long' | 'curly' | 'spiky' | 'ponytail' | 'pigtails' | 'bun' | 'mohawk';
export type EyeColor = 'brown' | 'blue' | 'green' | 'hazel' | 'purple' | 'amber';
export type Accessory = 'none' | 'glasses' | 'sunglasses' | 'hat' | 'bow' | 'headband' | 'crown' | 'flower';
export type OutfitColor = 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'pink' | 'yellow' | 'teal';
export type BaseCharacter = 'kid1' | 'kid2' | 'kid3' | 'kid4' | 'kid5' | 'kid6';

/**
 * Avatar configuration stored in database
 */
export interface AvatarConfig {
  id: string;
  userId: string;
  familyId?: string;
  avatarType: AvatarType;
  
  // Illustrated avatar options
  baseCharacter: BaseCharacter;
  skinTone: SkinTone;
  hairColor: HairColor;
  hairStyle: HairStyle;
  eyeColor: EyeColor;
  accessory: Accessory;
  outfitColor: OutfitColor;
  
  // Uploaded avatar
  uploadedUrl?: string;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Avatar customization options for the builder
 */
export interface AvatarCustomization {
  baseCharacter: BaseCharacter;
  skinTone: SkinTone;
  hairColor: HairColor;
  hairStyle: HairStyle;
  eyeColor: EyeColor;
  accessory: Accessory;
  outfitColor: OutfitColor;
}

/**
 * Default avatar configuration
 */
export const DEFAULT_AVATAR: AvatarCustomization = {
  baseCharacter: 'kid1',
  skinTone: 'medium',
  hairColor: 'brown',
  hairStyle: 'short',
  eyeColor: 'brown',
  accessory: 'none',
  outfitColor: 'blue',
};

/**
 * Color mappings for avatar rendering
 */
export const SKIN_TONE_COLORS: Record<SkinTone, string> = {
  light: '#FFE4C4',
  medium: '#DEB887',
  tan: '#CD853F',
  dark: '#8B4513',
};

export const HAIR_COLORS: Record<HairColor, string> = {
  brown: '#4A3728',
  black: '#1C1C1C',
  blonde: '#F0C75E',
  red: '#A52A2A',
  blue: '#4A90D9',
  purple: '#9B59B6',
  green: '#27AE60',
  pink: '#E91E63',
};

export const EYE_COLORS: Record<EyeColor, string> = {
  brown: '#4A3728',
  blue: '#3498DB',
  green: '#27AE60',
  hazel: '#8B7355',
  purple: '#9B59B6',
  amber: '#FFBF00',
};

export const OUTFIT_COLORS: Record<OutfitColor, string> = {
  blue: '#4A90D9',
  red: '#E74C3C',
  green: '#27AE60',
  purple: '#9B59B6',
  orange: '#E67E22',
  pink: '#E91E63',
  yellow: '#F1C40F',
  teal: '#00ACC1',
};

/**
 * Labels for UI display
 */
export const SKIN_TONE_LABELS: Record<SkinTone, string> = {
  light: 'Light',
  medium: 'Medium',
  tan: 'Tan',
  dark: 'Dark',
};

export const HAIR_COLOR_LABELS: Record<HairColor, string> = {
  brown: 'Brown',
  black: 'Black',
  blonde: 'Blonde',
  red: 'Red',
  blue: 'Blue',
  purple: 'Purple',
  green: 'Green',
  pink: 'Pink',
};

export const HAIR_STYLE_LABELS: Record<HairStyle, string> = {
  short: 'Short',
  long: 'Long',
  curly: 'Curly',
  spiky: 'Spiky',
  ponytail: 'Ponytail',
  pigtails: 'Pigtails',
  bun: 'Bun',
  mohawk: 'Mohawk',
};

export const ACCESSORY_LABELS: Record<Accessory, string> = {
  none: 'None',
  glasses: 'Glasses',
  sunglasses: 'Sunglasses',
  hat: 'Hat',
  bow: 'Bow',
  headband: 'Headband',
  crown: 'Crown',
  flower: 'Flower',
};

export const CHARACTER_LABELS: Record<BaseCharacter, string> = {
  kid1: 'Alex',
  kid2: 'Jordan',
  kid3: 'Sam',
  kid4: 'Riley',
  kid5: 'Casey',
  kid6: 'Morgan',
};
