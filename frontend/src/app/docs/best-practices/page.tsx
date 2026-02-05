'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Award, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import Header from '@/components/Header';

export default function BestPracticesPage() {
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
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">AI Generation</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Best Practices</h1>
            <p className="text-lg text-white/60">Tips for building great apps with CapyCode.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* Do's */}
            <div className="bg-[#111113] border border-emerald-500/20 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <h2 className="text-xl font-semibold text-white">Recommended Practices</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-emerald-400 text-xs">✓</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Start Simple</h3>
                    <p className="text-white/60 text-sm">Begin with core features, then add complexity through iteration.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-emerald-400 text-xs">✓</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Test on Real Devices</h3>
                    <p className="text-white/60 text-sm">Use Expo Go to test on your actual phone for the best feedback.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-emerald-400 text-xs">✓</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Use Component Patterns</h3>
                    <p className="text-white/60 text-sm">Ask AI to create reusable components for consistent design.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-emerald-400 text-xs">✓</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Review Generated Code</h3>
                    <p className="text-white/60 text-sm">Understand what the AI generates to make better future requests.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-emerald-400 text-xs">✓</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Save Frequently</h3>
                    <p className="text-white/60 text-sm">Export your project regularly to have backups of your progress.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Don'ts */}
            <div className="bg-[#111113] border border-red-500/20 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h2 className="text-xl font-semibold text-white">Things to Avoid</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-400 text-xs">✗</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Overly Complex Initial Prompts</h3>
                    <p className="text-white/60 text-sm">Don't try to describe every feature at once. Build incrementally.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-400 text-xs">✗</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Ignoring Errors</h3>
                    <p className="text-white/60 text-sm">If you see errors in the preview, fix them before adding more features.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-400 text-xs">✗</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Backend-Heavy Features</h3>
                    <p className="text-white/60 text-sm">CapyCode focuses on frontend. Complex backends require external services.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-400 text-xs">✗</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Skipping Preview Testing</h3>
                    <p className="text-white/60 text-sm">Always test in the preview before asking for more changes.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <Lightbulb className="w-6 h-6 text-yellow-400" />
                <h2 className="text-xl font-semibold text-white">Pro Tips</h2>
              </div>
              <div className="space-y-4 text-white/60">
                <p>• Use the AI to explain code: "Explain how the navigation in App.tsx works"</p>
                <p>• Ask for alternatives: "Show me 3 different button styles to choose from"</p>
                <p>• Reference design systems: "Style this like the iOS Settings app"</p>
                <p>• Request documentation: "Add comments explaining this component"</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/ai-chat" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>AI Chat</span>
              </Link>
              <Link href="/docs/editor" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>Code Editor</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
