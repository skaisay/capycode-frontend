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
  ExternalLink
} from 'lucide-react';
import { useGenerateProject } from '@/hooks/useGenerateProject';
import { UserApiKey, PROVIDER_INFO, getStatusColor, getStatusLabel, getCachedKeyStatuses, setCachedKeyStatus } from '@/lib/userApiKeys';
import { getApiKeys, DBApiKey } from '@/lib/database';
import { useAuth } from '@/hooks/useAuth';
import { AI_MODELS, AIModel, getDefaultModel } from '@/lib/ai';
import { motion, AnimatePresence } from 'framer-motion';

interface AIPromptPanelProps {
  isGenerating: boolean;
  progress: {
    stage: string;
    message?: string;
    progress: number;
    currentFile?: string;
  };
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
  status?: 'thinking' | 'editing' | 'searching' | 'complete' | 'error';
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

// Local storage key
const CHAT_STORAGE_KEY = 'capycode_chat_history';
const SELECTED_KEY_STORAGE = 'capycode_selected_api_key';

// Get saved selected key from localStorage
function getSavedSelectedKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SELECTED_KEY_STORAGE);
}

// Save selected key to localStorage
function saveSelectedKey(keyId: string | null) {
  if (typeof window === 'undefined') return;
  if (keyId) {
    localStorage.setItem(SELECTED_KEY_STORAGE, keyId);
  } else {
    localStorage.removeItem(SELECTED_KEY_STORAGE);
  }
}

export function AIPromptPanel({ isGenerating, progress }: AIPromptPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>(getDefaultModel());
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>({ connected: false, model: null });
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'idle' | 'thinking' | 'editing' | 'searching'>('idle');
  const [userApiKeys, setUserApiKeys] = useState<UserApiKey[]>([]);
  const [selectedUserKey, setSelectedUserKey] = useState<string | null>(getSavedSelectedKey());
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();

  const { generateProject } = useGenerateProject();

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

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        setChatHistory(JSON.parse(saved));
      } catch {
        // Invalid JSON, ignore
      }
    }
    checkAIStatus();
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isGenerating]);

  // Update status based on progress
  useEffect(() => {
    if (isGenerating) {
      if (progress.stage === 'analyzing') {
        setCurrentStatus('thinking');
      } else if (progress.stage.includes('generating')) {
        setCurrentStatus('editing');
      } else {
        setCurrentStatus('editing');
      }
    } else {
      setCurrentStatus('idle');
    }
  }, [isGenerating, progress.stage]);

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

  const handleNewChat = () => {
    setChatHistory([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const handleClearChat = () => {
    if (confirm('Clear all chat history?')) {
      handleNewChat();
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    const userPrompt = prompt;
    setPrompt('');
    setCurrentStatus('thinking');

    try {
      // Get user's API key if selected
      const selectedKey = selectedUserKey ? userApiKeys.find(k => k.id === selectedUserKey) : null;
      const userApiKey = selectedKey?.encryptedKey;
      const keyProvider = selectedKey?.provider;
      
      console.log('[AIPromptPanel] Submit debug:', {
        selectedUserKey,
        selectedKeyFound: !!selectedKey,
        provider: keyProvider,
        userApiKeysCount: userApiKeys.length,
        hasEncryptedKey: !!userApiKey
      });
      
      // Debug log with masked key
      const keyInfo = userApiKey 
        ? `user key (${userApiKey.slice(0, 6)}...${userApiKey.slice(-4)}) provider: ${keyProvider}` 
        : 'server key';
      console.log(`[AIPromptPanel] Generating with ${keyInfo}, model: ${selectedModel}`);
      
      // Generate and get result
      const result = await generateProject({
        prompt: userPrompt,
        model: selectedModel,
        apiKey: userApiKey,
        provider: keyProvider,
      });

      // Show success with REAL data from the result
      const appName = result?.expoConfig?.name || 'App';
      const filesCount = result?.files?.length || 0;
      const keyUsedInfo = selectedKey 
        ? `🔑 Used your **${selectedKey.provider.toUpperCase()}** API key (${selectedKey.name})`
        : `🤖 Used **${selectedModel}** (server key)`;
        
      const filesList = result?.files?.slice(0, 5).map((f: any) => f.path).join(', ') || '';
      const moreFiles = (result?.files?.length || 0) > 5 ? ` and ${(result?.files?.length || 0) - 5} more...` : '';
        
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `✅ **${appName}** generated successfully!\n\n${keyUsedInfo}\n\n📁 Created **${filesCount} files**: ${filesList}${moreFiles}\n\nCheck the file explorer on the left and preview on the right!`,
        timestamp: Date.now(),
        status: 'complete',
        files: result?.files?.map((f: any) => f.path) || [],
      };
      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      // Generate detailed error message
      const errorContent = getDetailedErrorMessage(err);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: Date.now(),
        status: 'error',
      };
      setChatHistory(prev => [...prev, errorMessage]);
      
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
      return `⚠️ **API Quota Exceeded**

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
      return `🔑 **API Key Error**

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
      return `🌐 **Connection Error**

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
      return `🔧 **Service Temporarily Unavailable**

The AI service is currently unavailable.

**This could mean:**
- The service is under maintenance
- Server is overloaded
- Configuration issue on the server side

Please try again in a few minutes.`;
    }
    
    // Rate limiting
    if (errorMsg.includes('rate') || errorMsg.includes('too many')) {
      return `⏱️ **Too Many Requests**

You're sending requests too quickly.

**Solution:**
- Wait 30-60 seconds before trying again
- Avoid sending multiple requests in quick succession

The rate limit will reset automatically.`;
    }
    
    // Default error
    return `❌ **Generation Error**

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

  const currentModel = AI_MODELS.find(m => m.id === selectedModel);

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
          
          {/* Clear Button */}
          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg hover:bg-[#1f1f23] transition-colors"
            title="Clear History"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#6b6b70]" />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
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
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  /* Assistant Message - No icon, no container */
                  <div className="py-2">
                    {message.status === 'error' ? (
                      <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-medium text-red-400">Error</span>
                        </div>
                        <div className="text-sm text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
                          {message.content.split('**').map((part, i) => 
                            i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-[#e5e5e5] leading-relaxed">
                          {message.content}
                        </p>
                        
                        {/* Files Modified */}
                        {message.files && message.files.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {message.files.map((file, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center gap-2 text-xs text-[#6b6b70] py-1"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <FileCode className="w-3.5 h-3.5" />
                                <span className="font-mono">{file}</span>
                              </div>
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
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Describe what you want to build..."
            disabled={isGenerating}
            className="w-full h-20 px-4 py-3 pr-12 bg-transparent rounded-xl text-sm text-white placeholder-[#4a4a4e] resize-none focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className="absolute right-2.5 bottom-2.5 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
