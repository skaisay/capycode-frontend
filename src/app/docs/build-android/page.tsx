'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Smartphone, Terminal, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';

export default function BuildAndroidPage() {
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
            <h1 className="text-4xl font-bold text-white mb-4">Build for Android</h1>
            <p className="text-lg text-white/60">Prepare your app for Google Play Store.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* Requirements */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">Requirements</h2>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Node.js and npm installed</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Google Play Developer Account ($25 one-time)</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>No Mac required - works on Windows/Linux/Mac</li>
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
                    <p className="text-white/60 text-sm">Click "Export" in CapyCode to download your project.</p>
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
                    <h3 className="text-white font-medium mb-2">Configure EAS</h3>
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
                    <h3 className="text-white font-medium mb-2">Build APK or AAB</h3>
                    <div className="bg-[#0a0a0b] rounded-lg p-3 border border-[#1f1f23] space-y-2">
                      <div><code className="text-emerald-400 text-sm"># For testing (APK)</code></div>
                      <div><code className="text-emerald-400 text-sm">npx eas-cli build --platform android --profile preview</code></div>
                      <div className="pt-2"><code className="text-emerald-400 text-sm"># For Play Store (AAB)</code></div>
                      <div><code className="text-emerald-400 text-sm">npx eas-cli build --platform android --profile production</code></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">5</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-2">Upload to Play Console</h3>
                    <p className="text-white/60 text-sm">Upload the .aab file to Google Play Console.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* APK vs AAB */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">APK vs AAB</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-white font-medium mb-2">APK</h3>
                  <p className="text-white/50 text-sm">Direct installation on devices. Good for testing and sideloading.</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-white font-medium mb-2">AAB (App Bundle)</h3>
                  <p className="text-white/50 text-sm">Required for Play Store. Smaller downloads, optimized for each device.</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/build-ios" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Build for iOS</span>
              </Link>
              <Link href="/docs/publishing" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>Publishing</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
