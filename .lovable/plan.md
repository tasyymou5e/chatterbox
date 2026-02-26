

# Add AI Conversation Persistence

## Current State

The entire AI assistant feature is **not yet built** -- no `ai-chat` edge function, no `AIAssistantChat.tsx` component, no AI site settings exist. This plan creates the full stack: database tables for persistence, edge function, admin settings, and the user-facing chat widget with conversation history.

## Database Tables

### `ai_conversations`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Default `gen_random_uuid()` |
| `user_id` | uuid NOT NULL | References `profiles(id)` ON DELETE CASCADE |
| `title` | text | Auto-generated from first message, editable |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

### `ai_messages`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Default `gen_random_uuid()` |
| `conversation_id` | uuid NOT NULL | References `ai_conversations(id)` ON DELETE CASCADE |
| `role` | text NOT NULL | `'user'`, `'assistant'`, or `'system'` |
| `content` | text NOT NULL | Message text |
| `tokens_used` | integer | Token count from API response |
| `model` | text | Model that generated the response |
| `created_at` | timestamptz | Default `now()` |

### RLS Policies
- Both tables: users can SELECT, INSERT, UPDATE, DELETE only their own rows (`user_id = auth.uid()` or via join)
- Indexes on `user_id` and `conversation_id` for query performance

### AI Site Settings (data insert)
Insert 4 rows into `site_settings`: `ai_provider` (`lovable`), `ai_model` (`google/gemini-3-flash-preview`), `ai_enabled` (`true`), `ai_system_prompt` (default child-friendly prompt).

## Edge Function: `ai-chat`

New `supabase/functions/ai-chat/index.ts`:

- Accepts `{ messages, conversationId?, stream? }`
- Requires JWT auth
- Reads `ai_provider`, `ai_model`, `ai_system_prompt`, `ai_enabled` from `site_settings`
- Looks up provider endpoint from `llm_providers`
- Resolves API key: `LOVABLE_API_KEY` for lovable provider, else `LLM_{PROVIDER}_API_KEY`
- If `conversationId` provided, loads full message history from `ai_messages`
- If no `conversationId`, creates a new `ai_conversations` row
- Saves user message and assistant response to `ai_messages`
- Auto-generates conversation title from first user message (truncated to 50 chars)
- Logs to `llm_api_calls` for monitoring
- Supports streaming (SSE passthrough) and non-streaming

## Admin UI: `AdminAISettings.tsx`

New component added to the admin dashboard:

- Toggle AI enabled/disabled
- Provider dropdown (from `llm_providers` where `is_active = true`)
- Model dropdown (from selected provider's `models` JSON array)
- System prompt textarea
- Test connection button
- Save to `site_settings` via Supabase client

## User-Facing: `AIAssistantChat.tsx`

Floating chat widget in bottom-right corner:

- Conversation list sidebar showing past conversations with timestamps
- Create new conversation / resume existing
- Full message history loaded from DB on conversation select
- Streams responses token-by-token
- Auto-scrolls, loading states, error handling
- Keyboard accessible

## Hook: `useAIChat.ts`

Custom hook managing:
- `conversations` list (fetch from `ai_conversations`)
- `messages` for active conversation (fetch from `ai_messages`)
- `sendMessage(content)` -- saves to DB, calls edge function, saves response
- `createConversation()` / `deleteConversation(id)`
- Optimistic UI updates

## Files

| File | Action |
|---|---|
| Migration SQL | **Create** -- `ai_conversations`, `ai_messages` tables + RLS + indexes + settings data |
| `supabase/functions/ai-chat/index.ts` | **Create** |
| `supabase/config.toml` | **Modify** -- register `ai-chat` with `verify_jwt = false` |
| `src/components/admin/AdminAISettings.tsx` | **Create** |
| `src/components/ai/AIAssistantChat.tsx` | **Create** |
| `src/hooks/useAIChat.ts` | **Create** |
| `src/pages/admin/AdminDashboard.tsx` | **Modify** -- add AI settings tab |
| App layout or portal components | **Modify** -- mount `AIAssistantChat` for authenticated users |

