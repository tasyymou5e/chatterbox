# API Documentation

**Chatterbox Edge Functions API Reference**  
**Version**: 1.1.0  
**Base URL**: `https://<project-ref>.supabase.co/functions/v1`  
**Last Updated**: 2026-01-15

---

## Recent Updates (2026-01-15)

- Improved type-safe error handling in all edge functions
- Updated error responses to use `getErrorMessage` pattern
- Enhanced input validation with proper TypeScript types

---

## Overview

Chatterbox uses Supabase Edge Functions for server-side operations that require elevated privileges or external API integration. All functions are authenticated via JWT tokens.

### Authentication

All API endpoints (except where noted) require authentication:

```http
Authorization: Bearer <jwt-token>
```

Tokens are obtained from Supabase Auth after user login.

### Common Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": "Optional additional details"
}
```

### Rate Limiting

Admin operations are rate-limited to prevent abuse:
- **10 operations per hour** per admin user
- Rate limit resets after 1 hour window

---

## Authentication Endpoints

### POST /create-child-account

Creates a new child account linked to a family.

**Authorization:** Parent or Admin role required

**Request Body:**
```typescript
interface CreateChildAccountRequest {
  firstName: string;      // Required - Child's first name
  lastName: string;       // Required - Child's last name
  parentUserId: string;   // Required - ID of requesting user
  password: string;       // Required - Min 8 characters
  familyId?: string;      // Required for admins, optional for parents
}
```

**Success Response (200):**
```typescript
interface CreateChildAccountResponse {
  success: true;
  childAccount: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;        // Generated email: parent@email.com.childname
    accountCode: null;
    status: 'completed';
  };
  family: {
    id: string;
    name: string;
    code: string;         // e.g., "FAM-2026-001"
  };
  instructions: {
    nextSteps: string[];
    loginUrl: string;
  };
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Missing required fields | firstName, lastName, parentUserId, or password missing |
| 400 | Password must be at least 8 characters | Password validation failed |
| 403 | Access denied: Parent or Admin role required | User lacks required role |
| 500 | Failed to create auth user | Supabase auth error |

**Example:**
```bash
curl -X POST \
  'https://xxx.supabase.co/functions/v1/create-child-account' \
  -H 'Authorization: Bearer eyJ...' \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "Alex",
    "lastName": "Smith",
    "parentUserId": "550e8400-e29b-41d4-a716-446655440000",
    "password": "SecurePass123!"
  }'
```

---

## Admin Endpoints

### POST /admin-create-user

Creates a new user with specified roles. Admin only.

**Authorization:** Admin role required

**Rate Limit:** 10 per hour

**Request Body:**
```typescript
interface CreateUserRequest {
  email: string;          // Valid email format
  firstName: string;      // Required
  lastName: string;       // Required
  roles: string[];        // One or more: 'admin', 'parent', 'child', 'read_only'
  customPassword?: string; // Optional - min 8 chars, auto-generated if omitted
}
```

**Role Conflict Rules:**
- Cannot mix admin roles (`admin`, `read_only`) with family roles (`parent`, `child`)
- Can only have one admin role
- Can only have one family role

