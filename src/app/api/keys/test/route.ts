import { NextRequest, NextResponse } from 'next/server';

// Provider detection patterns
const PROVIDER_PATTERNS = {
  google: [/^AIza/],
  openai: [/^sk-/, /^sk-proj-/],
  anthropic: [/^sk-ant-/],
  openrouter: [/^sk-or-/],
  together: [/^[a-f0-9]{64}$/i],
  groq: [/^gsk_/],
  fireworks: [/^fw_/],
  cohere: [/^[A-Za-z0-9]{40}$/],
  mistral: [/^[A-Za-z0-9]{32}$/],
  replicate: [/^r8_/],
  huggingface: [/^hf_/],
  deepseek: [/^sk-[a-f0-9]{32}$/i],
};

// Detect provider from API key format
function detectProvider(apiKey: string): { provider: string; confidence: 'high' | 'medium' | 'low'; possibleProviders: string[] } {
  const possibleProviders: string[] = [];
  
  // Check each provider pattern
  for (const [provider, patterns] of Object.entries(PROVIDER_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(apiKey)) {
        possibleProviders.push(provider);
        break;
      }
    }
  }
  
  // Specific high-confidence matches
  if (apiKey.startsWith('AIza')) {
    return { provider: 'google', confidence: 'high', possibleProviders: ['google'] };
  }
  if (apiKey.startsWith('sk-ant-')) {
    return { provider: 'anthropic', confidence: 'high', possibleProviders: ['anthropic'] };
  }
  if (apiKey.startsWith('sk-or-')) {
    return { provider: 'openrouter', confidence: 'high', possibleProviders: ['openrouter'] };
  }
  if (apiKey.startsWith('gsk_')) {
    return { provider: 'groq', confidence: 'high', possibleProviders: ['groq'] };
  }
  if (apiKey.startsWith('fw_')) {
    return { provider: 'fireworks', confidence: 'high', possibleProviders: ['fireworks'] };
  }
  if (apiKey.startsWith('r8_')) {
    return { provider: 'replicate', confidence: 'high', possibleProviders: ['replicate'] };
  }
  if (apiKey.startsWith('hf_')) {
    return { provider: 'huggingface', confidence: 'high', possibleProviders: ['huggingface'] };
  }
  if (apiKey.startsWith('sk-proj-')) {
    return { provider: 'openai', confidence: 'high', possibleProviders: ['openai'] };
  }
  if (apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant-') && !apiKey.startsWith('sk-or-')) {
    return { provider: 'openai', confidence: 'medium', possibleProviders: ['openai', 'deepseek'] };
  }
  
  // 64-char hex could be Together AI
  if (/^[a-f0-9]{64}$/i.test(apiKey)) {
    return { provider: 'together', confidence: 'medium', possibleProviders: ['together'] };
  }
  
  // Unknown format
  return { provider: 'unknown', confidence: 'low', possibleProviders };
}

// Test API key with actual request
async function testApiKey(apiKey: string, provider: string): Promise<{ success: boolean; message: string; latency?: number; model?: string }> {
  const startTime = Date.now();
  
  try {
    switch (provider) {
      case 'google': {
        // Test with Gemini API
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          { method: 'GET' }
        );
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json();
          const models = data.models?.slice(0, 3).map((m: any) => m.name.split('/').pop()).join(', ');
          return { success: true, message: `✅ Valid Google API Key. Available models: ${models || 'gemini-pro'}`, latency, model: 'gemini' };
        }
        const error = await response.json().catch(() => ({}));
        return { success: false, message: `❌ Invalid: ${error.error?.message || response.statusText}`, latency };
      }
      
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          return { success: true, message: '✅ Valid OpenAI API Key', latency, model: 'gpt-4' };
        }
        const error = await response.json().catch(() => ({}));
        return { success: false, message: `❌ Invalid: ${error.error?.message || response.statusText}`, latency };
      }
      
      case 'anthropic': {
        // Anthropic doesn't have a simple test endpoint, so we try a minimal request
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
          })
        });
        const latency = Date.now() - startTime;
        
        if (response.ok || response.status === 200) {
          return { success: true, message: '✅ Valid Anthropic API Key', latency, model: 'claude-3' };
        }
        const error = await response.json().catch(() => ({}));
        if (error.error?.type === 'authentication_error') {
          return { success: false, message: `❌ Invalid API Key`, latency };
        }
        // Rate limit or other errors mean the key is valid but limited
        if (response.status === 429) {
          return { success: true, message: '⚠️ Valid key but rate limited', latency, model: 'claude-3' };
        }
        return { success: false, message: `❌ Error: ${error.error?.message || response.statusText}`, latency };
      }
      
      case 'openrouter': {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          return { success: true, message: '✅ Valid OpenRouter API Key', latency, model: 'openrouter' };
        }
        return { success: false, message: `❌ Invalid OpenRouter key`, latency };
      }
      
      case 'groq': {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          return { success: true, message: '✅ Valid Groq API Key', latency, model: 'groq' };
        }
        return { success: false, message: `❌ Invalid Groq key`, latency };
      }
      
      case 'together': {
        const response = await fetch('https://api.together.xyz/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          return { success: true, message: '✅ Valid Together AI API Key', latency, model: 'together' };
        }
        return { success: false, message: `❌ Invalid Together AI key`, latency };
      }
      
      case 'fireworks': {
        const response = await fetch('https://api.fireworks.ai/inference/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          return { success: true, message: '✅ Valid Fireworks API Key', latency, model: 'fireworks' };
        }
        return { success: false, message: `❌ Invalid Fireworks key`, latency };
      }
      
      case 'huggingface': {
        const response = await fetch('https://huggingface.co/api/whoami', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json();
          return { success: true, message: `✅ Valid HuggingFace Key (${data.name || 'user'})`, latency, model: 'huggingface' };
        }
        return { success: false, message: `❌ Invalid HuggingFace key`, latency };
      }
      
      default:
        return { success: false, message: `❓ Unknown provider: ${provider}. Cannot test automatically.` };
    }
  } catch (error: any) {
    const latency = Date.now() - startTime;
    return { success: false, message: `❌ Network error: ${error.message}`, latency };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, provider: explicitProvider } = body;
    
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }
    
    // Mask key for logging
    const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
    
    // Auto-detect provider
    const detection = detectProvider(apiKey);
    const provider = explicitProvider || detection.provider;
    
    console.log(`[API Test] Testing key ${maskedKey}, detected provider: ${detection.provider} (${detection.confidence}), using: ${provider}`);
    
    // Test the key
    const result = await testApiKey(apiKey, provider);
    
    return NextResponse.json({
      detection: {
        provider: detection.provider,
        confidence: detection.confidence,
        possibleProviders: detection.possibleProviders
      },
      testedProvider: provider,
      result: {
        success: result.success,
        message: result.message,
        latency: result.latency,
        model: result.model
      }
    });
    
  } catch (error: any) {
    console.error('[API Test] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test API key' },
      { status: 500 }
    );
  }
}
