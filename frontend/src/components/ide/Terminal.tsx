'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal as TerminalIcon, 
  X, 
  Minimize2, 
  Maximize2, 
  Play,
  Square,
  Loader2,
  QrCode,
  Smartphone,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useSandbox, TerminalOutput } from '@/lib/sandbox';
import { useProjectStore } from '@/stores/projectStore';

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export function Terminal({ isOpen, onClose, projectId }: TerminalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [filesUploaded, setFilesUploaded] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    session, 
    isLoading, 
    error, 
    terminalOutput, 
    expoServer,
    createSession,
    uploadFiles,
    executeCommand,
    startExpo,
    stopExpo
  } = useSandbox(projectId || null);

  const project = useProjectStore(state => state.project);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Focus input when terminal opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Initialize session when opening
  useEffect(() => {
    if (isOpen && !session && projectId) {
      createSession();
    }
  }, [isOpen, session, projectId, createSession]);

  // Upload project files when session is ready
  useEffect(() => {
    if (session?.status === 'ready' && project?.files && Array.isArray(project.files) && !filesUploaded && !isUploadingFiles) {
      setIsUploadingFiles(true);
      
      const sandboxFiles = project.files.map((file: { path: string; content: string }) => ({
        path: file.path,
        content: file.content,
      }));
      
      // Ensure essential files exist
      const hasPackageJson = sandboxFiles.some(f => f.path === 'package.json');
      const hasAppJson = sandboxFiles.some(f => f.path === 'app.json');
      const projectName = project.name || 'myapp';
      const projectSlug = project.slug || projectName.toLowerCase().replace(/\s+/g, '-');
      
      if (!hasPackageJson) {
        console.log('[Terminal] Adding missing package.json');
        sandboxFiles.push({
          path: 'package.json',
          content: JSON.stringify({
            name: projectSlug,
            version: '1.0.0',
            main: 'node_modules/expo/AppEntry.js',
            scripts: {
              start: 'expo start',
              android: 'expo start --android',
              ios: 'expo start --ios',
              web: 'expo start --web'
            },
            dependencies: {
              'expo': '~50.0.0',
              'expo-status-bar': '~1.11.1',
              'react': '18.2.0',
              'react-native': '0.73.2',
              '@react-navigation/native': '^6.1.9',
              '@react-navigation/native-stack': '^6.9.17',
              'react-native-safe-area-context': '4.8.2',
              'react-native-screens': '~3.29.0',
              '@expo/vector-icons': '^14.0.0'
            },
            devDependencies: {
              '@babel/core': '^7.20.0',
              '@types/react': '~18.2.45',
              'typescript': '^5.1.3'
            },
            private: true
          }, null, 2)
        });
      }
      
      if (!hasAppJson) {
        console.log('[Terminal] Adding missing app.json');
        sandboxFiles.push({
          path: 'app.json',
          content: JSON.stringify({
            expo: {
              name: projectName,
              slug: projectSlug,
              version: '1.0.0',
              orientation: 'portrait',
              icon: './assets/icon.png',
              userInterfaceStyle: 'dark',
              splash: {
                image: './assets/splash.png',
                resizeMode: 'contain',
                backgroundColor: '#0a0a0b'
              },
              ios: {
                supportsTablet: true,
                bundleIdentifier: `com.capycode.${projectSlug}`
              },
              android: {
                adaptiveIcon: {
                  foregroundImage: './assets/adaptive-icon.png',
                  backgroundColor: '#0a0a0b'
                },
                package: `com.capycode.${projectSlug}`
              }
            }
          }, null, 2)
        });
      }
      
      console.log('[Terminal] Uploading', sandboxFiles.length, 'files to sandbox...');
      
      uploadFiles(sandboxFiles)
        .then(() => {
          console.log('[Terminal] Files uploaded successfully!');
          setFilesUploaded(true);
        })
        .catch((err) => {
          console.error('[Terminal] Failed to upload files:', err);
        })
        .finally(() => {
          setIsUploadingFiles(false);
        });
    }
  }, [session, project, uploadFiles, filesUploaded, isUploadingFiles]);

  const handleCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return;

    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    setCommandInput('');

    // Special commands
    if (cmd === 'clear') {
      return;
    }

    if (cmd === 'expo start' || cmd === 'npx expo start') {
      await startExpo();
      return;
    }

    if (cmd === 'expo stop') {
      await stopExpo();
      return;
    }

    // Regular command
    try {
      await executeCommand(cmd);
    } catch (error: any) {
      console.error('Command failed:', error);
    }
  }, [executeCommand, startExpo, stopExpo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(commandInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCommandInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommandInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      }
    }
  };

  const renderOutput = (output: TerminalOutput, index: number) => {
    const colorClass = output.type === 'stderr' 
      ? 'text-red-400' 
      : output.type === 'exit' 
        ? 'text-yellow-400'
        : 'text-gray-300';

    return (
      <div key={index} className={`font-mono text-sm ${colorClass} whitespace-pre-wrap`}>
        {output.data}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 300, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 300, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed bottom-0 left-0 right-0 z-50 ${isMinimized ? 'h-10' : 'h-80'}`}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-t border-[#2d2d44]">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white font-medium">Terminal</span>
            {session && (
              <span className="text-xs text-gray-500 ml-2">
                {session.id.slice(0, 12)}...
              </span>
            )}
            {isUploadingFiles && (
              <span className="text-xs text-yellow-400 ml-2 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Uploading files...
              </span>
            )}
            {filesUploaded && !isUploadingFiles && (
              <span className="text-xs text-green-400 ml-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Files ready
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Expo Status */}
            {expoServer && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">Expo Running</span>
              </div>
            )}

            {/* Quick Actions - only show Start Expo after files are uploaded */}
            {session && !expoServer && filesUploaded && (
              <button
                onClick={startExpo}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1 bg-violet-500/20 hover:bg-violet-500/30 
                           rounded-full text-violet-400 text-xs transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Start Expo
              </button>
            )}

            {expoServer && (
              <button
                onClick={stopExpo}
                className="flex items-center gap-1 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 
                           rounded-full text-red-400 text-xs transition-colors"
              >
                <Square className="w-3 h-3" />
                Stop
              </button>
            )}

            {/* Window Controls */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/10 rounded"
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4 text-gray-400" />
              ) : (
                <Minimize2 className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        {!isMinimized && (
          <div className="flex h-[calc(100%-40px)] bg-[#0d0d1a]">
            {/* Main Terminal */}
            <div className="flex-1 flex flex-col">
              {/* Output Area */}
              <div 
                ref={terminalRef}
                className="flex-1 p-4 overflow-y-auto font-mono text-sm"
                onClick={() => inputRef.current?.focus()}
              >
                {/* Welcome Message */}
                <div className="text-gray-500 mb-2">
                  CapyCode Terminal v1.0 - Powered by E2B
                </div>
                <div className="text-gray-500 mb-4">
                  Type 'expo start' to run your app, or any npm/node command.
                </div>

                {/* Error State */}
                {error && (
                  <div className="flex items-center gap-2 text-red-400 mb-4 p-3 bg-red-500/10 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {/* Loading State */}
                {isLoading && !session && (
                  <div className="flex items-center gap-2 text-violet-400 mb-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating sandbox environment...
                  </div>
                )}

                {/* Terminal Output */}
                {terminalOutput.map((output, index) => renderOutput(output, index))}
              </div>

              {/* Input Area */}
              <div className="flex items-center p-2 border-t border-[#2d2d44]">
                <span className="text-green-400 mr-2">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!session || isLoading}
                  placeholder={session ? "Enter command..." : "Waiting for session..."}
                  className="flex-1 bg-transparent text-white font-mono text-sm 
                             outline-none placeholder-gray-600"
                />
              </div>
            </div>

            {/* QR Code Panel (when Expo is running) */}
            {expoServer && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 250, opacity: 1 }}
                className="border-l border-[#2d2d44] p-4 flex flex-col items-center justify-center"
              >
                <div className="text-center mb-4">
                  <Smartphone className="w-8 h-8 text-violet-400 mx-auto mb-2" />
                  <h3 className="text-white font-medium">Scan with Expo Go</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Open Expo Go app and scan this code
                  </p>
                </div>

                {/* QR Code */}
                <div className="bg-white p-3 rounded-xl">
                  <img 
                    src={expoServer.qrCode} 
                    alt="Expo QR Code"
                    className="w-40 h-40"
                  />
                </div>

                {/* Direct URL */}
                <div className="mt-4 w-full">
                  <p className="text-xs text-gray-500 mb-1">Or open directly:</p>
                  <a 
                    href={expoServer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 
                               break-all"
                  >
                    {expoServer.url.slice(0, 30)}...
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default Terminal;
