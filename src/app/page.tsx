'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Smartphone, 
  Zap, 
  Code2, 
  Rocket, 
  ArrowRight,
  Clock,
  FileCode,
  Trash2,
  FolderOpen,
  LayoutDashboard,
  LogOut
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { getSupabaseClient } from '@/lib/supabase';
import { CreateProjectModal, ProjectData } from '@/components/CreateProjectModal';
import { useGenerateProject } from '@/hooks/useGenerateProject';

interface UserData {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const hasText = prompt.length > 0;
  const { recentProjects, loadProject, deleteRecentProject } = useProjectStore();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { generateProject, isGenerating } = useGenerateProject({
    onSuccess: () => {
      router.push('/editor');
    },
  });

  useEffect(() => {
    setMounted(true);
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name,
          avatar_url: authUser.user_metadata?.avatar_url,
        });
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setUserLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setShowCreateModal(true);
  };

  const handleCreateProject = async (data: ProjectData) => {
    generateProject({
      prompt: data.prompt,
      model: data.model,
      name: data.name,
      description: data.description,
    });
    setShowCreateModal(false);
    router.push('/editor');
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleOpenProject = (id: string) => {
    loadProject(id);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] relative overflow-hidden">
      {/* Dimming overlay when typing - covers everything including header */}
      <div 
        className={`fixed inset-0 bg-black/70 z-[100] transition-opacity duration-500 ${hasText ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Background - subtle depth */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#0a0a0b]" />
        <div 
          className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
          }}
        />
        <div 
          className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)',
          }}
        />
        <div 
          className="absolute bottom-[-20%] left-[30%] w-[1000px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, rgba(59,130,246,0.05) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Header - TRUE blur fade using single element with gradient mask */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div 
          className="absolute inset-x-0 top-0 h-32 backdrop-blur-xl"
          style={{
            background: 'linear-gradient(to bottom, rgba(10,10,11,0.9) 0%, rgba(10,10,11,0.7) 40%, rgba(10,10,11,0.3) 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
          }}
        />
        
        <div className="relative max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8">
              {/* Loader - visible by default, hidden on hover */}
              <div className="capy-loader absolute inset-0 transition-opacity duration-300 group-hover:opacity-0">
                <div className="shape" />
              </div>
              {/* Logo - hidden by default, visible on hover */}
              <Image 
                src="/logo.png" 
                alt="CapyCode" 
                width={32} 
                height={32}
                className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">CapyCode</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/features" className="text-white/50 hover:text-white transition-colors text-sm">Features</Link>
            <Link href="/pricing" className="text-white/50 hover:text-white transition-colors text-sm">Pricing</Link>
            <Link href="/docs" className="text-white/50 hover:text-white transition-colors text-sm">Docs</Link>
          </nav>

          <div className="flex items-center gap-4">
            {userLoading ? (
              <div className="w-20 h-8 bg-white/5 rounded-lg animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <Link 
                  href="/dashboard" 
                  className="text-white/50 hover:text-white transition-colors text-sm"
                >
                  Dashboard
                </Link>
                <div className="relative group">
                  <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                  </button>
                  
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#111113] border border-[#1f1f23] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="p-3 border-b border-[#1f1f23]">
                      <p className="text-sm text-white font-medium truncate">{user.full_name || 'User'}</p>
                      <p className="text-xs text-[#6b6b70] truncate">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm text-[#9a9aa0] hover:text-white hover:bg-[#1f1f23] rounded-lg transition-colors">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
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
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  className="px-4 py-2 text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-colors text-sm"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/signup" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-white/60">Powered by Gemini AI</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-semibold mb-6 leading-[1.1] tracking-tight">
              <span className="text-white">Ideas to </span>
              <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-violet-500 bg-clip-text text-transparent">Apps</span>
            </h1>
            
            <p className="text-lg text-white/40 max-w-lg mx-auto mb-12 leading-relaxed">
              Describe what you want. AI generates React Native code, previews live, deploys to stores.
            </p>
          </motion.div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl mx-auto relative z-[110]"
          >
            <div className={`glow-input-wrapper ${hasText ? 'is-active' : ''}`}>
              <div className="glow-border" />
              <div className="glow-content">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A task manager with categories, reminders, and dark mode..."
                  className="w-full h-28 px-5 py-4 bg-transparent text-base text-white placeholder-white/30 resize-none focus:outline-none"
                />
                <div className="flex items-center justify-between px-4 pb-3">
                  <div className="flex items-center gap-2 text-white/30 text-xs">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>React Native</span>
                  </div>
                  <button 
                    onClick={handleGenerate}
                    disabled={!prompt.trim()}
                    className="gen-btn-container disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="hover bt-1" />
                    <div className="hover bt-2" />
                    <div className="hover bt-3" />
                    <div className="hover bt-4" />
                    <div className="hover bt-5" />
                    <div className="hover bt-6" />
                    <div className="gen-btn">
                      <span className="btn-text-default">
                        <Sparkles className="w-4 h-4" />
                        Generate
                      </span>
                      <span className="btn-text-hover">Go! ✨</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Examples */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mt-6"
          >
            {['E-commerce', 'Task manager', 'Social app', 'Weather'].map((example) => (
              <button
                key={example}
                onClick={() => setPrompt(example)}
                className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-xs hover:bg-white/10 hover:text-white/60 transition-colors"
              >
                {example}
              </button>
            ))}
          </motion.div>

          {/* Recent Projects */}
          {mounted && recentProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-16 max-w-2xl mx-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white/60 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Projects
                </h3>
              </div>
              
              <div className="space-y-2">
                {recentProjects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href="/editor"
                    onClick={() => handleOpenProject(project.id)}
                    className="group flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                          {project.name}
                        </h4>
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-1">
                          {project.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-xs text-white/30">
                        <FileCode className="w-3.5 h-3.5" />
                        <span>{project.filesCount} files</span>
                      </div>
                      <span className="text-xs text-white/30">
                        {formatTimeAgo(project.lastModified)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteRecentProject(project.id);
                        }}
                        className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-semibold text-center mb-16 text-white"
          >
            Everything you need
          </motion.h2>
          
          <div className="grid md:grid-cols-3 gap-5">
            <FeatureCard
              icon={<Sparkles className="w-5 h-5" />}
              title="AI Generation"
              description="Describe in plain English, get production-ready React Native code."
              gradient="from-blue-500 to-cyan-400"
              delay={0}
            />
            <FeatureCard
              icon={<Smartphone className="w-5 h-5" />}
              title="Live Preview"
              description="See changes instantly in browser or on device with Expo Go."
              gradient="from-violet-500 to-purple-400"
              delay={0.1}
            />
            <FeatureCard
              icon={<Rocket className="w-5 h-5" />}
              title="One-Click Deploy"
              description="Publish directly to App Store and Google Play automatically."
              gradient="from-orange-500 to-rose-400"
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="relative py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-semibold text-center mb-16 text-white"
          >
            How it works
          </motion.h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { n: 1, t: 'Describe', d: 'Your app idea' },
              { n: 2, t: 'Generate', d: 'AI creates code' },
              { n: 3, t: 'Customize', d: 'Edit & preview' },
              { n: 4, t: 'Deploy', d: 'Publish to stores' },
            ].map((step, i) => (
              <motion.div 
                key={step.n}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-violet-600 text-white text-sm font-semibold flex items-center justify-center mx-auto mb-4">
                  {step.n}
                </div>
                <h3 className="text-sm font-medium mb-1 text-white">{step.t}</h3>
                <p className="text-white/40 text-xs">{step.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - only show for non-logged-in users */}
      {!user && (
        <section className="relative py-24 px-6">
          <div className="max-w-xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-semibold mb-4 text-white">
                Ready to build?
              </h2>
              <p className="text-white/40 mb-8">
                Start creating your mobile app in minutes.
              </p>
              <Link 
                href="/auth/signup" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 transition-colors"
              >
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative py-8 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="relative w-5 h-5">
              <div className="capy-loader absolute inset-0 transition-opacity duration-300 group-hover:opacity-0" style={{ width: 20, height: 20 }}>
                <div className="shape" style={{ width: 20, height: 20, borderRadius: 4 }} />
              </div>
              <Image 
                src="/logo.png" 
                alt="CapyCode" 
                width={20} 
                height={20}
                className="absolute inset-0 rounded opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            </div>
            <span className="text-sm font-medium text-white">CapyCode</span>
          </div>
          
          <div className="flex items-center gap-6 text-white/30 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
          
          <p className="text-white/20 text-xs">© 2026 CapyCode</p>
        </div>
      </footer>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreateProject}
        initialPrompt={prompt}
        isCreating={isGenerating}
      />
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  gradient,
  delay = 0
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  gradient: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all duration-300"
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 text-white shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-base font-medium mb-2 text-white">{title}</h3>
      <p className="text-sm text-white/40 leading-relaxed">{description}</p>
    </motion.div>
  );
}
