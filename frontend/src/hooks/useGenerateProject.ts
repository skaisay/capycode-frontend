import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, GenerateResult, GeneratedFile } from '@/lib/api';
import { useProjectStore } from '@/stores/projectStore';
import { logGeneration } from '@/lib/stripe';
import { AIModel } from '@/lib/ai';

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

const getStorageKey = (key: string): string => `capycode_${getCurrentUserId()}_${key}`;

interface UseGenerateProjectOptions {
  onSuccess?: (result: GenerateResult) => void;
  onError?: (error: Error) => void;
  streaming?: boolean;
  model?: AIModel;
  apiKey?: string; // User's own API key
  apiKeyProvider?: 'google' | 'openai' | 'anthropic' | 'custom'; // Provider of user's API key
  autoSelectKey?: boolean; // Whether to auto-select working key
  userId?: string; // User ID for auto-key selection
}

interface GenerationProgress {
  stage: 'analyzing' | 'generating' | 'building' | 'complete';
  message: string;
  progress: number;
  currentFile?: string;
}

// ДЕМО-ДАННЫЕ УДАЛЕНЫ - Используется только реальная генерация через AI API

export function useGenerateProject(options: UseGenerateProjectOptions = {}) {
  const { streaming = false, onSuccess, onError, model = 'gemini-2.5-flash' } = options;
  const { setProject, setProjectWithBackup, addFile, setLoading, reset: resetProjectStore, project } = useProjectStore();
  
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: 'analyzing',
    message: 'Ready to generate',
    progress: 0,
  });
  const [streamedFiles, setStreamedFiles] = useState<GeneratedFile[]>([]);
  const [currentModel, setCurrentModel] = useState<AIModel>(model);
  
  // AbortController for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cancel current generation
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setProgress({
        stage: 'analyzing',
        message: 'Генерация отменена',
        progress: 0,
      });
    }
  }, []);

  // Function to generate with real AI API
  const generateWithAI = async (prompt: string, selectedModel: AIModel, userApiKey?: string, provider?: string, autoSelectKey?: boolean, userId?: string, isEdit?: boolean): Promise<GenerateResult> => {
    // Get current project for edit mode
    const currentProject = useProjectStore.getState().project;
    const existingFiles = isEdit && currentProject?.files ? currentProject.files : [];
    
    // CREATE BACKUP BEFORE MAKING ANY CHANGES IN EDIT MODE!
    if (isEdit && currentProject && currentProject.files.length > 0) {
      console.log('[useGenerateProject] Creating backup before edit...');
      useProjectStore.getState().createBackup(`Before: ${prompt.substring(0, 50)}...`);
    }
    
    setProgress({
      stage: 'analyzing',
      message: isEdit ? 'Analyzing existing project...' : 'Analyzing your requirements...',
      progress: 10,
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // If editing, show what files we're reviewing
    if (isEdit && existingFiles.length > 0) {
      setProgress({
        stage: 'analyzing',
        message: `Reviewing ${existingFiles.length} existing files...`,
        progress: 15,
      });
      await new Promise(r => setTimeout(r, 500));
    }
    
    setProgress({
      stage: 'analyzing',
      message: autoSelectKey ? 'Finding the best API key...' : 'Connecting to AI...',
      progress: 20,
    });
    
    // Build context with existing files for edit mode
    let contextPrompt = prompt;
    if (isEdit && existingFiles.length > 0) {
      const filesSummary = existingFiles.map(f => `- ${f.path}`).join('\n');
      const mainFiles = existingFiles
        .filter(f => f.path.includes('App.tsx') || f.path.includes('index.tsx') || f.path.includes('screens/') || f.path.includes('components/'))
        .slice(0, 8)
        .map(f => `\n--- ${f.path} ---\n${f.content}`);
      
      // Check if user selected a specific element (element selector mode)
      const isElementSelection = prompt.includes('[Выбранный элемент:') || prompt.includes('[Выбранные элементы:');
      
      if (isElementSelection) {
        // ELEMENT SELECTION MODE - be super strict, send ALL files with FULL content
        const allFilesContent = existingFiles
          .map(f => `\n=== FILE: ${f.path} ===\n${f.content}\n=== END ${f.path} ===`)
          .join('\n');
        
        contextPrompt = `⚠️ ELEMENT SELECTION MODE - CRITICAL ⚠️

The user selected a SPECIFIC UI element and wants to change ONLY that element!

ALL PROJECT FILES (${existingFiles.length} files):
${allFilesContent}

USER REQUEST WITH SELECTED ELEMENT:
${prompt}

🚫 ABSOLUTE RULES:
1. Find the EXACT element mentioned in [Выбранный элемент: ...]
2. Change ONLY that one element's property (color, size, text, etc.)
3. Return ALL files - modified file has 1-5 lines changed MAX
4. Do NOT restructure, refactor, or "improve" anything
5. Do NOT create new files or delete existing files
6. Copy unmodified files EXACTLY as they are (byte-for-byte)

If you change more than 10 lines total, YOU ARE WRONG!`;
      } else {
        // Regular edit mode
        contextPrompt = `EXISTING PROJECT CONTEXT:
Files in project:
${filesSummary}

Key file contents:
${mainFiles.join('\n')}

USER REQUEST: ${prompt}

Please modify the existing project based on the user's request. Keep existing functionality and only change what's needed.`;
      }
    }
    
    // Call our API route
    const requestBody = { 
      prompt: contextPrompt, 
      model: selectedModel,
      apiKey: userApiKey, // Pass user's API key if provided
      provider: provider, // Provider of the API key (google, openai, anthropic)
      autoSelectKey: autoSelectKey || false,
      userId: userId,
      hasExistingProject: existingFiles.length > 0 || isEdit, // Tell API if we're editing
    };
    
    console.log('[useGenerateProject] Calling /api/generate with:', {
      prompt: prompt.substring(0, 50) + '...',
      model: selectedModel,
      hasApiKey: !!userApiKey,
      provider: provider,
      autoSelectKey: autoSelectKey,
      hasUserId: !!userId,
      isEdit: isEdit,
      existingFilesCount: existingFiles.length,
    });
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: abortControllerRef.current.signal,
    });
    
    console.log('[useGenerateProject] Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[useGenerateProject] API Error:', error);
      throw new Error(error.error || 'Failed to generate project');
    }
    
    const result = await response.json();
    
    // Check if this was determined to be a chat message instead of generation
    if (result.isChat) {
      console.log('[useGenerateProject] Prompt is chat, not generation:', result.reason);
      // Return a special result that indicates chat should be used
      return {
        isChat: true,
        reason: result.reason,
        message: result.message,
        files: [],
        dependencies: {},
        devDependencies: {},
        expoConfig: {}
      };
    }
    
    setProgress({
      stage: 'generating',
      message: 'AI is creating your app...',
      progress: 50,
    });
    
    console.log('[useGenerateProject] API Result:', {
      filesCount: result.files?.length,
      hasExpoConfig: !!result.expoConfig,
      firstFile: result.files?.[0]?.path,
      expoName: result.expoConfig?.name,
      isEdit: isEdit
    });
    
    // Create initial project structure only if not editing
    const projectName = typeof result.expoConfig?.name === 'string' 
      ? result.expoConfig.name 
      : currentProject?.name || 'New Project';
    const projectSlug = typeof result.expoConfig?.slug === 'string'
      ? result.expoConfig.slug
      : currentProject?.slug || 'new-project';
    
    // Only create new project if not editing
    if (!isEdit) {
      setProject({
        id: crypto.randomUUID(),
        name: projectName,
        slug: projectSlug,
        description: '',
        files: [], // Start empty, files will be added progressively
        expo_config: result.expoConfig || {},
        dependencies: result.dependencies || {},
        dev_dependencies: result.devDependencies || {},
        status: 'generating',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    
    // Stream files one by one for visual effect AND add/update to project store
    for (let i = 0; i < result.files.length; i++) {
      const file = result.files[i];
      setProgress({
        stage: 'generating',
        message: isEdit ? `Updating ${file.path}...` : `Creating ${file.path}...`,
        progress: 50 + ((i + 1) / result.files.length) * 40,
        currentFile: file.path,
      });
      setStreamedFiles(prev => [...prev, file]);
      
      // Check if file exists in current project (for edit mode)
      const existingFile = currentProject?.files?.find(f => f.path === file.path);
      if (existingFile) {
        // Update existing file
        useProjectStore.getState().updateFileContent(file.path, file.content);
      } else {
        // Add new file
        addFile(file);
      }
      
      // Delay between files for visual feedback (longer for better UX)
      await new Promise(r => setTimeout(r, 300));
    }
    
    setProgress({
      stage: 'building',
      message: 'Preparing preview...',
      progress: 95,
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    setProgress({
      stage: 'complete',
      message: isEdit ? 'Project updated!' : 'Your app is ready!',
      progress: 100,
    });
    
    return result;
  };

  const mutation = useMutation({
    mutationFn: async (promptOrConfig: string | { prompt: string; model: AIModel; name?: string; description?: string; apiKey?: string; provider?: string; autoSelectKey?: boolean; userId?: string; isEdit?: boolean }) => {
      setLoading(true);
      setStreamedFiles([]);
      
      const prompt = typeof promptOrConfig === 'string' ? promptOrConfig : promptOrConfig.prompt;
      const selectedModel = typeof promptOrConfig === 'string' ? currentModel : promptOrConfig.model;
      const userApiKey = typeof promptOrConfig === 'string' ? undefined : promptOrConfig.apiKey;
      const provider = typeof promptOrConfig === 'string' ? undefined : promptOrConfig.provider;
      const autoSelectKey = typeof promptOrConfig === 'string' ? false : promptOrConfig.autoSelectKey;
      const userId = typeof promptOrConfig === 'string' ? undefined : promptOrConfig.userId;
      const isEdit = typeof promptOrConfig === 'string' ? false : promptOrConfig.isEdit;
      
      // Set flag to prevent project restoration during generation (user-isolated)
      if (typeof window !== 'undefined') {
        localStorage.setItem(getStorageKey('generating'), 'true');
      }
      
      // Only reset project for new generation, not for edits
      if (!isEdit) {
        resetProjectStore();
      }
      
      if (typeof promptOrConfig !== 'string') {
        setCurrentModel(selectedModel);
      }
      
      // Use real AI generation - throw error if it fails (no more silent fallback)
      try {
        return await generateWithAI(prompt, selectedModel, userApiKey, provider, autoSelectKey, userId, isEdit);
      } catch (error: any) {
        console.error('AI generation failed:', error);
        // Re-throw to show error to user instead of silently falling back to demo
        throw error;
      }
    },
    onSuccess: (result) => {
      setLoading(false);
      setProgress({
        stage: 'complete',
        message: 'Generation complete!',
        progress: 100,
      });
      
      // Log generation to database
      const promptText = typeof mutation.variables === 'string' 
        ? mutation.variables 
        : mutation.variables?.prompt;
      logGeneration(promptText, 'completed').catch(console.error);
      
      // Clear generation flag (user-isolated)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(getStorageKey('generating'));
      }
      
      // Get current project from store - files were already added progressively
      const currentProject = useProjectStore.getState().project;
      const isEditMode = typeof mutation.variables === 'object' && mutation.variables?.isEdit;
      
      if (currentProject) {
        const updatedProject = {
          ...currentProject,
          status: 'active',
          updated_at: new Date().toISOString(),
        };
        
        // Use setProjectWithBackup for edits to properly track changes
        if (isEditMode && promptText) {
          setProjectWithBackup(updatedProject, promptText);
        } else {
          setProject(updatedProject, true); // skipBackup=true for new projects
        }
      }
      
      onSuccess?.(result);
    },
    onError: (error: Error) => {
      setLoading(false);
      setProgress({
        stage: 'analyzing',
        message: 'Generation failed',
        progress: 0,
      });
      
      // Clear generation flag (user-isolated)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(getStorageKey('generating'));
      }
      
      // Log failed generation
      const promptText = typeof mutation.variables === 'string' 
        ? mutation.variables 
        : mutation.variables?.prompt;
      logGeneration(promptText, 'failed').catch(console.error);
      
      onError?.(error);
    },
  });

  const generateProject = useCallback(
    async (promptOrConfig: string | { prompt: string; model: AIModel; name?: string; description?: string; apiKey?: string; provider?: string; autoSelectKey?: boolean; userId?: string; isEdit?: boolean }) => {
      return await mutation.mutateAsync(promptOrConfig);
    },
    [mutation]
  );

  const generateWithConfig = useCallback(
    async (config: { prompt: string; model: AIModel; name?: string; description?: string; apiKey?: string; provider?: string; autoSelectKey?: boolean; userId?: string; isEdit?: boolean }) => {
      return await mutation.mutateAsync(config);
    },
    [mutation]
  );

  const reset = useCallback(() => {
    mutation.reset();
    setProgress({
      stage: 'analyzing',
      message: 'Ready to generate',
      progress: 0,
    });
    setStreamedFiles([]);
  }, [mutation]);

  return {
    generateProject,
    generateWithConfig,
    isGenerating: mutation.isPending,
    progress,
    streamedFiles,
    error: mutation.error,
    reset,
    currentModel,
    setCurrentModel,
    cancelGeneration,
  };
}

interface UseGenerateComponentOptions {
  projectId: string;
  onSuccess?: (file: GeneratedFile) => void;
  onError?: (error: Error) => void;
}

export function useGenerateComponent(options: UseGenerateComponentOptions) {
  const { projectId, onSuccess, onError } = options;
  const { addFile } = useProjectStore();

  const mutation = useMutation({
    mutationFn: async (prompt: string) => {
      const result = await api.generateComponent(prompt, projectId);
      return result.component;
    },
    onSuccess: (file) => {
      addFile(file);
      onSuccess?.(file);
    },
    onError,
  });

  const generateComponent = useCallback(
    (prompt: string) => {
      mutation.mutate(prompt);
    },
    [mutation]
  );

  return {
    generateComponent,
    isGenerating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
