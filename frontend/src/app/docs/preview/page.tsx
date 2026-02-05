'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Play, Smartphone, Monitor, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';

export default function PreviewPage() {
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
              <Play className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Preview & Testing</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Live Preview</h1>
            <p className="text-lg text-white/60">See your app running in real-time.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* How It Works */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">How Live Preview Works</h2>
              <p className="text-white/60 mb-6">
                The live preview shows your React Native app running in a simulated device. Changes you make 
                in the code editor are reflected instantly through hot reloading.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23] text-center">
                  <Smartphone className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <h3 className="text-white font-medium">iOS Preview</h3>
                  <p className="text-white/50 text-sm mt-1">iPhone simulator view</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23] text-center">
                  <Monitor className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <h3 className="text-white font-medium">Android Preview</h3>
                  <p className="text-white/50 text-sm mt-1">Android device view</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Preview Features</h2>
              <ul className="space-y-4 text-white/60">
                <li className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-white font-medium">Hot Reload</span>
                    <p className="text-sm mt-1">See changes instantly without losing app state</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-white font-medium">Interactive</span>
                    <p className="text-sm mt-1">Tap, scroll, and interact just like a real device</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Monitor className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-white font-medium">Platform Toggle</span>
                    <p className="text-sm mt-1">Switch between iOS and Android views</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Tips */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">Preview Tips</h2>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Use refresh button if preview gets stuck</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Check both iOS and Android for consistent UI</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Test navigation flows by tapping through screens</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Console errors appear in the error panel</li>
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/components" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Components</span>
              </Link>
              <Link href="/docs/expo-go" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>Expo Go</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
