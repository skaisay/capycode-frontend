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

// Chat with Google Gemini
async function chatWithGemini(
  message: string, 
  context: string, 
  apiKey: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const systemPrompt = `You are a helpful AI assistant for a mobile app development platform called CapyCode.
You help users with their React Native / Expo projects.

${context ? `CURRENT PROJECT CONTEXT:\n${context}\n\n` : ''}

IMPORTANT RULES:
- Be concise and helpful
- If the user asks a question, answer it directly
- If the user wants to modify the app, explain what needs to be changed
- Don't generate full code unless explicitly asked
- Use markdown for formatting
- Keep responses under 500 words unless necessary`;

  const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`);
  return result.response.text();
}

// Chat with OpenAI
async function chatWithOpenAI(
  message: string, 
  context: string, 
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant for CapyCode, a mobile app development platform.
Help users with their React Native / Expo projects. Be concise and helpful.
${context ? `\nCurrent project context:\n${context}` : ''}`
        },
        { role: 'user', content: message }
      ],
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
  apiKey: string
): Promise<string> {
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
      system: `You are a helpful AI assistant for CapyCode, a mobile app development platform.
Help users with their React Native / Expo projects. Be concise.
${context ? `\nCurrent project context:\n${context}` : ''}`,
      messages: [{ role: 'user', content: message }],
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
    const { message, context, apiKey, provider, userId } = body;

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
        response = await chatWithOpenAI(message, context || '', actualKey);
        break;
      case 'anthropic':
        response = await chatWithAnthropic(message, context || '', actualKey);
        break;
      case 'google':
      default:
        response = await chatWithGemini(message, context || '', actualKey);
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
