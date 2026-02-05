'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Server, Users, Bell } from 'lucide-react';
import Header from '@/components/Header';

const sections = [
  {
    title: 'Information We Collect',
    icon: Eye,
    content: `When you use CapyCode, we collect information you provide directly to us, such as:
    
• Account information (name, email address, password)
• Profile information (avatar, preferences)
• Content you create (projects, code, chat messages)
• Payment information (processed securely through Stripe)
• Communications with us (support tickets, feedback)

We also automatically collect certain information when you use our service, including:
• Device information (browser type, operating system)
• Usage data (features used, time spent, actions taken)
• Log data (IP address, access times, pages viewed)`,
  },
  {
    title: 'How We Use Your Information',
    icon: Server,
    content: `We use the information we collect to:

• Provide, maintain, and improve our services
• Process transactions and send related information
• Send technical notices, updates, and support messages
• Respond to your comments, questions, and requests
• Monitor and analyze trends, usage, and activities
• Detect, investigate, and prevent security incidents
• Personalize and improve your experience
• Develop new products, services, and features`,
  },
  {
    title: 'Data Security',
    icon: Lock,
    content: `We take the security of your data seriously and implement appropriate measures to protect it:

• All data is encrypted in transit using TLS 1.3
• Data at rest is encrypted using AES-256 encryption
• We use secure, SOC 2 compliant cloud infrastructure
• Regular security audits and penetration testing
• Access controls and authentication requirements
• Automatic backup and disaster recovery systems
• We never store your payment card information

If you discover a security vulnerability, please report it to security@capycode.com.`,
  },
  {
    title: 'Data Sharing',
    icon: Users,
    content: `We do not sell, trade, or rent your personal information to third parties. We may share information:

• With service providers who assist our operations (hosting, analytics, payment processing)
• To comply with legal obligations or respond to lawful requests
• To protect the rights, privacy, safety of CapyCode, our users, or the public
• In connection with a merger, acquisition, or sale of assets
• With your consent or at your direction

All third-party service providers are bound by contractual obligations to protect your data.`,
  },
  {
    title: 'Your Rights',
    icon: Shield,
    content: `You have the following rights regarding your personal data:

• Access: Request a copy of your personal data
• Correction: Update or correct inaccurate data
• Deletion: Request deletion of your data
• Portability: Export your data in a portable format
• Restriction: Limit how we process your data
• Objection: Object to certain data processing activities
• Withdraw Consent: Withdraw previously given consent

To exercise these rights, contact us at privacy@capycode.com or through your account settings.`,
  },
  {
    title: 'Communications',
    icon: Bell,
    content: `We may send you communications about:

• Account activity and security alerts (cannot be opted out)
• Service updates and changes to terms
• New features and product announcements
• Tips and tutorials for using CapyCode
• Marketing and promotional content (with opt-out option)

You can manage your email preferences in your account settings. Transactional emails related to your account cannot be disabled.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      {/* Header */}
      <Header showBack backTo="/dashboard" backLabel="Dashboard" />

      <main className="relative z-10">
        {/* Hero */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">Privacy Policy</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-semibold mb-6 text-white">
                Your Privacy{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Matters
                </span>
              </h1>
              <p className="text-lg text-white/50 max-w-xl mx-auto">
                We're committed to protecting your personal information and being transparent about how we use it.
              </p>
              <p className="text-sm text-[#4a4a4e] mt-4">
                Last updated: January 1, 2026
              </p>
            </motion.div>
          </div>
        </section>

        {/* Introduction */}
        <section className="pb-12 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-8"
            >
              <p className="text-[#9a9aa0] leading-relaxed">
                This Privacy Policy describes how CapyCode ("we", "us", or "our") collects, uses, and shares information about you when you use our website, applications, and services (collectively, the "Services"). By using our Services, you agree to the collection and use of information in accordance with this policy.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Sections */}
        <section className="py-12 px-6">
          <div className="max-w-3xl mx-auto space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                </div>
                <div className="text-[#9a9aa0] whitespace-pre-line leading-relaxed">
                  {section.content}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="py-12 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center"
            >
              <h2 className="text-xl font-semibold text-white mb-4">Questions About Privacy?</h2>
              <p className="text-[#6b6b70] mb-6">
                If you have any questions about this Privacy Policy or our data practices, please contact us.
              </p>
              <a
                href="mailto:privacy@capycode.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
              >
                Contact Privacy Team
              </a>
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
            <Link href="/privacy" className="text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
          <p className="text-white/20 text-xs">© 2026 CapyCode</p>
        </div>
      </footer>
    </div>
  );
}
