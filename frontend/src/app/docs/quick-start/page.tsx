'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Rocket, Check, Terminal, Smartphone, Sparkles } from 'lucide-react';
import Header from '@/components/Header';

export default function QuickStartPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      <Header showBack backTo="/docs" backLabel="Documentation" />

      <main className="relative z-10 pt-20 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <Rocket className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Getting Started</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Quick Start Guide</h1>
            <p className="text-lg text-white/60">Get up and running with CapyCode in just 5 minutes.</p>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="prose prose-invert max-w-none"
          >
            {/* Step 1 */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="text-emerald-400 font-bold">1</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white mt-0 mb-3">Create Your Account</h2>
                  <p className="text-white/60 mb-4">
                    Sign up for CapyCode using your Google account. It's free to get started with our Basic plan.
                  </p>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">No credit card required</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="text-emerald-400 font-bold">2</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white mt-0 mb-3">Describe Your App</h2>
                  <p className="text-white/60 mb-4">
                    Tell CapyCode what kind of app you want to build. Be as specific as possible about features, 
                    design preferences, and functionality.
                  </p>
                  <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                    <p className="text-white/80 text-sm italic">
                      "Create a fitness tracking app with a dark theme, workout logging, progress charts, 
                      and a timer for exercises."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="text-emerald-400 font-bold">3</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white mt-0 mb-3">AI Generates Your App</h2>
                  <p className="text-white/60 mb-4">
                    Our Gemini-powered AI will generate a complete React Native app based on your description. 
                    This includes screens, components, navigation, and styling.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-white/60">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm">Usually takes 15-30 seconds</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="text-emerald-400 font-bold">4</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white mt-0 mb-3">Preview & Iterate</h2>
                  <p className="text-white/60 mb-4">
                    See your app in the live preview. Use the AI chat to make changes: "Make the buttons rounded", 
                    "Add a settings page", "Change the primary color to blue".
                  </p>
                  <div className="flex items-center gap-2 text-white/60">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm">Real-time preview on iOS & Android</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="text-emerald-400 font-bold">5</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white mt-0 mb-3">Export & Deploy</h2>
                  <p className="text-white/60 mb-4">
                    When you're happy with your app, export it as a complete React Native project or 
                    build it directly for iOS and Android app stores.
                  </p>
                  <div className="flex items-center gap-2 text-white/60">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm">One-click export to Expo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link 
                href="/docs"
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Docs</span>
              </Link>
              <Link 
                href="/docs/first-app"
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
              >
                <span>Your First App</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
