'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { 
  Smartphone,
  Code2,
  Rocket,
  X,
  Loader2,
  Home,
  FolderOpen,
  Download,
  ExternalLink,
  GripVertical,
  QrCode,
  LayoutDashboard,
  LogOut,
  Share2
} from 'lucide-react';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { DiffEditor } from './DiffEditor';
import { Preview } from './Preview';
import { AIPromptPanel } from './AIPromptPanel';
import { BuildPanel } from './BuildPanel';
import { DevToolsPanel } from './DevToolsPanel';
import { ExpoQRModal } from './ExpoQRModal';
import { ShareSubmitModal } from './ShareSubmitModal';

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
import { useProjectStore } from '@/stores/projectStore';
import { useGenerateProject } from '@/hooks/useGenerateProject';
import { useDevToolsData } from '@/hooks/useDevToolsData';
import { useElementSelectorStore } from '@/stores/elementSelectorStore';
import { getSupabaseClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export function IDELayout() {
  const searchParams = useSearchParams();
  // Read prompt from localStorage instead of URL to avoid URI_TOO_LONG errors
  const [initialPrompt, setInitialPrompt] = useState('');
  const [initialModel, setInitialModel] = useState<string | null>(null);
  const [initialApiKeyId, setInitialApiKeyId] = useState<string | null>(null);
  const [autoSelectKey, setAutoSelectKey] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [shouldRestoreProject, setShouldRestoreProject] = useState(false);
  
  // Load pending prompt from localStorage on mount
  useEffect(() => {
    const pendingPrompt = localStorage.getItem('pending_prompt');
    const pendingModel = localStorage.getItem('pending_model');
    const pendingApiKeyId = localStorage.getItem('pending_apiKeyId');
    const pendingAutoSelect = localStorage.getItem('pending_autoSelectKey');
    const pendingUser = localStorage.getItem('pending_userId');
    
    if (pendingPrompt) {
      // New project generation - CLEAR old project data first!
      resetProject();
      
      setInitialPrompt(pendingPrompt);
      setInitialModel(pendingModel);
      setInitialApiKeyId(pendingApiKeyId);
      setAutoSelectKey(pendingAutoSelect === 'true');
      setPendingUserId(pendingUser);
      // Clear after reading to avoid re-triggering
      localStorage.removeItem('pending_prompt');
      localStorage.removeItem('pending_model');
      localStorage.removeItem('pending_apiKeyId');
      localStorage.removeItem('pending_autoSelectKey');
      localStorage.removeItem('pending_userId');
    } else {
      // No pending prompt - we can restore previous project
      setShouldRestoreProject(true);
    }
  }, [resetProject]);
  
  const [activeView, setActiveView] = useState<'preview' | 'code' | 'build'>('preview');
  const [showFiles, setShowFiles] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showExpoQR, setShowExpoQR] = useState(false);
  const [showShareSubmit, setShowShareSubmit] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Diff view state - shows differences between old and new file content
  const [diffState, setDiffState] = useState<{
    isOpen: boolean;
    filePath: string;
    originalContent: string;
    modifiedContent: string;
  } | null>(null);
  
  const { 
    project, 
    currentFile, 
    setCurrentFile,
    updateFileContent,
    isLoading,
    loadProject,
    reset: resetProject
  } = useProjectStore();

  const { generateProject, isGenerating, progress, cancelGeneration } = useGenerateProject();
  
  // Track if we're in a generation session (even after component re-renders)
  // Check localStorage directly since initialPrompt isn't set yet at component mount
  const [generationStarted, setGenerationStarted] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('pending_prompt');
    }
    return false;
  });
  
  // Mark generation as started when isGenerating becomes true
  useEffect(() => {
    if (isGenerating) {
      setGenerationStarted(true);
    }
  }, [isGenerating]);
  
  // Restore previous project ONLY if:
  // 1. No pending prompt (not a new generation)
  // 2. No generation is in progress
  // 3. Generation hasn't been started in this session
  // 4. No active generation flag in localStorage
  useEffect(() => {
    const isGeneratingInStorage = typeof window !== 'undefined' && localStorage.getItem(getStorageKey('generating')) === 'true';
    
    if (shouldRestoreProject && !project && !isGenerating && !generationStarted && !initialPrompt && !isGeneratingInStorage) {
      const currentProjectId = localStorage.getItem(getStorageKey('current_project_id'));
      if (currentProjectId) {
        console.log('[IDELayout] Restoring project:', currentProjectId);
        loadProject(currentProjectId);
      }
    }
  }, [shouldRestoreProject, project, loadProject, isGenerating, generationStarted, initialPrompt]);
  
  // Element selector store for AI chat integration
  const { selectedElements, getSelectionDescription, clearSelectedElements } = useElementSelectorStore();
  
  // State for element selection text to inject into AI prompt
  const [elementSelectionText, setElementSelectionText] = useState('');
  
  // Handle element selection from Preview
  const handleElementSelected = useCallback((description: string) => {
    setElementSelectionText(description);
  }, []);
  
  // DevTools data - real subscription and usage from Supabase
  const { logs, history, credits, addLog, clearLogs, refreshData } = useDevToolsData();

  // Check auth status
  useEffect(() => {
    const checkUser = async () => {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, []);

  // Auto-generate if prompt provided from localStorage
  // NOTE: We just pass initialPrompt to AIPromptPanel, which handles the generation
  // This ensures chat messages are properly displayed
  useEffect(() => {
    if (initialPrompt) {
      // Store model/apiKeyId for AIPromptPanel to read
      if (initialModel) {
        localStorage.setItem('selected_model', initialModel);
      }
      if (initialApiKeyId) {
        localStorage.setItem('selected_user_key', initialApiKeyId);
      }
      // Store auto-select settings
      if (autoSelectKey) {
        localStorage.setItem('auto_select_key', 'true');
      }
      if (pendingUserId) {
        localStorage.setItem('pending_user_id', pendingUserId);
      }
    }
  }, [initialPrompt, initialModel, initialApiKeyId, autoSelectKey, pendingUserId]);

  const handleSave = useCallback(() => {
    toast.success('Changes saved');
  }, []);

  // When file is selected, switch to code view (keep file menu open)
  const handleFileSelect = (file: any) => {
    setCurrentFile(file);
    setActiveView('code');
    // Don't close file menu - user may want to browse more files
  };

  // Navigate to file by path (from AI chat)
  const handleFileClick = useCallback((filePath: string) => {
    if (!project) return;
    
    // Find the file in project
    const file = project.files.find(f => f.path === filePath);
    if (file) {
      setCurrentFile(file);
      setActiveView('code');
      setShowFiles(true); // Show file tree
    }
  }, [project, setCurrentFile]);

  // Open diff view to compare old and new content
  const openDiffView = useCallback((filePath: string, originalContent: string, modifiedContent: string) => {
    setDiffState({
      isOpen: true,
      filePath,
      originalContent,
      modifiedContent
    });
    setActiveView('code');
  }, []);

  // Accept diff changes - update file content
  const handleDiffAccept = useCallback((content: string) => {
    if (diffState) {
      updateFileContent(diffState.filePath, content);
      setDiffState(null);
      toast.success('Изменения приняты');
    }
  }, [diffState, updateFileContent]);

  // Reject diff changes
  const handleDiffReject = useCallback(() => {
    setDiffState(null);
    toast('Изменения отклонены');
  }, []);

  // Close diff view
  const handleDiffClose = useCallback(() => {
    setDiffState(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setActiveView('preview');
      }
      // Toggle DevTools with Ctrl+`
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault();
        setShowDevTools(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
    <div className="h-screen w-screen bg-[#0a0a0b] flex overflow-hidden select-none">
      <PanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - AI Chat (Resizable) */}
        <Panel defaultSize={25} minSize={18} maxSize={40}>
          <div className="h-full p-3 pr-0">
            <div className="h-full rounded-2xl bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 overflow-hidden flex flex-col shadow-2xl shadow-black/40">
              <AIPromptPanel 
                isGenerating={isGenerating}
                progress={progress}
                initialPrompt={initialPrompt}
                onStopGeneration={cancelGeneration}
                elementSelectionText={elementSelectionText}
                onClearElementSelection={() => {
                  setElementSelectionText('');
                  clearSelectedElements();
                }}
                onFileClick={handleFileClick}
                onOpenDiff={openDiffView}
              />
            </div>
          </div>
        </Panel>

        {/* Resize Handle for Chat */}
        <PanelResizeHandle className="w-3 flex items-center justify-center group cursor-col-resize">
          <div className="w-1 h-12 rounded-full bg-[#2a2a2e] group-hover:bg-emerald-500/50 group-active:bg-emerald-500 transition-colors" />
        </PanelResizeHandle>

        {/* Right Panel - Preview/Code/Build */}
        <Panel defaultSize={75}>
          <div className="h-full p-3 pl-0 flex flex-col gap-3">
            {/* Top Controls */}
            <div className="flex items-center justify-between shrink-0">
              {/* Left controls */}
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-xl p-1">
                  <button
                    onClick={() => setActiveView('preview')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeView === 'preview' 
                        ? 'bg-[#1f1f23] text-white shadow-lg' 
                        : 'text-[#6b6b70] hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => setActiveView('code')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeView === 'code' 
                        ? 'bg-[#1f1f23] text-white shadow-lg' 
                        : 'text-[#6b6b70] hover:text-white'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Code
                  </button>
                  <button
                    onClick={() => setActiveView('build')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeView === 'build' 
                        ? 'bg-[#1f1f23] text-white shadow-lg' 
                        : 'text-[#6b6b70] hover:text-white'
                    }`}
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    Build
                  </button>
                </div>

                {/* Files button */}
                <button
                  onClick={() => setShowFiles(!showFiles)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border backdrop-blur-xl transition-all ${
                    showFiles 
                      ? 'bg-[#1f1f23] border-[#2a2a2e] text-white' 
                      : 'bg-[#111113]/80 border-[#1f1f23]/50 text-[#6b6b70] hover:text-white hover:border-[#2a2a2e]'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Files
                </button>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-2">
                {/* Dashboard button with home icon */}
                {user ? (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 text-[#6b6b70] hover:text-white hover:border-[#2a2a2e] transition-all"
                    title="Back to Dashboard"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <LayoutDashboard className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    href="/auth/login"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 text-[#6b6b70] hover:text-white hover:border-[#2a2a2e] transition-all"
                  >
                    Log in
                  </Link>
                )}
                
                {/* Expo QR Button - Open on Mobile */}
                <button
                  onClick={() => setShowExpoQR(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/20"
                  title="Test with Expo Go"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Open on mobile
                </button>
                
                {/* Share / Submit Button */}
                <button
                  onClick={() => setShowShareSubmit(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all shadow-lg shadow-purple-500/20"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Publish
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex gap-3 min-h-0">
              {/* Files Panel (slide out with resize) */}
              <AnimatePresence>
                {showFiles && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 overflow-hidden flex"
                  >
                    <div className="h-full w-[260px] rounded-2xl bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 flex flex-col overflow-hidden shadow-2xl shadow-black/40">
                      {/* Header */}
                      <div className="h-12 px-4 flex items-center justify-between border-b border-[#1f1f23]/50 shrink-0">
                        <span className="text-sm font-medium text-white">Files</span>
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded-lg text-[#6b6b70] hover:text-white hover:bg-[#1f1f23] transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setShowFiles(false)}
                            className="p-1.5 rounded-lg text-[#6b6b70] hover:text-white hover:bg-[#1f1f23] transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* File Tree */}
                      <div className="flex-1 overflow-auto p-2">
                        {project ? (
                          <FileTree 
                            files={project.files}
                            activeFile={currentFile?.path}
                            onFileSelect={handleFileSelect}
                          />
                        ) : (
                          <div className="p-4 text-center text-[#6b6b70] text-sm">
                            {isGenerating ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Generating...</span>
                              </div>
                            ) : (
                              <span>No files yet</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Resize handle for files */}
                    <div className="w-3 flex items-center justify-center cursor-col-resize group">
                      <div className="w-1 h-12 rounded-full bg-[#2a2a2e] group-hover:bg-emerald-500/50 transition-colors" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main View with Glow Effect */}
              <div className={`flex-1 rounded-2xl overflow-hidden relative shadow-2xl shadow-black/40 transition-all duration-500 ${
                isGenerating ? 'preview-glow' : ''
              }`}>
                {/* Glow border effect when generating */}
                <div className={`absolute inset-0 rounded-2xl pointer-events-none z-10 transition-opacity duration-500 ${
                  isGenerating ? 'opacity-100' : 'opacity-0'
                }`}>
                  <div className="absolute inset-0 rounded-2xl border-2 border-emerald-500/50 animate-pulse" />
                  <div className="absolute inset-[-2px] rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 blur-xl animate-pulse" />
                </div>
                
                {/* Content container */}
                <div className={`h-full w-full bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl overflow-hidden relative ${
                  showDevTools ? 'pb-[288px]' : 'pb-8'
                }`}>
                  {activeView === 'preview' && (
                    <Preview 
                      project={project} 
                      isGenerating={isGenerating} 
                      onElementSelected={handleElementSelected}
                    />
                  )}
                  {activeView === 'code' && (
                    diffState?.isOpen ? (
                      <DiffEditor
                        originalContent={diffState.originalContent}
                        modifiedContent={diffState.modifiedContent}
                        fileName={diffState.filePath}
                        language={diffState.filePath.endsWith('.tsx') || diffState.filePath.endsWith('.ts') ? 'typescript' : 'javascript'}
                        onAccept={handleDiffAccept}
                        onReject={handleDiffReject}
                        onClose={handleDiffClose}
                      />
                    ) : (
                      <CodeEditor 
                        file={currentFile}
                        onChange={updateFileContent}
                      />
                    )
                  )}
                  {activeView === 'build' && (
                    <BuildPanel project={project} />
                  )}
                  
                  {/* DevTools Panel */}
                  <DevToolsPanel 
                    isOpen={showDevTools}
                    onToggle={() => setShowDevTools(!showDevTools)}
                    logs={logs}
                    history={history.map(h => ({
                      id: h.id,
                      prompt: h.prompt,
                      timestamp: h.timestamp,
                      status: h.status,
                      creditsUsed: h.creditsUsed,
                    }))}
                    projectStatus={{
                      name: project?.name || 'No Project',
                      status: isGenerating ? 'generating' : 'idle',
                      filesCount: project?.files?.length || 0,
                      lastModified: new Date()
                    }}
                    credits={credits}
                  />
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </PanelGroup>
      
      {/* Expo QR Modal */}
      <ExpoQRModal 
        isOpen={showExpoQR}
        onClose={() => setShowExpoQR(false)}
        projectId={project?.id}
        projectName={project?.name}
      />
      
      {/* Share/Submit Modal */}
      <ShareSubmitModal
        isOpen={showShareSubmit}
        onClose={() => setShowShareSubmit(false)}
        projectId={project?.id}
        projectName={project?.name}
        projectFiles={project?.files}
      />
    </div>
  );
}
