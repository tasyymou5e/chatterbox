# Edge Functions Developer Guide

> **Last Updated:** 2026-01-21  
> **Total Functions:** 19  
> **Runtime:** Deno  
> **Location:** `supabase/functions/`

## Overview

This guide provides comprehensive documentation for developing, testing, and deploying Supabase Edge Functions in the Chatterbox platform. Edge functions handle server-side logic, external API integrations, and secure operations.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Shared Utilities](#shared-utilities)
3. [Function Reference](#function-reference)
4. [Security Patterns](#security-patterns)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Deployment](#deployment)

---

## Architecture

### Directory Structure

```
supabase/functions/
├── _shared/                          # Shared utilities
│   ├── api-types.ts                  # API type definitions
│   ├── cors.ts                       # CORS configuration
│   ├── password-validator.ts         # Password validation
│   ├── rate-limiter.ts               # Rate limiting
│   └── security-headers.ts           # Security headers
│
├── admin-add-family-member/          # Add member to family
├── admin-create-user/                # Create new user
├── admin-remove-family-member/       # Remove family member
├── admin-update-user/                # Update user profile
├── api-integration-status/           # Check API status
├── cleanup-test-families/            # Remove test data
├── create-child-account/             # Create child account
├── create-test-family/               # Create test family
├── delete-family-comprehensive/      # Delete family cascade
├── error-collector/                  # Collect frontend errors
├── grok-chat/                        # Grok AI integration
├── process-recurring-chores/         # Process recurring chores
├── security-monitoring/              # Security event logging
├── security-testing/                 # Security test suite
├── send-family-email/                # Send family emails
├── supabase-analytics-query/         # Analytics queries
├── text-to-speech/                   # TTS conversion
└── update-site-settings/             # Update settings
```

### Request Flow

```
Client Request
     │
     ▼
┌─────────────────┐
│   CORS Check    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rate Limiting  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Authentication  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Authorization  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Input Validation│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Business Logic  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Response     │
└─────────────────┘
```

---

## Shared Utilities

### `cors.ts`

CORS configuration with origin validation.

```typescript
// Allowed production origins
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://*.lovable.dev',
  'https://*.lovableproject.com',
  'https://lxuqfgbukrrickanmmic.supabase.co',
];

// Development origins
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

/**
 * Get CORS headers with validated origin
 */
export function getCorsHeaders(requestOrigin?: string | null): Record<string, string>;

// Legacy export (deprecated)
export const corsHeaders: Record<string, string>;
```

**Usage:**
```typescript
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // ... handler logic
  
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

---

### `rate-limiter.ts`

Rate limiting implementation.

```typescript
interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
}

/**
 * Check if request should be rate limited
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }>;

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  admin: { windowMs: 3600000, maxRequests: 10 },  // 10/hour
  auth: { windowMs: 900000, maxRequests: 5 },     // 5/15min
  api: { windowMs: 60000, maxRequests: 100 },     // 100/min
};
```

---

### `password-validator.ts`

Password security validation.

```typescript
interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

/**
 * Validate password against security requirements
 */
export function validatePassword(password: string): PasswordValidationResult;

/**
 * Password requirements
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};
```

---

### `security-headers.ts`

Security header utilities.

```typescript
/**
 * Get standard security headers
 */
export function getSecurityHeaders(): Record<string, string>;

/**
 * Standard security headers
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};
```

---

### `api-types.ts`

Shared API type definitions.

```typescript
/**
 * Standard API response
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

/**
 * Error response
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

---

## Function Reference

### Authentication Functions

#### `create-child-account`

Creates a child account linked to a family.

**Authorization:** Parent or Admin

**Request:**
```typescript
interface CreateChildAccountRequest {
  first_name: string;
  last_name: string;
  family_id: string;
  date_of_birth?: string;
}
```

**Response:**
```typescript
interface CreateChildAccountResponse {
  child_account_id: string;
  generated_email: string;
  user_id: string;
}
```

---

### Admin Functions

#### `admin-create-user`

Creates a new user with specified role.

**Authorization:** Admin only

**Request:**
```typescript
interface AdminCreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'parent' | 'child';
  family_id?: string;
}
```

---

#### `admin-update-user`

Updates user profile and role.

**Authorization:** Admin only

**Request:**
```typescript
interface AdminUpdateUserRequest {
  user_id: string;
  updates: {
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: 'admin' | 'parent' | 'child';
  };
}
```

---

#### `admin-add-family-member`

Adds existing user to a family.

**Authorization:** Admin only

**Request:**
```typescript
interface AddFamilyMemberRequest {
  user_id: string;
  family_id: string;
  role: 'parent' | 'child';
}
```

---

#### `admin-remove-family-member`

Removes user from family.

**Authorization:** Admin only

**Request:**
```typescript
interface RemoveFamilyMemberRequest {
  user_id: string;
  family_id: string;
}
```

---

#### `delete-family-comprehensive`

Deletes family and all associated data.

**Authorization:** Admin only

**Request:**
```typescript
interface DeleteFamilyRequest {
  family_id: string;
  confirm: boolean;
}
```

---

### Communication Functions

#### `send-family-email`

Sends email to family members.

**Authorization:** Admin or Parent

**Request:**
```typescript
interface SendFamilyEmailRequest {
  family_id: string;
  subject: string;
  body: string;
  recipient_ids?: string[];
}
```

---

#### `text-to-speech`

Converts text to speech audio.

**Authorization:** Authenticated

**Request:**
```typescript
interface TextToSpeechRequest {
  text: string;
  voice?: string;
  speed?: number;
}
```

**Response:** Audio stream (audio/mpeg)

---

### AI Integration

#### `grok-chat`

Grok AI chat completion.

**Authorization:** Authenticated

**Request:**
```typescript
interface GrokChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
}
```

**Response:**
```typescript
interface GrokChatResponse {
  message: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

---

### System Functions

#### `error-collector`

Collects frontend errors for monitoring.

**Authorization:** Authenticated

**Request:**
```typescript
interface ErrorCollectorRequest {
  error_type: string;
  message: string;
  stack_trace?: string;
  component_name?: string;
  route_path?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  browser_info?: Record<string, unknown>;
  device_info?: Record<string, unknown>;
}
```

---

#### `security-monitoring`

Records security events.

**Authorization:** Authenticated

**Request:**
```typescript
interface SecurityEventRequest {
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
}
```

---

#### `security-testing`

Runs security tests (development only).

**Authorization:** Admin only

**Response:**
```typescript
interface SecurityTestResponse {
  tests: SecurityTest[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}
```

---

#### `process-recurring-chores`

Processes recurring chore schedules.

**Authorization:** Service role (cron job)

**Response:**
```typescript
interface ProcessChoresResponse {
  processed: number;
  created: number;
  errors: string[];
}
```

---

### Utility Functions

#### `api-integration-status`

Checks external API integration status.

**Authorization:** Admin only

**Response:**
```typescript
interface IntegrationStatusResponse {
  integrations: Array<{
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    lastCheck: string;
  }>;
}
```

---

#### `update-site-settings`

Updates global site settings.

**Authorization:** Admin only

**Request:**
```typescript
interface UpdateSettingsRequest {
  settings: Record<string, boolean | number | string>;
}
```

---

#### `supabase-analytics-query`

Executes analytics queries.

**Authorization:** Admin only

**Request:**
```typescript
interface AnalyticsQueryRequest {
  query_type: 'engagement' | 'retention' | 'growth' | 'custom';
  date_range?: { start: string; end: string };
  custom_query?: string;
}
```

---

### Test Functions

#### `create-test-family`

Creates test family for development.

**Authorization:** Admin only (development)

---

#### `cleanup-test-families`

Removes test families.

**Authorization:** Admin only (development)

---

## Security Patterns

### Authentication Check

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid token');
  }
  
  return user;
}
```

### Role Verification

```typescript
async function verifyAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });
  
  if (error) {
    console.error('Role check error:', error);
    return false;
  }
  
  return data === true;
}
```

### Input Validation

```typescript
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  role: z.enum(['admin', 'parent', 'child']),
});

function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation error: ${result.error.message}`);
  }
  return result.data;
}
```

---

## Development Workflow

### Creating a New Function

1. **Create directory:**
   ```bash
   mkdir supabase/functions/my-new-function
   ```

2. **Create handler file:**
   ```typescript
   // supabase/functions/my-new-function/index.ts
   import { getCorsHeaders } from '../_shared/cors.ts';
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

   const supabaseAdmin = createClient(
     Deno.env.get('SUPABASE_URL')!,
     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
   );

   Deno.serve(async (req) => {
     const corsHeaders = getCorsHeaders(req.headers.get('origin'));

     // Handle CORS preflight
     if (req.method === 'OPTIONS') {
       return new Response(null, { headers: corsHeaders });
     }

     try {
       // Authentication
       const authHeader = req.headers.get('Authorization');
       if (!authHeader) {
         return new Response(
           JSON.stringify({ error: 'Unauthorized' }),
           { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }

       // Parse request
       const body = await req.json();

       // Business logic
       const result = await processRequest(body);

       return new Response(
         JSON.stringify({ data: result, success: true }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     } catch (error) {
       console.error('Function error:', error);
       return new Response(
         JSON.stringify({ error: error.message, success: false }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
   });

   async function processRequest(body: unknown) {
     // Implement logic
   }
   ```

3. **Add secrets (if needed):**
   - Add to Supabase dashboard: Settings → Edge Functions → Secrets

---

## Testing

### Local Testing

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve

# Test with curl
curl -X POST http://localhost:54321/functions/v1/my-function \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

### Unit Tests

```typescript
// supabase/functions/my-function/my-function.test.ts
import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

Deno.test('my-function validates input', async () => {
  const response = await fetch('http://localhost:54321/functions/v1/my-function', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invalid: 'data' }),
  });

  assertEquals(response.status, 400);
});
```

---

## Deployment

Edge functions are automatically deployed when code is pushed. Manual deployment:

```bash
# Deploy single function
supabase functions deploy my-function

# Deploy all functions
supabase functions deploy
```

### Environment Variables

Required secrets for all functions:
- `SUPABASE_URL` (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)
- `SUPABASE_ANON_KEY` (auto-provided)

Function-specific secrets:
- `grok-chat`: `XAI_API_KEY`
- `text-to-speech`: `XAI_API_KEY`
- `send-family-email`: `RESEND_API_KEY`

---

## Monitoring

### Viewing Logs

Dashboard: https://supabase.com/dashboard/project/lxuqfgbukrrickanmmic/functions

### Log Format

```typescript
console.log(JSON.stringify({
  level: 'info',
  function: 'my-function',
  message: 'Processing request',
  metadata: { userId, action },
}));
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial documentation |
