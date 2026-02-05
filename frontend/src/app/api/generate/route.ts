import { NextRequest, NextResponse } from 'next/server';
import { generateWithGemini, generateWithOpenAI, generateWithAnthropic, AIModel } from '@/lib/ai';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Auto-detect provider from API key format
function detectProviderFromKey(apiKey: string): 'google' | 'openai' | 'anthropic' {
  if (apiKey.startsWith('AIza')) {
    return 'google';
  }
  if (apiKey.startsWith('sk-ant-')) {
    return 'anthropic';
  }
  if (apiKey.startsWith('sk-')) {
    return 'openai';
  }
  // Default to google for unknown formats
  return 'google';
}

// Auto-select the optimal model based on prompt complexity
function selectOptimalModel(prompt: string, requestedModel?: AIModel): AIModel {
  // If user explicitly requested a model, use it
  if (requestedModel) {
    return requestedModel;
  }

  const promptLength = prompt.length;
  const promptLower = prompt.toLowerCase();
  
  // Keywords indicating complex project
  const complexKeywords = [
    'authentication', 'auth', 'login', 'signup', 'database', 'api', 'server',
    'backend', 'integration', 'payment', 'stripe', 'firebase', 'supabase',
    'real-time', 'realtime', 'websocket', 'push notification', 'offline',
    'complex', 'full', 'complete', 'enterprise', 'production', 'scalable',
    'multiple screens', 'navigation', 'state management', 'redux', 'zustand',
    'many features', 'dashboard', 'admin', 'analytics', 'charts', 'graphs'
  ];
  
  // Keywords indicating medium complexity
  const mediumKeywords = [
    'profile', 'settings', 'list', 'form', 'input', 'button', 'modal',
    'animation', 'transition', 'theme', 'dark mode', 'tabs', 'menu'
  ];
  
  // Count complexity indicators
  const complexCount = complexKeywords.filter(kw => promptLower.includes(kw)).length;
  const mediumCount = mediumKeywords.filter(kw => promptLower.includes(kw)).length;
  
  // Decision logic:
  // - Very complex (3+ complex keywords or prompt > 500 chars with complex keywords) -> gemini-1.5-pro
  // - Medium complexity (1-2 complex keywords or medium keywords) -> gemini-1.5-flash
  // - Simple (short prompt, no complex keywords) -> gemini-2.0-flash (fastest)
  
  if (complexCount >= 3 || (promptLength > 500 && complexCount >= 1)) {
    return 'gemini-2.5-pro';
  }
  
  if (complexCount >= 1 || mediumCount >= 2 || promptLength > 300) {
    return 'gemini-2.5-flash';
  }
  
  return 'gemini-2.5-flash';
}

// Try to generate with a specific key and provider
async function tryGenerateWithKey(
  prompt: string,
  apiKey: string,
  provider: 'google' | 'openai' | 'anthropic',
  model: AIModel
): Promise<{ success: boolean; result?: any; error?: string; isRetryable: boolean }> {
  try {
    let result;
    switch (provider) {
      case 'openai':
        result = await generateWithOpenAI(prompt, apiKey);
        break;
      case 'anthropic':
        result = await generateWithAnthropic(prompt, apiKey);
        break;
      case 'google':
      default:
        result = await generateWithGemini(prompt, model, apiKey);
        break;
    }
    return { success: true, result, isRetryable: false };
  } catch (error: any) {
    const errorMsg = error.message?.toLowerCase() || '';
    const isQuotaError = errorMsg.includes('quota') || errorMsg.includes('exceeded') || 
                         errorMsg.includes('rate limit') || errorMsg.includes('429');
    const isAuthError = errorMsg.includes('api key') || errorMsg.includes('unauthorized') ||
                        errorMsg.includes('401') || errorMsg.includes('invalid');
    
    // Quota and auth errors are retryable with different key
    const isRetryable = isQuotaError || isAuthError;
    
    return { success: false, error: error.message, isRetryable };
  }
}

// Get all user's API keys from database
async function getUserApiKeys(userId: string): Promise<Array<{ id: string; key: string; provider: string; name: string }>> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, encrypted_key, provider, name')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false, nullsFirst: false });
    
    if (error) {
      console.error('[Generate] Failed to fetch user API keys:', error);
      return [];
    }
    
    return (data || []).map(key => ({
      id: key.id,
      key: key.encrypted_key, // In production, decrypt this
      provider: key.provider,
      name: key.name
    }));
  } catch (error) {
    console.error('[Generate] Error fetching API keys:', error);
    return [];
  }
}

