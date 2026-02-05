'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
  AlertTriangle, 
  History, 
  Activity, 
  Settings,
  ChevronUp,
  ChevronDown,
  X,
  Circle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Zap,
  Coins,
  Database,
  Server,
  Key,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { UserApiKey, PROVIDER_INFO, getStatusColor, getStatusLabel, getCachedKeyStatuses } from '@/lib/userApiKeys';
import { getApiKeys } from '@/lib/database';
import { useAuth } from '@/hooks/useAuth';

interface LogEntry {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  details?: string;
}

interface HistoryEntry {
  id: string;
  prompt: string;
  timestamp: Date;
  status: 'completed' | 'failed' | 'cancelled';
  creditsUsed: number;
}

interface DevToolsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  logs?: LogEntry[];
  history?: HistoryEntry[];
  projectStatus?: {
    name: string;
    status: 'idle' | 'generating' | 'building' | 'deployed';
    lastModified?: Date;
    filesCount: number;
  };
  credits?: {
    used: number;
    total: number;
    plan: string;
  };
}

type Tab = 'console' | 'terminal' | 'status' | 'history' | 'settings';

export function DevToolsPanel({ 
  isOpen, 
  onToggle,
  logs = [],
  history = [],
  projectStatus,
  credits
}: DevToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('console');
  const [panelHeight, setPanelHeight] = useState(280);
  const [userApiKeys, setUserApiKeys] = useState<UserApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  
  const { user } = useAuth();

  // Load user API keys
  useEffect(() => {
    if (user) {
      loadUserApiKeys();
    }
  }, [user]);

  const loadUserApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const keys = await getApiKeys();
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
      
      setUserApiKeys(mappedKeys);
    } catch (error) {
      console.error('Failed to load user API keys:', error);
    } finally {
      setLoadingKeys(false);
    }
  };

  // Use real data or show empty state - NO MORE MOCK DATA
  const realLogs = logs;
  const realHistory = history;
  
  const realProjectStatus = projectStatus || {
    name: 'No Project',
    status: 'idle' as const,
    filesCount: 0,
    lastModified: undefined
  };

  const realCredits = credits || {
    used: 0,
    total: 0,
    plan: 'Free'
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
      case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Circle className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'console', label: 'Console', icon: <Terminal className="w-3.5 h-3.5" />, badge: realLogs.filter(l => l.type === 'error').length || undefined },
    { id: 'terminal', label: 'Terminal', icon: <Server className="w-3.5 h-3.5" /> },
    { id: 'status', label: 'Status', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      {/* Toggle Bar (always visible at bottom) */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <button
          onClick={onToggle}
          className="w-full h-8 bg-[#111113]/95 backdrop-blur-xl border-t border-[#1f1f23]/50 flex items-center justify-center gap-2 text-[#6b6b70] hover:text-white transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">DevTools</span>
            {realLogs.filter(l => l.type === 'error').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-medium">
                {realLogs.filter(l => l.type === 'error').length}
              </span>
            )}
          </div>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Panel Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: panelHeight, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-8 left-0 right-0 z-10 bg-[#0d0d0f]/98 backdrop-blur-xl border-t border-[#1f1f23]/50 overflow-hidden"
          >
            {/* Resize Handle */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize group hover:bg-emerald-500/30 transition-colors"
              onMouseDown={(e) => {
                const startY = e.clientY;
                const startHeight = panelHeight;
                
                const onMouseMove = (e: MouseEvent) => {
                  const delta = startY - e.clientY;
                  setPanelHeight(Math.min(500, Math.max(150, startHeight + delta)));
                };
                
                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-[#2a2a2e] group-hover:bg-emerald-500/50 transition-colors" />
            </div>

            {/* Tabs */}
            <div className="h-10 px-3 flex items-center justify-between border-b border-[#1f1f23]/50">
              <div className="flex items-center gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === tab.id 
                        ? 'bg-[#1f1f23] text-white' 
                        : 'text-[#6b6b70] hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.badge && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-medium">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Credits indicator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1f1f23]/50 border border-[#2a2a2e]/50">
                  <Coins className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs text-white font-medium">€{(realCredits.total - realCredits.used).toFixed(2)}</span>
                  <span className="text-xs text-[#6b6b70]">/ €{realCredits.total}</span>
                </div>
                <button
                  onClick={onToggle}
                  className="p-1.5 rounded-lg text-[#6b6b70] hover:text-white hover:bg-[#1f1f23] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="h-[calc(100%-40px)] overflow-auto">
              {/* Console Tab */}
              {activeTab === 'console' && (
                <div className="p-3 space-y-1">
                  {realLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-[#6b6b70] text-sm">
                      <Terminal className="w-8 h-8 mb-2 opacity-30" />
                      <p>No logs yet</p>
                      <p className="text-xs mt-1">Logs will appear here when you generate or build</p>
                    </div>
                  ) : (
                    realLogs.map((log) => (
                      <div 
                        key={log.id}
                        className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-[#1f1f23]/50 transition-colors group"
                      >
                        {getLogIcon(log.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white font-medium">{log.message}</span>
                            <span className="text-[10px] text-[#6b6b70]">{formatTime(log.timestamp)}</span>
                          </div>
                          {log.details && (
                            <p className="text-[11px] text-[#6b6b70] mt-0.5">{log.details}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Terminal Tab */}
              {activeTab === 'terminal' && (
                <div className="p-3 h-full flex flex-col">
                  <div className="flex-1 rounded-lg bg-[#0a0a0b] border border-[#1f1f23]/50 p-3 font-mono text-xs overflow-auto">
                    <div className="text-emerald-400 mb-2">$ CapyCode AI Terminal v1.0</div>
                    <div className="text-[#6b6b70] mb-3">AI-powered terminal for project management</div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400">$</span>
                        <span className="text-[#9a9aa0]">expo start</span>
                        <span className="text-[#6b6b70] ml-2">→ Start development server</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400">$</span>
                        <span className="text-[#9a9aa0]">expo build</span>
                        <span className="text-[#6b6b70] ml-2">→ Build app with EAS</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400">$</span>
                        <span className="text-[#9a9aa0]">expo publish</span>
                        <span className="text-[#6b6b70] ml-2">→ Publish to stores</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400">$</span>
                        <span className="text-[#9a9aa0]">sync database</span>
                        <span className="text-[#6b6b70] ml-2">→ Sync with Supabase</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-[#1f1f23]/50">
                      <div className="text-yellow-400/80 text-[11px]">
                        ⚠️ Terminal commands are executed by AI assistant.
                        <br />Use chat to request: "run expo start" or "build my app"
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Tab */}
              {activeTab === 'status' && (
                <div className="p-4 space-y-4">
                  {/* Project Status */}
                  <div className="p-4 rounded-xl bg-[#1f1f23]/30 border border-[#2a2a2e]/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Project Status</span>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${
                        realProjectStatus.status === 'generating' ? 'bg-yellow-500/20 text-yellow-400' :
                        realProjectStatus.status === 'building' ? 'bg-blue-500/20 text-blue-400' :
                        realProjectStatus.status === 'deployed' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-[#2a2a2e] text-[#6b6b70]'
                      }`}>
                        <Circle className="w-2 h-2 fill-current" />
                        {realProjectStatus.status.charAt(0).toUpperCase() + realProjectStatus.status.slice(1)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-[#111113]/50 text-center">
                        <div className="text-lg font-bold text-white">{realProjectStatus.filesCount}</div>
                        <div className="text-[10px] text-[#6b6b70]">Files</div>
                      </div>
                      <div className="p-3 rounded-lg bg-[#111113]/50 text-center">
                        <Database className="w-5 h-5 mx-auto text-emerald-400" />
                        <div className="text-[10px] text-[#6b6b70] mt-1">Database</div>
                      </div>
                      <div className="p-3 rounded-lg bg-[#111113]/50 text-center">
                        <Server className="w-5 h-5 mx-auto text-blue-400" />
                        <div className="text-[10px] text-[#6b6b70] mt-1">API</div>
                      </div>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="p-4 rounded-xl bg-[#1f1f23]/30 border border-[#2a2a2e]/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Usage This Month</span>
                      <span className="text-xs text-emerald-400 font-medium">{realCredits.plan} Plan</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6b6b70]">Credits Used</span>
                        <span className="text-white font-medium">€{realCredits.used.toFixed(2)} / €{realCredits.total.toFixed(2)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#1f1f23] overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                          style={{ width: `${realCredits.total > 0 ? (realCredits.used / realCredits.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="p-3 space-y-1">
                  {realHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-[#6b6b70] text-sm">
                      <History className="w-8 h-8 mb-2 opacity-30" />
                      <p>No history yet</p>
                      <p className="text-xs mt-1">Your generation history will appear here</p>
                    </div>
                  ) : (
                    realHistory.map((entry) => (
                      <div 
                        key={entry.id}
                        className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-[#1f1f23]/50 transition-colors group cursor-pointer"
                      >
                        <div className={`mt-0.5 ${
                          entry.status === 'completed' ? 'text-emerald-400' :
                          entry.status === 'failed' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {entry.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                           entry.status === 'failed' ? <XCircle className="w-4 h-4" /> :
                           <Clock className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-medium truncate">{entry.prompt}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-[#6b6b70]">{formatTime(entry.timestamp)}</span>
                            <span className="text-[10px] text-yellow-400">-€{entry.creditsUsed.toFixed(2)}</span>
                          </div>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#6b6b70] hover:text-white transition-all">
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="p-4 space-y-4">
                  {/* User API Keys Section */}
                  <div className="p-4 rounded-xl bg-[#1f1f23]/30 border border-[#2a2a2e]/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-medium text-white">Your API Keys</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={loadUserApiKeys}
                          disabled={loadingKeys}
                          className="p-1.5 rounded-lg hover:bg-[#2a2a2e] transition-colors"
                          title="Refresh keys"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-[#6b6b70] ${loadingKeys ? 'animate-spin' : ''}`} />
                        </button>
                        <a
                          href="/dashboard#api-keys"
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-medium hover:bg-blue-500/20 transition-colors"
                        >
                          Manage
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    
                    {userApiKeys.length === 0 ? (
                      <div className="py-6 text-center">
                        <Key className="w-8 h-8 text-[#3a3a3e] mx-auto mb-2" />
                        <p className="text-xs text-[#6b6b70]">No API keys added yet</p>
                        <a
                          href="/dashboard#api-keys"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Add your first key
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {userApiKeys.map((key) => (
                          <div
                            key={key.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-[#111113]/50 border-[#2a2a2e]/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(key.status)}`} />
                              <div>
                                <div className="text-xs font-medium text-white">{key.name}</div>
                                <div className="text-[10px] text-[#6b6b70]">
                                  {PROVIDER_INFO[key.provider]?.name} • {key.keyPreview}
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              key.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                              key.status === 'quota_exceeded' ? 'bg-yellow-500/10 text-yellow-400' :
                              key.status === 'error' ? 'bg-red-500/10 text-red-400' :
                              'bg-[#2a2a2e] text-[#6b6b70]'
                            }`}>
                              {getStatusLabel(key.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Default Models Section */}
                  <div className="p-4 rounded-xl bg-[#1f1f23]/30 border border-[#2a2a2e]/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">Default Models</h3>
                      <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-500/10">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-medium">Auto-select</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#6b6b70]">
                      AI automatically selects the best model based on your request complexity
                    </p>
                    <div className="space-y-2">
                      {[
                        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Quick tasks, small changes', speed: 'Fast', available: true },
                        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Balanced performance', speed: 'Medium', available: true },
                        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Complex apps, large features', speed: 'Thorough', available: true },
                      ].map((model) => (
                        <div
                          key={model.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            model.available 
                              ? 'bg-[#111113]/50 border-[#2a2a2e]/50' 
                              : 'bg-[#111113]/30 border-[#2a2a2e]/30 opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${model.available ? 'bg-emerald-500' : 'bg-[#6b6b70]'}`} />
                            <div>
                              <div className="text-xs font-medium text-white">{model.name}</div>
                              <div className="text-[10px] text-[#6b6b70]">{model.desc}</div>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            model.speed === 'Fast' ? 'bg-emerald-500/10 text-emerald-400' :
                            model.speed === 'Medium' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-purple-500/10 text-purple-400'
                          }`}>
                            {model.speed}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1f1f23]/30 border border-[#2a2a2e]/50 space-y-3">
                    <h3 className="text-sm font-medium text-white">Quick Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#111113]/50 border border-[#2a2a2e]/50 text-[#6b6b70] hover:text-white hover:border-[#3a3a3e] transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear Console
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#111113]/50 border border-[#2a2a2e]/50 text-[#6b6b70] hover:text-white hover:border-[#3a3a3e] transition-all">
                        <History className="w-3.5 h-3.5" />
                        Clear History
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
