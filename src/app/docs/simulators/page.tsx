'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Monitor, Apple, Smartphone } from 'lucide-react';
import Header from '@/components/Header';

export default function SimulatorsPage() {
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
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Preview & Testing</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Device Simulators</h1>
            <p className="text-lg text-white/60">Understanding iOS Simulator and Android Emulator.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* Overview */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">Built-in Preview</h2>
              <p className="text-white/60">
                CapyCode includes a built-in web-based preview that simulates both iOS and Android devices. 
                This works directly in your browser without any additional setup required.
              </p>
            </div>

            {/* iOS Simulator */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gray-500/20 flex items-center justify-center">
                  <Apple className="w-5 h-5 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">iOS Simulator (Mac only)</h2>
              </div>
              <p className="text-white/60 mb-4">
                For the most accurate iOS testing, you can use Xcode's iOS Simulator on a Mac:
              </p>
              <ol className="space-y-2 text-white/60 list-decimal list-inside">
                <li>Install Xcode from the Mac App Store</li>
                <li>Open Xcode → Preferences → Components</li>
                <li>Download your desired iOS simulator version</li>
                <li>Export your project from CapyCode</li>
                <li>Run with <code className="px-2 py-0.5 bg-[#0a0a0b] rounded text-emerald-400 text-sm">npx expo run:ios</code></li>
              </ol>
            </div>

            {/* Android Emulator */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Android Emulator</h2>
              </div>
              <p className="text-white/60 mb-4">
                For Android testing, use Android Studio's emulator:
              </p>
              <ol className="space-y-2 text-white/60 list-decimal list-inside">
                <li>Install Android Studio</li>
                <li>Open AVD Manager (Android Virtual Device)</li>
                <li>Create a new virtual device</li>
                <li>Export your project from CapyCode</li>
                <li>Run with <code className="px-2 py-0.5 bg-[#0a0a0b] rounded text-emerald-400 text-sm">npx expo run:android</code></li>
              </ol>
            </div>

            {/* Comparison */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">When to Use What</h2>
              <div className="space-y-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-medium mb-1">CapyCode Preview</h3>
                  <p className="text-white/50 text-sm">Best for quick iteration and basic testing</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-medium mb-1">Expo Go</h3>
                  <p className="text-white/50 text-sm">Best for real device testing without building</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-medium mb-1">Native Simulators</h3>
                  <p className="text-white/50 text-sm">Best for final testing before app store submission</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/expo-go" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Expo Go</span>
              </Link>
              <Link href="/docs/build-ios" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>Build for iOS</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
