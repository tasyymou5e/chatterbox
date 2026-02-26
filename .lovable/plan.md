

# Add New LLM Providers to Database

## Current State

Already configured: **Grok (xAI)**, **Anthropic (Claude)**, **OpenAI**, **Google (Gemini)**, **Lovable AI Gateway**

## Providers to Add

| Provider | Key | API Endpoint | Models |
|---|---|---|---|
| Kimi 2 (Moonshot AI) | `kimi` | `https://api.moonshot.cn/v1` | `kimi-2`, `moonshot-v1-8k`, `moonshot-v1-32k` |
| Hugging Face (Ensemble) | `huggingface` | `https://api-inference.huggingface.co/v1` | `meta-llama/Llama-3-70b`, `mistralai/Mixtral-8x7B` |
| Local Model (Ollama) | `local` | `http://localhost:11434/v1` | `llama3`, `mistral`, `codellama` |

**Note:** Grok and Claude (Anthropic) are already in the system -- no changes needed for those.

I'm interpreting "ansable" as **Hugging Face** (ensemble/open-source model hub). If you meant something else, let me know.

## Changes

### 1. Database Migration

Insert 3 new rows into `llm_providers` with `is_active: false` (admin enables after configuring API keys).

### 2. Update Provider Icon Mapping

In `AdminAPIIntegrations.tsx`, add icon cases for `kimi`, `huggingface`, and `local` in the `getProviderIcon` function.

## Files Modified

| File | Action |
|---|---|
| Migration SQL | **Create** -- insert 3 new providers |
| `src/components/admin/AdminAPIIntegrations.tsx` | **Modify** -- add icon cases |

No edge function changes needed -- the existing `manage-llm-provider` and `llm-with-failover` functions already work dynamically with any provider in the database.

