'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MessageSquare, Sparkles, RefreshCw, Code2 } from 'lucide-react';
import Header from '@/components/Header';

export default function AIChatPage() {
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
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">AI Generation</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Iterating with AI Chat</h1>
            <p className="text-lg text-white/60">Refine your app through conversation with Gemini AI.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* How It Works */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">How AI Chat Works</h2>
              <p className="text-white/60 mb-6">
                After generating your initial app, use the AI chat panel to make changes. The AI understands 
                your entire codebase and can modify files, add features, or fix bugs.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23] text-center">
                  <MessageSquare className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-white text-sm font-medium">Describe Change</p>
                  <p className="text-white/50 text-xs mt-1">Tell AI what you want</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23] text-center">
                  <Code2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-white text-sm font-medium">AI Edits Code</p>
                  <p className="text-white/50 text-xs mt-1">Changes are applied</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23] text-center">
                  <RefreshCw className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-white text-sm font-medium">Preview Updates</p>
                  <p className="text-white/50 text-xs mt-1">See results instantly</p>
                </div>
              </div>
            </div>

            {/* Example Conversations */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Example Requests</h2>
              <div className="space-y-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <p className="text-emerald-400 text-sm font-medium mb-2">Adding Features:</p>
                  <p className="text-white/60 text-sm">"Add a dark mode toggle to the settings screen"</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <p className="text-emerald-400 text-sm font-medium mb-2">Styling Changes:</p>
                  <p className="text-white/60 text-sm">"Make all buttons have rounded corners and add a subtle shadow"</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <p className="text-emerald-400 text-sm font-medium mb-2">Bug Fixes:</p>
                  <p className="text-white/60 text-sm">"The login button doesn't work when I tap it, can you fix that?"</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <p className="text-emerald-400 text-sm font-medium mb-2">New Screens:</p>
                  <p className="text-white/60 text-sm">"Add a profile screen with avatar, name, email, and logout button"</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <p className="text-emerald-400 text-sm font-medium mb-2">Animations:</p>
                  <p className="text-white/60 text-sm">"Add a fade-in animation when the list items appear"</p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <h2 className="text-xl font-semibold text-white">Tips for Better Results</h2>
              </div>
              <ul className="space-y-3 text-white/60">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                  <span><strong className="text-white">Be specific</strong> - Instead of "make it look better", say "increase font size to 18px and add more padding"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                  <span><strong className="text-white">Reference screens</strong> - Mention which screen you want to change: "On the home screen, add..."</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                  <span><strong className="text-white">One thing at a time</strong> - Make smaller requests for more accurate results</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                  <span><strong className="text-white">Iterate</strong> - If the first result isn't perfect, ask for adjustments</span>
                </li>
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/prompts" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Writing Prompts</span>
              </Link>
              <Link href="/docs/best-practices" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>Best Practices</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
