'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Smartphone, Code2, Sparkles, Play } from 'lucide-react';
import Header from '@/components/Header';

export default function FirstAppPage() {
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
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Getting Started</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Your First App</h1>
            <p className="text-lg text-white/60">Build a complete Todo app step by step.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* Introduction */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">What We'll Build</h2>
              <p className="text-white/60 mb-4">
                In this tutorial, we'll create a simple but functional Todo app with the following features:
              </p>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Add new tasks</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Mark tasks as complete</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Delete tasks</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Filter between all/active/completed</li>
              </ul>
            </div>

            {/* Step 1 */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold text-sm">1</span>
                </div>
                <h2 className="text-xl font-semibold text-white">Start with a Prompt</h2>
              </div>
              <p className="text-white/60 mb-4">Go to your dashboard and enter this prompt:</p>
              <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                <p className="text-emerald-400 text-sm font-mono">
                  "Create a Todo app with a clean dark theme. Include an input field to add tasks, 
                  a list showing all tasks with checkboxes, swipe to delete, and filter tabs for 
                  All/Active/Completed tasks."
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold text-sm">2</span>
                </div>
                <h2 className="text-xl font-semibold text-white">Review Generated Code</h2>
              </div>
              <p className="text-white/60 mb-4">
                The AI will generate a complete React Native app. Open the code editor to see the file structure:
              </p>
              <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23] font-mono text-sm text-white/60">
                <div>📁 App.tsx</div>
                <div className="ml-4">📁 components/</div>
                <div className="ml-8">📄 TodoItem.tsx</div>
                <div className="ml-8">📄 AddTodo.tsx</div>
                <div className="ml-8">📄 FilterTabs.tsx</div>
                <div className="ml-4">📁 hooks/</div>
                <div className="ml-8">📄 useTodos.ts</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold text-sm">3</span>
                </div>
                <h2 className="text-xl font-semibold text-white">Use AI Chat for Refinements</h2>
              </div>
              <p className="text-white/60 mb-4">
                Use the AI chat panel to make improvements:
              </p>
              <ul className="space-y-3 text-white/60">
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                  <span>"Add animations when adding or deleting tasks"</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                  <span>"Make the checkbox have a green check mark"</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                  <span>"Add persistence with AsyncStorage"</span>
                </li>
              </ul>
            </div>

            {/* Step 4 */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold text-sm">4</span>
                </div>
                <h2 className="text-xl font-semibold text-white">Preview on Device</h2>
              </div>
              <p className="text-white/60 mb-4">
                Use the live preview to test your app. Toggle between iOS and Android views to ensure 
                it looks great on both platforms.
              </p>
              <div className="flex items-center gap-2 text-white/60">
                <Play className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Hot reload updates instantly as you make changes</span>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/quick-start" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Quick Start</span>
              </Link>
              <Link href="/docs/ide-overview" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>Understanding the IDE</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
