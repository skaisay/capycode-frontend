'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Info,
  Download,
  ChevronRight,
  Wifi,
  Play,
  Apple
} from 'lucide-react';

interface ExpoQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  projectSlug?: string;
}

export function ExpoQRModal({ isOpen, onClose, projectId, projectName, projectSlug }: ExpoQRModalProps) {
  const [activeTab, setActiveTab] = useState<'expo-go' | 'dev-build'>('expo-go');
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(key);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const steps = {
    'expo-go': [
      {
        step: 1,
        title: 'Export Your Project',
        description: 'Click "Export" to download your project files as a ZIP',
        command: null,
        icon: <Download className="w-4 h-4" />
      },
      {
        step: 2,
        title: 'Install Dependencies',
        description: 'Open terminal in the extracted project folder:',
        command: 'npm install',
        icon: <Terminal className="w-4 h-4" />
      },
      {
        step: 3,
        title: 'Start Development Server',
        description: 'Launch Expo development server:',
        command: 'npx expo start',
        icon: <Wifi className="w-4 h-4" />
      },
      {
        step: 4,
        title: 'Scan QR Code',
        description: 'Open Expo Go on your phone and scan the QR code in terminal',
        command: null,
        icon: <Smartphone className="w-4 h-4" />
      }
    ],
    'dev-build': [
      {
        step: 1,
        title: 'Install EAS CLI',
        description: 'Install Expo Application Services CLI:',
        command: 'npm install -g eas-cli',
        icon: <Terminal className="w-4 h-4" />
      },
      {
        step: 2,
        title: 'Login to Expo',
        description: 'Authenticate with your Expo account:',
        command: 'eas login',
        icon: <Check className="w-4 h-4" />
      },
      {
        step: 3,
        title: 'Configure Project',
        description: 'Initialize EAS Build configuration:',
        command: 'eas build:configure',
        icon: <Terminal className="w-4 h-4" />
      },
      {
        step: 4,
        title: 'Create Development Build',
        description: 'Build for your device:',
        command: 'eas build --profile development --platform all',
        icon: <Smartphone className="w-4 h-4" />
      }
    ]
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-lg bg-[#111113] rounded-3xl border border-[#1f1f23] shadow-2xl shadow-black/50 overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-[#1f1f23]/50 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Test on Device</h2>
                      <p className="text-xs text-[#6b6b70]">Run your app on a real device</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-[#6b6b70] hover:text-white hover:bg-[#1f1f23] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setActiveTab('expo-go')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                      activeTab === 'expo-go'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#1f1f23]/50 text-[#6b6b70] border border-transparent hover:text-white'
                    }`}
                  >
                    Expo Go
                  </button>
                  <button
                    onClick={() => setActiveTab('dev-build')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                      activeTab === 'dev-build'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#1f1f23]/50 text-[#6b6b70] border border-transparent hover:text-white'
                    }`}
                  >
                    Development Build
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-auto flex-1">
                {/* Info Banner */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
                  <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    {activeTab === 'expo-go' ? (
                      <p className="text-blue-300">
                        <span className="font-medium">Expo Go</span> is the fastest way to test. 
                        Download Expo Go on your phone and follow the steps below.
                      </p>
                    ) : (
                      <p className="text-blue-300">
                        <span className="font-medium">Development builds</span> give you full native capabilities.
                        Required for apps using custom native modules.
                      </p>
                    )}
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-4">
                  {steps[activeTab].map((item) => (
                    <div
                      key={item.step}
                      className="p-4 rounded-xl bg-[#0a0a0b] border border-[#1f1f23]/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-400">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1f1f23] text-[#6b6b70]">
                              Step {item.step}
                            </span>
                            <h4 className="text-sm font-medium text-white">{item.title}</h4>
                          </div>
                          <p className="text-xs text-[#6b6b70] mb-2">{item.description}</p>
                          
                          {item.command && (
                            <div className="flex items-center gap-2">
                              <code className="flex-1 px-3 py-2 rounded-lg bg-[#1f1f23] font-mono text-xs text-emerald-400 overflow-x-auto">
                                {item.command}
                              </code>
                              <button
                                onClick={() => handleCopy(item.command!, `step-${item.step}`)}
                                className="p-2 rounded-lg bg-[#1f1f23] hover:bg-[#2a2a2e] transition-colors shrink-0"
                              >
                                {copiedCommand === `step-${item.step}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-[#6b6b70]" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Download Apps */}
                <div className="mt-6 pt-6 border-t border-[#1f1f23]/50">
                  <p className="text-xs text-[#6b6b70] mb-3 text-center">
                    Download Expo Go on your device:
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <a 
                      href="https://apps.apple.com/app/expo-go/id982107779" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1f1f23]/50 border border-[#2a2a2e]/50 text-xs text-[#9a9aa0] hover:text-white hover:border-[#3a3a3e] transition-all"
                    >
                      <Apple className="w-4 h-4" />
                      App Store
                    </a>
                    <a 
                      href="https://play.google.com/store/apps/details?id=host.exp.exponent" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1f1f23]/50 border border-[#2a2a2e]/50 text-xs text-[#9a9aa0] hover:text-white hover:border-[#3a3a3e] transition-all"
                    >
                      <Play className="w-4 h-4" />
                      Google Play
                    </a>
                  </div>
                </div>

                {/* Documentation Link */}
                <div className="mt-4">
                  <a
                    href="https://docs.expo.dev/get-started/expo-go/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 text-xs text-[#6b6b70] hover:text-emerald-400 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Read Expo Documentation
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
