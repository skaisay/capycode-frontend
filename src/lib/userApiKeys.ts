/**
 * User API Keys Management for IDE
 * Handles custom API keys from user's dashboard
 */

export interface UserApiKey {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  keyPreview: string; // First and last 4 chars, e.g., "AIza...Xk2w"
  encryptedKey: string;
  status: 'unknown' | 'active' | 'error' | 'quota_exceeded';
  lastChecked?: number;
  errorMessage?: string;
}

export interface UserApiKeyWithDecrypted extends UserApiKey {
  decryptedKey?: string; // Only available during runtime
}

// Provider display info
export const PROVIDER_INFO: Record<UserApiKey['provider'], { name: string; models: string[] }> = {
  google: {
    name: 'Google AI',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
  },
  custom: {
    name: 'Custom',
    models: []
  }
};

// Storage key for caching key statuses
const STORAGE_KEY = 'capycode_api_key_status';

/**
 * Get cached status for API keys
 */
export function getCachedKeyStatuses(): Record<string, { status: UserApiKey['status']; lastChecked: number; errorMessage?: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save key status to cache
 */
export function setCachedKeyStatus(keyId: string, status: UserApiKey['status'], errorMessage?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const statuses = getCachedKeyStatuses();
    statuses[keyId] = {
      status,
      lastChecked: Date.now(),
      errorMessage
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch {
    // Ignore
  }
}

/**
 * Check if an API key is valid by making a test request
 */
export async function validateApiKey(key: string, provider: UserApiKey['provider']): Promise<{ valid: boolean; error?: string; isQuota?: boolean }> {
  try {
    const response = await fetch('/api/ai/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, provider })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        valid: false,
        error: data.error || 'Validation failed',
        isQuota: data.isQuota || false
      };
    }
    
    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Get status indicator color
 */
export function getStatusColor(status: UserApiKey['status']): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500';
    case 'quota_exceeded':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get status label
 */
export function getStatusLabel(status: UserApiKey['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'quota_exceeded':
      return 'Quota Exceeded';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
}

/**
 * Format key preview (e.g., "AIza...Xk2w")
 */
export function formatKeyPreview(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
