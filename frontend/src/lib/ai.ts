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
const SYSTEM_PROMPT = `Ты — инженерный ИИ-ассистент для разработки нативных мобильных приложений на React Native (iOS / Android). Ты работаешь внутри профессионального веб-сервиса для создания и редактирования проектов. Ты не генератор примеров и не демо-ассистент. Ты работаешь ТОЛЬКО с реальными проектами, реальным кодом и реальной логикой.

=== ОСНОВНОЕ ПРАВИЛО ===

Ты никогда не должен угадывать намерение пользователя. Если намерение неочевидно — ты обязан задать уточняющий вопрос и НЕ выполнять никаких изменений.

=== 1. РЕЖИМЫ РАБОТЫ (ОБЯЗАТЕЛЬНО) ===

Ты всегда работаешь строго в одном режиме. Режим определяется по контексту:

- chat — объяснение, советы, архитектура, ответы на вопросы. Код писать запрещено.
- analyze — анализ кода или архитектуры без изменений. Код писать запрещено.
- edit — точечное редактирование существующего кода.
- refactor — улучшение структуры без изменения поведения.
- generate — создание нового файла или компонента с нуля.

Если режим противоречив — остановись и задай вопрос.

=== 2. ИСТОЧНИК ИСТИНЫ ===

Ты работаешь ТОЛЬКО с тем кодом, который тебе передали явно.

ЗАПРЕЩЕНО:
- додумывать файлы
- ссылаться на «проект в целом», если он не передан
- использовать шаблоны, демо-данные, мок-данные
- генерировать фейковые ответы

Если файла нет — ты НЕ имеешь права его менять.

=== 3. ПРАВИЛА РЕДАКТИРОВАНИЯ КОДА ===

При edit и refactor:

ЗАПРЕЩЕНО переписывать файл целиком, если не указано явно.

ЗАПРЕЩЕНО менять:
- API
- сигнатуры функций
- бизнес-логику
- авторизацию
- маршрутизацию

ЗАПРЕЩЕНО трогать другие файлы.

Ты должен:
- сохранять существующую структуру
- минимизировать изменения
- не ломать совместимость

=== 4. ЗАПРЕТ ДЕМО-ДАННЫХ ===

КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
- mock users
- demo projects
- seed data
- фейковые ответы ИИ
- статические JSON вместо реальных запросов

Если данных нет — ты обязан сказать: «Для выполнения требуется реальный backend / API / ключ».

=== 5. СОСТОЯНИЕ ПРОЕКТА ===

Ты обязан учитывать:
- текущего пользователя (userId)
- projectId
- ownership данных

Никогда не смешивай данные разных пользователей.
Любая логика обязана быть user-scoped.

=== 6. ЯЗЫКОВАЯ ЛОКАЛИЗАЦИЯ ===

КРИТИЧЕСКОЕ ПРАВИЛО: Определи язык пользователя и отвечай соответственно:

- Если пользователь пишет на русском (кириллица) → ВСЕ тексты приложения ДОЛЖНЫ быть на русском
- Если пользователь пишет на английском → Тексты на английском
- Кнопки на русском: "Добавить", "Удалить", "Сохранить", "Отмена", "Готово"
- Навигация на русском: "Главная", "Профиль", "Настройки", "Поиск"
- Сообщения: "Загрузка...", "Ошибка", "Успешно", "Нет данных"

=== 7. ГЕНЕРАЦИЯ НОВОГО ПРИЛОЖЕНИЯ ===

При generate:

1. СТРУКТУРА ФАЙЛОВ (создай ВСЕ необходимые):
\`\`\`
App.tsx                          # Главный файл с навигацией
src/
├── screens/                     # ВСЕ экраны (минимум 4-6)
├── components/                  # Переиспользуемые компоненты (минимум 8-15)
│   ├── common/                  # Кнопки, Инпуты, Карточки
│   └── layout/                  # Хедеры, Футеры
├── navigation/                  # Настройка навигации
├── hooks/                       # Кастомные хуки
├── services/                    # API, сервисы хранения
├── utils/                       # Вспомогательные функции
├── constants/                   # Цвета, типографика, отступы
└── types/                       # TypeScript интерфейсы
\`\`\`

2. КАЖДАЯ ФУНКЦИЯ ДОЛЖНА БЫТЬ РЕАЛИЗОВАНА:
   - НЕТ плейсхолдеров типа "Coming soon" или "TODO"
   - НЕТ пустых функций или компонентов
   - Рабочее управление состоянием (useState, useReducer, Context)
   - Реальный поток данных между компонентами
   - Правильная обработка ошибок
   - Состояния загрузки со спиннерами

3. ПРОФЕССИОНАЛЬНЫЙ UI/UX:
   Цвета:
   - Background: #0a0a0b (тёмный)
   - Surface: #1a1a1b (карточки)
   - Primary: #10b981 (изумрудный акцент)
   - Text: #ffffff / #a1a1aa
   - Error: #ef4444
   - Success: #22c55e

   Типографика:
   - Title: 32px, bold
   - Heading: 24px, semibold
   - Body: 16px, regular
   - Caption: 14px, regular

   Компоненты:
   - Border radius: 8-16px
   - Touch targets: минимум 44x44px
   - Иконки: Ionicons/MaterialIcons

=== 8. РЕЖИМ РЕДАКТИРОВАНИЯ ===

Когда присутствует "EXISTING PROJECT CONTEXT":

1. Прочитай ВСЕ переданные файлы полностью
2. Пойми существующую структуру кода
3. Найди ТОЧНО что нужно изменить
4. Сохрани ВСЕ что не просили менять

ПРАВИЛА СОХРАНЕНИЯ:
- Сохраняй ВСЕ имена файлов точно такими же
- Сохраняй ВСЕ имена компонентов
- Сохраняй ВСЕ логику что не просили менять
- Сохраняй ВСЕ стили что не просили менять
- Верни ВСЕ файлы из контекста

=== 9. ФОРМАТ ОТВЕТА ===

Отвечай ТОЛЬКО валидным JSON. Никакого markdown, никаких объяснений.

{
  "files": [
    { "path": "App.tsx", "content": "полный TypeScript код", "type": "typescript" },
    { "path": "src/screens/HomeScreen.tsx", "content": "...", "type": "typescript" }
  ],
  "dependencies": {
    "@react-navigation/native": "^6.1.9",
    "react-native-safe-area-context": "4.8.2"
  },
  "devDependencies": {},
  "expoConfig": { 
    "name": "Название Приложения",
    "slug": "app-slug",
    "version": "1.0.0"
  }
}

=== 10. ЗАПРЕЩЁННЫЕ ДЕЙСТВИЯ ===

НИКОГДА:
1. ❌ Создавать только App.tsx со всем в одном файле
2. ❌ Использовать плейсхолдеры "Lorem ipsum"
3. ❌ Оставлять пустые функции
4. ❌ Игнорировать требования пользователя
5. ❌ Генерировать английский UI когда пользователь пишет на русском
6. ❌ Создавать меньше файлов чем требует сложность
7. ❌ Ломать существующий функционал при редактировании
8. ❌ Использовать демо-данные или моки

ВСЕГДА:
1. ✅ Создавать полноценную структуру файлов
2. ✅ Соответствовать языку пользователя
3. ✅ Реализовывать каждую упомянутую функцию
4. ✅ Использовать правильные TypeScript типы
5. ✅ Делать UI красивым и профессиональным
6. ✅ Минимизировать изменения при редактировании
7. ✅ Сохранять всё что не просили менять

=== ТВОЯ ЦЕЛЬ ===

Ты не «помощник». Ты — инженерный инструмент, который:
- не ломает проекты
- не врёт
- не симулирует
- не подменяет реальность демо-данными`;

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
  
  const userPrompt = buildUserPrompt(prompt);
  
  // Detect if this is an element selection edit - use much lower temperature
  const isElementEdit = prompt.includes('[Выбранный элемент:') || prompt.includes('[Выбранные элементы:');
  const isEditMode = prompt.includes('EXISTING PROJECT CONTEXT') || prompt.includes('ELEMENT SELECTION MODE');
  
  // Lower temperature for edits (0.2) to be more precise, higher for new apps (0.5)
  const temperature = isElementEdit ? 0.1 : (isEditMode ? 0.2 : 0.5);
  
  console.log(`[Gemini] Starting generation, model: ${model}, temp: ${temperature}, isEdit: ${isEditMode}, isElementEdit: ${isElementEdit}`);
  
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
            { text: userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature,
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

// Helper to build user prompt based on request type
function buildUserPrompt(prompt: string): string {
  // Check if this is an edit request
  const isEditMode = prompt.includes('EXISTING PROJECT CONTEXT');
  
  // DETECT USER'S LANGUAGE
  const cyrillicPattern = /[\u0400-\u04FF]/; // Cyrillic characters
  const isRussian = cyrillicPattern.test(prompt);
  const userLanguage = isRussian ? 'Russian' : 'English';
  const languageInstruction = isRussian 
    ? `\n\n🌍 LANGUAGE: User writes in RUSSIAN. ALL app UI text (buttons, labels, messages, placeholders) MUST be in Russian!\nExamples: "Добавить", "Сохранить", "Главная", "Настройки", "Загрузка...", "Ошибка"`
    : '';
  
  if (isEditMode) {
    // Check if user selected specific elements
    const hasSelectedElement = prompt.includes('[Выбранный элемент:') || prompt.includes('[Выбранные элементы:');
    
    // SUPER STRICT mode for element selection
    if (hasSelectedElement) {
      return `${prompt}

=== 🎯 ELEMENT SELECTION MODE - ULTRA PRECISE ===
User selected a SPECIFIC ELEMENT in the preview!

⛔ CRITICAL: CHANGE ONLY THE SELECTED ELEMENT! ⛔

The text "[Выбранный элемент: ...]" tells you EXACTLY which component to modify.
Example: "[Выбранный элемент: Button 'Сохранить']" → Find the Save button, change ONLY it.

🔴 ABSOLUTE RESTRICTIONS:
1. Find the EXACT element/component mentioned
2. Apply ONLY the change user requested (color, size, text, position)
3. Touch NOTHING else in that file
4. Do NOT rewrite other files
5. Do NOT restructure anything
6. Do NOT "improve" other code
7. Copy ALL other files EXACTLY byte-for-byte

📝 EXAMPLE:
User: "[Выбранный элемент: Button 'Send'] Сделай красным"
CORRECT: Change backgroundColor of that one button to red
WRONG: Rewrite the whole screen, change app structure

Return ALL original files. Modified file has 1-3 lines changed, max.
If you change more than 5 lines total, you are doing it WRONG!`;
    }
    
    // Regular edit mode (no element selected)
    return `${prompt}

=== ⚠️ EDIT MODE - MINIMAL CHANGES ONLY ===
This is an EDIT request, NOT a new app creation.
${languageInstruction}

🔒 ABSOLUTE RULES FOR EDITING:

1. PRESERVE EVERYTHING:
   - Keep ALL file structure exactly the same
   - Keep ALL imports exactly as they were
   - Keep ALL component names unchanged
   - Keep ALL navigation unchanged
   - Keep ALL styling that wasn't asked to change
   - Keep ALL functionality that wasn't asked to change

2. CHANGE ONLY WHAT WAS REQUESTED:
   - "change color to blue" → Change ONLY the color value
   - "make button bigger" → Change ONLY button size
   - "translate to Russian" → Change ONLY text content
   - "move element down" → Change ONLY position/margin

3. RETURN ALL FILES:
   - Include EVERY file from the original context
   - Modified files have ONLY the requested changes
   - Unmodified files have EXACT original content (copy-paste)
   - Same file count in = same file count out

4. NEVER DO:
   ❌ Delete any files
   ❌ Rename any files
   ❌ Remove any imports
   ❌ Restructure code that wasn't asked to change
   ❌ Simplify or "improve" code that works
   ❌ Remove features to "fix" something
   ❌ Create App.tsx with all code in one file
   ❌ Output raw code without proper file structure

If the edit breaks the app, you made too many changes!`;
  }
  
  // Extract app complexity from prompt
  const promptLower = prompt.toLowerCase();
  const promptLength = prompt.length;
  
  // Count features mentioned to determine complexity
  const featureKeywords = [
    'экран', 'screen', 'страниц', 'page', 'кнопк', 'button', 
    'список', 'list', 'форм', 'form', 'input', 'ввод',
    'меню', 'menu', 'таб', 'tab', 'навигац', 'navigation',
    'график', 'chart', 'статистик', 'statistic', 'история', 'history',
    'профил', 'profile', 'настройк', 'setting', 'поиск', 'search',
    'фильтр', 'filter', 'категори', 'category', 'уведомлен', 'notification',
    'авториз', 'auth', 'login', 'регистр', 'signup', 'register'
  ];
  
  let featuresCount = 0;
  for (const keyword of featureKeywords) {
    if (promptLower.includes(keyword)) featuresCount++;
  }
  
  // Determine complexity
  let complexity = 'simple';
  let minFiles = 10;
  
  if (promptLength > 500 || featuresCount > 5) {
    complexity = 'complex';
    minFiles = 30;
  } else if (promptLength > 200 || featuresCount > 2) {
    complexity = 'medium';
    minFiles = 18;
  }
  
  // Extract app type with localized requirements
  // ORDER MATTERS! More specific patterns first
  let appType = 'mobile application';
  let specificRequirements = '';
  
  // NOTES APP - check first before chat (Notes contains 'note')
  if (promptLower.includes('notes') || promptLower.includes('note app') || promptLower.includes('заметки') || promptLower.includes('заметок') || promptLower.includes('записки') || promptLower.includes('записей') || promptLower.includes('notepad') || promptLower.includes('блокнот')) {
    appType = isRussian ? 'приложение для заметок (Notes)' : 'notes app';
    specificRequirements = `CRITICAL: This is a NOTES app, NOT a chat/messenger!
Notes app includes:
- Note list screen showing all notes with title preview
- Full-screen note editor for creating/editing text
- Create new note button
- Edit existing notes
- Delete notes with confirmation
- Local storage with AsyncStorage
- Search notes by title/content
- Sort by date created/modified
- Light and dark theme support
- iOS-style minimalist design
DO NOT create chat bubbles or message threads - this is for TEXT DOCUMENTS!`;
  } else if (promptLower.includes('calculator') || promptLower.includes('калькулятор')) {
    appType = isRussian ? 'приложение-калькулятор' : 'calculator app';
    specificRequirements = 'Include: number pad (0-9), operators (+, -, ×, ÷, =), clear button, display, calculation history, scientific mode option';
  } else if (promptLower.includes('fitness') || promptLower.includes('фитнес') || promptLower.includes('workout') || promptLower.includes('тренировк')) {
    appType = isRussian ? 'фитнес-приложение' : 'fitness/workout tracking app';
    specificRequirements = 'Include: workout list, exercise details with sets/reps, rest timer, workout history, progress charts, muscle groups, calendar view';
  } else if (promptLower.includes('social') || promptLower.includes('соц') || promptLower.includes('лента') || promptLower.includes('feed')) {
    appType = isRussian ? 'социальная сеть' : 'social media app';
    specificRequirements = 'Include: feed with posts, like/comment buttons, user profiles, follow system, post creation, image support, notifications';
  } else if (promptLower.includes('chat') || promptLower.includes('messenger') || promptLower.includes('чат') || promptLower.includes('сообщен') || promptLower.includes('мессенджер')) {
    appType = isRussian ? 'мессенджер/чат' : 'chat/messaging app';
    specificRequirements = 'Include: conversation list, message thread, send/receive UI, typing indicator, read receipts, user avatars, search. This is for MESSAGING between users!';
  } else if (promptLower.includes('todo') || promptLower.includes('task') || promptLower.includes('задач')) {
    appType = isRussian ? 'список задач' : 'task/todo list app';
    specificRequirements = 'Include: task list, add/edit/delete, categories, due dates, priority levels, completion status, filters, search';
  } else if (promptLower.includes('weather') || promptLower.includes('погод')) {
    appType = isRussian ? 'приложение погоды' : 'weather app';
    specificRequirements = 'Include: current conditions, hourly forecast, weekly forecast, location selector, weather icons, temperature units toggle';
  } else if (promptLower.includes('music') || promptLower.includes('audio') || promptLower.includes('музык') || promptLower.includes('плеер')) {
    appType = isRussian ? 'музыкальный плеер' : 'music player app';
    specificRequirements = 'Include: now playing screen, playlist management, album art, play/pause/skip controls, progress bar, shuffle/repeat, library';
  } else if (promptLower.includes('shop') || promptLower.includes('store') || promptLower.includes('ecommerce') || promptLower.includes('магазин') || promptLower.includes('товар')) {
    appType = isRussian ? 'интернет-магазин' : 'e-commerce/shopping app';
    specificRequirements = 'Include: product catalog, product details, cart, wishlist, checkout flow, order history, categories, search, filters';
  } else if (promptLower.includes('finance') || promptLower.includes('money') || promptLower.includes('расход') || promptLower.includes('бюджет') || promptLower.includes('финанс') || promptLower.includes('доход')) {
    appType = isRussian ? 'финансовый трекер' : 'finance/expense tracking app';
    specificRequirements = 'Include: transaction list, add income/expense, categories, pie/bar charts, budgets, monthly summary, reports';
  } else if (promptLower.includes('health') || promptLower.includes('здоров') || promptLower.includes('трекер')) {
    appType = isRussian ? 'трекер здоровья' : 'health tracking app';
    specificRequirements = 'Include: daily tracking dashboard, history charts, reminders, goals, statistics, calendar view';
  }
  
  return `=== APP GENERATION REQUEST ===

APP TYPE: ${appType}
COMPLEXITY: ${complexity.toUpperCase()} (generate at least ${minFiles} files)
USER LANGUAGE: ${userLanguage}
${languageInstruction}

USER'S FULL REQUIREMENTS:
${prompt}

${specificRequirements ? `MUST-HAVE FEATURES FOR THIS APP TYPE:\n${specificRequirements}\n` : ''}
CRITICAL INSTRUCTIONS:
1. Read the user's requirements COMPLETELY before generating
2. Implement EVERY feature and screen they mentioned
3. Generate at least ${minFiles} files for a ${complexity} app
4. Create proper folder structure (src/screens, src/components, etc.)
5. Make the UI professional and polished
6. App name in expoConfig must match what user is building
7. DO NOT create a minimal template - create a COMPLETE app
${isRussian ? '8. ALL UI TEXT MUST BE IN RUSSIAN (buttons, labels, placeholders, messages)' : ''}

This user is trusting you to build their dream app. Make it amazing!`;
}

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
  
  const userPrompt = buildUserPrompt(prompt);
  
  // Detect if this is an element selection edit - use much lower temperature
  const isElementEdit = prompt.includes('[Выбранный элемент:') || prompt.includes('[Выбранные элементы:');
  const isEditMode = prompt.includes('EXISTING PROJECT CONTEXT') || prompt.includes('ELEMENT SELECTION MODE');
  
  // Lower temperature for edits (0.2) to be more precise, higher for new apps (0.5)
  const temperature = isElementEdit ? 0.1 : (isEditMode ? 0.2 : 0.5);
  
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
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 16384,
      temperature: temperature,
    }),
  });
  
  console.log(`[OpenAI] Response received in ${Date.now() - startTime}ms, status: ${response.status}, temp: ${temperature}`);
  
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
  
  const userPrompt = buildUserPrompt(prompt);
  
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
        { role: 'user', content: userPrompt }
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
