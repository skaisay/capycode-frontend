'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import Header from '@/components/Header';

export default function PromptsPage() {
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
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">AI Generation</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Writing Effective Prompts</h1>
            <p className="text-lg text-white/60">Get better results from AI with these prompting techniques.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* Good vs Bad */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#111113] border border-red-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <h3 className="text-lg font-semibold text-red-400">Too Vague</h3>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <p className="text-white/60 text-sm">"Make me an app"</p>
                </div>
                <p className="text-white/50 text-sm mt-3">Not enough information to generate anything useful.</p>
              </div>

              <div className="bg-[#111113] border border-emerald-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-emerald-400">Specific & Clear</h3>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <p className="text-white/60 text-sm">"Create a recipe app with a dark purple theme. Include a home screen with recipe categories, a recipe detail page with ingredients and steps, and a favorites feature."</p>
                </div>
                <p className="text-white/50 text-sm mt-3">Clear structure, specific features, design direction.</p>
              </div>
            </div>

            {/* Key Elements */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Key Elements of a Good Prompt</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">App Purpose</h3>
                    <p className="text-white/60 text-sm">What is the main goal? (e.g., "fitness tracking", "task management", "social networking")</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">Screens & Features</h3>
                    <p className="text-white/60 text-sm">List the main screens and what they should do (e.g., "home screen with daily stats", "settings page")</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">Design Style</h3>
                    <p className="text-white/60 text-sm">Mention colors, theme, style (e.g., "dark theme with blue accents", "minimal and clean")</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">4</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">User Interactions</h3>
                    <p className="text-white/60 text-sm">How should users interact? (e.g., "swipe to delete", "tap to expand", "pull to refresh")</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <h2 className="text-xl font-semibold text-white">Example Prompts</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <p className="text-emerald-400 text-sm font-medium mb-2">Fitness App:</p>
                  <p className="text-white/60 text-sm">"Build a workout tracking app with a dark theme and orange accents. Include a home dashboard showing today's workout, a workout library with exercise categories, a timer screen with rest intervals, and a progress page with weekly statistics charts."</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <p className="text-emerald-400 text-sm font-medium mb-2">E-commerce App:</p>
                  <p className="text-white/60 text-sm">"Create a shopping app with product grid, product detail pages with image carousel, shopping cart with quantity controls, and a checkout flow. Use a clean white theme with black text and green action buttons."</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <p className="text-emerald-400 text-sm font-medium mb-2">Notes App:</p>
                  <p className="text-white/60 text-sm">"Make a note-taking app with folders for organization. Notes should support rich text with bold, italic, and bullet lists. Include a search feature and dark/light mode toggle. Minimalist design with plenty of whitespace."</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/ide-overview" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>IDE Overview</span>
              </Link>
              <Link href="/docs/ai-chat" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>AI Chat</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
