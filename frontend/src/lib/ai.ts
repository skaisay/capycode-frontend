// AI Service - Google Gemini and other models
export type AIModel = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-2.0-flash';

export interface AIConfig {
  model: AIModel;
  apiKey?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: string;
}

export interface GenerationResult {
  files: GeneratedFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  expoConfig: {
    name: string;
    slug: string;
    [key: string]: unknown;
  };
}

// System prompt for React Native app generation
const SYSTEM_PROMPT = `You are an expert React Native and Expo developer. Generate complete, production-ready mobile app code based on user requirements.

RULES:
1. Always use TypeScript with strict mode
2. Use functional components with hooks
3. Use React Navigation for navigation
4. Use modern React Native patterns (SafeAreaView, etc.)
5. Use Expo SDK 52+ features
6. Create clean, well-organized file structure
7. Include proper styling with StyleSheet
8. Use @expo/vector-icons for icons
9. Make the UI look modern, clean, and professional with dark theme (background #0a0a0b)
10. Use emerald/teal (#10b981) as primary accent color
11. Generate proper app.json with bundleIdentifier and package name
12. Generate eas.json for EAS Build configuration
13. Include metro.config.js for development server

RESPONSE FORMAT:
You MUST respond with valid JSON only. No markdown, no explanations.
{
  "files": [
    { "path": "App.tsx", "content": "...", "type": "typescript" },
    { "path": "screens/HomeScreen.tsx", "content": "...", "type": "typescript" }
  ],
  "dependencies": { "package": "version" },
  "devDependencies": { "package": "version" },
  "expoConfig": { 
    "name": "AppName", 
    "slug": "appname",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "appname",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0a0a0b"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.appname"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0a0a0b"
      },
      "package": "com.yourcompany.appname"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}

Required files:
- App.tsx - Main entry point with navigation setup
- At least 2 screens in screens/ folder
- At least 1 reusable component in components/ folder  
- package.json with all dependencies including expo-dev-client
- app.json with full Expo configuration (iOS bundleIdentifier, Android package)
- eas.json with development, preview, production profiles
- tsconfig.json
- metro.config.js for bundler configuration
- babel.config.js for Babel configuration
- assets/icon.png placeholder reference
- assets/splash.png placeholder reference`;

// Escape special characters in string values for JSON
function escapeJsonString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Attempt to fix common JSON errors
function attemptJsonFix(jsonStr: string): string {
  let fixed = jsonStr;
  
  // Fix unescaped newlines in string values
  // This is a common issue when AI returns code with newlines
  fixed = fixed.replace(/"content"\s*:\s*"([^"]*)"/g, (match, content) => {
    // Escape any unescaped newlines
    const escapedContent = content
      .replace(/(?<!\\)\n/g, '\\n')
      .replace(/(?<!\\)\r/g, '\\r')
      .replace(/(?<!\\)\t/g, '\\t');
    return `"content": "${escapedContent}"`;
  });
  
  // Fix trailing commas before closing brackets
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix missing commas between properties (common AI error)
  fixed = fixed.replace(/}(\s*){/g, '}, {');
  fixed = fixed.replace(/"(\s*)"(\w+)":/g, '", "$2":');
  
  return fixed;
}

// Extract balanced JSON object from text
function extractBalancedJson(text: string): string | null {
  const startIdx = text.indexOf('{');
  if (startIdx === -1) return null;
  
  let depth = 0;
  let inString = false;
  let escape = false;
  let endIdx = -1;
  
  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === '\\') {
      escape = true;
      continue;
    }
    
    if (char === '"' && !escape) {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }
  
  if (endIdx === -1) {
    // Try to fix incomplete JSON by finding where it likely should end
    // Look for the last complete file entry and close the structure
    const lastFileEndMatch = text.lastIndexOf('"type"');
    if (lastFileEndMatch !== -1) {
      // Find the end of this entry and close the structure
      let closePoint = text.indexOf('}', lastFileEndMatch);
      if (closePoint !== -1) {
        // Close the files array and main object
        return text.substring(startIdx, closePoint + 1) + ']}';
      }
    }
    return null;
  }
  
  return text.substring(startIdx, endIdx + 1);
}

