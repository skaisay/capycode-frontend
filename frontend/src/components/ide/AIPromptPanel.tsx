'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Loader2,
  Wand2,
  FileCode,
  Layers,
  Lightbulb,
  ChevronDown,
  Cpu,
  Plus,
  Trash2,
  AlertTriangle,
  Check,
  FileEdit,
  Search,
  Eye,
  Pencil,
  FolderPlus,
  Code2,
  Sparkles,
  Key,
  ExternalLink,
  Terminal,
  Bug,
  Square,
  Undo2,
  History,
  X
} from 'lucide-react';
import { useGenerateProject } from '@/hooks/useGenerateProject';
import { useProjectStore } from '@/stores/projectStore';
import { UserApiKey, PROVIDER_INFO, getStatusColor, getStatusLabel, getCachedKeyStatuses, setCachedKeyStatus } from '@/lib/userApiKeys';
import { getApiKeys, DBApiKey } from '@/lib/database';
import { useAuth } from '@/hooks/useAuth';
import { AI_MODELS, AIModel, getDefaultModel } from '@/lib/ai';
import { motion, AnimatePresence } from 'framer-motion';
import TerminalComponent from '@/components/ide/Terminal';

interface AIPromptPanelProps {
  isGenerating: boolean;
  progress: {
    stage: string;
    message?: string;
    progress: number;
    currentFile?: string;
  };
  initialPrompt?: string; // Prompt from dashboard
  onStopGeneration?: () => void; // Stop generation callback
  elementSelectionText?: string; // Text describing selected elements from Preview
  onClearElementSelection?: () => void; // Clear selected elements
  onFileClick?: (filePath: string) => void; // Navigate to file in editor
  onOpenDiff?: (filePath: string, original: string, modified: string) => void; // Open diff view
}

interface AIStatus {
  connected: boolean;
  model: string | null;
  provider?: string;
  error?: string;
  isQuotaError?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  files?: string[];
  status?: 'thinking' | 'editing' | 'searching' | 'terminal' | 'checking' | 'complete' | 'error';
  terminalCommand?: string;
  currentFile?: string;
  processedFiles?: string[];
  action?: 'generating' | 'editing' | 'restoring' | 'terminal';
}

const SUGGESTIONS = [
  {
    icon: <Layers className="w-4 h-4" />,
    title: 'E-commerce App',
    prompt: 'Create an e-commerce app with product listing, shopping cart, checkout, and user authentication',
  },
  {
    icon: <FileCode className="w-4 h-4" />,
    title: 'Task Manager',
    prompt: 'Build a task management app with categories, due dates, reminders, and offline support',
  },
  {
    icon: <Wand2 className="w-4 h-4" />,
    title: 'Social Feed',
    prompt: 'Design a social media app with posts, likes, comments, user profiles, and real-time updates',
  },
  {
    icon: <Lightbulb className="w-4 h-4" />,
    title: 'Fitness Tracker',
    prompt: 'Create a fitness app with workout logging, progress charts, goals, and daily reminders',
  },
];

// Get current user ID for data isolation
const getCurrentUserId = (): string => {
  if (typeof window === 'undefined') return 'anonymous';
  try {
    const supabaseAuth = localStorage.getItem('sb-ollckpiykoiizdwtfnle-auth-token');
    if (supabaseAuth) {
      const parsed = JSON.parse(supabaseAuth);
      if (parsed?.user?.id) return parsed.user.id;
    }
  } catch (e) {}
  return 'anonymous';
};

// Get current project ID from URL
const getCurrentProjectId = (): string => {
  if (typeof window === 'undefined') return 'new';
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    if (projectId) return projectId;
  } catch (e) {}
  return 'new'; // New project (no ID yet)
};

const getStorageKey = (key: string): string => `capycode_${getCurrentUserId()}_${key}`;

// Chat history is per-project to avoid mixing histories
const getChatStorageKey = () => `capycode_${getCurrentUserId()}_${getCurrentProjectId()}_chat_history`;
const getSelectedKeyStorage = () => getStorageKey('selected_api_key');

// Get saved selected key from localStorage (user-isolated)
function getSavedSelectedKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(getSelectedKeyStorage());
}

// Save selected key to localStorage (user-isolated)
function saveSelectedKey(keyId: string | null) {
  if (typeof window === 'undefined') return;
  if (keyId) {
    localStorage.setItem(getSelectedKeyStorage(), keyId);
  } else {
    localStorage.removeItem(getSelectedKeyStorage());
  }
}

