'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Code2, Keyboard, Search, FileText } from 'lucide-react';
import Header from '@/components/Header';

export default function EditorPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      <Header showBack backTo="/docs" backLabel="Documentation" />

      <main className="relative z-10 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Development</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Code Editor</h1>
            <p className="text-lg text-white/60">Master the CapyCode code editor.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* Features */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Editor Features</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-white font-medium mb-2">Syntax Highlighting</h3>
                  <p className="text-white/50 text-sm">Full TypeScript, JSX, and React Native support</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-white font-medium mb-2">Auto-completion</h3>
                  <p className="text-white/50 text-sm">IntelliSense for React Native components</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-white font-medium mb-2">Error Detection</h3>
                  <p className="text-white/50 text-sm">Real-time linting and error highlighting</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-white font-medium mb-2">Multi-file Tabs</h3>
                  <p className="text-white/50 text-sm">Open multiple files simultaneously</p>
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <Keyboard className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[#1f1f23]">
                  <span className="text-white/60">Save file</span>
                  <kbd className="px-2 py-1 bg-[#0a0a0b] rounded text-xs text-white/80 font-mono">Ctrl/Cmd + S</kbd>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#1f1f23]">
                  <span className="text-white/60">Find in file</span>
                  <kbd className="px-2 py-1 bg-[#0a0a0b] rounded text-xs text-white/80 font-mono">Ctrl/Cmd + F</kbd>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#1f1f23]">
                  <span className="text-white/60">Undo</span>
                  <kbd className="px-2 py-1 bg-[#0a0a0b] rounded text-xs text-white/80 font-mono">Ctrl/Cmd + Z</kbd>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#1f1f23]">
                  <span className="text-white/60">Redo</span>
                  <kbd className="px-2 py-1 bg-[#0a0a0b] rounded text-xs text-white/80 font-mono">Ctrl/Cmd + Shift + Z</kbd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-white/60">Format code</span>
                  <kbd className="px-2 py-1 bg-[#0a0a0b] rounded text-xs text-white/80 font-mono">Shift + Alt + F</kbd>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">Editor Tips</h2>
              <ul className="space-y-3 text-white/60">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                  <span>Click on line numbers to set breakpoints for debugging</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                  <span>Hover over errors to see detailed messages</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                  <span>Use the minimap on the right for quick navigation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                  <span>Right-click for context menu with more options</span>
                </li>
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/best-practices" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Best Practices</span>
              </Link>
              <Link href="/docs/file-structure" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>File Structure</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