// Parse AI response to extract JSON
function parseAIResponse(text: string): GenerationResult {
  console.log('[parseAIResponse] Input length:', text.length);
  console.log('[parseAIResponse] First 500 chars:', text.substring(0, 500));
  
  // Try to find JSON in the response
  let jsonStr = text;
  
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
    console.log('[parseAIResponse] Extracted from code block, length:', jsonStr.length);
  }
  
  // Try to extract balanced JSON object
  const extracted = extractBalancedJson(jsonStr);
  if (extracted) {
    jsonStr = extracted;
    console.log('[parseAIResponse] Extracted balanced JSON, length:', jsonStr.length);
  } else {
    // Fallback to regex
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
      console.log('[parseAIResponse] Found JSON via regex, length:', jsonStr.length);
    } else {
      console.log('[parseAIResponse] No JSON object found in response');
    }
  }
  
  // Try parsing, with multiple attempts
  const attempts = [
    () => JSON.parse(jsonStr),
    () => JSON.parse(attemptJsonFix(jsonStr)),
    () => {
      // Last resort: try to extract just the files array
      console.log('[parseAIResponse] Attempting partial recovery...');
      const filesMatch = jsonStr.match(/"files"\s*:\s*\[([\s\S]*?)\]/);
      if (filesMatch) {
        // Try to parse each file object individually
        const filesStr = filesMatch[1];
        const files: any[] = [];
        const fileMatches = filesStr.match(/\{[^{}]*"path"[^{}]*"content"[^{}]*"type"[^{}]*\}/g);
        if (fileMatches) {
          for (const fileStr of fileMatches) {
            try {
              files.push(JSON.parse(attemptJsonFix(fileStr)));
            } catch {
              // Skip malformed files
            }
          }
        }
        if (files.length > 0) {
          return { files, dependencies: {}, devDependencies: {}, expoConfig: { name: 'MyApp', slug: 'myapp' } };
        }
      }
      throw new Error('Could not recover files from response');
    }
  ];
  
  let parsed: any = null;
  let lastError: any = null;
  
  for (let i = 0; i < attempts.length; i++) {
    try {
      parsed = attempts[i]();
      console.log(`[parseAIResponse] Parse attempt ${i + 1} succeeded`);
      break;
    } catch (e) {
      lastError = e;
      console.log(`[parseAIResponse] Parse attempt ${i + 1} failed:`, (e as Error).message);
    }
  }
  
  if (!parsed) {
    console.error('[parseAIResponse] All parse attempts failed');
    console.error('[parseAIResponse] Last 500 chars:', jsonStr.substring(jsonStr.length - 500));
    throw new Error(`Failed to parse AI response: ${lastError?.message}. The AI returned malformed JSON. Please try again.`);
  }
  
  // Validate structure
  if (!parsed.files || !Array.isArray(parsed.files)) {
    throw new Error('Invalid response: missing files array');
  }
  
  if (parsed.files.length === 0) {
    throw new Error('Invalid response: no files generated');
  }
  
  const files = parsed.files;
  const expoConfig = parsed.expoConfig || { name: 'MyApp', slug: 'myapp' };
  
  // Ensure required EAS files exist
  const hasEasJson = files.some((f: any) => f.path === 'eas.json');
  if (!hasEasJson) {
    files.push({
      path: 'eas.json',
      content: JSON.stringify({
        cli: { version: '>= 7.0.0' },
        build: {
          development: {
            developmentClient: true,
            distribution: 'internal',
            ios: { simulator: true }
          },
          preview: {
            distribution: 'internal',
            ios: { simulator: false }
          },
          production: {}
        },
        submit: {
          production: {}
        }
      }, null, 2),
      type: 'json'
    });
  }
  
  // Ensure metro.config.js exists
  const hasMetroConfig = files.some((f: any) => f.path === 'metro.config.js');
  if (!hasMetroConfig) {
    files.push({
      path: 'metro.config.js',
      content: `const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
`,
      type: 'javascript'
    });
  }
  
  // Ensure babel.config.js exists
  const hasBabelConfig = files.some((f: any) => f.path === 'babel.config.js');
  if (!hasBabelConfig) {
    files.push({
      path: 'babel.config.js',
      content: `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
`,
      type: 'javascript'
    });
  }
  
  console.log(`[parseAIResponse] Success! Files: ${files.length}, ExpoConfig: ${expoConfig.name}`);
  
  return {
    files,
    dependencies: parsed.dependencies || {},
    devDependencies: parsed.devDependencies || {},
    expoConfig,
  };
}

// Generate with Google Gemini API
// SECURITY: This function should only be called from server-side API routes
export async function generateWithGemini(
  prompt: string,
  model: AIModel = 'gemini-2.5-flash',
  apiKey: string
): Promise<GenerationResult> {
  if (!apiKey) {
    throw new Error('API key is required');
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `Create a React Native Expo app: ${prompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Gemini API error:', error);
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('No response from Gemini API');
  }
  
  const responseText = data.candidates[0].content.parts[0].text;
  return parseAIResponse(responseText);
}

// Available models with descriptions
export const AI_MODELS: { id: AIModel; name: string; description: string }[] = [
  { 
    id: 'gemini-2.5-flash', 
    name: 'Gemini 2.5 Flash', 
    description: 'Best price-performance, fast' 
  },
  { 
    id: 'gemini-2.5-pro', 
    name: 'Gemini 2.5 Pro', 
    description: 'Advanced thinking, complex apps' 
  },
  { 
    id: 'gemini-2.0-flash', 
    name: 'Gemini 2.0 Flash', 
    description: 'Fast generation' 
  },
];

// Get default model
export function getDefaultModel(): AIModel {
  return 'gemini-2.5-flash';
}

// Generate with OpenAI API
export async function generateWithOpenAI(
  prompt: string,
  apiKey: string
): Promise<GenerationResult> {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  console.log('[OpenAI] Starting generation...');
  const startTime = Date.now();
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Create a React Native Expo app: ${prompt}` }
      ],
      max_tokens: 16384,
      temperature: 0.7,
    }),
  });
  
  console.log(`[OpenAI] Response received in ${Date.now() - startTime}ms, status: ${response.status}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('[OpenAI] API error:', error);
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('No response from OpenAI API');
  }
  
  const content = data.choices[0].message.content;
  console.log(`[OpenAI] Content length: ${content.length}, finish_reason: ${data.choices[0].finish_reason}`);
  
  return parseAIResponse(content);
}

// Generate with Anthropic Claude API
export async function generateWithAnthropic(
  prompt: string,
  apiKey: string
): Promise<GenerationResult> {
  if (!apiKey) {
    throw new Error('Anthropic API key is required');
  }
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Create a React Native Expo app: ${prompt}` }
      ],
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Anthropic API error:', error);
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.content?.[0]?.text) {
    throw new Error('No response from Anthropic API');
  }
  
  return parseAIResponse(data.content[0].text);
}