export function AIPromptPanel({ isGenerating, progress, initialPrompt, onStopGeneration, elementSelectionText, onClearElementSelection, onFileClick, onOpenDiff }: AIPromptPanelProps) {
  // Model and API key are now stored in localStorage (set by dashboard/IDELayout)
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>(getDefaultModel());
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>({ connected: false, model: null });
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'idle' | 'thinking' | 'editing' | 'searching'>('idle');
  const [userApiKeys, setUserApiKeys] = useState<UserApiKey[]>([]);
  const [selectedUserKey, setSelectedUserKey] = useState<string | null>(getSavedSelectedKey());
  const [hasProcessedInitialPrompt, setHasProcessedInitialPrompt] = useState(false);
  const [showBackupsDropdown, setShowBackupsDropdown] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [showElementSelection, setShowElementSelection] = useState(false);
  const [showKeyChecker, setShowKeyChecker] = useState(false);
  const [keyCheckResults, setKeyCheckResults] = useState<Map<string, { status: 'checking' | 'valid' | 'error' | 'quota'; models: string[]; error?: string }>>(new Map());
  const [isCheckingKeys, setIsCheckingKeys] = useState(false);
  const [failedPrompt, setFailedPrompt] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const backupsDropdownRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { project, getBackups, undoLastChange } = useProjectStore();

  const { generateProject } = useGenerateProject();
  
  // Show element selection badge when elements are selected
  useEffect(() => {
    if (elementSelectionText) {
      setShowElementSelection(true);
    }
  }, [elementSelectionText]);
  
  // Check if undo is available
  useEffect(() => {
    const backups = getBackups();
    setCanUndo(backups.length > 0);
  }, [project, getBackups]);

  // Load user API keys
  useEffect(() => {
    if (user) {
      loadUserApiKeys();
    }
  }, [user]);
  
  // Save selected key to localStorage when it changes
  useEffect(() => {
    saveSelectedKey(selectedUserKey);
  }, [selectedUserKey]);

  const loadUserApiKeys = async () => {
    try {
      const keys = await getApiKeys();
      console.log('[AIPromptPanel] Loaded keys from DB:', keys);
      const cachedStatuses = getCachedKeyStatuses();
      
      const mappedKeys: UserApiKey[] = keys.map(key => ({
        id: key.id,
        name: key.name,
        provider: key.provider,
        keyPreview: key.key_preview,
        encryptedKey: key.encrypted_key,
        status: cachedStatuses[key.id]?.status || 'unknown',
        lastChecked: cachedStatuses[key.id]?.lastChecked,
        errorMessage: cachedStatuses[key.id]?.errorMessage
      }));
      
      console.log('[AIPromptPanel] Mapped keys:', mappedKeys.map(k => ({ id: k.id, name: k.name, hasEncrypted: !!k.encryptedKey })));
      setUserApiKeys(mappedKeys);
      
      // Validate keys that haven't been checked recently (within 5 minutes)
      const now = Date.now();
      for (const key of mappedKeys) {
        if (!key.lastChecked || (now - key.lastChecked) > 300000) {
          validateUserApiKey(key);
        }
      }
    } catch (error) {
      console.error('Failed to load user API keys:', error);
    }
  };

  // Validate a single API key
  const validateUserApiKey = async (key: UserApiKey) => {
    try {
      const response = await fetch('/api/ai/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: key.encryptedKey, // In production, decrypt this first
          provider: key.provider,
        }),
      });
      
      const result = await response.json();
      
      const newStatus: UserApiKey['status'] = result.valid 
        ? 'active' 
        : result.isQuota 
          ? 'quota_exceeded' 
          : 'error';
      
      // Update cached status
      setCachedKeyStatus(key.id, newStatus, result.error);
      
      // Update local state
      setUserApiKeys(prev => prev.map(k => 
        k.id === key.id 
          ? { ...k, status: newStatus, lastChecked: Date.now(), errorMessage: result.error }
          : k
      ));
    } catch (error) {
      console.error('Failed to validate key:', key.name, error);
    }
  };

  // Check all API keys and their available models (for error recovery)
  const checkAllApiKeys = async () => {
    if (userApiKeys.length === 0) {
      await loadUserApiKeys();
    }
    
    setIsCheckingKeys(true);
    setShowKeyChecker(true);
    const results = new Map<string, { status: 'checking' | 'valid' | 'error' | 'quota'; models: string[]; error?: string }>();
    
    // Set all to checking
    for (const key of userApiKeys) {
      results.set(key.id, { status: 'checking', models: [] });
    }
    setKeyCheckResults(new Map(results));
    
    // Check all keys in parallel with timeout
    const checkPromises = userApiKeys.map(async (key) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const response = await fetch('/api/keys/check-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyId: key.id,
            encryptedKey: key.encryptedKey,
            provider: key.provider,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const result = await response.json();
        
        if (result.valid) {
          results.set(key.id, { 
            status: 'valid', 
            models: result.availableModels || [] 
          });
        } else if (result.isQuota) {
          results.set(key.id, { 
            status: 'quota', 
            models: [],
            error: 'Лимит исчерпан'
          });
        } else {
          results.set(key.id, { 
            status: 'error', 
            models: [],
            error: result.error || 'Ключ недействителен'
          });
        }
      } catch (error: any) {
        results.set(key.id, { 
          status: 'error', 
          models: [],
          error: error.name === 'AbortError' ? 'Таймаут' : 'Ошибка проверки'
        });
      }
      
      setKeyCheckResults(new Map(results));
    });
    
    await Promise.all(checkPromises);
    setIsCheckingKeys(false);
  };

  // Apply selected key and retry failed prompt
  const applyKeyAndRetry = async (keyId: string, model?: string) => {
    const key = userApiKeys.find(k => k.id === keyId);
    if (!key) return;
    
    // Save selected key and model
    setSelectedUserKey(keyId);
    if (model) {
      setSelectedModel(model as AIModel);
      localStorage.setItem('selected_model', model);
    }
    localStorage.setItem('selected_user_key', keyId);
    
    // Close key checker
    setShowKeyChecker(false);
    
    // Retry the failed prompt
    if (failedPrompt) {
      const promptToRetry = failedPrompt;
      setFailedPrompt(null);
      
      // Set prompt and trigger submit via useEffect or direct call
      setPrompt(promptToRetry);
      // Small delay to let state update, then submit
      setTimeout(() => {
        const submitBtn = document.querySelector('[data-testid="submit-btn"]') as HTMLButtonElement;
        if (submitBtn) submitBtn.click();
      }, 100);
    }
  };

  // Close backups dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (backupsDropdownRef.current && !backupsDropdownRef.current.contains(event.target as Node)) {
        setShowBackupsDropdown(false);
      }
    };
    
    if (showBackupsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBackupsDropdown]);

  // Load chat history from localStorage (per-project)
  // When project changes, load appropriate history
  useEffect(() => {
    const projectId = getCurrentProjectId();
    const chatKey = getChatStorageKey();
    
    // If this is a NEW project (no ID), start with empty history
    if (projectId === 'new') {
      setChatHistory([]);
      return;
    }
    
    // Load saved history for this specific project
    const saved = localStorage.getItem(chatKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChatHistory(parsed);
      } catch {
        setChatHistory([]);
      }
    } else {
      // No history for this project - start fresh
      setChatHistory([]);
    }
    
    checkAIStatus();
  }, []); // eslint-disable-line - run once on mount

  // Handle initial prompt from dashboard - auto-submit
  useEffect(() => {
    if (initialPrompt && !hasProcessedInitialPrompt && !isGenerating) {
      console.log('[AIPromptPanel] Processing initial prompt from dashboard:', initialPrompt.substring(0, 50) + '...');
      setHasProcessedInitialPrompt(true);
      
      // Get auto-select settings from localStorage
      const autoSelectKey = localStorage.getItem('auto_select_key') === 'true';
      const pendingUserId = localStorage.getItem('pending_user_id');
      
      // Clear these settings
      localStorage.removeItem('auto_select_key');
      localStorage.removeItem('pending_user_id');
      
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: initialPrompt,
        timestamp: Date.now(),
      };
      setChatHistory(prev => [...prev, userMessage]);
      
      // Add thinking message
      const thinkingMessageId = (Date.now() + 0.5).toString();
      const thinkingMessage: ChatMessage = {
        id: thinkingMessageId,
        role: 'assistant',
        content: 'Analyzing your request...',
        timestamp: Date.now(),
        status: 'thinking',
      };
      setChatHistory(prev => [...prev, thinkingMessage]);
      setCurrentStatus('thinking');
      
      // Start generation
      const doGenerate = async () => {
        try {
          const result = await generateProject({
            prompt: initialPrompt,
            model: selectedModel,
            autoSelectKey: autoSelectKey,
            userId: pendingUserId || user?.id,
          });
          
          // Update chat with success message
          const appName = result?.expoConfig?.name || 'App';
          const filesCount = result?.files?.length || 0;
          const usedKeyInfo = (result as any)?.usedKey;
          let keyUsedInfo = '';
          if (usedKeyInfo?.name) {
            keyUsedInfo = `Used **${usedKeyInfo.provider?.toUpperCase() || 'API'}** key (${usedKeyInfo.name})`;
          } else {
            keyUsedInfo = `Used **${selectedModel}** (auto-selected)`;
          }
          
          const filesList = result?.files?.slice(0, 5).map((f: any) => f.path).join(', ') || '';
          const moreFiles = (result?.files?.length || 0) > 5 ? ` and ${(result?.files?.length || 0) - 5} more...` : '';
          
          const successMessage: ChatMessage = {
            id: thinkingMessageId,
            role: 'assistant',
            content: `**${appName}** generated successfully!\n\n${keyUsedInfo}\n\nCreated **${filesCount} files**: ${filesList}${moreFiles}\n\nCheck the file explorer on the left and preview on the right.`,
            timestamp: Date.now(),
            status: 'complete',
            files: result?.files?.map((f: any) => f.path) || [],
          };
          setChatHistory(prev => prev.map(msg => msg.id === thinkingMessageId ? successMessage : msg));
        } catch (err: any) {
          // Save failed prompt for retry
          setFailedPrompt(initialPrompt);
          
          const errorMessage: ChatMessage = {
            id: thinkingMessageId,
            role: 'assistant',
            content: `**Ошибка генерации**\n\n${err.message || 'Неизвестная ошибка'}\n\nНажмите "Проверить ключи" ниже, чтобы найти рабочий ключ и повторить попытку.`,
            timestamp: Date.now(),
            status: 'error',
          };
          setChatHistory(prev => prev.map(msg => msg.id === thinkingMessageId ? errorMessage : msg));
        } finally {
          setCurrentStatus('idle');
        }
      };
      
      doGenerate();
    }
  }, [initialPrompt, hasProcessedInitialPrompt, isGenerating, user, selectedModel]);

  // Save chat history to localStorage (user-isolated)
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem(getChatStorageKey(), JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isGenerating]);

  // Update status based on progress and update thinking message
  useEffect(() => {
    if (isGenerating) {
      if (progress.stage === 'analyzing') {
        setCurrentStatus('thinking');
      } else if (progress.stage.includes('generating')) {
        setCurrentStatus('editing');
      } else {
        setCurrentStatus('editing');
      }
      
      // Update the "thinking" message with progress info and current file
      setChatHistory(prev => prev.map(msg => 
        msg.status === 'thinking' 
          ? { 
              ...msg, 
              content: progress.currentFile 
                ? `Обработка файла...`
                : progress.message || 'Выполнение задачи...',
              currentFile: progress.currentFile,
              action: 'editing'
            }
          : msg
      ));
    } else {
      setCurrentStatus('idle');
    }
  }, [isGenerating, progress.stage, progress.progress, progress.currentFile, progress.message]);

  const checkAIStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch('/api/ai/status');
      const data = await response.json();
      setAiStatus(data);
    } catch (error) {
      setAiStatus({ connected: false, model: null, error: 'Failed to check status' });
    } finally {
      setCheckingStatus(false);
    }
  };

  // Render message content with code blocks support
  const renderMessageContent = (content: string) => {
    // Split by code blocks (```language\ncode\n```)
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      // Check if this is a code block
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).split('\n');
        const language = lines[0].trim() || 'code';
        const code = lines.slice(1).join('\n');
        
        return (
          <div key={index} className="my-3 rounded-lg overflow-hidden bg-[#0a0a0b] border border-[#1f1f23]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#111113] border-b border-[#1f1f23]">
              <span className="text-xs text-[#6b6b70] font-mono">{language}</span>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="text-xs text-[#6b6b70] hover:text-white transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-xs">
              <code className="text-[#e5e5e5] font-mono whitespace-pre">{code}</code>
            </pre>
          </div>
        );
      }
      
      // Regular text - render with bold support
      return (
        <span key={index}>
          {part.split(/(\*\*[^*]+\*\*)/g).map((segment, i) => {
            if (segment.startsWith('**') && segment.endsWith('**')) {
              return <strong key={i} className="font-semibold text-white">{segment.slice(2, -2)}</strong>;
            }
            // Handle inline code `code`
            return segment.split(/(`[^`]+`)/g).map((inlineSegment, j) => {
              if (inlineSegment.startsWith('`') && inlineSegment.endsWith('`')) {
                return (
                  <code key={`${i}-${j}`} className="px-1.5 py-0.5 rounded bg-[#1f1f23] text-emerald-400 text-xs font-mono">
                    {inlineSegment.slice(1, -1)}
                  </code>
                );
              }
              return inlineSegment;
            });
          })}
        </span>
      );
    });
  };

  const handleNewChat = () => {
    setChatHistory([]);
    localStorage.removeItem(getChatStorageKey());
  };

  const handleClearChat = () => {
    if (confirm('Clear all chat history?')) {
      handleNewChat();
    }
  };

  // Detect terminal/restore/undo commands
  const detectSpecialCommand = (text: string): { type: 'terminal' | 'restore' | 'expo' | null; command?: string } => {
    const lowerText = text.toLowerCase().trim();
    
    // Restore/Undo commands
    if (/\b(верни|вернуть|откати|откатить|undo|restore|revert|назад|предыдущ|отменить)\b/i.test(lowerText)) {
      return { type: 'restore' };
    }
    
    // Expo/Terminal commands
    if (/\b(запусти|запустить|start|run|expo|сервер|server|qr|qr-код|терминал|terminal|открой|открыть)\b/i.test(lowerText)) {
      if (/\b(expo|приложен|app)\b/i.test(lowerText)) {
        return { type: 'expo', command: 'npx expo start' };
      }
      if (/\b(сервер|server)\b/i.test(lowerText)) {
        return { type: 'terminal', command: 'npm start' };
      }
    }
    
    // Console/Debug commands
    if (/\b(консоль|console|лог|log|ошибк|error|debug)\b/i.test(lowerText)) {
      return { type: 'terminal', command: 'check-console' };
    }
    
    return { type: null };
  };

  // Detect if the prompt is a question (should chat) or a generation request
  const isQuestionPrompt = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    
    // FIRST: Check for special commands
    const specialCmd = detectSpecialCommand(text);
    if (specialCmd.type) {
      return false; // Handle as action, not question
    }
    
    // SECOND: Check for ACTION/EDIT/CREATE requests (these ALWAYS generate code)
    // This runs BEFORE question detection to handle "привет, создай приложение"
    const actionPatterns = [
      // English - explicit creation (anywhere in text)
      /\b(create|build|make|generate|design|implement|develop)\b/i,
      // Russian - explicit creation (anywhere in text) 
      /\b(создай|создать|сделай|построй|сгенерируй|напиши код|разработай)\b/i,
      /(приложение|application|app)\b/i,
      /(новое приложение|new app|from scratch|с нуля)/i,
      // Add/modify specific elements
      /\b(add|добавь|добавить)\b/i,
      // CHANGE/MODIFY/EDIT requests
      /\b(change|modify|edit|update|fix|replace|remove|delete|adjust)\b/i,
      /\b(измени|изменить|поменяй|поменять|замени|заменить|удали|удалить|убери|убрать|исправь|исправить|обнови|обновить)\b/i,
      // Color/style changes
      /\b(color|цвет|стиль|style|background|фон)\b/i,
      // "Can you create/make" - these are requests, not questions
      /(can you|could you|would you|please|можешь|можешь ли|пожалуйста).*(create|make|build|change|modify|edit|add|создать|сделать|изменить|добавить)/i,
    ];
    
    for (const pattern of actionPatterns) {
      if (pattern.test(lowerText)) {
        console.log('[isQuestionPrompt] Detected ACTION/CREATE request:', lowerText.slice(0, 50));
        return false; // This is a generation request
      }
    }
    
    // THIRD: Check for pure questions (ONLY these should NOT generate code)
    // Only matches if NO action patterns were found above
    const pureQuestionPatterns = [
      // Console/debug commands - DO NOT GENERATE CODE
      /(посмотри|проверь|покажи|открой).*(консоль|лог|ошибк|терминал|error|log|console)/i,
      /(check|show|look|view|see).*(console|log|error|terminal|output)/i,
      /^(консоль|console|лог|log|ошибк|error)$/i,
      // Purely informational questions
      /^(what is|why is|how does|explain|describe)\b/i,
      /^(что такое|что это|как работает|зачем нужен|почему так)/i,
      // "Tell me about" (informational)
      /(расскажи|рассказать|объясни|объяснить|подскажи|подсказать)\s+(что|как|почему|зачем)/i,
      /(что ты сделал|что сделала|что было сделано)/i,
      // Pure greetings - extended patterns (anywhere, not just start)
      /^(привет|hello|hi|hey|здравствуй|здорово|хай|йо|салют|приветик)[\s!.,?]*$/i,
      /^(привет|hello|hi|hey).{0,20}$/i, // Short greetings with minor additions up to 20 chars
      // Conversational questions - FLEXIBLE (can have more text after)
      /^как (дела|ты|поживаешь|настроение)/i, // "как дела", "как ты", "как настроение" etc
      /^(как у тебя|как твои|что нового|что делаешь)/i,
      /(как дела|как настроение|как поживаешь|как у тебя дела)/i, // Anywhere in text
      /^(how are you|what's up|how's it going|how do you do)/i,
      /(how are you|what's up|how's it going)/i, // Anywhere in text
      // Affirmative/short responses - extended
      /^(да|нет|ок|окей|хорошо|понял|ясно|круто|класс|отлично|супер|норм|нормально|збс|отл|ладно|чётко)[\s!.,?]*$/i,
      /^(yes|no|ok|okay|sure|got it|understood|cool|great|nice|awesome|yep|nope|alright)[\s!.,?]*$/i,
      // Pure thanks
      /^(спасибо|благодарю|thanks|thank you|thx)[\s!.,?]*$/i,
      // Questions about AI
      /^(кто ты|что ты|ты кто|who are you|what are you)[\s!?,]*$/i,
      /^(что ты умеешь|что можешь|what can you do)[\s!?,]*$/i,
      // Emotional/casual responses (shouldn't trigger generation)
      /^(ахах|хаха|лол|ржу|смешно|прикольно|lol|haha|lmao|nice one)[\s!.,?]*$/i,
      // Short questions without action intent
      /^(правда|серьёзно|реально|точно|уверен|really|seriously|for real)[\s!?,]*$/i,
    ];
    
    for (const pattern of pureQuestionPatterns) {
      if (pattern.test(lowerText)) {
        console.log('[isQuestionPrompt] Detected PURE QUESTION:', lowerText.slice(0, 50));
        return true;
      }
    }
    
    // FOURTH: Default to GENERATION for everything else
    console.log('[isQuestionPrompt] Defaulting to GENERATION');
    return false;
  };

  // Handle chat-only response (no code generation)
  const handleChatResponse = async (userPrompt: string, messageId: string) => {
    try {
      // Get user's API key
      const selectedKey = selectedUserKey ? userApiKeys.find(k => k.id === selectedUserKey) : null;
      
      // Build RICH context from current project
      let context = '';
      if (project && project.files.length > 0) {
        context = `Current project: ${project.name || 'Untitled'}\n`;
        context += `Description: ${project.description || 'Mobile app'}\n`;
        context += `Total files: ${project.files.length}\n`;
        context += `Files: ${project.files.map(f => f.path).join(', ')}\n\n`;
        
        // Include App.tsx or main file
        const mainFile = project.files.find(f => f.path.includes('App.tsx') || f.path.includes('index.tsx'));
        if (mainFile) {
          context += `=== Main App File (${mainFile.path}) ===\n${mainFile.content.slice(0, 3000)}\n\n`;
        }
        
        // Include screens if any
        const screens = project.files.filter(f => f.path.includes('screen') || f.path.includes('Screen'));
        if (screens.length > 0) {
          context += `=== Screens ===\n`;
          screens.forEach(s => {
            context += `${s.path}: ${s.content.slice(0, 500)}...\n`;
          });
        }
      }
      
      // Build conversation history from recent messages
      const recentHistory = chatHistory
        .filter(msg => msg.status !== 'thinking')
        .slice(-6)
        .map(msg => ({
          role: msg.role,
          content: msg.content.slice(0, 500)
        }));
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userPrompt,
          context,
          apiKey: selectedKey?.encryptedKey,
          provider: selectedKey?.provider,
          userId: user?.id,
          history: recentHistory,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      
      const assistantMessage: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
        status: 'complete',
      };
      
      setChatHistory(prev => prev.map(msg => msg.id === messageId ? assistantMessage : msg));
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: `**Error:** ${err.message}\n\nPlease try again or rephrase your question.`,
        timestamp: Date.now(),
        status: 'error',
      };
      setChatHistory(prev => prev.map(msg => msg.id === messageId ? errorMessage : msg));
    }
  };

  // Handle restore/undo command
  const handleRestoreCommand = (messageId: string) => {
    const backups = useProjectStore.getState().getBackups();
    
    if (backups.length === 0) {
      const noBackupMessage: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: '**Нет доступных резервных копий**\n\nИстория изменений пуста. Резервные копии создаются автоматически перед каждым изменением проекта.',
        timestamp: Date.now(),
        status: 'complete',
      };
      setChatHistory(prev => prev.map(msg => msg.id === messageId ? noBackupMessage : msg));
      return;
    }
    
    // Restore to latest backup
    useProjectStore.getState().undoLastChange();
    
    const successMessage: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: `✅ **Изменения отменены**\n\nПроект восстановлен к предыдущей версии.\n\nДоступно ещё **${backups.length - 1}** резервных копий.`,
      timestamp: Date.now(),
      status: 'complete',
      action: 'restoring',
    };
    setChatHistory(prev => prev.map(msg => msg.id === messageId ? successMessage : msg));
  };

  // Handle expo/terminal command
  const handleTerminalCommand = (messageId: string, command: string) => {
    if (command === 'npx expo start') {
      // Open real terminal with E2B sandbox
      setShowTerminal(true);
      
      const expoMessage: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: `**🚀 Запускаю терминал**\n\nОткрываю терминал для запуска приложения. Нажмите **Start Expo** в терминале для получения QR-кода.\n\n> 💡 Отсканируйте QR-код в **Expo Go** на вашем телефоне\n> 📱 [App Store](https://apps.apple.com/app/expo-go/id982107779) | [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)`,
        timestamp: Date.now(),
        status: 'complete',
        terminalCommand: command,
        action: 'terminal',
      };
      setChatHistory(prev => prev.map(msg => msg.id === messageId ? expoMessage : msg));
    } else if (command === 'check-console') {
      // Actually check the code for potential errors
      const currentProject = useProjectStore.getState().project;
      let errorsList: string[] = [];
      let warningsList: string[] = [];
      
      if (currentProject && currentProject.files.length > 0) {
        currentProject.files.forEach(file => {
          if (file.path.endsWith('.tsx') || file.path.endsWith('.ts') || file.path.endsWith('.js')) {
            const content = file.content;
            
            // Check for common issues
            if (content.includes('undefined') && content.includes('?.') === false) {
              warningsList.push(`${file.path}: Возможно необработанное undefined`);
            }
            if (content.includes('console.error') || content.includes('console.warn')) {
              warningsList.push(`${file.path}: Есть отладочные console.error/warn`);
            }
            if (content.match(/import.*from\s+['"][^'"]+['"]/g)) {
              const imports = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
              imports.forEach(imp => {
                if (imp.includes('./') && !imp.includes('.tsx') && !imp.includes('.ts')) {
                  // Check if imported file exists
                  const match = imp.match(/from\s+['"]([^'"]+)['"]/);
                  if (match) {
                    const importPath = match[1];
                    const resolved = file.path.split('/').slice(0, -1).join('/') + '/' + importPath.replace('./', '');
                    const exists = currentProject.files.some(f => 
                      f.path === resolved + '.tsx' || 
                      f.path === resolved + '.ts' || 
                      f.path === resolved + '/index.tsx' ||
                      f.path === resolved + '/index.ts'
                    );
                    if (!exists && !importPath.startsWith('@') && !importPath.startsWith('react') && !importPath.startsWith('expo')) {
                      warningsList.push(`${file.path}: Импорт "${importPath}" может не существовать`);
                    }
                  }
                }
              });
            }
            // Check for syntax-like issues
            if ((content.match(/{/g) || []).length !== (content.match(/}/g) || []).length) {
              errorsList.push(`${file.path}: Несбалансированные фигурные скобки`);
            }
            if ((content.match(/\(/g) || []).length !== (content.match(/\)/g) || []).length) {
              errorsList.push(`${file.path}: Несбалансированные круглые скобки`);
            }
          }
        });
      }
      
      let resultContent = '**🔍 Проверка кода**\n\n';
      
      if (errorsList.length === 0 && warningsList.length === 0) {
        resultContent += '✅ **Ошибок не обнаружено!**\n\nКод выглядит корректно. Если вы видите проблемы в превью, опишите их — я исправлю.';
      } else {
        if (errorsList.length > 0) {
          resultContent += '**❌ Ошибки:**\n';
          errorsList.forEach(e => resultContent += `- ${e}\n`);
          resultContent += '\n';
        }
        if (warningsList.length > 0) {
          resultContent += '**⚠️ Предупреждения:**\n';
          warningsList.slice(0, 5).forEach(w => resultContent += `- ${w}\n`);
          if (warningsList.length > 5) {
            resultContent += `- ... и ещё ${warningsList.length - 5}\n`;
          }
        }
        resultContent += '\n> Хотите, чтобы я исправил эти проблемы?';
      }
      
      const consoleMessage: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: resultContent,
        timestamp: Date.now(),
        status: 'complete',
        action: 'terminal',
      };
      setChatHistory(prev => prev.map(msg => msg.id === messageId ? consoleMessage : msg));
    } else {
      const terminalMessage: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: `**💻 Команда терминала**\n\n\`\`\`bash\n${command}\n\`\`\`\n\nЭта команда будет доступна после экспорта проекта.`,
        timestamp: Date.now(),
        status: 'complete',
        terminalCommand: command,
        action: 'terminal',
      };
      setChatHistory(prev => prev.map(msg => msg.id === messageId ? terminalMessage : msg));
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || isGenerating) return;

    // Combine element selection with user prompt if available
    let fullPrompt = prompt;
    if (showElementSelection && elementSelectionText) {
      fullPrompt = `${elementSelectionText}\n\n${prompt}`;
      // Clear element selection after using it
      setShowElementSelection(false);
      if (onClearElementSelection) {
        onClearElementSelection();
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: fullPrompt,
      timestamp: Date.now(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    const userPrompt = fullPrompt;
    setPrompt('');
    setCurrentStatus('thinking');

    // Add a "working" message that will be updated
    const thinkingMessageId = (Date.now() + 0.5).toString();
    const thinkingMessage: ChatMessage = {
      id: thinkingMessageId,
      role: 'assistant',
      content: 'Выполнение задачи...',
      timestamp: Date.now(),
      status: 'thinking',
    };
    setChatHistory(prev => [...prev, thinkingMessage]);

    // Check for special commands first
    const specialCmd = detectSpecialCommand(userPrompt);
    if (specialCmd.type === 'restore') {
      handleRestoreCommand(thinkingMessageId);
      setCurrentStatus('idle');
      return;
    }
    if (specialCmd.type === 'expo' || specialCmd.type === 'terminal') {
      handleTerminalCommand(thinkingMessageId, specialCmd.command || '');
      setCurrentStatus('idle');
      return;
    }

    // Check if this is just a question or a generation request
    const isQuestion = isQuestionPrompt(userPrompt);
    
    if (isQuestion) {
      // Just chat, don't generate code
      await handleChatResponse(userPrompt, thinkingMessageId);
      setCurrentStatus('idle');
      return;
    }

    try {
      // Get user's API key if selected
      const selectedKey = selectedUserKey ? userApiKeys.find(k => k.id === selectedUserKey) : null;
      const userApiKey = selectedKey?.encryptedKey;
      const keyProvider = selectedKey?.provider;
      
      // Check if we should auto-select key (no specific key selected but keys available)
      const shouldAutoSelect = !selectedKey && userApiKeys.length > 0;
      
      console.log('[AIPromptPanel] Submit debug:', {
        selectedUserKey,
        selectedKeyFound: !!selectedKey,
        provider: keyProvider,
        userApiKeysCount: userApiKeys.length,
        hasEncryptedKey: !!userApiKey,
        autoSelectKey: shouldAutoSelect,
        isQuestion
      });
      
      // Debug log with masked key
      const keyInfo = userApiKey 
        ? `user key (${userApiKey.slice(0, 6)}...${userApiKey.slice(-4)}) provider: ${keyProvider}` 
        : shouldAutoSelect ? 'auto-selecting key' : 'server key';
      console.log(`[AIPromptPanel] Generating with ${keyInfo}, model: ${selectedModel}`);
      
      // Check if we already have a project - if so, this is an edit
      const hasExistingProject = !!project && project.files.length > 0;
      
      // Generate and get result
      const result = await generateProject({
        prompt: userPrompt,
        model: selectedModel,
        apiKey: userApiKey,
        provider: keyProvider,
        autoSelectKey: shouldAutoSelect,
        userId: user?.id,
        isEdit: hasExistingProject, // Don't reset project if we're editing
      });

      // Build meaningful success message based on what actually happened
      const appName = result?.expoConfig?.name || project?.name || 'App';
      const filesCount = result?.files?.length || 0;
      const newFiles = result?.files?.filter((f: any) => !project?.files.find(pf => pf.path === f.path)) || [];
      
      // Find actually MODIFIED files (content changed, not just exists)
      const modifiedFiles = result?.files?.filter((f: any) => {
        const existingFile = project?.files.find(pf => pf.path === f.path);
        if (!existingFile) return false;
        // Compare content - only count as modified if content actually changed
        return existingFile.content !== f.content;
      }) || [];
      
      // Create action-based message with REAL changes
      let actionDescription = '';
      if (hasExistingProject) {
        const actuallyChanged = newFiles.length + modifiedFiles.length;
        
        if (actuallyChanged === 0) {
          actionDescription = 'Проект уже содержит запрошенные изменения';
        } else if (newFiles.length > 0 && modifiedFiles.length > 0) {
          const newFileNames = newFiles.slice(0, 2).map((f: any) => f.path.split('/').pop()).join(', ');
          const modFileNames = modifiedFiles.slice(0, 2).map((f: any) => f.path.split('/').pop()).join(', ');
          actionDescription = `**Добавлено ${newFiles.length}:** ${newFileNames}${newFiles.length > 2 ? '...' : ''}\n**Изменено ${modifiedFiles.length}:** ${modFileNames}${modifiedFiles.length > 2 ? '...' : ''}`;
        } else if (newFiles.length > 0) {
          const fileNames = newFiles.slice(0, 3).map((f: any) => f.path.split('/').pop()).join(', ');
          actionDescription = `**Добавлено ${newFiles.length} файл${newFiles.length > 1 ? 'ов' : ''}:** ${fileNames}`;
        } else if (modifiedFiles.length > 0) {
          const fileNames = modifiedFiles.slice(0, 3).map((f: any) => f.path.split('/').pop()).join(', ');
          actionDescription = `**Изменено ${modifiedFiles.length} файл${modifiedFiles.length > 1 ? 'ов' : ''}:** ${fileNames}`;
        } else {
          actionDescription = `Обработано ${filesCount} файлов`;
        }
      } else {
        actionDescription = `Создано приложение **${appName}** (${filesCount} файлов)`;
      }
        
      const assistantMessage: ChatMessage = {
        id: thinkingMessageId,
        role: 'assistant',
        content: `${actionDescription}\n\n✅ Изменения применены. Проверьте превью справа.`,
        timestamp: Date.now(),
        status: 'complete',
        files: modifiedFiles.length > 0 ? modifiedFiles.map((f: any) => f.path) : result?.files?.map((f: any) => f.path) || [],
      };
      // Replace thinking message with success message
      setChatHistory(prev => prev.map(msg => msg.id === thinkingMessageId ? assistantMessage : msg));
    } catch (err: any) {
      // Save failed prompt for retry
      setFailedPrompt(userPrompt);
      
      // Generate detailed error message
      const errorContent = getDetailedErrorMessage(err);
      
      const errorMessage: ChatMessage = {
        id: thinkingMessageId, // Replace thinking message
        role: 'assistant',
        content: errorContent,
        timestamp: Date.now(),
        status: 'error',
      };
      // Replace thinking message with error
      setChatHistory(prev => prev.map(msg => msg.id === thinkingMessageId ? errorMessage : msg));
      
      // Refresh AI status after error
      checkAIStatus();
    } finally {
      setCurrentStatus('idle');
    }
  };

  // Generate detailed error message with solutions
  const getDetailedErrorMessage = (err: any): string => {
    const errorMsg = err.message?.toLowerCase() || '';
    
    // Quota exceeded
    if (errorMsg.includes('quota') || errorMsg.includes('exceeded') || errorMsg.includes('limit') || errorMsg.includes('429')) {
      return `**API Quota Exceeded**

You have reached the usage limit for the AI service.

**Possible solutions:**
1. **Wait and retry** — Free tier limits reset periodically (usually hourly or daily)
2. **Upgrade your plan** — Consider upgrading to a paid plan for higher limits
3. **Check your billing** — Ensure your payment method is valid if on a paid plan

**Technical details:**
- Rate limits apply to prevent overuse
- Free tier: ~15 requests/minute, ~1500 requests/day
- Paid tier: Significantly higher limits

Please wait a few minutes and try again.`;
    }
    
    // API key issues
    if (errorMsg.includes('api key') || errorMsg.includes('unauthorized') || errorMsg.includes('401') || errorMsg.includes('invalid')) {
      return `**API Key Error**

Your API key cannot be used. Common causes:

**1. Formatting issues:**
- Check for extra spaces at the beginning or end
- Ensure no special characters were accidentally added
- Verify the key is complete (not truncated)

**2. Account & Billing:**
- Check if your account has available credits
- Verify your payment method is valid
- Some APIs require billing setup even for free tier

**3. Security restrictions:**
- API key may be restricted to specific IP addresses
- Check if geographic restrictions apply
- Verify the key has required permissions (scopes)

**4. Key status:**
- The key may have been revoked or expired
- Try generating a new API key

Contact support if the issue persists.`;
    }
    
    // Network errors
    if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection') || errorMsg.includes('timeout')) {
      return `**Connection Error**

Unable to connect to the AI service.

**Possible solutions:**
1. Check your internet connection
2. Disable VPN if you're using one
3. Try again in a few moments
4. The AI service may be temporarily unavailable

If the problem persists, the service may be experiencing downtime.`;
    }
    
    // Service unavailable
    if (errorMsg.includes('503') || errorMsg.includes('service unavailable') || errorMsg.includes('not configured')) {
      return `**Service Temporarily Unavailable**

The AI service is currently unavailable.

**This could mean:**
- The service is under maintenance
- Server is overloaded
- Configuration issue on the server side

Please try again in a few minutes.`;
    }
    
    // Rate limiting
    if (errorMsg.includes('rate') || errorMsg.includes('too many')) {
      return `**Too Many Requests**

You're sending requests too quickly.

**Solution:**
- Wait 30-60 seconds before trying again
- Avoid sending multiple requests in quick succession

The rate limit will reset automatically.`;
    }
    
    // Default error
    return `**Generation Error**

${err.message || 'An unexpected error occurred.'}

**Try these steps:**
1. Refresh the page and try again
2. Check if the AI service is available
3. Try with a simpler prompt
4. Contact support if the issue persists`;
  };

  const handleSuggestionClick = (suggestionPrompt: string) => {
    setPrompt(suggestionPrompt);
  };

  // Handle undo button click
  const handleUndo = () => {
    const backups = useProjectStore.getState().getBackups();
    if (backups.length === 0) {
      // Show message that no backups available
      const message: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '**Нет доступных резервных копий**\n\nИстория изменений пуста.',
        timestamp: Date.now(),
        status: 'complete',
      };
      setChatHistory(prev => [...prev, message]);
      return;
    }
    
    useProjectStore.getState().undoLastChange();
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✅ **Изменения отменены**\n\nПроект восстановлен к предыдущей версии.`,
      timestamp: Date.now(),
      status: 'complete',
      action: 'restoring',
    };
    setChatHistory(prev => [...prev, message]);
    setShowBackupsDropdown(false);
  };

  // Handle restore to specific backup
  const handleRestoreToBackup = (backupId: string, description: string) => {
    useProjectStore.getState().restoreBackup(backupId);
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✅ **Восстановлено**\n\nПроект восстановлен к версии: "${description}"`,
      timestamp: Date.now(),
      status: 'complete',
      action: 'restoring',
    };
    setChatHistory(prev => [...prev, message]);
    setShowBackupsDropdown(false);
  };

  // Format timestamp for display
  const formatBackupTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const currentModel = AI_MODELS.find(m => m.id === selectedModel);
  const backups = useProjectStore.getState().getBackups();
  const backupsCount = backups.length;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0b]">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#1f1f23]/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1f1f23]/50 hover:bg-[#1f1f23] border border-[#2a2a2e]/50 transition-colors"
            title="New Chat"
          >
            <Plus className="w-3.5 h-3.5 text-[#9a9aa0]" />
            <span className="text-xs text-[#9a9aa0]">New</span>
          </button>
          
          {/* Undo Button with Dropdown */}
          {project && backupsCount > 0 && (
            <div className="relative" ref={backupsDropdownRef}>
              <button
                onClick={() => setShowBackupsDropdown(!showBackupsDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                title={`Undo (${backupsCount} backups available)`}
              >
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span className="text-xs text-amber-400">Undo</span>
                <ChevronDown className={`w-3 h-3 text-amber-400 transition-transform ${showBackupsDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Backups Dropdown */}
              <AnimatePresence>
                {showBackupsDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-72 max-h-80 overflow-y-auto bg-[#111113] border border-[#1f1f23] rounded-xl shadow-xl z-50"
                  >
                    <div className="p-2 border-b border-[#1f1f23]">
                      <p className="text-xs text-[#6b6b70] px-2">История изменений ({backupsCount})</p>
                    </div>
                    <div className="p-1">
                      {/* Quick Undo - latest backup */}
                      <button
                        onClick={handleUndo}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-500/10 transition-colors text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">Отменить последнее</p>
                          <p className="text-xs text-[#6b6b70]">Быстрый откат</p>
                        </div>
                      </button>
                      
                      <div className="h-px bg-[#1f1f23] my-1" />
                      
                      {/* All backups */}
                      {backups.map((backup, index) => (
                        <button
                          key={backup.id}
                          onClick={() => handleRestoreToBackup(backup.id, backup.description)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1f1f23] transition-colors text-left group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#1f1f23] group-hover:bg-[#2a2a2e] flex items-center justify-center shrink-0">
                            <span className="text-xs text-[#6b6b70] font-mono">#{backups.length - index}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#e5e5e5] truncate">{backup.description}</p>
                            <p className="text-xs text-[#6b6b70]">{formatBackupTime(backup.timestamp)} • {backup.files.length} файлов</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          {/* Clear Button */}
          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg hover:bg-[#1f1f23] transition-colors"
            title="Clear History"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#6b6b70]" />
          </button>
        </div>

        {/* Status Indicators Row */}
        <div className="flex items-center gap-2">
          {/* Terminal Indicator - shows when AI is running commands */}
          <AnimatePresence>
            {currentStatus === 'editing' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/10"
              >
                <Terminal className="w-3 h-3 text-purple-400 animate-pulse" />
                <span className="text-[10px] text-purple-400 font-medium">Terminal</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Console/Debug Indicator - shows when checking for errors */}
          <AnimatePresence>
            {isGenerating && progress.stage === 'validation' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-500/10"
              >
                <Bug className="w-3 h-3 text-orange-400 animate-pulse" />
                <span className="text-[10px] text-orange-400 font-medium">Console</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* API Key / Connection Status */}
          {selectedUserKey ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10">
              <Key className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-blue-400 font-medium truncate max-w-[80px]">
                {userApiKeys.find(k => k.id === selectedUserKey)?.name || 'Custom'}
              </span>
            </div>
          ) : checkingStatus ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6b6b70]" />
          ) : aiStatus.connected ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium">Ready</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-[10px] text-red-400 font-medium">
                {aiStatus.isQuotaError ? 'Quota' : 'Offline'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-auto">
        {chatHistory.length === 0 ? (
          <div className="p-4 space-y-6">
            {/* Welcome */}
            <div className="pt-8 pb-4">
              <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <p className="text-center text-[#6b6b70] text-sm">
                What would you like to build?
              </p>
            </div>

            {/* Suggestions */}
            <div className="space-y-2">
              {SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.prompt)}
                  className="w-full p-3 rounded-xl bg-[#111113] hover:bg-[#161618] border border-[#1f1f23]/50 hover:border-[#2a2a2e] transition-all text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#1f1f23] group-hover:bg-emerald-600/20 flex items-center justify-center transition-colors text-[#6b6b70] group-hover:text-emerald-400">
                      {suggestion.icon}
                    </div>
                    <span className="font-medium text-sm text-[#9a9aa0] group-hover:text-white transition-colors">
                      {suggestion.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {chatHistory.map((message) => (
              <div key={message.id}>
                {message.role === 'user' ? (
                  /* User Message */
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-emerald-600 text-white rounded-2xl rounded-tr-md px-4 py-2.5">
                      {/* Check if message contains element selection */}
                      {message.content.includes('[Выбранный элемент:') || message.content.includes('[Выбранные элементы:') ? (
                        <div>
                          {/* Extract and display element selection badge */}
                          {message.content.match(/\[Выбранн[ыйе]+ элемент[ыа]?: ([^\]]+)\]/) && (
                            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-white/20 rounded-lg text-xs">
                              <Eye className="w-3.5 h-3.5" />
                              <span className="font-medium">
                                {message.content.match(/\[Выбранн[ыйе]+ элемент[ыа]?: ([^\]]+)\]/)?.[1]}
                              </span>
                            </div>
                          )}
                          {/* Display the rest of the message */}
                          <p className="text-sm leading-relaxed">
                            {message.content.replace(/\[Выбранн[ыйе]+ элемент[ыа]?: [^\]]+\]\n*/, '').trim()}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Assistant Message - No icon, no container */
                  <div className="py-2">
                    {message.status === 'error' ? (
                      <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-medium text-red-400">Ошибка</span>
                        </div>
                        <div className="text-sm text-[#e5e5e5] leading-relaxed whitespace-pre-wrap mb-4">
                          {message.content.split('**').map((part, i) => 
                            i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
                          )}
                        </div>
                        {/* Check Keys Button */}
                        <button
                          onClick={() => {
                            checkAllApiKeys();
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Key className="w-4 h-4" />
                          Проверить ключи
                        </button>
                      </div>
                    ) : message.status === 'thinking' ? (
                      /* Working status with file indicator */
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-[#9a9aa0]">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 className="w-4 h-4 text-emerald-500" />
                          </motion.div>
                          <span>Выполнение задачи...</span>
                        </div>
                        
                        {/* Current file being processed */}
                        {message.currentFile && (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 text-xs py-1.5 px-3 bg-[#111113] rounded-lg border border-[#1f1f23]/50"
                          >
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.6, repeat: Infinity }}
                              className="w-2 h-2 rounded-full bg-emerald-500"
                            />
                            <FileCode className="w-3.5 h-3.5 text-[#6b6b70]" />
                            <span className="font-mono text-[#e5e5e5]">{message.currentFile}</span>
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Action indicator for completed messages */}
                        {message.action === 'restoring' && (
                          <div className="flex items-center gap-2 mb-2 text-xs text-amber-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            <span>Восстановление</span>
                          </div>
                        )}
                        {message.action === 'terminal' && (
                          <div className="flex items-center gap-2 mb-2 text-xs text-blue-400">
                            <Terminal className="w-4 h-4" />
                            <span>Терминал</span>
                          </div>
                        )}
                        
                        <div className="text-sm text-[#e5e5e5] leading-relaxed prose prose-invert prose-sm max-w-none">
                          {renderMessageContent(message.content)}
                        </div>
                        
                        {/* Files Modified - with staggered animation - CLICKABLE */}
                        {message.files && message.files.length > 0 && (
                          <div className="mt-3 space-y-1">
                            <div className="text-xs text-[#6b6b70] mb-2 flex items-center gap-1">
                              <FileEdit className="w-3.5 h-3.5" />
                              <span>Изменённые файлы ({message.files.length}):</span>
                            </div>
                            {message.files.map((file, idx) => (
                              <motion.button 
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ 
                                  delay: idx * 0.1, 
                                  duration: 0.3,
                                  ease: "easeOut" 
                                }}
                                onClick={() => onFileClick?.(file)}
                                className="flex items-center gap-2 text-xs py-1.5 px-2 w-full rounded-lg hover:bg-[#1f1f23] transition-colors group cursor-pointer text-left"
                              >
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: idx * 0.1 + 0.2 }}
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                </motion.div>
                                <FileCode className="w-3.5 h-3.5 text-[#6b6b70] group-hover:text-emerald-400 transition-colors" />
                                <span className="font-mono text-[#6b6b70] group-hover:text-[#e5e5e5] transition-colors">{file}</span>
                                <ExternalLink className="w-3 h-3 text-[#4b4b50] group-hover:text-emerald-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Live Generation Status */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="py-3 space-y-3"
                >
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    {currentStatus === 'thinking' && (
                      <>
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-[#6b6b70]">Thinking...</span>
                      </>
                    )}
                    {currentStatus === 'editing' && (
                      <>
                        <Pencil className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span className="text-xs text-[#6b6b70]">{getStageLabel(progress.stage)}</span>
                      </>
                    )}
                    {currentStatus === 'searching' && (
                      <>
                        <Search className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                        <span className="text-xs text-[#6b6b70]">Searching...</span>
                      </>
                    )}
                  </div>
                  
                  {/* Terminal Command Display */}
                  {progress.stage === 'terminal' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-2 rounded-lg bg-[#0a0a0b] border border-[#1f1f23]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Terminal className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] text-purple-400 font-medium">Running command</span>
                      </div>
                      <code className="text-xs text-[#e5e5e5] font-mono">
                        {progress.message || 'npm install...'}
                      </code>
                    </motion.div>
                  )}
                  
                  {/* Console Check Display */}
                  {progress.stage === 'validation' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/20"
                    >
                      <div className="flex items-center gap-2">
                        <Bug className="w-3 h-3 text-orange-400 animate-pulse" />
                        <span className="text-[10px] text-orange-400 font-medium">Checking for errors...</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Progress Bar */}
                  <div className="h-1 bg-[#1f1f23] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.progress}%` }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {/* Current File */}
                  {progress.currentFile && (
                    <div className="flex items-center gap-2 text-xs">
                      <FileEdit className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-mono text-[#6b6b70]">{progress.currentFile}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-[#1f1f23]/50 shrink-0 space-y-2">
        {/* Model Selector - Compact */}
        <div className="relative">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-2.5 py-1.5 bg-[#111113] rounded-lg border transition-colors disabled:opacity-50 ${
              selectedUserKey 
                ? 'border-blue-500/50 bg-blue-500/5' 
                : 'border-[#1f1f23]/50 hover:border-[#2a2a2e]'
            }`}
          >
            {selectedUserKey ? (
              <Key className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className={`text-xs ${selectedUserKey ? 'text-blue-400' : 'text-[#9a9aa0]'}`}>
              {selectedUserKey 
                ? userApiKeys.find(k => k.id === selectedUserKey)?.name || 'Custom Key'
                : currentModel?.name
              }
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#6b6b70] transition-transform ${showModelSelector ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showModelSelector && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full left-0 mb-2 bg-[#111113] border border-[#1f1f23] rounded-xl shadow-xl z-10 min-w-[240px] max-h-[280px] flex flex-col"
              >
                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 overscroll-contain">
                  {/* Default Models Section */}
                  <div className="px-3 py-2 border-b border-[#1f1f23]/50 sticky top-0 bg-[#111113] z-10">
                    <span className="text-[10px] text-[#6b6b70] uppercase tracking-wide">Default Models</span>
                  </div>
                  {AI_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setSelectedUserKey(null);
                        setShowModelSelector(false);
                        checkAIStatus();
                      }}
                      className={`w-full px-3 py-2.5 text-left hover:bg-[#1f1f23] transition-colors flex items-center gap-2 ${
                        !selectedUserKey && selectedModel === model.id ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${!selectedUserKey && selectedModel === model.id ? 'bg-emerald-500' : 'bg-[#3f3f46]'}`} />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-white">{model.name}</div>
                        <div className="text-[10px] text-[#6b6b70]">{model.description}</div>
                      </div>
                    </button>
                  ))}

                  {/* User API Keys Section */}
                  {userApiKeys.length > 0 && (
                    <>
                      <div className="px-3 py-2 border-t border-b border-[#1f1f23]/50 flex items-center justify-between sticky top-0 bg-[#111113] z-10">
                        <span className="text-[10px] text-[#6b6b70] uppercase tracking-wide">Your API Keys</span>
                      </div>
                      {userApiKeys.map((key) => (
                        <button
                          key={key.id}
                          onClick={() => {
                            console.log('[AIPromptPanel] Selecting user key:', key.id, key.name, 'has encryptedKey:', !!key.encryptedKey);
                            setSelectedUserKey(key.id);
                            setShowModelSelector(false);
                          }}
                          disabled={!key.encryptedKey}
                          className={`w-full px-3 py-2.5 text-left hover:bg-[#1f1f23] transition-colors flex items-center gap-2 ${
                          selectedUserKey === key.id ? 'bg-blue-500/10' : ''
                        } ${!key.encryptedKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(key.status)}`} />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-white flex items-center gap-2">
                            {key.name}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                              key.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                              key.status === 'quota_exceeded' ? 'bg-yellow-500/10 text-yellow-400' :
                              key.status === 'error' ? 'bg-red-500/10 text-red-400' :
                              'bg-[#2a2a2e] text-[#6b6b70]'
                            }`}>
                              {getStatusLabel(key.status)}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#6b6b70]">
                            {PROVIDER_INFO[key.provider]?.name} • {key.keyPreview}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* Add Key Link */}
                <a
                  href="/dashboard#api-keys"
                  className="flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#1f1f23] transition-colors border-t border-[#1f1f23]/50 sticky bottom-0 bg-[#111113]"
                  onClick={() => setShowModelSelector(false)}
                >
                  <Plus className="w-3.5 h-3.5 text-[#6b6b70]" />
                  <span className="text-xs text-[#6b6b70]">Add API Key</span>
                  <ExternalLink className="w-3 h-3 text-[#6b6b70] ml-auto" />
                </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Input Field */}
        <div className="relative bg-[#111113] rounded-xl border border-[#1f1f23]/50 focus-within:border-emerald-500/30 transition-colors">
          {/* Selected Elements Badge */}
          <AnimatePresence>
            {showElementSelection && elementSelectionText && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-12 left-0 right-0 z-10"
              >
                <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-lg px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">{elementSelectionText}</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowElementSelection(false);
                      if (onClearElementSelection) {
                        onClearElementSelection();
                      }
                    }}
                    className="text-emerald-400/60 hover:text-red-400 transition-colors p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={elementSelectionText ? "Что сделать с выбранными элементами?" : "Опишите, что хотите создать..."}
            disabled={isGenerating}
            className="w-full h-20 px-4 py-3 pr-28 bg-transparent rounded-xl text-sm text-white placeholder-[#4a4a4e] resize-none focus:outline-none disabled:opacity-50"
          />
          
          {/* Action buttons */}
          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
            {/* Undo button - shown when there are backups and not generating */}
            {canUndo && !isGenerating && (
              <button
                onClick={() => {
                  undoLastChange();
                  setChatHistory(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: '↩️ Изменения отменены. Проект восстановлен к предыдущей версии.',
                    timestamp: Date.now(),
                    status: 'complete',
                  }]);
                }}
                className="p-2 bg-[#1f1f23] text-[#a1a1aa] rounded-lg hover:bg-[#2a2a2e] hover:text-white transition-all"
                title="Отменить последнее изменение"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}
            
            {/* Stop button - shown during generation */}
            {isGenerating && onStopGeneration && (
              <button
                onClick={onStopGeneration}
                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all animate-pulse"
                title="Остановить генерацию"
              >
                <Square className="w-4 h-4" />
              </button>
            )}
            
            {/* Send button */}
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isGenerating}
              data-testid="submit-btn"
              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title={isGenerating ? "Генерация..." : "Отправить"}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Key Checker Modal */}
      <AnimatePresence>
        {showKeyChecker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowKeyChecker(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0a0a0b] border border-[#1f1f23] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#1f1f23]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                    <Key className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Проверка API ключей</h3>
                    <p className="text-xs text-[#6b6b70]">Выберите рабочий ключ для продолжения</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowKeyChecker(false)}
                  className="p-2 hover:bg-[#1f1f23] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-[#6b6b70]" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4 max-h-[400px] overflow-y-auto">
                {userApiKeys.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="w-12 h-12 mx-auto mb-3 text-[#3b3b40]" />
                    <p className="text-[#9a9aa0] mb-2">Нет API ключей</p>
                    <p className="text-xs text-[#6b6b70] mb-4">Добавьте ключ в настройках для генерации приложений</p>
                    <a
                      href="/dashboard?tab=settings"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Открыть настройки
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userApiKeys.map((key) => {
                      const checkResult = keyCheckResults.get(key.id);
                      const isValid = checkResult?.status === 'valid';
                      const isChecking = checkResult?.status === 'checking';
                      const isQuota = checkResult?.status === 'quota';
                      const isError = checkResult?.status === 'error';
                      
                      return (
                        <div
                          key={key.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isValid 
                              ? 'bg-emerald-500/10 border-emerald-500/30' 
                              : isQuota
                                ? 'bg-amber-500/10 border-amber-500/30'
                                : isError
                                  ? 'bg-red-500/10 border-red-500/30'
                                  : 'bg-[#111113] border-[#1f1f23]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{key.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                key.provider === 'google' ? 'bg-blue-500/20 text-blue-400' :
                                key.provider === 'openai' ? 'bg-green-500/20 text-green-400' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {key.provider?.toUpperCase()}
                              </span>
                            </div>
                            
                            {/* Status indicator */}
                            {isChecking ? (
                              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                            ) : isValid ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : isQuota ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                            ) : isError ? (
                              <X className="w-4 h-4 text-red-400" />
                            ) : null}
                          </div>
                          
                          <p className="text-xs text-[#6b6b70] mb-2 truncate max-w-full overflow-hidden">{key.keyPreview}</p>
                          
                          {/* Status message */}
                          {checkResult && !isChecking && (
                            <div className="mb-3">
                              {isValid && checkResult.models.length > 0 && (
                                <div className="text-xs text-emerald-400">
                                  Доступные модели: {checkResult.models.slice(0, 3).join(', ')}
                                  {checkResult.models.length > 3 && ` +${checkResult.models.length - 3}`}
                                </div>
                              )}
                              {isValid && checkResult.models.length === 0 && (
                                <div className="text-xs text-emerald-400">✓ Ключ работает</div>
                              )}
                              {(isQuota || isError) && checkResult.error && (
                                <div className="text-xs text-red-400">{checkResult.error}</div>
                              )}
                            </div>
                          )}
                          
                          {/* Use button for valid keys */}
                          {isValid && (
                            <button
                              onClick={() => applyKeyAndRetry(key.id, checkResult.models[0])}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Использовать этот ключ
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="flex items-center justify-between p-4 border-t border-[#1f1f23] bg-[#0a0a0b]">
                <button
                  onClick={checkAllApiKeys}
                  disabled={isCheckingKeys}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1f1f23] hover:bg-[#2a2a2e] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isCheckingKeys ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {isCheckingKeys ? 'Проверка...' : 'Проверить снова'}
                </button>
                
                <a
                  href="/dashboard?tab=settings"
                  className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить ключ
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Terminal Component */}
      <TerminalComponent 
        isOpen={showTerminal}
        onClose={() => setShowTerminal(false)}
        projectId={project?.id}
      />
    </div>
  );
}

function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    analyzing: 'Analyzing your request...',
    planning: 'Planning structure...',
    generating_config: 'Creating config...',
    generating_components: 'Building components...',
    generating_screens: 'Creating screens...',
    generating_navigation: 'Setting up navigation...',
    generating_services: 'Adding services...',
    finalizing: 'Finalizing...',
    complete: 'Done!',
  };
  return labels[stage] || 'Generating...';
}
