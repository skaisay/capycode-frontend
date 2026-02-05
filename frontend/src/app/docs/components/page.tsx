'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Layers, Square, Type, Image, ToggleLeft } from 'lucide-react';
import Header from '@/components/Header';

export default function ComponentsPage() {
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
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Development</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Components Library</h1>
            <p className="text-lg text-white/60">React Native components available in CapyCode.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* Core Components */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Core Components</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <div className="flex items-center gap-2 mb-2">
                    <Square className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-white font-medium">View</h3>
                  </div>
                  <p className="text-white/50 text-sm">Container component for layout</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <div className="flex items-center gap-2 mb-2">
                    <Type className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-white font-medium">Text</h3>
                  </div>
                  <p className="text-white/50 text-sm">Display text content</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <div className="flex items-center gap-2 mb-2">
                    <Image className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-white font-medium">Image</h3>
                  </div>
                  <p className="text-white/50 text-sm">Display images and icons</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <div className="flex items-center gap-2 mb-2">
                    <ToggleLeft className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-white font-medium">TouchableOpacity</h3>
                  </div>
                  <p className="text-white/50 text-sm">Pressable with opacity feedback</p>
                </div>
              </div>
            </div>

            {/* Input Components */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Input Components</h2>
              <div className="space-y-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-mono text-sm mb-2">TextInput</h3>
                  <p className="text-white/60 text-sm">Text fields for user input, password fields, search boxes</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-mono text-sm mb-2">Switch</h3>
                  <p className="text-white/60 text-sm">Toggle switches for boolean settings</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-mono text-sm mb-2">Button</h3>
                  <p className="text-white/60 text-sm">Pressable buttons with customizable styles</p>
                </div>
              </div>
            </div>

            {/* List Components */}
            <div className="bg-[#111113] border border-[#1f1f23] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">List Components</h2>
              <div className="space-y-4">
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-mono text-sm mb-2">FlatList</h3>
                  <p className="text-white/60 text-sm">Performant scrolling list for large datasets</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-mono text-sm mb-2">ScrollView</h3>
                  <p className="text-white/60 text-sm">Scrollable container for content</p>
                </div>
                <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f23]">
                  <h3 className="text-emerald-400 font-mono text-sm mb-2">SectionList</h3>
                  <p className="text-white/60 text-sm">List with section headers</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-[#1f1f23]">
              <Link href="/docs/file-structure" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>File Structure</span>
              </Link>
              <Link href="/docs/preview" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
                <span>Live Preview</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
