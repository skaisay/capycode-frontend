'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Smartphone, QrCode, Download, Wifi } from 'lucide-react';
import Header from '@/components/Header';

export default function ExpoGoPage() {
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
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Preview & Testing</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Expo Go Testing</h1>
            <p className="text-lg text-white/60">Test your app on a real device with Expo Go.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* What is Expo Go */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">What is Expo Go?</h2>
              <p className="text-white/60 mb-4">
                Expo Go is a free app for iOS and Android that lets you run your React Native app on your 
                real phone without needing to build and install it. Perfect for testing touch interactions, 
                performance, and real-world usage.
              </p>
              <div className="flex gap-4">
                <a href="https://apps.apple.com/app/expo-go/id982107779" target="_blank" rel="noopener noreferrer" 
                   className="px-4 py-2 bg-[#0a0a0b] border border-[#1f1f23] rounded-lg text-white text-sm hover:border-emerald-500/50 transition-colors">
                  Download for iOS
                </a>
                <a href="https://play.google.com/store/apps/details?id=host.exp.exponent" target="_blank" rel="noopener noreferrer"
                   className="px-4 py-2 bg-[#0a0a0b] border border-[#1f1f23] rounded-lg text-white text-sm hover:border-emerald-500/50 transition-colors">
                  Download for Android
                </a>
              </div>
            </div>

            {/* Steps */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">How to Test with Expo Go</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">1. Install Expo Go</h3>
                    <p className="text-white/60 text-sm">Download Expo Go from the App Store or Play Store</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Wifi className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">2. Same Network</h3>
                    <p className="text-white/60 text-sm">Make sure your phone and computer are on the same WiFi network</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">3. Scan QR Code</h3>
                    <p className="text-white/60 text-sm">Click the QR button in CapyCode and scan with Expo Go</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">4. Test Your App</h3>
                    <p className="text-white/60 text-sm">Your app loads on your phone with live updates</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">Benefits of Real Device Testing</h2>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Test actual touch gestures and scrolling</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Check performance on real hardware</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Test camera, GPS, and other device features</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Share with others for feedback</li>
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/preview" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Live Preview</span>
              </Link>
              <Link href="/docs/simulators" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>Simulators</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
