'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Smartphone, 
  Rocket, 
  Code2, 
  Zap, 
  Cloud, 
  Shield, 
  Users,
  ArrowRight,
  Check,
  MessageSquare,
  Palette,
  Globe,
  GitBranch
} from 'lucide-react';
import Header from '@/components/Header';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Generation',
    description: 'Describe your app idea in plain English and watch AI generate production-ready React Native code instantly.',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: Smartphone,
    title: 'Live Preview',
    description: 'See your app come to life in real-time. Preview on iPhone, Android, or iPad simulators directly in browser.',
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    icon: Rocket,
    title: 'One-Click Deploy',
    description: 'Deploy to App Store and Google Play with a single click. We handle certificates, builds, and submissions.',
    gradient: 'from-orange-500 to-red-600',
  },
  {
    icon: Code2,
    title: 'Full Code Access',
    description: 'Export clean, well-documented code anytime. No vendor lock-in. Your code, your way.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: MessageSquare,
    title: 'AI Chat Assistant',
    description: 'Chat with AI to refine your app. Add features, fix bugs, or completely redesign — just by asking.',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    icon: Palette,
    title: 'Beautiful UI Components',
    description: 'Pre-built components that look stunning out of the box. Customize colors, fonts, and layouts easily.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: Cloud,
    title: 'Cloud Sync',
    description: 'Your projects are automatically saved to the cloud. Access them from anywhere, on any device.',
    gradient: 'from-sky-500 to-blue-600',
  },
  {
    icon: GitBranch,
    title: 'Version Control',
    description: 'Built-in version history. Undo changes, compare versions, and never lose your work.',
    gradient: 'from-indigo-500 to-violet-600',
  },
  {
    icon: Globe,
    title: 'Expo Integration',
    description: 'Test on real devices instantly with Expo Go. Scan QR code and see your app running in seconds.',
    gradient: 'from-green-500 to-emerald-600',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-[100px]" />
      </div>

      {/* Header */}
      <Header showBack backTo="/dashboard" backLabel="Dashboard" />

      <main className="relative z-10 pt-20">
        {/* Hero */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-semibold mb-6 text-white">
                Everything you need to build{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  amazing apps
                </span>
              </h1>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                CapyCode combines AI power with professional development tools. 
                From idea to App Store in minutes, not months.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group p-6 bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl hover:border-[#2a2a2e] transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-[#6b6b70] text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="max-w-xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-semibold mb-4 text-white">Ready to start building?</h2>
              <p className="text-white/40 mb-8">
                Create your first app in minutes. No credit card required.
              </p>
              <Link 
                href="/auth/signup" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-[#1f1f23]/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="CapyCode" width={20} height={20} className="rounded" />
            <span className="text-sm font-medium text-white">CapyCode</span>
          </div>
          <div className="flex items-center gap-6 text-white/30 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
          <p className="text-white/20 text-xs">© 2026 CapyCode</p>
        </div>
      </footer>
    </div>
  );
}