**Success Response (200):**
```typescript
interface CreateUserResponse {
  success: true;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    roles: string[];
  };
  password: string;       // Generated or provided password
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | MISSING_FIELDS | Required fields missing |
| 400 | INVALID_EMAIL | Email format invalid |
| 400 | EMAIL_EXISTS | Email already registered |
| 400 | WEAK_PASSWORD | Password too short |
| 400 | ROLE_CONFLICT | Invalid role combination |
| 403 | - | Admin access required |
| 429 | - | Rate limit exceeded |

---

### PUT /admin-update-user

Updates an existing user's profile and roles.

**Authorization:** Admin role required

**Request Body:**
```typescript
interface UpdateUserRequest {
  userId: string;         // Required - User ID to update
  email?: string;         // Optional - New email
  firstName?: string;     // Optional - New first name
  lastName?: string;      // Optional - New last name
  roles?: string[];       // Optional - New role set
}
```

**Success Response (200):**
```typescript
interface UpdateUserResponse {
  success: true;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    roles: string[];
  };
}
```

---

### DELETE /admin-remove-family-member

Removes a member from a family.

**Authorization:** Admin role required

**Request Body:**
```typescript
interface RemoveFamilyMemberRequest {
  familyId: string;       // Required
  userId: string;         // Required - Member to remove
}
```

---

### POST /admin-add-family-member

Adds a user to a family with specified role.

**Authorization:** Admin role required

**Request Body:**
```typescript
interface AddFamilyMemberRequest {
  familyId: string;       // Required
  userId: string;         // Required
  role: 'parent' | 'child';
}
```

---

### DELETE /delete-family-comprehensive

Completely removes a family and all associated data.

**Authorization:** Admin role required

**Request Body:**
```typescript
interface DeleteFamilyRequest {
  familyId: string;
  confirmDeletion: boolean; // Must be true
}
```

**Side Effects:**
- Deletes all family members
- Deletes all chores and assignments
- Deletes all child accounts
- Deletes family activity logs
- Archives or removes related data

---

## Communication Endpoints

### POST /send-family-email

Sends an email to family members.

**Authorization:** Admin or Parent role required

**Request Body:**
```typescript
interface SendFamilyEmailRequest {
  familyId: string;
  subject: string;
  body: string;
  recipients: 'all' | 'parents' | string[]; // User IDs or group
}
```

**Success Response (200):**
```typescript
interface SendEmailResponse {
  success: true;
  sentCount: number;
  failedCount: number;
}
```

---

### POST /text-to-speech

Converts text to speech audio.

**Authorization:** Required

**Request Body:**
```typescript
interface TextToSpeechRequest {
  text: string;           // Text to convert (max 5000 chars)
  voice?: string;         // Voice ID (provider-specific)
  speed?: number;         // Playback speed (0.5 - 2.0)
}
```

**Success Response (200):**
```typescript
interface TextToSpeechResponse {
  success: true;
  audioUrl: string;       // URL to audio file
  duration: number;       // Duration in seconds
}
```

---

## AI Integration Endpoints

### POST /grok-chat

Interfaces with Grok AI for chat completion.

**Authorization:** Required

**Request Body:**
```typescript
interface GrokChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;   // 0.0 - 1.0
  maxTokens?: number;     // Max response tokens
}
```

**Success Response (200):**
```typescript
interface GrokChatResponse {
  success: true;
  response: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

**Rate Limiting:** Based on token usage

---

## System Endpoints

### POST /error-collector

Collects and stores frontend errors.

**Authorization:** Optional (anonymous errors accepted)

**Request Body:**
```typescript
interface ErrorCollectorRequest {
  errorType: string;
  message: string;
  stackTrace?: string;
  componentName?: string;
  routePath?: string;
  browserInfo?: object;
  deviceInfo?: object;
  userId?: string;
  sessionId?: string;
}
```

---

### POST /security-monitoring

Records security events for audit trail.

**Authorization:** Required

**Request Body:**
```typescript
interface SecurityEventRequest {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: object;
}
```

---

### POST /security-testing

Runs security tests (development only).

**Authorization:** Admin role required

**Environment:** Development only

---

### POST /process-recurring-chores

Processes and creates recurring chore instances.

**Authorization:** Service role (automated)

**Trigger:** Scheduled cron job

---

### POST /cleanup-test-families

Removes test families created during testing.

**Authorization:** Admin role required

---

### POST /create-test-family

Creates test family for development/testing.

**Authorization:** Admin role required

---

## Utility Endpoints

### GET /api-integration-status

Checks status of external API integrations.

**Authorization:** Admin role required

**Response:**
```typescript
interface IntegrationStatusResponse {
  integrations: Array<{
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    lastChecked: string;
    details?: object;
  }>;
}
```

---

### PUT /update-site-settings

Updates global site settings.

**Authorization:** Admin role required

**Request Body:**
```typescript
interface UpdateSiteSettingsRequest {
  setting_key: string;
  setting_value: any;
}
```

---

### POST /supabase-analytics-query

Executes analytics queries against Supabase.

**Authorization:** Admin role required

---

## Shared Types

Located in `supabase/functions/_shared/api-types.ts`:

```typescript
// Standard API response wrapper
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination parameters
interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Standard error response
interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Common CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": "Additional debugging information"
}
```

---

## Versioning

API versioning is handled via function naming. Breaking changes will result in new function names (e.g., `create-child-account-v2`).

---

## Security Considerations

1. **All requests are logged** to admin_audit_logs
2. **Rate limiting** protects against abuse
3. **Role verification** happens on every request
4. **Input validation** uses Zod schemas
5. **CORS headers** are set appropriately

---

## Related Documentation

- [RLS Policies Documentation](./RLS_POLICIES_DOCUMENTATION.md)
- [Authentication Guide](./AUTHENTICATION_GUIDE.md)
- [Security Framework](./SECURITY_FRAMEWORK.md)
