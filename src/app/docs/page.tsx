'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, 
  Code2, 
  Rocket, 
  Sparkles, 
  Terminal, 
  Smartphone,
  ArrowRight,
  Search,
  X
} from 'lucide-react';
import Header from '@/components/Header';

// All documentation items with searchable content
const allDocs = [
  { 
    title: 'Quick Start Guide', 
    href: '/docs/quick-start', 
    time: '5 min',
    section: 'Getting Started',
    keywords: ['start', 'begin', 'first', 'setup', 'install', 'account', 'create']
  },
  { 
    title: 'Your First App', 
    href: '/docs/first-app', 
    time: '10 min',
    section: 'Getting Started',
    keywords: ['tutorial', 'build', 'todo', 'example', 'app', 'first']
  },
  { 
    title: 'Understanding the IDE', 
    href: '/docs/ide-overview', 
    time: '8 min',
    section: 'Getting Started',
    keywords: ['interface', 'editor', 'layout', 'panel', 'workspace', 'ide']
  },
  { 
    title: 'Writing Effective Prompts', 
    href: '/docs/prompts', 
    time: '7 min',
    section: 'AI Generation',
    keywords: ['prompt', 'ai', 'generate', 'describe', 'write', 'tips']
  },
  { 
    title: 'Iterating with AI Chat', 
    href: '/docs/ai-chat', 
    time: '6 min',
    section: 'AI Generation',
    keywords: ['chat', 'conversation', 'modify', 'change', 'update', 'ai']
  },
  { 
    title: 'Best Practices', 
    href: '/docs/best-practices', 
    time: '10 min',
    section: 'AI Generation',
    keywords: ['tips', 'advice', 'recommended', 'avoid', 'practice']
  },
  { 
    title: 'Code Editor', 
    href: '/docs/editor', 
    time: '5 min',
    section: 'Development',
    keywords: ['editor', 'code', 'syntax', 'highlight', 'write', 'keyboard']
  },
  { 
    title: 'File Structure', 
    href: '/docs/file-structure', 
    time: '4 min',
    section: 'Development',
    keywords: ['files', 'folders', 'structure', 'organize', 'components', 'screens']
  },
  { 
    title: 'Components Library', 
    href: '/docs/components', 
    time: '12 min',
    section: 'Development',
    keywords: ['components', 'view', 'text', 'button', 'input', 'list', 'ui']
  },
  { 
    title: 'Live Preview', 
    href: '/docs/preview', 
    time: '3 min',
    section: 'Preview & Testing',
    keywords: ['preview', 'live', 'hot', 'reload', 'view', 'test']
  },
  { 
    title: 'Expo Go Testing', 
    href: '/docs/expo-go', 
    time: '5 min',
    section: 'Preview & Testing',
    keywords: ['expo', 'phone', 'device', 'qr', 'scan', 'test', 'real']
  },
  { 
    title: 'Device Simulators', 
    href: '/docs/simulators', 
    time: '4 min',
    section: 'Preview & Testing',
    keywords: ['simulator', 'emulator', 'xcode', 'android', 'studio', 'ios']
  },
  { 
    title: 'Build for iOS', 
    href: '/docs/build-ios', 
    time: '8 min',
    section: 'Deployment',
    keywords: ['ios', 'iphone', 'apple', 'build', 'ipa', 'xcode', 'app store']
  },
  { 
    title: 'Build for Android', 
    href: '/docs/build-android', 
    time: '7 min',
    section: 'Deployment',
    keywords: ['android', 'apk', 'aab', 'build', 'google', 'play']
  },
  { 
    title: 'Publishing to Stores', 
    href: '/docs/publishing', 
    time: '15 min',
    section: 'Deployment',
    keywords: ['publish', 'store', 'submit', 'app store', 'google play', 'release']
  },
];

