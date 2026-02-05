'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Apple, Terminal, CheckCircle, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';

export default function BuildIOSPage() {
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
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Deployment</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Build for iOS</h1>
            <p className="text-lg text-white/60">Prepare your app for the App Store.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* Requirements */}
            <div className="bg-[#111113] border border-yellow-500/20 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <h2 className="text-xl font-semibold text-white">Requirements</h2>
              </div>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>Mac computer with macOS</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>Xcode installed from Mac App Store</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>Apple Developer Account ($99/year)</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>Node.js and npm installed</li>
              </ul>
            </div>

            {/* Steps */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Build Steps</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-2">Export Your Project</h3>
                    <p className="text-white/60 text-sm mb-2">Click "Export" in CapyCode to download your project as a ZIP file.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-2">Install Dependencies</h3>
                    <div className="bg-[#0a0a0b] rounded-lg p-3 border border-[#1f1f23]">
                      <code className="text-emerald-400 text-sm">npm install</code>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-2">Configure EAS Build</h3>
                    <div className="bg-[#0a0a0b] rounded-lg p-3 border border-[#1f1f23]">
                      <code className="text-emerald-400 text-sm">npx eas-cli build:configure</code>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">4</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-2">Build for iOS</h3>
                    <div className="bg-[#0a0a0b] rounded-lg p-3 border border-[#1f1f23]">
                      <code className="text-emerald-400 text-sm">npx eas-cli build --platform ios</code>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">5</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-2">Download & Submit</h3>
                    <p className="text-white/60 text-sm">Download the .ipa file and upload via Xcode or Transporter app.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">Tips</h2>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Use <code className="text-emerald-400">eas build --profile production</code> for App Store builds</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Set up certificates in Apple Developer Portal first</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Test with TestFlight before submitting to the store</span>
                </li>
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/simulators" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Simulators</span>
              </Link>
              <Link href="/docs/build-android" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>Build for Android</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
