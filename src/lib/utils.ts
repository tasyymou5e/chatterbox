import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes user input to prevent XSS attacks.
 * Removes script tags, javascript: protocols, and event handlers.
 * 
 * @param input - Raw user input string
 * @returns Sanitized string safe for rendering
 * 
 * @example
 * const safeName = sanitizeInput(userInput);
 * const safeDescription = sanitizeInput(description);
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<(iframe|object|embed|link|meta|form|input|textarea|select|option)\b[^>]*>/gi, '')
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
