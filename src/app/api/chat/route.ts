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
  
  const hasProject = context && context.includes('Current project:');
  
  const systemPrompt = `You are CapyCode AI - an intelligent assistant that helps build React Native / Expo mobile apps.

${hasProject ? `ACTIVE PROJECT:\n${context}\n\nYou are currently working on this project. The user can ask you to modify, edit, or add features to it.` : 'No project is currently open.'}

YOUR CAPABILITIES:
- Create complete React Native mobile apps from scratch
- Edit existing files and add new features
- Understand project context and continue where you left off
- Run terminal commands (npm install, expo start, etc.)
- Check console for errors and auto-fix them

RESPONSE RULES:
${hasProject ? `
- You KNOW this project. Greet the user and offer to help with the current app.
- If user says "hi/привет", briefly describe what the project does and ask how to help.
- When user asks to modify something, DO IT - don't just explain how.
- Be proactive - suggest improvements based on the current code.
` : `
- No project is open. Ask user what app they want to create.
- Be ready to generate a complete app structure.
`}
- Use markdown for code snippets
- Be concise but helpful
- NEVER just explain how to do something - ACTUALLY DO IT by generating code`;

  const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`);
  return result.response.text();
}

// Chat with OpenAI
async function chatWithOpenAI(
  message: string, 
  context: string, 
  apiKey: string
): Promise<string> {
  const hasProject = context && context.includes('Current project:');
  
  const systemPrompt = `You are CapyCode AI - an intelligent assistant that builds React Native / Expo mobile apps.

${hasProject ? `ACTIVE PROJECT:\n${context}\n\nYou are working on this project. Help the user modify, edit, or add features.` : 'No project is currently open.'}

RULES:
${hasProject ? `
- You KNOW this project. Greet and offer to help with the current app.
- When user says "hi", briefly describe what the project does.
- When asked to modify something, DO IT - generate the code.
` : `- No project open. Ask what app to create.`}
- Use markdown for code
- NEVER just explain - ACTUALLY generate code when asked`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1500,
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
  const hasProject = context && context.includes('Current project:');
  
  const systemPrompt = `You are CapyCode AI - an intelligent assistant that builds React Native / Expo mobile apps.

${hasProject ? `ACTIVE PROJECT:\n${context}\n\nYou are working on this project.` : 'No project is currently open.'}

RULES:
${hasProject ? `- You KNOW this project. When user says hi, describe the app and offer to help.` : `- Ask what app to create.`}
- Use markdown for code. NEVER just explain - generate code when asked.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      system: systemPrompt,
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