const sections = [
  {
    title: 'Getting Started',
    icon: Rocket,
    items: allDocs.filter(d => d.section === 'Getting Started'),
  },
  {
    title: 'AI Generation',
    icon: Sparkles,
    items: allDocs.filter(d => d.section === 'AI Generation'),
  },
  {
    title: 'Development',
    icon: Code2,
    items: allDocs.filter(d => d.section === 'Development'),
  },
  {
    title: 'Preview & Testing',
    icon: Smartphone,
    items: allDocs.filter(d => d.section === 'Preview & Testing'),
  },
  {
    title: 'Deployment',
    icon: Terminal,
    items: allDocs.filter(d => d.section === 'Deployment'),
  },
];

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return allDocs.filter(doc => {
      const titleMatch = doc.title.toLowerCase().includes(query);
      const sectionMatch = doc.section.toLowerCase().includes(query);
      const keywordMatch = doc.keywords.some(k => k.toLowerCase().includes(query));
      return titleMatch || sectionMatch || keywordMatch;
    });
  }, [searchQuery]);

  const showSearchResults = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0b] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      {/* Header */}
      <Header showBack backTo="/dashboard" backLabel="Dashboard" />

      <main className="relative z-10">
        {/* Hero */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <Book className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">Documentation</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-semibold mb-6 text-white">
                Learn{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  CapyCode
                </span>
              </h1>
              <p className="text-lg text-white/50 max-w-xl mx-auto mb-8">
                Everything you need to build, preview, and deploy mobile apps with AI.
              </p>

              {/* Search */}
              <div className="max-w-xl mx-auto relative">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b6b70]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documentation..."
                    className="w-full bg-[#111113] border border-[#1f1f23] rounded-xl pl-12 pr-12 py-4 text-white placeholder-[#6b6b70] focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6b70] hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                <AnimatePresence>
                  {showSearchResults && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-[#111113] border border-[#1f1f23] rounded-xl overflow-hidden z-50 shadow-2xl"
                    >
                      {searchResults.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto">
                          {searchResults.map((result) => (
                            <Link
                              key={result.href}
                              href={result.href}
                              onClick={() => setSearchQuery('')}
                              className="flex items-center justify-between p-4 hover:bg-[#1f1f23] transition-colors border-b border-[#1f1f23] last:border-b-0"
                            >
                              <div>
                                <div className="text-white font-medium">{result.title}</div>
                                <div className="text-[#6b6b70] text-sm">{result.section}</div>
                              </div>
                              <span className="text-[#4a4a4e] text-xs">{result.time}</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <p className="text-[#6b6b70]">No results found for "{searchQuery}"</p>
                          <p className="text-[#4a4a4e] text-sm mt-1">Try different keywords</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="pb-12 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-8"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">New to CapyCode?</h2>
                  <p className="text-[#6b6b70]">Start with our quick start guide and build your first app in 5 minutes.</p>
                </div>
                <Link
                  href="/docs/quick-start"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors shrink-0"
                >
                  Quick Start
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Documentation Sections */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.map((section, index) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <section.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                  </div>

                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-[#1f1f23]/50 transition-colors group"
                      >
                        <span className="text-[#6b6b70] group-hover:text-white transition-colors text-sm">
                          {item.title}
                        </span>
                        <span className="text-[#4a4a4e] text-xs">{item.time}</span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Resources - Email support only */}
        <section className="py-24 px-6 border-t border-[#1f1f23]/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-semibold text-center text-white mb-12">
              Need Help?
            </h2>
            <div className="max-w-md mx-auto">
              <a
                href="mailto:support@capycode.com"
                className="flex items-center gap-4 p-6 bg-[#111113]/80 border border-[#1f1f23]/50 rounded-2xl hover:border-emerald-500/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium group-hover:text-emerald-400 transition-colors">Email Support</h3>
                  <p className="text-[#6b6b70] text-sm">support@capycode.com</p>
                </div>
                <ArrowRight className="w-5 h-5 text-[#6b6b70] group-hover:text-emerald-400 transition-colors" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1f1f23]/50 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#6b6b70] text-sm">
            © 2026 CapyCode. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
