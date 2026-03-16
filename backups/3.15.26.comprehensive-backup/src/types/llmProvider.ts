/**
 * Type definitions for LLM Provider management
 */

export interface LLMProvider {
  id: string;
  provider_key: string;
  display_name: string;
  api_endpoint: string;
  models: string[];
  is_active: boolean | null;
  is_custom: boolean | null;
  pricing_config: {
    inputPricePer1k: number;
    outputPricePer1k: number;
  } | null;
  api_key_configured: boolean;
  last_health_check: string | null;
  health_status: 'healthy' | 'unhealthy' | 'unchecked' | null;
  created_at: string;
  updated_at: string;
}

export interface LLMProviderFormData {
  displayName: string;
  providerKey: string;
  apiEndpoint: string;
  apiKey: string;
  models: string[];
  inputPricePer1k: string;
  outputPricePer1k: string;
}

export const initialProviderFormData: LLMProviderFormData = {
  displayName: '',
  providerKey: '',
  apiEndpoint: '',
  apiKey: '',
  models: [],
  inputPricePer1k: '0.001',
  outputPricePer1k: '0.002'
};
