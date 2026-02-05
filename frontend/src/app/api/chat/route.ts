import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Detect provider from API key format
function detectProviderFromKey(apiKey: string): 'google' | 'openai' | 'anthropic' {
  if (apiKey.startsWith('AIza')) return 'google';
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('sk-')) return 'openai';
  return 'google';
}

// System prompt for chat
const CHAT_SYSTEM_PROMPT = `Ты — CapyCode AI, интеллектуальный ассистент для разработки мобильных приложений React Native / Expo.

=== ТВОЯ РОЛЬ ===

Ты — Senior Fullstack Developer с опытом 15+ лет. Ты работаешь как диалоговый помощник в редакторе кода.

=== ПРАВИЛА ОБЩЕНИЯ ===

1. ОПРЕДЕЛИ ЯЗЫК ПОЛЬЗОВАТЕЛЯ:
   - Если пользователь пишет на русском → отвечай на русском
   - Если на английском → отвечай на английском

2. ОТВЕЧАЙ КАК ЧЕЛОВЕК:
   - Короткие, понятные ответы
   - Никаких формальных шаблонов
   - Будь дружелюбным и полезным

3. НА ПРИВЕТСТВИЯ:
   - "Привет!" → "Привет! Чем могу помочь?"
   - "Как дела?" → "Всё отлично, готов помочь с кодом!"
   - Если есть проект → кратко упомяни его

4. НА ВОПРОСЫ О ПРОЕКТЕ:
   - Анализируй контекст проекта
   - Давай конкретные советы
   - Предлагай улучшения

5. НА ЗАПРОСЫ ИЗМЕНЕНИЙ:
   - НЕ пиши код здесь
   - Скажи: "Сейчас сделаю!" или "Хорошо, изменяю..."
   - Код генерируется через другой API

=== КОНТЕКСТ ===

ACTIVE_PROJECT_PLACEHOLDER

=== ЗАПРЕЩЕНО ===

❌ Длинные формальные ответы
❌ Код в ответах (используй другой API)
❌ Игнорирование контекста проекта
❌ Демо-данные или примеры
❌ Объяснения вместо действий`;

// Chat with Google Gemini
async function chatWithGemini(
  message: string, 
  context: string, 
  apiKey: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const hasProject = context && context.includes('Current project:');
  
  // Build prompt with context
  let systemPrompt = CHAT_SYSTEM_PROMPT.replace(
    'ACTIVE_PROJECT_PLACEHOLDER',
    hasProject 
      ? `Текущий проект:\n${context}` 
      : 'Проект не открыт. Спроси пользователя, какое приложение он хочет создать.'
  );
  
  // Build conversation history
  let conversationContext = '';
  if (history.length > 0) {
    conversationContext = '\n\n=== ИСТОРИЯ ДИАЛОГА ===\n';
    history.slice(-6).forEach(msg => {
      conversationContext += `${msg.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${msg.content.slice(0, 200)}\n`;
    });
  }

  const result = await model.generateContent(`${systemPrompt}${conversationContext}\n\nПользователь: ${message}`);
  return result.response.text();
}

// Chat with OpenAI
async function chatWithOpenAI(
  message: string, 
  context: string, 
  apiKey: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
  const hasProject = context && context.includes('Current project:');
  
  // Build prompt with context
  let systemPrompt = CHAT_SYSTEM_PROMPT.replace(
    'ACTIVE_PROJECT_PLACEHOLDER',
    hasProject 
      ? `Текущий проект:\n${context}` 
      : 'Проект не открыт. Спроси пользователя, какое приложение он хочет создать.'
  );
  
  // Build messages array with history
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];
  
  // Add conversation history
  history.slice(-6).forEach(msg => {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content.slice(0, 500)
    });
  });
  
  // Add current message
  messages.push({ role: 'user', content: message });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response';
}

// Chat with Anthropic
async function chatWithAnthropic(
  message: string, 
  context: string, 
  apiKey: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
  const hasProject = context && context.includes('Current project:');
  
  // Build prompt with context
  let systemPrompt = CHAT_SYSTEM_PROMPT.replace(
    'ACTIVE_PROJECT_PLACEHOLDER',
    hasProject 
      ? `Текущий проект:\n${context}` 
      : 'Проект не открыт. Спроси пользователя, какое приложение он хочет создать.'
  );
  
  // Build messages array with history
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  
  // Add conversation history
  history.slice(-6).forEach(msg => {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content.slice(0, 500)
    });
  });
  
  // Add current message
  messages.push({ role: 'user', content: message });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API error');
  }

  const data = await response.json();
  return data.content[0]?.text || 'No response';
}

// Get user's API keys from database
async function getUserApiKeys(userId: string): Promise<{ key: string; provider: string; name: string }[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: keys } = await supabase
      .from('api_keys')
      .select('encrypted_key, provider, name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (!keys || keys.length === 0) return [];
    
    return keys.map(k => ({
      key: k.encrypted_key,
      provider: k.provider,
      name: k.name
    }));
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, apiKey, provider, userId, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let actualKey = apiKey;
    let actualProvider = provider;

    // If no key provided, try to get from user's saved keys
    if (!actualKey && userId) {
      const userKeys = await getUserApiKeys(userId);
      if (userKeys.length > 0) {
        actualKey = userKeys[0].key;
        actualProvider = userKeys[0].provider;
      }
    }

    // Fall back to server key
    if (!actualKey) {
      actualKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
      actualProvider = 'google';
    }

    if (!actualKey) {
      return NextResponse.json({ 
        error: 'No API key available. Please add your API key in settings.' 
      }, { status: 400 });
    }

    // Auto-detect provider if not specified
    if (!actualProvider) {
      actualProvider = detectProviderFromKey(actualKey);
    }

    let response: string;
    
    switch (actualProvider) {
      case 'openai':
        response = await chatWithOpenAI(message, context || '', actualKey, history);
        break;
      case 'anthropic':
        response = await chatWithAnthropic(message, context || '', actualKey, history);
        break;
      case 'google':
      default:
        response = await chatWithGemini(message, context || '', actualKey, history);
        break;
    }

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to get response' 
    }, { status: 500 });
  }
}
