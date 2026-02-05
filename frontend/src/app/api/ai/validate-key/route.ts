import { NextRequest, NextResponse } from 'next/server';

/**
 * Validate API key by making a test request
 * POST /api/ai/validate-key
 */
export async function POST(request: NextRequest) {
  try {
    const { key, provider } = await request.json();

    if (!key || !provider) {
      return NextResponse.json(
        { error: 'Key and provider are required' },
        { status: 400 }
      );
    }

    let isValid = false;
    let error: string | undefined;
    let isQuota = false;

    switch (provider) {
      case 'google':
        const result = await validateGoogleKey(key);
        isValid = result.valid;
        error = result.error;
        isQuota = result.isQuota || false;
        break;
        
      case 'openai':
        const openaiResult = await validateOpenAIKey(key);
        isValid = openaiResult.valid;
        error = openaiResult.error;
        isQuota = openaiResult.isQuota || false;
        break;
        
      case 'anthropic':
        const anthropicResult = await validateAnthropicKey(key);
        isValid = anthropicResult.valid;
        error = anthropicResult.error;
        isQuota = anthropicResult.isQuota || false;
        break;
        
      default:
        // For custom providers, just check format
        isValid = key.length > 10;
    }

    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: error || 'Invalid API key', isQuota },
        { status: 200 }
      );
    }

    return NextResponse.json({ valid: true });
    
  } catch (error: any) {
    console.error('Key validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Validate Google Gemini API key
 */
async function validateGoogleKey(key: string): Promise<{ valid: boolean; error?: string; isQuota?: boolean }> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { method: 'GET' }
    );

    if (response.ok) {
      return { valid: true };
    }

    const data = await response.json();
    const errorMessage = data.error?.message || 'Unknown error';
    
    if (response.status === 429 || errorMessage.includes('quota') || errorMessage.includes('rate')) {
      return { valid: false, error: 'Quota exceeded', isQuota: true };
    }
    
    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Invalid API key' };
    }

    return { valid: false, error: errorMessage };
    
  } catch (error: any) {
    return { valid: false, error: error.message || 'Network error' };
  }
}

/**
 * Validate OpenAI API key
 */
async function validateOpenAIKey(key: string): Promise<{ valid: boolean; error?: string; isQuota?: boolean }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    const data = await response.json();
    const errorMessage = data.error?.message || 'Unknown error';
    
    if (response.status === 429) {
      return { valid: false, error: 'Rate limit or quota exceeded', isQuota: true };
    }
    
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    return { valid: false, error: errorMessage };
    
  } catch (error: any) {
    return { valid: false, error: error.message || 'Network error' };
  }
}

/**
 * Validate Anthropic API key
 */
async function validateAnthropicKey(key: string): Promise<{ valid: boolean; error?: string; isQuota?: boolean }> {
  try {
    // Anthropic doesn't have a simple validation endpoint, so we check format
    // Real validation would require making an actual API call
    if (!key.startsWith('sk-ant-')) {
      return { valid: false, error: 'Invalid key format. Should start with sk-ant-' };
    }
    
    // Try a minimal API call
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    // We don't need the response to succeed, just not be 401
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    if (response.status === 429) {
      return { valid: false, error: 'Rate limit exceeded', isQuota: true };
    }

    return { valid: true };
    
  } catch (error: any) {
    return { valid: false, error: error.message || 'Network error' };
  }
}
