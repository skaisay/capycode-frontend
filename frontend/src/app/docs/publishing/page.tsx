'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Store, Apple, Smartphone, CheckCircle, FileText, Image } from 'lucide-react';
import Header from '@/components/Header';

export default function PublishingPage() {
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
              <Store className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Deployment</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Publishing to Stores</h1>
            <p className="text-lg text-white/60">Get your app on the App Store and Google Play.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* Checklist */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Pre-submission Checklist</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-white/60">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>App tested thoroughly on both iOS and Android</span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>App icon in all required sizes</span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Screenshots for different device sizes</span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>App description and keywords prepared</span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Privacy policy URL (required by both stores)</span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Support email address</span>
                </div>
              </div>
            </div>

            {/* App Store */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-500/20 flex items-center justify-center">
                  <Apple className="w-5 h-5 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Apple App Store</h2>
              </div>
              <div className="space-y-4 text-white/60">
                <p><strong className="text-white">Cost:</strong> $99/year Apple Developer Program</p>
                <p><strong className="text-white">Review Time:</strong> Usually 24-48 hours</p>
                <div className="mt-4">
                  <h3 className="text-white font-medium mb-2">Steps:</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Create app in App Store Connect</li>
                    <li>Upload build via Xcode or Transporter</li>
                    <li>Fill in app metadata and pricing</li>
                    <li>Submit for review</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Google Play */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Google Play Store</h2>
              </div>
              <div className="space-y-4 text-white/60">
                <p><strong className="text-white">Cost:</strong> $25 one-time registration fee</p>
                <p><strong className="text-white">Review Time:</strong> Usually a few hours to 7 days</p>
                <div className="mt-4">
                  <h3 className="text-white font-medium mb-2">Steps:</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Create app in Google Play Console</li>
                    <li>Upload AAB file</li>
                    <li>Complete store listing</li>
                    <li>Set up pricing and distribution</li>
                    <li>Submit for review</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Required Assets */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Required Assets</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <div className="flex items-center gap-2 mb-2">
                    <Image className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-white font-medium">App Icon</h3>
                  </div>
                  <p className="text-white/50 text-sm">1024x1024px PNG, no transparency</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <div className="flex items-center gap-2 mb-2">
                    <Image className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-white font-medium">Screenshots</h3>
                  </div>
                  <p className="text-white/50 text-sm">Multiple sizes for phones and tablets</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-white font-medium">Description</h3>
                  </div>
                  <p className="text-white/50 text-sm">Compelling app description with keywords</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-white font-medium">Privacy Policy</h3>
                  </div>
                  <p className="text-white/50 text-sm">Required URL for both stores</p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">🎉 Congratulations!</h2>
              <p className="text-white/60">
                You've completed the CapyCode documentation! You now have all the knowledge needed to 
                build, test, and publish your mobile apps. Happy coding!
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/build-android" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Build for Android</span>
              </Link>
              <Link href="/docs" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>Back to Docs</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
