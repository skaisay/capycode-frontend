'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Folder, 
  Clock, 
  Database, 
  Key, 
  Zap,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  Trash2,
  BarChart3,
  Loader2,
  RefreshCw,
  Check,
  Code2,
  Crown
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  getProjects, 
  createProject, 
  deleteProject, 
  getApiKeys, 
  createApiKey, 
  deleteApiKey, 
  getUserStats,
  DBProject,
  DBApiKey,
  UserStats
} from '@/lib/database';
import { 
  getUserSubscription, 
  getUsageStats, 
  canGenerate, 
  canCreateProject,
  logGeneration,
  STRIPE_PLANS,
  UserSubscription,
  UsageStats as StripeUsageStats,
  formatPrice
} from '@/lib/stripe';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'api' | 'settings'>('overview');
  
  // Welcome animation
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeComplete, setWelcomeComplete] = useState(false);
  
  // Real data from Supabase
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [apiKeys, setApiKeys] = useState<DBApiKey[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  
  // Subscription data
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usageStats, setUsageStats] = useState<StripeUsageStats | null>(null);
  
  // New project form
  const [newPrompt, setNewPrompt] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const hasText = newPrompt.length > 0;
  
  // AI Model selection for generation
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);
  
  // API Key form
  const [showApiForm, setShowApiForm] = useState(false);
  const [newApiKey, setNewApiKey] = useState<{ name: string; key: string; provider: 'openai' | 'anthropic' | 'google' | 'custom' }>({ name: '', key: '', provider: 'openai' });
  const [savingApiKey, setSavingApiKey] = useState(false);
  
  // Auto-detect provider from API key
  const detectProviderFromKey = (key: string): 'openai' | 'anthropic' | 'google' | 'custom' => {
    const trimmedKey = key.trim();
    if (trimmedKey.startsWith('sk-ant-') || trimmedKey.startsWith('sk-ant')) {
      return 'anthropic';
    } else if (trimmedKey.startsWith('sk-')) {
      return 'openai';
    } else if (trimmedKey.startsWith('AIza')) {
      return 'google';
    }
    return 'custom';
  };
  
  // Handle API key input with auto-detection
  const handleApiKeyChange = (key: string) => {
    const detectedProvider = detectProviderFromKey(key);
    setNewApiKey({ 
      ...newApiKey, 
      key, 
      provider: key.length > 3 ? detectedProvider : newApiKey.provider 
    });
  };

  useEffect(() => {
    checkUser();
    // Check if returning from successful payment
    checkPaymentSuccess();
    // Welcome animation timer
    const timer = setTimeout(() => {
      setShowWelcome(false);
      setTimeout(() => setWelcomeComplete(true), 500);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const checkPaymentSuccess = async () => {
    const success = searchParams.get('success');
    const sessionId = searchParams.get('session_id');
    
    if (success === 'true' && sessionId) {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        // Verify payment and update subscription
        const res = await fetch('/api/stripe/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ sessionId }),
        });
        
        const data = await res.json();
        
        if (data.success) {
          toast.success(`🎉 Welcome to ${data.plan_id.charAt(0).toUpperCase() + data.plan_id.slice(1)}!`);
          // Reload subscription data
          const subscriptionData = await getUserSubscription();
          setSubscription(subscriptionData);
        }
        
        // Clear URL params
        router.replace('/dashboard');
      } catch (error) {
        console.error('Payment verification error:', error);
      }
    }
  };

  const checkUser = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        router.push('/auth/login');
        return;
      }

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name,
        avatar_url: authUser.user_metadata?.avatar_url,
      });
      
      await loadUserData();
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    setLoadingData(true);
    try {
      const [projectsData, apiKeysData, statsData, subscriptionData, usageData] = await Promise.all([
        getProjects(),
        getApiKeys(),
        getUserStats(),
        getUserSubscription(),
        getUsageStats(),
      ]);
      setProjects(projectsData);
      setApiKeys(apiKeysData);
      setStats(statsData);
      setSubscription(subscriptionData);
      setUsageStats(usageData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const handleCreateProject = async () => {
    if (!newPrompt.trim()) {
      toast.error('Please enter a project description');
      return;
    }
    
    setCreatingProject(true);
    try {
      const project = await createProject({
        name: newPrompt.slice(0, 50) + (newPrompt.length > 50 ? '...' : ''),
        description: newPrompt,
        files: [],
      });
      
      toast.success('Project created!');
      
      // Clear previous chat history to start fresh for new project
      localStorage.removeItem('capycode_chat_history');
      
      // Store prompt in localStorage to avoid URL length limits
      localStorage.setItem('pending_prompt', newPrompt);
      localStorage.setItem('pending_model', selectedModel);
      if (selectedApiKeyId) {
        localStorage.setItem('pending_apiKeyId', selectedApiKeyId);
      }
      
      // Enable auto-key selection for the new project
      localStorage.setItem('pending_autoSelectKey', 'true');
      localStorage.setItem('pending_userId', user?.id || '');
      
      // Only pass project ID in URL - prompt is too long for URL
      router.push(`/editor?project=${project.id}`);
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      toast.success('Project deleted');
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleSaveApiKey = async () => {
    if (!newApiKey.name.trim() || !newApiKey.key.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setSavingApiKey(true);
    try {
      const key = await createApiKey({
        name: newApiKey.name,
        key: newApiKey.key,
        provider: newApiKey.provider,
      });
      setApiKeys([key, ...apiKeys]);
      setNewApiKey({ name: '', key: '', provider: 'openai' });
      setShowApiForm(false);
      toast.success('API key saved!');
    } catch (error) {
      toast.error('Failed to save API key');
    } finally {
      setSavingApiKey(false);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    
    try {
      await deleteApiKey(id);
      setApiKeys(apiKeys.filter(k => k.id !== id));
      toast.success('API key deleted');
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[#6b6b70]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] relative overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.06) 0%, transparent 70%)' }} />
      </div>

      {/* Header */}
      <header className="border-b border-[#1f1f23]/50 bg-[#0a0a0b]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="CapyCode" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-semibold text-white">CapyCode</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {(['overview', 'projects', 'api', 'settings'] as const).map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-sm transition-colors capitalize ${activeTab === tab ? 'text-white' : 'text-white/50 hover:text-white'}`}
              >
                {tab === 'api' ? 'API Keys' : tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/editor"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Link>
            
            <div className="relative group">
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#1f1f23] transition-colors">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </button>
              
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#111113] border border-[#1f1f23] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="p-3 border-b border-[#1f1f23]">
                  <p className="text-sm text-white font-medium truncate">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-[#6b6b70] truncate">{user?.email}</p>
                </div>
                <div className="p-2">
                  <Link href="/pricing" className="flex items-center gap-2 px-3 py-2 text-sm text-[#9a9aa0] hover:text-white hover:bg-[#1f1f23] rounded-lg transition-colors">
                    <Zap className="w-4 h-4" />
                    Upgrade Plan
                  </Link>
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#9a9aa0] hover:text-white hover:bg-[#1f1f23] rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-[#1f1f23] rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <>
            {/* Welcome Animation */}
            <div className="text-center pt-8 pb-12">
              <AnimatePresence mode="wait">
                {showWelcome ? (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.6 }}
                  >
                    <h1 className="text-4xl md:text-5xl font-semibold text-white mb-4">
                      Welcome back, <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{user?.full_name?.split(' ')[0] || 'Developer'}</span>
                    </h1>
                    <p className="text-lg text-white/40">What will you build today?</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-xl mx-auto"
                  >
                    <h2 className="text-2xl font-semibold text-white mb-6">
                      What will you build?
                    </h2>
                    
                    {/* Glowing Input like home page */}
                    <div className={`glow-input-wrapper ${hasText ? 'is-active' : ''}`}>
                      <div className="glow-border" />
                      <div className="glow-content">
                        <textarea
                          value={newPrompt}
                          onChange={(e) => setNewPrompt(e.target.value)}
                          placeholder="A task manager with categories, reminders, and dark mode..."
                          className="w-full h-28 px-5 py-4 bg-transparent text-base text-white placeholder-white/30 resize-none focus:outline-none"
                        />
                        <div className="flex items-center justify-between px-4 pb-3">
                          <div className="flex items-center gap-3">
                            {/* Model selector */}
                            <select
                              value={selectedModel}
                              onChange={(e) => setSelectedModel(e.target.value)}
                              className="bg-[#1a1a1d] border border-[#2a2a2e] rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-emerald-500/50"
                            >
                              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                              <option value="gpt-4o">GPT-4o</option>
                              <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                            </select>
                            {/* API Key selector */}
                            {apiKeys.length > 0 && (
                              <select
                                value={selectedApiKeyId || ''}
                                onChange={(e) => setSelectedApiKeyId(e.target.value || null)}
                                className="bg-[#1a1a1d] border border-[#2a2a2e] rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-emerald-500/50"
                              >
                                <option value="">Default API</option>
                                {apiKeys.map((key) => (
                                  <option key={key.id} value={key.id}>
                                    {key.name} ({key.provider})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <button
                            onClick={handleCreateProject}
                            disabled={creatingProject || !newPrompt.trim()}
                            className="gen-btn-container"
                          >
                            <div className="hover bt-1" />
                            <div className="hover bt-2" />
                            <div className="hover bt-3" />
                            <div className="hover bt-4" />
                            <div className="hover bt-5" />
                            <div className="hover bt-6" />
                            <div className="gen-btn">
                              {creatingProject ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <span className="btn-text-default">
                                    <Sparkles className="w-4 h-4" />
                                    Generate
                                  </span>
                                  <span className="btn-text-hover">Go! ✨</span>
                                </>
                              )}
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick examples */}
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {['Habit tracker', 'E-commerce', 'Social app', 'Weather app'].map((example) => (
                        <button
                          key={example}
                          onClick={() => setNewPrompt(example)}
                          className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-xs hover:bg-white/10 hover:text-white/60 transition-colors"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stats Grid - Real Data */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: welcomeComplete ? 1 : 0, y: welcomeComplete ? 0 : 20 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
              <div className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Folder className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6b6b70]">Total Projects</p>
                    <span className="text-2xl font-semibold text-white">{stats?.total_projects || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6b6b70]">AI Generations</p>
                    <span className="text-2xl font-semibold text-white">{stats?.total_generations || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6b6b70]">This Month</p>
                    <span className="text-2xl font-semibold text-white">{stats?.projects_this_month || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6b6b70]">API Keys</p>
                    <span className="text-2xl font-semibold text-white">{apiKeys.length}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Recent Projects */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: welcomeComplete ? 1 : 0, y: welcomeComplete ? 0 : 20 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2 bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Folder className="w-5 h-5 text-emerald-400" />
                    Recent Projects
                  </h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={loadUserData}
                      className="p-2 hover:bg-[#1f1f23] rounded-lg transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-4 h-4 text-[#6b6b70] ${loadingData ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                      onClick={() => setActiveTab('projects')}
                      className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      View all
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {loadingData ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-[#1f1f23] flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-[#4a4a4e]" />
                    </div>
                    <h3 className="text-white font-medium mb-2">No projects yet</h3>
                    <p className="text-[#6b6b70] text-sm">Use the form above to create your first project</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 5).map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-4 bg-[#0a0a0b]/50 hover:bg-[#1f1f23]/50 rounded-xl transition-colors group"
                      >
                        <Link
                          href={`/editor?project=${project.id}`}
                          className="flex items-center gap-4 flex-1"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                            <Folder className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-medium group-hover:text-emerald-400 transition-colors">
                              {project.name}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-[#6b6b70]">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(project.updated_at)}
                              </span>
                              <span>{project.files?.length || 0} files</span>
                            </div>
                          </div>
                        </Link>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: welcomeComplete ? 1 : 0, y: welcomeComplete ? 0 : 20 }}
                transition={{ delay: 0.3 }}
                className="space-y-6"
              >
                <div className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Quick Actions
                  </h2>
                  <div className="space-y-2">
                    <Link
                      href="/editor"
                      className="flex items-center gap-3 p-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 rounded-xl transition-colors"
                    >
                      <Plus className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Create New App</span>
                    </Link>
                    <button
                      onClick={() => setActiveTab('api')}
                      className="w-full flex items-center gap-3 p-3 hover:bg-[#1f1f23]/50 rounded-xl transition-colors"
                    >
                      <Key className="w-5 h-5 text-[#6b6b70]" />
                      <span className="text-[#9a9aa0]">Manage API Keys</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="w-full flex items-center gap-3 p-3 hover:bg-[#1f1f23]/50 rounded-xl transition-colors"
                    >
                      <Settings className="w-5 h-5 text-[#6b6b70]" />
                      <span className="text-[#9a9aa0]">Account Settings</span>
                    </button>
                  </div>
                </div>

                {/* Database Status */}
                <div className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-cyan-400" />
                    Database
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6b6b70] text-sm">Status</span>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-green-400 text-sm">Connected</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6b6b70] text-sm">Provider</span>
                      <span className="text-white text-sm">Supabase</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6b6b70] text-sm">Projects</span>
                      <span className="text-white text-sm">{stats?.total_projects || 0}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}

        {activeTab === 'projects' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">All Projects</h2>
              <Link
                href="/editor"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Project
              </Link>
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-20 bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl">
                <div className="w-20 h-20 rounded-2xl bg-[#1f1f23] flex items-center justify-center mx-auto mb-6">
                  <Folder className="w-10 h-10 text-[#4a4a4e]" />
                </div>
                <h3 className="text-xl text-white font-medium mb-2">No projects yet</h3>
                <p className="text-[#6b6b70] mb-6">Get started by creating your first AI-powered mobile app</p>
                <Link
                  href="/editor"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First App
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-6 hover:border-[#2a2a2e] transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                        <Folder className="w-7 h-7 text-emerald-400" />
                      </div>
                      <button 
                        onClick={() => handleDeleteProject(project.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                    <h3 className="text-white font-medium mb-2">{project.name}</h3>
                    <p className="text-[#6b6b70] text-sm mb-4 line-clamp-2">
                      {project.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#4a4a4e]">
                        {formatDate(project.updated_at)} • {project.files?.length || 0} files
                      </span>
                      <Link
                        href={`/editor?project=${project.id}`}
                        className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        Open
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'api' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">API Keys</h2>
                <p className="text-[#6b6b70] text-sm mt-1">Manage your AI provider API keys</p>
              </div>
              <button
                onClick={() => setShowApiForm(!showApiForm)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Key
              </button>
            </div>

            {/* Add API Key Form */}
            {showApiForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-6 mb-6"
              >
                <h3 className="text-lg font-medium text-white mb-4">Add New API Key</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm text-[#6b6b70] mb-2 block">Name</label>
                    <input
                      type="text"
                      value={newApiKey.name}
                      onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                      placeholder="My OpenAI Key"
                      className="w-full px-4 py-2.5 bg-[#0a0a0b] border border-[#1f1f23] rounded-lg text-white placeholder-[#4a4a4e] focus:border-emerald-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#6b6b70] mb-2 block">Provider</label>
                    <select
                      value={newApiKey.provider}
                      onChange={(e) => setNewApiKey({ ...newApiKey, provider: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-[#0a0a0b] border border-[#1f1f23] rounded-lg text-white focus:border-emerald-500/50 focus:outline-none"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google AI</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-[#6b6b70] mb-2 block">API Key</label>
                    <input
                      type="password"
                      value={newApiKey.key}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder="sk-... or AIza..."
                      className="w-full px-4 py-2.5 bg-[#0a0a0b] border border-[#1f1f23] rounded-lg text-white placeholder-[#4a4a4e] focus:border-emerald-500/50 focus:outline-none"
                    />
                    {newApiKey.key.length > 3 && (
                      <p className="text-xs text-emerald-500 mt-1">
                        Auto-detected: {newApiKey.provider === 'openai' ? 'OpenAI' : 
                                        newApiKey.provider === 'anthropic' ? 'Anthropic' : 
                                        newApiKey.provider === 'google' ? 'Google AI' : 'Custom'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowApiForm(false)}
                    className="px-4 py-2 text-[#9a9aa0] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveApiKey}
                    disabled={savingApiKey}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {savingApiKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Key
                  </button>
                </div>
              </motion.div>
            )}

            {/* API Keys List */}
            {apiKeys.length === 0 ? (
              <div className="text-center py-20 bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl">
                <div className="w-20 h-20 rounded-2xl bg-[#1f1f23] flex items-center justify-center mx-auto mb-6">
                  <Key className="w-10 h-10 text-[#4a4a4e]" />
                </div>
                <h3 className="text-xl text-white font-medium mb-2">No API keys yet</h3>
                <p className="text-[#6b6b70] mb-6">Add your AI provider API keys to enable code generation</p>
                <button
                  onClick={() => setShowApiForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Key
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-xl p-5 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                        <Key className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{key.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-[#6b6b70]">
                          <span className="capitalize">{key.provider}</span>
                          <span>•</span>
                          <span className="font-mono">{key.key_preview}</span>
                          <span>•</span>
                          <span>Added {formatDate(key.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteApiKey(key.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Account Settings</h2>
            
            <div className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-medium text-white mb-4">Profile</h3>
              <div className="flex items-center gap-6 mb-6">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-20 h-20 rounded-full" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center">
                    <span className="text-3xl text-white font-medium">
                      {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="text-lg text-white font-medium">{user?.full_name || 'User'}</h4>
                  <p className="text-[#6b6b70]">{user?.email}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#6b6b70] mb-2 block">Display Name</label>
                  <input
                    type="text"
                    defaultValue={user?.full_name || ''}
                    className="w-full max-w-md px-4 py-2.5 bg-[#0a0a0b] border border-[#1f1f23] rounded-lg text-white placeholder-[#4a4a4e] focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#6b6b70] mb-2 block">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full max-w-md px-4 py-2.5 bg-[#0a0a0b] border border-[#1f1f23] rounded-lg text-[#6b6b70] cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-6">
              <h3 className="text-lg font-medium text-white mb-4">Subscription</h3>
              
              {/* Current Plan */}
              <div className="flex items-center justify-between p-4 bg-[#0a0a0b] rounded-xl mb-4">
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    subscription?.plan_id === 'pro' 
                      ? 'bg-purple-500/10 text-purple-400' 
                      : subscription?.plan_id === 'team'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    Current Plan
                  </span>
                  <h4 className="text-lg text-white font-medium mt-2">
                    {STRIPE_PLANS[subscription?.plan_id || 'free'].name} Plan
                  </h4>
                  <p className="text-[#6b6b70] text-sm">
                    {subscription?.plan_id === 'free' 
                      ? `${3 - (usageStats?.generations_today || 0)} generations left today`
                      : 'Unlimited generations'}
                  </p>
                </div>
                {subscription?.plan_id === 'free' ? (
                  <Link
                    href="/pricing"
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg transition-all"
                  >
                    Upgrade
                  </Link>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        const supabase = getSupabaseClient();
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch('/api/stripe/portal', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${session?.access_token}`,
                          },
                        });
                        const { url } = await res.json();
                        if (url) window.location.href = url;
                      } catch (error) {
                        toast.error('Failed to open billing portal');
                      }
                    }}
                    className="px-4 py-2 bg-[#1f1f23] hover:bg-[#2a2a2e] text-white font-medium rounded-lg transition-colors"
                  >
                    Manage Billing
                  </button>
                )}
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[#0a0a0b] rounded-xl text-center">
                  <p className="text-2xl font-semibold text-white">{usageStats?.generations_today || 0}</p>
                  <p className="text-xs text-[#6b6b70]">Today</p>
                </div>
                <div className="p-4 bg-[#0a0a0b] rounded-xl text-center">
                  <p className="text-2xl font-semibold text-white">{usageStats?.generations_this_month || 0}</p>
                  <p className="text-xs text-[#6b6b70]">This Month</p>
                </div>
                <div className="p-4 bg-[#0a0a0b] rounded-xl text-center">
                  <p className="text-2xl font-semibold text-white">{usageStats?.projects_count || 0}</p>
                  <p className="text-xs text-[#6b6b70]">Projects</p>
                </div>
              </div>

              {/* Plan Features */}
              <div className="mt-4 pt-4 border-t border-[#1f1f23]">
                <p className="text-sm text-[#6b6b70] mb-2">Your plan includes:</p>
                <ul className="space-y-1">
                  {STRIPE_PLANS[subscription?.plan_id || 'free'].features.slice(0, 4).map((feature, i) => (
                    <li key={i} className="text-sm text-white/70 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mt-6">
              <h3 className="text-lg font-medium text-red-400 mb-2">Danger Zone</h3>
              <p className="text-[#6b6b70] text-sm mb-4">Once you delete your account, there is no going back.</p>
              <button className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors">
                Delete Account
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
