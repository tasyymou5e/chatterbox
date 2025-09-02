/**
 * Specific type interfaces for authentication-related data structures
 * Replaces generic 'any' types with structured interfaces
 */

export interface AuthError {
  code: string;
  message: string;
  status?: number;
  name?: string;
  details?: {
    hint?: string;
    suggestion?: string;
    documentation?: string;
  };
  context?: {
    email?: string;
    userId?: string;
    timestamp: string;
    attemptCount?: number;
  };
}

export interface AuthMetadata {
  signupMethod?: 'email_password' | 'oauth' | 'magic_link';
  loginMethod?: 'email_password' | 'oauth' | 'magic_link' | 'sso';
  provider?: string;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    browser?: string;
    isMobile?: boolean;
  };
  location?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  security?: {
    mfaEnabled?: boolean;
    lastPasswordChange?: string;
    passwordStrength?: number;
    suspiciousActivity?: boolean;
  };
}

export interface UserActivityMetadata {
  sessionId?: string;
  route?: string;
  feature?: string;
  duration?: number;
  interactions?: {
    clicks: number;
    keystrokes: number;
    scrolls: number;
  };
  performance?: {
    loadTime?: number;
    errorCount?: number;
    apiCalls?: number;
  };
  context?: Record<string, unknown>;
}

export interface SessionData {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  activities: string[];
  metadata?: {
    browser?: string;
    device?: string;
    location?: string;
    ipAddress?: string;
  };
}

export interface RoleData {
  role: 'admin' | 'parent' | 'child';
  permissions: string[];
  familyId?: string;
  assignedBy?: string;
  assignedAt: string;
  expiresAt?: string;
  metadata?: {
    source?: 'signup' | 'invitation' | 'promotion';
    approvedBy?: string;
    restrictions?: string[];
  };
}

export interface ProfileMetadata {
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    timezone?: string;
    notifications?: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  accessibility?: {
    largeText?: boolean;
    highContrast?: boolean;
    reduceMotion?: boolean;
    screenReader?: boolean;
  };
  privacy?: {
    profileVisibility?: 'public' | 'family' | 'private';
    activitySharing?: boolean;
    dataCollection?: boolean;
  };
}