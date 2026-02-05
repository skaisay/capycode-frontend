'use client';

import { useState, useRef } from 'react';
import { 
  Rocket, 
  Apple, 
  Play,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  Check,
  Smartphone,
  Tablet
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
}

interface BuildPanelProps {
  project: Project | null;
}

type Platform = 'ios' | 'android' | 'both';
type DeviceType = 'phone' | 'tablet';

export function BuildPanel({ project }: BuildPanelProps) {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState<Platform>('both');
  const [deviceType, setDeviceType] = useState<DeviceType>('phone');
  const [appIcon, setAppIcon] = useState<string | null>(null);
  const [appName, setAppName] = useState(project?.name || 'My App');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setAppIcon(event.target?.result as string);
        toast.success('Icon uploaded!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartBuild = () => {
    // Open EAS Build in new tab with pre-filled data
    window.open('https://expo.dev/accounts', '_blank');
    toast.success('Redirecting to Expo...');
  };

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0b]">
        <div className="text-center text-[#6b6b70]">
          <Rocket className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg text-white">No project to build</p>
          <p className="text-sm mt-2">Generate a project first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0b] overflow-auto">
      {/* Header */}
      <div className="p-4 border-b border-[#1f1f23]/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Publish App</h2>
            <p className="text-xs text-[#6b6b70]">3 simple steps to App Store</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-4 py-3 border-b border-[#1f1f23]/50 shrink-0">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step >= s 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-[#1f1f23] text-[#6b6b70]'
                }`}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-0.5 mx-2 transition-all ${step > s ? 'bg-emerald-500' : 'bg-[#1f1f23]'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-[#6b6b70]">Icon</span>
          <span className="text-[10px] text-[#6b6b70]">Platform</span>
          <span className="text-[10px] text-[#6b6b70]">Build</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {/* Step 1: App Icon */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-white font-medium mb-2">Upload App Icon</h3>
              <p className="text-xs text-[#6b6b70]">1024×1024px PNG recommended</p>
            </div>

            <div className="flex justify-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-3xl border-2 border-dashed border-[#2a2a2e] hover:border-emerald-500/50 flex items-center justify-center cursor-pointer transition-all overflow-hidden bg-[#1f1f23]/50 group"
              >
                {appIcon ? (
                  <img src={appIcon} alt="App Icon" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-[#6b6b70] mx-auto mb-2 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-xs text-[#6b6b70] group-hover:text-white transition-colors">Click to upload</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleIconUpload}
                className="hidden"
              />
            </div>

            {/* App Name */}
            <div>
              <label className="block text-xs text-[#6b6b70] mb-2">App Name</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1f1f23] border border-[#2a2a2e] text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                placeholder="My Awesome App"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Step 2: Platform Selection */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-white font-medium mb-2">Select Platform</h3>
              <p className="text-xs text-[#6b6b70]">Where do you want to publish?</p>
            </div>

            {/* Platform */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'ios', icon: <Apple className="w-6 h-6" />, label: 'iOS' },
                { id: 'android', icon: <Play className="w-6 h-6" />, label: 'Android' },
                { id: 'both', icon: <div className="flex"><Apple className="w-5 h-5" /><Play className="w-5 h-5" /></div>, label: 'Both' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id as Platform)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    platform === p.id 
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                      : 'border-[#2a2a2e] bg-[#1f1f23]/50 text-[#6b6b70] hover:border-[#3a3a3e]'
                  }`}
                >
                  {p.icon}
                  <span className="text-xs font-medium">{p.label}</span>
                </button>
              ))}
            </div>

            {/* Device Type */}
            <div>
              <label className="block text-xs text-[#6b6b70] mb-3">Device Support</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'phone', icon: <Smartphone className="w-5 h-5" />, label: 'Phone Only' },
                  { id: 'tablet', icon: <Tablet className="w-5 h-5" />, label: 'Phone + Tablet' },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDeviceType(d.id as DeviceType)}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                      deviceType === d.id 
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                        : 'border-[#2a2a2e] text-[#6b6b70] hover:border-[#3a3a3e]'
                    }`}
                  >
                    {d.icon}
                    <span className="text-xs font-medium">{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl bg-[#1f1f23] hover:bg-[#2a2a2e] text-white font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Build */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-white font-medium mb-2">Ready to Build!</h3>
              <p className="text-xs text-[#6b6b70]">Review your settings and start build</p>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-[#1f1f23]/50 border border-[#2a2a2e]/50 space-y-4">
              <div className="flex items-center gap-4">
                {appIcon ? (
                  <img src={appIcon} alt="App Icon" className="w-16 h-16 rounded-2xl" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#2a2a2e] flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-[#6b6b70]" />
                  </div>
                )}
                <div>
                  <p className="text-white font-medium">{appName}</p>
                  <p className="text-xs text-[#6b6b70]">
                    {platform === 'both' ? 'iOS & Android' : platform === 'ios' ? 'iOS Only' : 'Android Only'}
                    {' • '}
                    {deviceType === 'tablet' ? 'Phone + Tablet' : 'Phone Only'}
                  </p>
                </div>
              </div>
            </div>

            {/* What happens next */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-300 font-medium mb-2">What happens next:</p>
              <ul className="text-xs text-blue-300/80 space-y-1">
                <li>• You'll be redirected to Expo</li>
                <li>• Sign in with your Expo account</li>
                <li>• Certificates will be generated automatically</li>
                <li>• Build will start in the cloud</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl bg-[#1f1f23] hover:bg-[#2a2a2e] text-white font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleStartBuild}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                Start Build
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer Link */}
      <div className="p-4 border-t border-[#1f1f23]/50 shrink-0">
        <a
          href="https://expo.dev/eas"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2 text-xs text-[#6b6b70] hover:text-emerald-400 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Learn more about EAS Build
        </a>
      </div>
    </div>
  );
}
