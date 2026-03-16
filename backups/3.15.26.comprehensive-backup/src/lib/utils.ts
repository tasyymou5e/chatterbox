import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import DOMPurify from 'dompurify';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes HTML content using DOMPurify.
 * For cases where HTML rendering is necessary.
 * 
 * @param input - Raw HTML string
 * @param options - Optional DOMPurify configuration
 * @returns Sanitized HTML string
 * 
 * @example
 * const safeHtml = sanitizeHtml(userContent, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong'] });
 */
export function sanitizeHtml(input: string, options?: Record<string, unknown>): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    ...options,
  });
}

/**
 * Sanitizes user input to prevent XSS attacks.
 * Uses DOMPurify as primary defense with additional cleanup.
 * 
 * @param input - Raw user input string
 * @returns Sanitized string safe for rendering
 * 
 * @example
 * const safeName = sanitizeInput(userInput);
 * const safeDescription = sanitizeInput(description);
 */
export function sanitizeInput(input: string): string {
  // First pass: DOMPurify for XSS prevention
  const purified = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  
  // Second pass: Additional cleanup
  return purified
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes a filename to prevent path traversal attacks.
 * 
 * @param filename - Raw filename string
 * @returns Safe filename string
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\.[\/\\]/g, '')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .substring(0, 255)
    .trim();
}
