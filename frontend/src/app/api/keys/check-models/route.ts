import { NextRequest, NextResponse } from 'next/server';

// Detect provider from API key format
function detectProviderFromKey(apiKey: string): 'google' | 'openai' | 'anthropic' {
  if (apiKey.startsWith('AIza')) return 'google';
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('sk-')) return 'openai';
  return 'google';
}

// Get available models for provider
function getModelsForProvider(provider: 'google' | 'openai' | 'anthropic'): string[] {
  switch (provider) {
    case 'google':
      return ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    case 'openai':
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    case 'anthropic':
      return ['claude-3-5-sonnet', 'claude-3-haiku', 'claude-3-opus'];
    default:
      return [];
  }
}

// Quick validation test for each provider
async function validateGoogleKey(apiKey: string): Promise<{ valid: boolean; error?: string; isQuota?: boolean }> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
      { method: 'GET', signal: AbortSignal.timeout(5000) }
    );
    
    if (response.ok) {
      return { valid: true };
    }
    
    const error = await response.json().catch(() => ({}));
    const errorMsg = error.error?.message || '';
    
    if (response.status === 429 || errorMsg.includes('quota') || errorMsg.includes('exceeded')) {
      return { valid: false, error: 'Лимит исчерпан', isQuota: true };
    }
    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Недействительный ключ' };
    }
    
    return { valid: false, error: errorMsg || 'Ошибка проверки' };
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return { valid: false, error: 'Таймаут' };
    }
    return { valid: false, error: 'Ошибка сети' };
  }
}

async function validateOpenAIKey(apiKey: string): Promise<{ valid: boolean; error?: string; isQuota?: boolean }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      return { valid: true };
    }
    
    const error = await response.json().catch(() => ({}));
    const errorMsg = error.error?.message || '';
    
    if (response.status === 429 || errorMsg.includes('quota') || errorMsg.includes('exceeded')) {
      return { valid: false, error: 'Лимит исчерпан', isQuota: true };
    }
    if (response.status === 401) {
      return { valid: false, error: 'Недействительный ключ' };
    }
    
    return { valid: false, error: errorMsg || 'Ошибка проверки' };
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return { valid: false, error: 'Таймаут' };
    }
    return { valid: false, error: 'Ошибка сети' };
  }
}

async function validateAnthropicKey(apiKey: string): Promise<{ valid: boolean; error?: string; isQuota?: boolean }> {
  try {
    // Anthropic doesn't have a simple validation endpoint, so we do a minimal request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    
    // Any response other than auth error means key is valid
    if (response.ok || response.status === 400) {
      return { valid: true };
    }
    
    const error = await response.json().catch(() => ({}));
    const errorMsg = error.error?.message || '';
    
    if (response.status === 429 || errorMsg.includes('quota') || errorMsg.includes('rate')) {
      return { valid: false, error: 'Лимит исчерпан', isQuota: true };
    }
    if (response.status === 401) {
      return { valid: false, error: 'Недействительный ключ' };
    }
    
    return { valid: false, error: errorMsg || 'Ошибка проверки' };
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return { valid: false, error: 'Таймаут' };
    }
    return { valid: false, error: 'Ошибка сети' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { encryptedKey, provider: providedProvider } = await request.json();
    
    if (!encryptedKey) {
      return NextResponse.json({ valid: false, error: 'Ключ не указан' }, { status: 400 });
    }
    
    // Detect actual provider from key format
    const detectedProvider = detectProviderFromKey(encryptedKey);
    const provider = detectedProvider; // Use detected, not provided
    
    console.log(`[check-models] Checking key for provider: ${provider}`);
    
    // Validate key based on provider
    let result: { valid: boolean; error?: string; isQuota?: boolean };
    
    switch (provider) {
      case 'google':
        result = await validateGoogleKey(encryptedKey);
        break;
      case 'openai':
        result = await validateOpenAIKey(encryptedKey);
        break;
      case 'anthropic':
        result = await validateAnthropicKey(encryptedKey);
        break;
      default:
        result = { valid: false, error: 'Неизвестный провайдер' };
    }
    
    if (result.valid) {
      return NextResponse.json({
        valid: true,
        provider,
        availableModels: getModelsForProvider(provider),
      });
    }
    
    return NextResponse.json({
      valid: false,
      error: result.error,
      isQuota: result.isQuota,
    });
  } catch (error: any) {
    console.error('[check-models] Error:', error);
    return NextResponse.json({ valid: false, error: 'Ошибка сервера' }, { status: 500 });
  }
}