// Update last_used_at for an API key
async function markKeyUsed(keyId: string) {
  try {
    const supabase = createServerSupabaseClient();
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId);
  } catch (error) {
    console.error('[Generate] Failed to update key last_used_at:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 requests per minute per IP
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`generate:${clientIP}`, RATE_LIMITS.aiGeneration);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please wait before trying again.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          },
        }
      );
    }

    const body = await request.json();
    const { prompt, model: requestedModel, apiKey: userApiKey, provider, autoSelectKey, userId } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Auto-select model based on prompt complexity
    const model = selectOptimalModel(prompt, requestedModel as AIModel | undefined);
    
    // Track errors for debugging
    const errors: string[] = [];
    let usedKeyInfo: { id?: string; name?: string; provider?: string } = {};

    // If user provided their own key with a specific provider, try that first
    if (userApiKey) {
      // Auto-detect provider from key format (override database value if mismatch)
      const detectedProvider = detectProviderFromKey(userApiKey);
      
      console.log(`[Generate] User key detected, provider: ${detectedProvider}, key starts with: ${userApiKey.substring(0, 8)}...`);
      console.log(`[Generate] Prompt: "${prompt.substring(0, 100)}..."`);
      
      const startTime = Date.now();
      const result = await tryGenerateWithKey(prompt, userApiKey, detectedProvider, model);
      
      if (result.success) {
        const duration = Date.now() - startTime;
        console.log(`[Generate] Success! Duration: ${duration}ms, Files: ${result.result.files?.length}, ExpoName: ${result.result.expoConfig?.name}`);
        
        return NextResponse.json({
          ...result.result,
          usedKey: { provider: detectedProvider }
        }, {
          headers: {
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          },
        });
      }
      
      errors.push(`User key (${detectedProvider}): ${result.error}`);
      console.log(`[Generate] User key failed: ${result.error}`);
      
      // If not retryable (network error, parse error), throw immediately
      if (!result.isRetryable) {
        throw new Error(result.error);
      }
      
      // Otherwise continue to try other keys
    }

    // AUTO-KEY SELECTION: Try all user's API keys until one works
    if (autoSelectKey && userId) {
      console.log('[Generate] Auto-selecting from user API keys...');
      const userKeys = await getUserApiKeys(userId);
      console.log(`[Generate] Found ${userKeys.length} user API keys`);
      
      for (const key of userKeys) {
        const provider = detectProviderFromKey(key.key);
        console.log(`[Generate] Trying key "${key.name}" (${provider})...`);
        
        const result = await tryGenerateWithKey(prompt, key.key, provider, model);
        
        if (result.success) {
          console.log(`[Generate] Success with key "${key.name}"!`);
          // Mark this key as recently used
          await markKeyUsed(key.id);
          
          return NextResponse.json({
            ...result.result,
            usedKey: { id: key.id, name: key.name, provider }
          }, {
            headers: {
              'X-RateLimit-Remaining': String(rateLimitResult.remaining),
              'X-RateLimit-Reset': String(rateLimitResult.resetTime),
            },
          });
        }
        
        errors.push(`${key.name} (${provider}): ${result.error}`);
        console.log(`[Generate] Key "${key.name}" failed: ${result.error}`);
        
        // If not retryable, stop trying
        if (!result.isRetryable) {
          break;
        }
      }
    }

    // Fallback: Use server-side key (Gemini only)
    const serverKey = process.env.GEMINI_API_KEY;
    
    if (serverKey) {
      console.log(`[Generate] Trying server API key (${serverKey.substring(0, 8)}...), model: ${model}`);
      
      const result = await tryGenerateWithKey(prompt, serverKey, 'google', model);
      
      if (result.success) {
        console.log('[Generate] Success with server key!');
        
        return NextResponse.json({
          ...result.result,
          usedKey: { provider: 'google', name: 'Server (Gemini)' }
        }, {
          headers: {
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          },
        });
      }
      
      errors.push(`Server key (google): ${result.error}`);
      console.log(`[Generate] Server key failed: ${result.error}`);
    } else {
      console.error('[Generate] GEMINI_API_KEY not configured');
      errors.push('Server key not configured');
    }

    // All keys failed
    console.error('[Generate] All API keys failed:', errors);
    
    // Return the most relevant error
    const lastError = errors[errors.length - 1] || 'No API keys available';
    const isQuotaError = errors.some(e => e.includes('quota') || e.includes('429'));
    
    return NextResponse.json(
      { 
        error: isQuotaError 
          ? 'All API keys have exceeded their quota. Please add more keys or try again later.'
          : `AI generation failed: ${lastError}`,
        errors,
        isQuotaError,
      },
      { status: isQuotaError ? 503 : 500 }
    );
  } catch (error: any) {
    console.error('AI generation error:', error);
    
    // Check if it's a quota exceeded error
    const errorMessage = error.message || '';
    const isQuotaError = errorMessage.includes('quota') || 
                         errorMessage.includes('exceeded') ||
                         errorMessage.includes('rate limit') ||
                         errorMessage.includes('429');
    
    if (isQuotaError) {
      return NextResponse.json(
        { 
          error: 'AI quota exceeded. Please try again later or upgrade your plan.',
          isQuotaError: true,
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate project' },
      { status: 500 }
    );
  }
}
