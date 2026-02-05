'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Layout, Code2, Smartphone, MessageSquare, FolderTree, Play } from 'lucide-react';
import Header from '@/components/Header';

export default function IDEOverviewPage() {
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
              <Layout className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Getting Started</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Understanding the IDE</h1>
            <p className="text-lg text-white/60">Learn the CapyCode development environment.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* Overview */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">IDE Layout</h2>
              <p className="text-white/60 mb-6">
                The CapyCode IDE is divided into four main areas, each designed to streamline your development workflow:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <FolderTree className="w-6 h-6 text-emerald-400 mb-2" />
                  <h3 className="text-white font-medium mb-1">File Explorer</h3>
                  <p className="text-white/50 text-sm">Browse and manage your project files</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <Code2 className="w-6 h-6 text-emerald-400 mb-2" />
                  <h3 className="text-white font-medium mb-1">Code Editor</h3>
                  <p className="text-white/50 text-sm">Edit code with syntax highlighting</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <Smartphone className="w-6 h-6 text-emerald-400 mb-2" />
                  <h3 className="text-white font-medium mb-1">Device Preview</h3>
                  <p className="text-white/50 text-sm">Live preview on iOS/Android</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <MessageSquare className="w-6 h-6 text-emerald-400 mb-2" />
                  <h3 className="text-white font-medium mb-1">AI Chat</h3>
                  <p className="text-white/50 text-sm">Communicate with Gemini AI</p>
                </div>
              </div>
            </div>

            {/* File Explorer */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <FolderTree className="w-6 h-6 text-emerald-400" />
                <h2 className="text-xl font-semibold text-white">File Explorer</h2>
              </div>
              <p className="text-white/60 mb-4">
                The file explorer shows your complete project structure. You can:
              </p>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Click files to open them in the editor</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Right-click for context menu (rename, delete)</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Use the + button to create new files</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Drag and drop to reorganize</li>
              </ul>
            </div>

            {/* Code Editor */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <Code2 className="w-6 h-6 text-emerald-400" />
                <h2 className="text-xl font-semibold text-white">Code Editor</h2>
              </div>
              <p className="text-white/60 mb-4">
                A fully-featured code editor with:
              </p>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Syntax highlighting for TypeScript/React</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Auto-completion and IntelliSense</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Error detection and linting</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Multi-file tabs</li>
              </ul>
            </div>

            {/* Preview */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <Smartphone className="w-6 h-6 text-emerald-400" />
                <h2 className="text-xl font-semibold text-white">Device Preview</h2>
              </div>
              <p className="text-white/60 mb-4">
                See your app running in real-time:
              </p>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Toggle between iOS and Android</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Interactive preview - tap, scroll, type</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Hot reload on code changes</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>QR code to preview on your real device</li>
              </ul>
            </div>

            {/* AI Chat */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-6 h-6 text-emerald-400" />
                <h2 className="text-xl font-semibold text-white">AI Chat Panel</h2>
              </div>
              <p className="text-white/60 mb-4">
                Your AI coding assistant powered by Google Gemini:
              </p>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Ask questions about your code</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Request new features or changes</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Get debugging help</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Auto-applies changes to your code</li>
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/first-app" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Your First App</span>
              </Link>
              <Link href="/docs/prompts" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>Writing Prompts</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
