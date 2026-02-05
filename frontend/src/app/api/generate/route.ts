import { NextRequest, NextResponse } from 'next/server';
import { generateWithGemini, generateWithOpenAI, generateWithAnthropic, AIModel } from '@/lib/ai';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

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
    const { prompt, model: requestedModel, apiKey: userApiKey, provider } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Auto-select model based on prompt complexity
    const model = selectOptimalModel(prompt, requestedModel as AIModel | undefined);

    // If user provided their own key with a specific provider, use that
    if (userApiKey) {
      // Auto-detect provider from key format (override database value if mismatch)
      const detectedProvider = detectProviderFromKey(userApiKey);
      
      console.log(`[Generate] User key detected, provider: ${detectedProvider}, key starts with: ${userApiKey.substring(0, 8)}...`);
      console.log(`[Generate] Prompt: "${prompt.substring(0, 100)}..."`);
      
      const startTime = Date.now();
      let result;
      try {
        switch (detectedProvider) {
          case 'openai':
            console.log('[Generate] Calling OpenAI API...');
            result = await generateWithOpenAI(prompt, userApiKey);
            break;
          case 'anthropic':
            console.log('[Generate] Calling Anthropic API...');
            result = await generateWithAnthropic(prompt, userApiKey);
            break;
          case 'google':
          default:
            console.log('[Generate] Calling Gemini API...');
            result = await generateWithGemini(prompt, model as AIModel, userApiKey);
            break;
        }
        
        const duration = Date.now() - startTime;
        console.log(`[Generate] Success! Duration: ${duration}ms, Files: ${result.files?.length}, ExpoName: ${result.expoConfig?.name}`);
        
        return NextResponse.json(result, {
          headers: {
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          },
        });
      } catch (error: any) {
        console.error(`[Generate] ${detectedProvider} API error:`, error.message);
        throw error;
      }
    }

    // Use server-side key (Gemini only)
    const key = process.env.GEMINI_API_KEY;
    
    if (!key) {
      return NextResponse.json(
        { error: 'AI service not configured. Please add your own API key in settings or contact support.' },
        { status: 503 }
      );
    }

    console.log(`[Generate] Using server API key, model: ${model}`);

    const result = await generateWithGemini(prompt, model as AIModel, key);

    return NextResponse.json(result, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(rateLimitResult.resetTime),
      },
    });
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
