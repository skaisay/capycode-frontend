'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, FolderTree, File, Folder } from 'lucide-react';
import Header from '@/components/Header';

export default function FileStructurePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      <Header showBack backTo="/docs" backLabel="Documentation" />

      <main className="relative z-10 pt-20 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <FolderTree className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Development</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">File Structure</h1>
            <p className="text-lg text-white/60">Understanding your React Native project layout.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* Structure Overview */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Project Structure</h2>
              <div className="bg-[#0a0a0b] rounded-xl p-6 border border-[#1f1f23] font-mono text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400"><Folder className="w-4 h-4" /> my-app/</div>
                  <div className="ml-4 flex items-center gap-2 text-white/80"><File className="w-4 h-4 text-blue-400" /> App.tsx</div>
                  <div className="ml-4 flex items-center gap-2 text-white/80"><File className="w-4 h-4 text-blue-400" /> app.json</div>
                  <div className="ml-4 flex items-center gap-2 text-white/80"><File className="w-4 h-4 text-yellow-400" /> package.json</div>
                  <div className="ml-4 flex items-center gap-2 text-emerald-400"><Folder className="w-4 h-4" /> components/</div>
                  <div className="ml-8 flex items-center gap-2 text-white/60"><File className="w-4 h-4 text-blue-400" /> Button.tsx</div>
                  <div className="ml-8 flex items-center gap-2 text-white/60"><File className="w-4 h-4 text-blue-400" /> Header.tsx</div>
                  <div className="ml-4 flex items-center gap-2 text-emerald-400"><Folder className="w-4 h-4" /> screens/</div>
                  <div className="ml-8 flex items-center gap-2 text-white/60"><File className="w-4 h-4 text-blue-400" /> HomeScreen.tsx</div>
                  <div className="ml-8 flex items-center gap-2 text-white/60"><File className="w-4 h-4 text-blue-400" /> SettingsScreen.tsx</div>
                  <div className="ml-4 flex items-center gap-2 text-emerald-400"><Folder className="w-4 h-4" /> hooks/</div>
                  <div className="ml-8 flex items-center gap-2 text-white/60"><File className="w-4 h-4 text-blue-400" /> useTheme.ts</div>
                  <div className="ml-4 flex items-center gap-2 text-emerald-400"><Folder className="w-4 h-4" /> assets/</div>
                  <div className="ml-8 flex items-center gap-2 text-white/60"><File className="w-4 h-4 text-purple-400" /> icon.png</div>
                </div>
              </div>
            </div>

            {/* Key Files */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Key Files Explained</h2>
              <div className="space-y-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-mono text-sm mb-2">App.tsx</h3>
                  <p className="text-white/60 text-sm">The main entry point of your app. Contains navigation setup and root components.</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-mono text-sm mb-2">components/</h3>
                  <p className="text-white/60 text-sm">Reusable UI components like buttons, cards, and inputs.</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-mono text-sm mb-2">screens/</h3>
                  <p className="text-white/60 text-sm">Full-page components representing different app screens.</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-mono text-sm mb-2">hooks/</h3>
                  <p className="text-white/60 text-sm">Custom React hooks for shared logic and state management.</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-mono text-sm mb-2">assets/</h3>
                  <p className="text-white/60 text-sm">Images, fonts, and other static files.</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/editor" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Code Editor</span>
              </Link>
              <Link href="/docs/components" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>Components</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
