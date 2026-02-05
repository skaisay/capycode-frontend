'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ScrollText, Shield, CreditCard, Ban, FileCode, Scale } from 'lucide-react';
import Header from '@/components/Header';

const sections = [
  {
    title: '1. Acceptance of Terms',
    icon: ScrollText,
    content: `By accessing or using CapyCode's services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using our services.

These terms apply to all visitors, users, and others who access or use the Service. We reserve the right to update these terms at any time, and it is your responsibility to review them periodically.`,
  },
  {
    title: '2. Use License',
    icon: FileCode,
    content: `Subject to these Terms, CapyCode grants you a limited, non-exclusive, non-transferable license to:

• Access and use the Services for your personal or internal business purposes
• Create, edit, and export mobile applications using our platform
• Use AI-generated code and assets in your projects
• Store your projects and data on our servers

This license does not include the right to:
• Modify, copy, or distribute the CapyCode platform itself
• Reverse engineer or attempt to extract source code from our platform
• Use the Services to build a competing product
• Resell, sublicense, or commercially exploit the Services`,
  },
  {
    title: '3. User Accounts',
    icon: Shield,
    content: `When you create an account with us, you must provide accurate and complete information. You are responsible for:

• Maintaining the confidentiality of your account credentials
• All activities that occur under your account
• Notifying us immediately of any unauthorized access
• Ensuring your account information is always current

We reserve the right to suspend or terminate accounts that violate these terms or for any other reason at our sole discretion. You may delete your account at any time through your account settings.`,
  },
  {
    title: '4. Payment Terms',
    icon: CreditCard,
    content: `For paid subscriptions, you agree to pay all applicable fees as described on our pricing page.

• Billing occurs at the beginning of each billing period
• All fees are non-refundable unless otherwise stated
• Prices may change with 30 days notice
• Failed payments may result in service suspension
• You can cancel your subscription at any time
• Cancellation takes effect at the end of the current billing period

Enterprise customers may have custom payment terms as specified in their agreement.`,
  },
  {
    title: '5. Prohibited Uses',
    icon: Ban,
    content: `You may not use CapyCode to:

• Violate any applicable laws or regulations
• Create malicious, harmful, or offensive content
• Infringe on intellectual property rights of others
• Distribute malware, viruses, or harmful code
• Attempt to gain unauthorized access to our systems
• Interfere with the proper functioning of the Services
• Harass, abuse, or harm others
• Scrape or collect data without permission
• Use automated systems to access the Services
• Generate content that violates our content policies

We reserve the right to investigate and take appropriate action against violators.`,
  },
  {
    title: '6. Intellectual Property',
    icon: Scale,
    content: `Ownership of Content:
• You retain ownership of all code and content you create using CapyCode
• AI-generated code suggestions are provided without ownership claims from us
• You grant us a license to host and display your content as needed to provide the Services

CapyCode Property:
• The CapyCode platform, brand, and underlying technology remain our property
• You may not use our trademarks without prior written permission
• All rights not expressly granted are reserved

Third-Party Content:
• Some features may include third-party libraries or components
• These are subject to their respective licenses
• You are responsible for compliance with applicable licenses`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[100px]" />
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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <ScrollText className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">Terms of Service</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-semibold mb-6 text-white">
                Terms of{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Service
                </span>
              </h1>
              <p className="text-lg text-white/50 max-w-xl mx-auto">
                Please read these terms carefully before using CapyCode.
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
                Welcome to CapyCode. These Terms of Service ("Terms") govern your access to and use of the CapyCode platform, including any content, functionality, and services offered on or through capycode.com (the "Services"). CapyCode is operated by CapyCode Inc. ("Company", "we", "us", or "our").
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

            {/* Additional Terms */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-8"
            >
              <h2 className="text-xl font-semibold text-white mb-6">7. Disclaimer of Warranties</h2>
              <div className="text-[#9a9aa0] leading-relaxed space-y-4">
                <p>
                  THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                </p>
                <p>
                  We do not warrant that the Services will be uninterrupted, error-free, or secure. You use the Services at your own risk. We disclaim all warranties, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-2xl p-8"
            >
              <h2 className="text-xl font-semibold text-white mb-6">8. Limitation of Liability</h2>
              <div className="text-[#9a9aa0] leading-relaxed space-y-4">
                <p>
                  IN NO EVENT SHALL CAPYCODE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
                </p>
                <p>
                  Our total liability shall not exceed the amount you paid us in the twelve (12) months preceding the claim. Some jurisdictions do not allow the exclusion of certain warranties or limitations of liability, so these limitations may not apply to you.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-12 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center"
            >
              <h2 className="text-xl font-semibold text-white mb-4">Questions About These Terms?</h2>
              <p className="text-[#6b6b70] mb-6">
                If you have any questions about these Terms of Service, please contact our legal team.
              </p>
              <a
                href="mailto:legal@capycode.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
              >
                Contact Legal Team
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
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="text-white transition-colors">Terms</Link>
          </div>
          <p className="text-white/20 text-xs">© 2026 CapyCode</p>
        </div>
      </footer>
    </div>
  );
}
