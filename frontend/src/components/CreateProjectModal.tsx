'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Smartphone, Tag, FileText, ChevronDown, Cpu } from 'lucide-react';
import { AI_MODELS, AIModel, getDefaultModel } from '@/lib/ai';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ProjectData) => void;
  initialPrompt?: string;
  isCreating?: boolean;
}

export interface ProjectData {
  name: string;
  description: string;
  prompt: string;
  model: AIModel;
}

export function CreateProjectModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  initialPrompt = '',
  isCreating = false
}: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState<AIModel>(getDefaultModel());
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Generate name from prompt ONLY when modal opens (not on every name change)
  useEffect(() => {
    if (isOpen && initialPrompt && !hasInitialized) {
      const words = initialPrompt.split(' ').slice(0, 3);
      const generatedName = words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('')
        .replace(/[^a-zA-Z0-9]/g, '') + 'App';
      setName(generatedName || 'MyApp');
      setHasInitialized(true);
    }
  }, [isOpen, initialPrompt, hasInitialized]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
      setShowModelSelect(false);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showModelSelect && modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModelSelect(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelSelect]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onConfirm({
      name: name.trim(),
      description: description.trim(),
      prompt: initialPrompt,
      model,
    });
  };

  const selectedModel = AI_MODELS.find(m => m.id === model);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg max-h-[85vh] bg-[#111113] border border-[#1f1f23] rounded-2xl shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#1f1f23]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Create New App</h2>
                <p className="text-sm text-[#6b6b70]">Configure your project settings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isCreating}
              className="p-2 rounded-lg hover:bg-[#1f1f23] transition-colors text-[#6b6b70] hover:text-white disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* App Name */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#9a9aa0]">
                <Smartphone className="w-4 h-4" />
                App Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MyAwesomeApp"
                disabled={isCreating}
                className="w-full px-4 py-3.5 bg-[#0a0a0b] border border-[#1f1f23] rounded-xl text-white text-base placeholder-[#3f3f46] focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#9a9aa0]">
                <FileText className="w-4 h-4" />
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your app"
                disabled={isCreating}
                className="w-full px-4 py-3.5 bg-[#0a0a0b] border border-[#1f1f23] rounded-xl text-white text-base placeholder-[#3f3f46] focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
              />
            </div>

            {/* AI Model Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#9a9aa0]">
                <Cpu className="w-4 h-4" />
                AI Model
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModelSelect(!showModelSelect)}
                  disabled={isCreating}
                  className="w-full px-4 py-3.5 bg-[#0a0a0b] border border-[#1f1f23] rounded-xl text-left text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Cpu className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-medium text-base">{selectedModel?.name}</div>
                      <div className="text-xs text-[#6b6b70]">{selectedModel?.description}</div>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-[#6b6b70] transition-transform ${showModelSelect ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown - positioned inside modal */}
                <AnimatePresence>
                  {showModelSelect && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute bottom-full left-0 right-0 mb-2 bg-[#161618] border border-[#1f1f23] rounded-xl overflow-hidden z-50 shadow-2xl"
                    >
                      {AI_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setModel(m.id);
                            setShowModelSelect(false);
                          }}
                          className={`w-full px-4 py-3.5 text-left hover:bg-[#1f1f23] transition-colors flex items-center gap-3 ${
                            model === m.id ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : 'border-l-2 border-transparent'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${model === m.id ? 'bg-emerald-500/20' : 'bg-[#1f1f23]'}`}>
                            <Cpu className={`w-4 h-4 ${model === m.id ? 'text-emerald-400' : 'text-[#6b6b70]'}`} />
                          </div>
                          <div>
                            <div className={`font-medium ${model === m.id ? 'text-emerald-400' : 'text-white'}`}>{m.name}</div>
                            <div className="text-xs text-[#6b6b70]">{m.description}</div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Prompt Preview */}
            {initialPrompt && (
              <div className="p-4 bg-[#0a0a0b] border border-[#1f1f23] rounded-xl max-h-32 overflow-y-auto">
                <div className="text-xs text-[#6b6b70] mb-2 font-medium">Your prompt:</div>
                <p className="text-sm text-white/80 leading-relaxed break-words">{initialPrompt}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-base rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create App
                </>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
