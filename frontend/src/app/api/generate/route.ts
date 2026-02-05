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

// Check if the prompt is a generation request or just a chat message
function isGenerationRequest(prompt: string, hasExistingProject: boolean): { isGeneration: boolean; reason: string } {
  const promptLower = prompt.toLowerCase().trim();
  const promptLength = prompt.length;
  
  // Greetings and simple messages that should NOT trigger generation
  const greetingPatterns = [
    /^(привет|здравствуй|здорово|хай|хей|йо|салют|приветик)[\s!.,?]*$/i,
    /^(hi|hello|hey|yo|howdy|greetings)[\s!.,?]*$/i,
    /^(как дела|как ты|что нового|что делаешь)[\s!.,?]*$/i,
    /^(how are you|what's up|what's new|how's it going)[\s!.,?]*$/i,
    /^(спасибо|благодарю|thanks|thank you|thx)[\s!.,?]*$/i,
    /^(да|нет|ок|окей|хорошо|понял|ясно)[\s!.,?]*$/i,
    /^(yes|no|ok|okay|sure|got it|understood)[\s!.,?]*$/i,
    /^[a-zа-яё\s]{1,15}[!?.]*$/i, // Very short messages (1-15 chars)
  ];
  
  // Check if it matches any greeting pattern
  for (const pattern of greetingPatterns) {
    if (pattern.test(promptLower)) {
      return { isGeneration: false, reason: 'Greeting or simple message' };
    }
  }
  
  // Very short prompts without action words - probably not a generation request
  if (promptLength < 20 && !hasExistingProject) {
    const actionWords = ['создай', 'сделай', 'добавь', 'измени', 'create', 'make', 'build', 'add', 'change', 'edit', 'fix', 'app', 'приложение'];
    const hasActionWord = actionWords.some(word => promptLower.includes(word));
    if (!hasActionWord) {
      return { isGeneration: false, reason: 'Too short without action words' };
    }
  }
  
  // Questions about how to do something (not asking to DO it)
  const questionPatterns = [
    /^(как|что такое|почему|зачем|можно ли)\s/i,
    /^(how to|what is|why|can i|could you explain)\s/i,
    /\?$/,
  ];
  
  // If it's a question AND doesn't have generation intent, it's chat
  const isQuestion = questionPatterns.some(p => p.test(prompt));
  const generationIntentWords = ['создай', 'сделай', 'добавь', 'напиши', 'сгенерируй', 'create', 'make', 'build', 'add', 'generate', 'implement'];
  const hasGenerationIntent = generationIntentWords.some(word => promptLower.includes(word));
  
  if (isQuestion && !hasGenerationIntent && !hasExistingProject) {
    return { isGeneration: false, reason: 'Question without generation intent' };
  }
  
  // Keywords that definitely indicate generation request
  const generationKeywords = [
    'создай', 'сделай', 'разработай', 'напиши', 'сгенерируй', 'построй',
    'приложение', 'апп', 'экран', 'компонент', 'кнопк', 'форм',
    'create', 'build', 'make', 'develop', 'generate', 'write',
    'app', 'application', 'screen', 'component', 'button', 'form',
    'добавь', 'измени', 'удали', 'исправь', 'обнови',
    'add', 'change', 'remove', 'fix', 'update', 'modify'
  ];
  
  const hasGenerationKeyword = generationKeywords.some(kw => promptLower.includes(kw));
  
  if (hasGenerationKeyword) {
    return { isGeneration: true, reason: 'Contains generation keywords' };
  }
  
  // If there's an existing project, more likely to be an edit request
  if (hasExistingProject && promptLength > 10) {
    return { isGeneration: true, reason: 'Editing existing project' };
  }
  
  // Long prompts (>50 chars) are probably generation requests
  if (promptLength > 50) {
    return { isGeneration: true, reason: 'Long detailed prompt' };
  }
  
  // Default: if nothing matched, it's probably just chat
  return { isGeneration: false, reason: 'No clear generation intent' };
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

// Determine which provider is needed for a given model
function getRequiredProviderForModel(model: AIModel): 'google' | 'openai' | 'anthropic' {
  if (model.startsWith('gemini')) return 'google';
  if (model.startsWith('gpt')) return 'openai';
  if (model.startsWith('claude')) return 'anthropic';
  return 'google'; // Default
}

// Check if a provider's key is compatible with the requested model
function isProviderCompatible(provider: string, model: AIModel): boolean {
  const requiredProvider = getRequiredProviderForModel(model);
  return provider === requiredProvider;
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
    const { prompt, model: requestedModel, apiKey: userApiKey, provider, autoSelectKey, userId, hasExistingProject, forceGeneration } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check if this is actually a generation request or just chat
    const generationCheck = isGenerationRequest(prompt, !!hasExistingProject);
    
    if (!generationCheck.isGeneration && !forceGeneration) {
      console.log(`[Generate] Not a generation request: ${generationCheck.reason}. Prompt: "${prompt.substring(0, 50)}..."`);
      
      // Return a special response indicating this should go to chat instead
      return NextResponse.json({
        isChat: true,
        reason: generationCheck.reason,
        message: 'This appears to be a chat message, not a generation request. Use /api/chat instead.',
        suggestedAction: 'redirect_to_chat'
      }, { status: 200 });
    }
    
    console.log(`[Generate] Generation request confirmed: ${generationCheck.reason}`);

    // Auto-select model based on prompt complexity
    const model = selectOptimalModel(prompt, requestedModel as AIModel | undefined);
    
    // Track errors for debugging
    const errors: string[] = [];
    let usedKeyInfo: { id?: string; name?: string; provider?: string } = {};

    // If user provided their own key with a specific provider, try that first
    if (userApiKey) {
      // Auto-detect provider from key format (override database value if mismatch)
      const detectedProvider = detectProviderFromKey(userApiKey);
      const requiredProvider = getRequiredProviderForModel(model);
      
      console.log(`[Generate] User key detected, provider: ${detectedProvider}, model: ${model}, required: ${requiredProvider}`);
      console.log(`[Generate] Prompt: "${prompt.substring(0, 100)}..."`);
      
      // Check if key is compatible with model
      if (!isProviderCompatible(detectedProvider, model)) {
        const errorMsg = `Ключ ${detectedProvider.toUpperCase()} несовместим с моделью ${model}. Нужен ключ ${requiredProvider.toUpperCase()}.`;
        console.log(`[Generate] Incompatible key: ${errorMsg}`);
        errors.push(errorMsg);
        // Don't try this key, fall through to auto-select or error
      } else {
        const startTime = Date.now();
        const result = await tryGenerateWithKey(prompt, userApiKey, detectedProvider, model);
        
        if (result.success) {
          const duration = Date.now() - startTime;
          const filesCount = result.result.files?.length || 0;
          console.log(`[Generate] Success! Duration: ${duration}ms, Files: ${filesCount}, ExpoName: ${result.result.expoConfig?.name}`);
          
          // Validate result has files - empty result is an error
          if (filesCount === 0) {
            errors.push(`Генерация вернула пустой результат. Попробуйте другой ключ.`);
            // Continue to try other keys
          } else {
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
        } else {
          errors.push(`User key (${detectedProvider}): ${result.error || 'Unknown error'}`);
          console.log(`[Generate] User key failed: ${result.error}`);
        
          // If not retryable (network error, parse error), throw immediately
          if (!result.isRetryable) {
            throw new Error(result.error);
          }
        }
        // Otherwise continue to try other keys
      }
    }

    // AUTO-KEY SELECTION: Try all user's API keys until one works
    // ONLY try keys that are compatible with the selected model
    const requiredProvider = getRequiredProviderForModel(model);
    
    if (autoSelectKey && userId) {
      console.log(`[Generate] Auto-selecting from user API keys for ${model} (requires ${requiredProvider})...`);
      const userKeys = await getUserApiKeys(userId);
      console.log(`[Generate] Found ${userKeys.length} user API keys`);
      
      // Filter to only compatible keys first
      const compatibleKeys = userKeys.filter(key => {
        const provider = detectProviderFromKey(key.key);
        return isProviderCompatible(provider, model);
      });
      
      console.log(`[Generate] ${compatibleKeys.length} keys are compatible with ${requiredProvider}`);
      
      if (compatibleKeys.length === 0) {
        errors.push(`Нет совместимых ключей для модели ${model}. Нужен ключ ${requiredProvider.toUpperCase()}.`);
      }
      
      for (const key of compatibleKeys) {
        const provider = detectProviderFromKey(key.key) as 'google' | 'openai' | 'anthropic';
        console.log(`[Generate] Trying key "${key.name}" (${provider})...`);
        
        const result = await tryGenerateWithKey(prompt, key.key, provider, model);
        
        if (result.success) {
          const filesCount = result.result.files?.length || 0;
          console.log(`[Generate] Result with key "${key.name}": ${filesCount} files`);
          
          // Validate result has files
          if (filesCount === 0) {
            errors.push(`${key.name}: Пустой результат генерации`);
            continue; // Try next key
          }
          
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

    // NO FALLBACK TO SERVER KEY - User must have valid API keys
    // This ensures no demo/default data is ever shown

    // All keys failed - return detailed error
    console.error('[Generate] All API keys failed:', errors);
    
    // Build helpful error message
    const lastError = errors[errors.length - 1] || 'Нет доступных API ключей';
    const isQuotaError = errors.some(e => e.includes('quota') || e.includes('429') || e.includes('exceeded'));
    const isCompatibilityError = errors.some(e => e.includes('несовместим'));
    
    let errorMessage = '';
    if (errors.length === 0) {
      errorMessage = `**Нет API ключей**\n\nДля генерации приложений необходимо добавить API ключ.\n\n**Как добавить:**\n1. Перейдите в Настройки → API Ключи\n2. Добавьте ключ Google AI (для моделей Gemini)\n3. Или добавьте ключ OpenAI (для моделей GPT)\n\n**Получить ключ:**\n- Google AI: https://aistudio.google.com/app/apikey\n- OpenAI: https://platform.openai.com/api-keys`;
    } else if (isCompatibilityError) {
      errorMessage = `**Несовместимый API ключ**\n\nВыбранный ключ не подходит для модели ${model}.\n\n**Решение:**\n- Для моделей Gemini нужен ключ Google AI\n- Для моделей GPT нужен ключ OpenAI\n- Для моделей Claude нужен ключ Anthropic\n\n**Добавьте нужный ключ в Настройках.**`;
    } else if (isQuotaError) {
      errorMessage = `**Лимит API исчерпан**\n\nВсе ваши API ключи достигли лимита.\n\n**Возможные решения:**\n1. Подождите несколько минут и попробуйте снова\n2. Добавьте другой API ключ\n3. Проверьте баланс на сайте провайдера\n\n**Ошибки:**\n${errors.map(e => `• ${e}`).join('\n')}`;
    } else {
      errorMessage = `**Ошибка генерации**\n\nНе удалось сгенерировать приложение.\n\n**Детали:**\n${errors.map(e => `• ${e}`).join('\n')}\n\n**Что можно сделать:**\n1. Проверьте правильность API ключа\n2. Убедитесь, что ключ активен\n3. Попробуйте другой ключ`;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        errors,
        isQuotaError,
        noKeys: errors.length === 0,
      },
      { status: errors.length === 0 ? 400 : (isQuotaError ? 503 : 500) }
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
