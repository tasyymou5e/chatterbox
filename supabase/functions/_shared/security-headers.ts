export const securityHeaders = {
  // CORS Headers
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  
  // Security Headers
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://lxuqfgbukrrickanmmic.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Rate Limiting Headers
  'X-RateLimit-Limit': '100',
  'X-RateLimit-Window': '60',
  
  // Additional Security Headers
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  
  // Security Logging Headers
  'X-Security-Level': 'high',
  'X-Request-ID': () => crypto.randomUUID()
};

export function getSecurityHeaders(requestId?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (typeof value === 'function') {
      headers[key] = value();
    } else {
      headers[key] = value;
    }
  });
  
  if (requestId) {
    headers['X-Request-ID'] = requestId;
  }
  
  return headers;
}

export function createSecureResponse(
  body: any,
  options: {
    status?: number;
    requestId?: string;
    additionalHeaders?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, requestId, additionalHeaders = {} } = options;
  
  const headers = {
    ...getSecurityHeaders(requestId),
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
  
  return new Response(JSON.stringify(body), {
    status,
    headers
  });
}

export function validateInput(data: any, schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic XSS prevention
  const checkXSS = (value: string): boolean => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b/gi,
      /<object\b/gi,
      /<embed\b/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(value));
  };
  
  // Basic SQL injection prevention
  const checkSQLInjection = (value: string): boolean => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/)/gi,
      /(\bOR\b|\bAND\b).*[=<>]/gi
    ];
    
    return sqlPatterns.some(pattern => pattern.test(value));
  };
  
  // Recursively check all string values
  const validateValue = (value: any, path: string = ''): void => {
    if (typeof value === 'string') {
      if (checkXSS(value)) {
        errors.push(`XSS detected in ${path}`);
      }
      if (checkSQLInjection(value)) {
        errors.push(`SQL injection attempt detected in ${path}`);
      }
      
      // Check for excessive length
      if (value.length > 10000) {
        errors.push(`Value too long in ${path} (max 10000 characters)`);
      }
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          validateValue(item, `${path}[${index}]`);
        });
      } else {
        Object.entries(value).forEach(([key, val]) => {
          validateValue(val, path ? `${path}.${key}` : key);
        });
      }
    }
  };
  
  validateValue(data);
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    // Basic sanitization
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(sanitizeInput);
    } else {
      const sanitized: any = {};
      Object.entries(data).forEach(([key, value]) => {
        sanitized[key] = sanitizeInput(value);
      });
      return sanitized;
    }
  }
  
  return data;
}