/**
 * Enhanced input validation and sanitization utilities
 */
import { z } from 'zod';

// Common validation schemas
export const commonSchemas = {
  email: z.string().email('Invalid email format').max(254, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number and special character'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore and dash'),
  name: z.string()
    .min(1, 'Name is required')
    .max(50, 'Name too long')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Name contains invalid characters'),
  familyName: z.string()
    .min(1, 'Family name is required')
    .max(100, 'Family name too long')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Family name contains invalid characters'),
  choreTitle: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title too long'),
  choreDescription: z.string()
    .max(500, 'Description too long')
    .optional(),
  uuid: z.string().uuid('Invalid ID format'),
  safeText: z.string()
    .max(1000, 'Text too long')
    .refine(text => !containsXSS(text), 'Text contains potentially harmful content')
    .refine(text => !containsSQLInjection(text), 'Text contains potentially harmful SQL'),
};

// XSS detection patterns
const xssPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b/gi,
  /<object\b/gi,
  /<embed\b/gi,
  /<link\b/gi,
  /<meta\b/gi,
  /expression\s*\(/gi,
  /vbscript:/gi,
  /livescript:/gi,
  /mocha:/gi,
  /charset=/gi,
  /src\s*=\s*['"]\s*data:/gi,
];

// SQL injection detection patterns
const sqlPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(--|\/\*|\*\/|;)/gi,
  /(\bOR\b|\bAND\b)\s+[\w\s]*[=<>]/gi,
  /\b(UNION|JOIN)\b.*\b(SELECT|FROM)\b/gi,
  /\b(EXEC|EXECUTE)\b\s*\(/gi,
  /\b(CAST|CONVERT|CHAR|ASCII|SUBSTRING)\b\s*\(/gi,
  /\b(WAITFOR|DELAY)\b/gi,
  /\b(@@VERSION|@@SERVERNAME|USER_NAME)\b/gi,
];

// Path traversal detection
const pathTraversalPatterns = [
  /\.\.[\/\\]/gi,
  /%2e%2e[\/\\]/gi,
  /\.{2,}[\/\\]/gi,
  /[\/\\]\.{2,}[\/\\]/gi,
];

// Command injection detection - properly escaped regex patterns
const commandInjectionPatterns = [
  /[;&|`$(){}<>]/g, // Removed 'i' flag (not needed for symbols), removed problematic [\] chars
  /\b(rm|del|format|fdisk|kill|shutdown|halt|reboot)\b/gi,
  /\b(cat|type|more|less|head|tail)\b\s+[/\\]/gi,
  /\b(wget|curl|nc|netcat|telnet|ssh)\b/gi,
];

export function containsXSS(input: string): boolean {
  return xssPatterns.some(pattern => pattern.test(input));
}

export function containsSQLInjection(input: string): boolean {
  return sqlPatterns.some(pattern => pattern.test(input));
}

export function containsPathTraversal(input: string): boolean {
  return pathTraversalPatterns.some(pattern => pattern.test(input));
}

export function containsCommandInjection(input: string): boolean {
  return commandInjectionPatterns.some(pattern => pattern.test(input));
}

export function sanitizeInput(input: string): string {
  return input
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove javascript: protocols
    .replace(/javascript:/gi, '')
    // Remove on* event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove potentially dangerous tags
    .replace(/<(iframe|object|embed|link|meta|form|input|textarea|select|option)\b[^>]*>/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeFilename(filename: string): string {
  return filename
    // Remove path traversal attempts
    .replace(/\.\.[\/\\]/g, '')
    // Remove special characters
    .replace(/[<>:"/\\|?*]/g, '')
    // Remove control characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    // Limit length
    .substring(0, 255)
    .trim();
}

export function validateAndSanitizeFormData<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    // First, sanitize string inputs
    const sanitizedData = sanitizeObjectInputs(data);
    
    // Then validate with schema
    const validatedData = schema.parse(sanitizedData);
    
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
      };
    }
    
    return {
      success: false,
      errors: ['Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')]
    };
  }
}

function sanitizeObjectInputs(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectInputs);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    Object.entries(obj).forEach(([key, value]) => {
      sanitized[key] = sanitizeObjectInputs(value);
    });
    return sanitized;
  }
  
  return obj;
}

// File upload validation
export function validateFileUpload(file: File, options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [], allowedExtensions = [] } = options;
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds limit of ${Math.round(maxSize / (1024 * 1024))}MB`);
  }
  
  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      errors.push(`File extension .${extension} is not allowed`);
    }
  }
  
  // Check filename for malicious content
  const sanitizedName = sanitizeFilename(file.name);
  if (sanitizedName !== file.name) {
    errors.push('Filename contains invalid characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Rate limiting validation
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing attempts for this identifier
    let attempts = this.attempts.get(identifier) || [];
    
    // Remove expired attempts
    attempts = attempts.filter(attempt => attempt > windowStart);
    
    // Check if under limit
    if (attempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    attempts.push(now);
    this.attempts.set(identifier, attempts);
    
    return true;
  }
  
  getRemainingAttempts(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const attempts = (this.attempts.get(identifier) || [])
      .filter(attempt => attempt > windowStart);
    
    return Math.max(0, this.maxAttempts - attempts.length);
  }
  
  getTimeUntilReset(identifier: string): number {
    const attempts = this.attempts.get(identifier) || [];
    if (attempts.length === 0) return 0;
    
    const oldestAttempt = Math.min(...attempts);
    const resetTime = oldestAttempt + this.windowMs;
    
    return Math.max(0, resetTime - Date.now());
  }
}

// Create common validation schemas for the application
export const validationSchemas = {
  // User forms
  signUp: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    firstName: commonSchemas.name,
    lastName: commonSchemas.name,
  }),
  
  signIn: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required'),
  }),
  
  // Family forms
  createFamily: z.object({
    name: commonSchemas.familyName,
    displayName: commonSchemas.familyName,
  }),
  
  // Chore forms
  createChore: z.object({
    title: commonSchemas.choreTitle,
    description: commonSchemas.choreDescription,
    familyId: commonSchemas.uuid,
    estimatedDuration: z.number().min(1).max(480), // 1 minute to 8 hours
    difficulty: z.enum(['easy', 'medium', 'hard']),
    basePoints: z.number().min(1).max(100),
  }),
  
  // Child account forms
  createChildAccount: z.object({
    firstName: commonSchemas.name,
    lastName: commonSchemas.name,
    familyId: commonSchemas.uuid,
  }),
  
  // Generic safe text input
  safeTextInput: z.object({
    text: commonSchemas.safeText,
  }),
};

// Export rate limiter instance
export const defaultRateLimiter = new RateLimiter();