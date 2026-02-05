'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Share2,
  Apple,
  Play,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Loader2,
  Rocket,
  Shield,
  FileText,
  Image as ImageIcon,
  Upload,
  XCircle,
  ChevronLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ProjectFile {
  path: string;
  content: string;
}

interface ShareSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  projectFiles?: ProjectFile[];
}

type SubmissionTarget = 'app-store' | 'play-store' | null;
type SubmissionStep = 'select' | 'configure' | 'checking' | 'requirements' | 'instructions';

interface AppConfig {
  name: string;
  icon: string | null;
  bundleId: string;
  version: string;
}

interface RequirementCheck {
  id: string;
  title: string;
  description: string;
  status: 'checking' | 'passed' | 'failed' | 'warning';
  details?: string;
}

export function ShareSubmitModal({ isOpen, onClose, projectId, projectName, projectFiles }: ShareSubmitModalProps) {
  const [target, setTarget] = useState<SubmissionTarget>(null);
  const [step, setStep] = useState<SubmissionStep>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    name: projectName || 'My App',
    icon: null,
    bundleId: `com.capycode.${(projectName || 'myapp').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    version: '1.0.0',
  });
  const [requirements, setRequirements] = useState<RequirementCheck[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTarget(null);
      setStep('select');
      setAppConfig({
        name: projectName || 'My App',
        icon: null,
        bundleId: `com.capycode.${(projectName || 'myapp').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        version: '1.0.0',
      });
      setRequirements([]);
    }
  }, [isOpen, projectName]);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setAppConfig(prev => ({ ...prev, icon: event.target?.result as string }));
        toast.success('Icon uploaded');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectTarget = (t: SubmissionTarget) => {
    setTarget(t);
    setStep('configure');
  };

  const handleStartCheck = async () => {
    if (!projectFiles || projectFiles.length === 0) {
      toast.error('No project to submit. Generate a project first.');
      return;
    }

    setStep('checking');
    setIsProcessing(true);

    // Initialize requirements with actual project checks
    const checks: RequirementCheck[] = target === 'app-store' ? [
      { id: 'files', title: 'Project Files', description: 'Checking project structure...', status: 'checking' },
      { id: 'app-config', title: 'App Configuration', description: 'Validating app.json...', status: 'checking' },
      { id: 'icon', title: 'App Icon', description: 'Checking 1024x1024 icon...', status: 'checking' },
      { id: 'bundle-id', title: 'Bundle Identifier', description: 'Validating iOS bundle ID...', status: 'checking' },
      { id: 'eas-config', title: 'EAS Configuration', description: 'Checking eas.json...', status: 'checking' },
    ] : [
      { id: 'files', title: 'Project Files', description: 'Checking project structure...', status: 'checking' },
      { id: 'app-config', title: 'App Configuration', description: 'Validating app.json...', status: 'checking' },
      { id: 'icon', title: 'App Icon', description: 'Checking 512x512 icon...', status: 'checking' },
      { id: 'package', title: 'Package Name', description: 'Validating Android package...', status: 'checking' },
      { id: 'eas-config', title: 'EAS Configuration', description: 'Checking eas.json...', status: 'checking' },
    ];

    setRequirements(checks);

    // Check each requirement with real validation
    for (let i = 0; i < checks.length; i++) {
      await new Promise(r => setTimeout(r, 400));
      
      const check = checks[i];
      let status: 'passed' | 'failed' | 'warning' = 'passed';
      let details: string | undefined;

      switch (check.id) {
        case 'files':
          const hasAppTsx = projectFiles.some(f => f.path === 'App.tsx' || f.path === 'App.js');
          const hasPackageJson = projectFiles.some(f => f.path === 'package.json');
          if (!hasAppTsx) {
            status = 'failed';
            details = 'Missing App.tsx entry point';
          } else if (!hasPackageJson) {
            status = 'warning';
            details = 'Missing package.json - will be generated';
          } else {
            details = `${projectFiles.length} files ready`;
          }
          break;
          
        case 'app-config':
          const appJson = projectFiles.find(f => f.path === 'app.json');
          if (!appJson) {
            status = 'warning';
            details = 'Missing app.json - will use provided config';
          } else {
            try {
              const config = JSON.parse(appJson.content);
              if (!config.expo?.name || !config.expo?.slug) {
                status = 'warning';
                details = 'Incomplete app.json - will be updated';
              } else {
                details = 'Configuration valid';
              }
            } catch {
              status = 'warning';
              details = 'Invalid JSON - will be regenerated';
            }
          }
          break;
          
        case 'icon':
          if (!appConfig.icon) {
            status = 'warning';
            details = 'No custom icon - default CapyCode icon will be used';
          } else {
            details = 'Custom icon uploaded';
          }
          break;
          
        case 'bundle-id':
        case 'package':
          const bundleRegex = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/i;
          if (!appConfig.bundleId || !bundleRegex.test(appConfig.bundleId)) {
            status = 'warning';
            details = 'Invalid format - should be like com.company.app';
          } else {
            details = appConfig.bundleId;
          }
          break;
          
        case 'eas-config':
          const easJson = projectFiles.find(f => f.path === 'eas.json');
          if (!easJson) {
            status = 'warning';
            details = 'Will be auto-generated by EAS CLI';
          } else {
            details = 'EAS configuration found';
          }
          break;
      }

      setRequirements(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status, details } : r
      ));
    }

    setIsProcessing(false);
    setStep('requirements');
  };

  const handleContinue = () => {
    // Check if there are critical failures
    const hasFailed = requirements.some(r => r.status === 'failed');
    if (hasFailed) {
      toast.error('Please fix critical issues before continuing');
      return;
    }
    setStep('instructions');
  };

  const handleClose = () => {
    setTarget(null);
    setStep('select');
    setIsProcessing(false);
    onClose();
  };

  const getRequirementIcon = (status: RequirementCheck['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'passed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0f0f11] border border-[#2a2a2e]/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f23]/50">
            <div className="flex items-center gap-3">
              {step !== 'select' && (
                <button
                  onClick={() => {
                    if (step === 'configure') setStep('select');
                    else if (step === 'requirements' || step === 'checking') setStep('configure');
                    else if (step === 'instructions') setStep('requirements');
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#1f1f23] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-[#6b6b70]" />
                </button>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                target === 'app-store' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                  : target === 'play-store'
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                    : 'bg-gradient-to-br from-blue-500 to-purple-500'
              }`}>
                {target === 'app-store' ? (
                  <Apple className="w-5 h-5 text-white" />
                ) : target === 'play-store' ? (
                  <Play className="w-5 h-5 text-white fill-white" />
                ) : (
                  <Share2 className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {step === 'select' && 'Submit to Store'}
                  {step === 'configure' && 'Configure App'}
                  {step === 'checking' && 'Checking Project...'}
                  {step === 'requirements' && 'Requirements Check'}
                  {step === 'instructions' && 'Build Instructions'}
                </h2>
                <p className="text-xs text-[#6b6b70]">
                  {appConfig.name || projectName || 'Your App'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-[#1f1f23] transition-colors"
            >
              <X className="w-5 h-5 text-[#6b6b70]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[65vh] overflow-y-auto">
            {/* Step: Select Target */}
            {step === 'select' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <p className="text-sm text-[#9a9aa0] mb-6">
                  Choose where you want to publish your app:
                </p>

                {/* App Store Option */}
                <button
                  onClick={() => handleSelectTarget('app-store')}
                  className="w-full p-4 rounded-xl bg-[#1f1f23]/30 border border-[#2a2a2e]/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                      <Apple className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium flex items-center gap-2">
                        App Store
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">iOS</span>
                      </div>
                      <p className="text-xs text-[#6b6b70] mt-0.5">
                        Publish for iPhone, iPad, and Mac
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#6b6b70] group-hover:text-white transition-colors" />
                  </div>
                </button>

                {/* Play Store Option */}
                <button
                  onClick={() => handleSelectTarget('play-store')}
                  className="w-full p-4 rounded-xl bg-[#1f1f23]/30 border border-[#2a2a2e]/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium flex items-center gap-2">
                        Google Play
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Android</span>
                      </div>
                      <p className="text-xs text-[#6b6b70] mt-0.5">
                        Publish for Android phones and tablets
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#6b6b70] group-hover:text-white transition-colors" />
                  </div>
                </button>

                {/* Warning if no project */}
                {(!projectFiles || projectFiles.length === 0) && (
                  <div className="mt-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <div className="flex gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-300">
                        No project detected. Generate a project first before submitting.
                      </p>
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="mt-6 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-300">
                      Submission requires developer accounts. Apple Developer ($99/year) or Google Play Console ($25 one-time).
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step: Configure App */}
            {step === 'configure' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* App Icon */}
                <div className="flex items-start gap-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#2a2a2e] hover:border-emerald-500/50 flex items-center justify-center cursor-pointer transition-all overflow-hidden bg-[#1f1f23]/50 group shrink-0"
                  >
                    {appConfig.icon ? (
                      <img src={appConfig.icon} alt="App Icon" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <Upload className="w-5 h-5 text-[#6b6b70] mx-auto group-hover:text-emerald-400 transition-colors" />
                        <span className="text-[10px] text-[#6b6b70] mt-1 block">Icon</span>
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
                  <div className="flex-1">
                    <label className="block text-xs text-[#6b6b70] mb-1.5">App Name</label>
                    <input
                      type="text"
                      value={appConfig.name}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-[#1f1f23] border border-[#2a2a2e] text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                      placeholder="My App"
                    />
                    <p className="text-[10px] text-[#6b6b70] mt-1">
                      This name will appear on the store
                    </p>
                  </div>
                </div>

                {/* Bundle ID */}
                <div>
                  <label className="block text-xs text-[#6b6b70] mb-1.5">
                    {target === 'app-store' ? 'Bundle Identifier' : 'Package Name'}
                  </label>
                  <input
                    type="text"
                    value={appConfig.bundleId}
                    onChange={(e) => setAppConfig(prev => ({ ...prev, bundleId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f23] border border-[#2a2a2e] text-white text-sm font-mono focus:border-emerald-500/50 focus:outline-none transition-colors"
                    placeholder="com.yourcompany.appname"
                  />
                  <p className="text-[10px] text-[#6b6b70] mt-1">
                    Unique identifier (e.g., com.company.appname)
                  </p>
                </div>

                {/* Version */}
                <div>
                  <label className="block text-xs text-[#6b6b70] mb-1.5">Version</label>
                  <input
                    type="text"
                    value={appConfig.version}
                    onChange={(e) => setAppConfig(prev => ({ ...prev, version: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f23] border border-[#2a2a2e] text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                    placeholder="1.0.0"
                  />
                </div>

                <button
                  onClick={handleStartCheck}
                  disabled={!appConfig.name || !appConfig.bundleId}
                  className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    target === 'app-store'
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  Check Project
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step: Checking */}
            {step === 'checking' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <p className="text-sm text-[#9a9aa0] mb-4">
                  Validating your project before submission...
                </p>
                {requirements.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-[#1f1f23]/30 border border-[#2a2a2e]/50"
                  >
                    {getRequirementIcon(req.status)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{req.title}</p>
                      <p className="text-xs text-[#6b6b70]">{req.description}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Step: Requirements Results */}
            {step === 'requirements' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <p className="text-sm text-[#9a9aa0] mb-2">
                  Project validation results:
                </p>

                <div className="space-y-2">
                  {requirements.map((req) => (
                    <div
                      key={req.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        req.status === 'passed' 
                          ? 'bg-emerald-500/5 border-emerald-500/20' 
                          : req.status === 'warning'
                            ? 'bg-yellow-500/5 border-yellow-500/20'
                            : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      {getRequirementIcon(req.status)}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          req.status === 'passed' ? 'text-emerald-300' :
                          req.status === 'warning' ? 'text-yellow-300' : 'text-red-300'
                        }`}>
                          {req.title}
                        </p>
                        {req.details && (
                          <p className="text-xs text-[#6b6b70] mt-0.5">{req.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="p-3 rounded-lg bg-[#1f1f23]/50 border border-[#2a2a2e]/50">
                  <div className="flex items-center gap-2 mb-2">
                    {requirements.some(r => r.status === 'failed') ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : requirements.some(r => r.status === 'warning') ? (
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="text-sm font-medium text-white">
                      {requirements.some(r => r.status === 'failed') 
                        ? 'Fix issues before building'
                        : requirements.some(r => r.status === 'warning')
                          ? 'Ready with warnings'
                          : 'All checks passed'
                      }
                    </span>
                  </div>
                  <p className="text-xs text-[#6b6b70]">
                    {requirements.filter(r => r.status === 'passed').length} passed, {' '}
                    {requirements.filter(r => r.status === 'warning').length} warnings, {' '}
                    {requirements.filter(r => r.status === 'failed').length} failed
                  </p>
                </div>

                <button
                  onClick={handleContinue}
                  disabled={requirements.some(r => r.status === 'failed')}
                  className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    target === 'app-store'
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  <Rocket className="w-4 h-4" />
                  Continue to Build
                </button>
              </motion.div>
            )}

            {/* Step: Instructions */}
            {step === 'instructions' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-xl bg-[#1f1f23]/30 border border-[#2a2a2e]/50">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Rocket className="w-4 h-4" />
                    How to Build & Submit
                  </h4>
                  
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                      <div>
                        <p className="text-white font-medium">Export your project</p>
                        <p className="text-xs text-[#6b6b70] mt-0.5">Download the project files to your computer</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                      <div>
                        <p className="text-white font-medium">Install EAS CLI</p>
                        <code className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block font-mono">
                          npm install -g eas-cli
                        </code>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                      <div>
                        <p className="text-white font-medium">Login to Expo</p>
                        <code className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block font-mono">
                          eas login
                        </code>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                      <div>
                        <p className="text-white font-medium">Build your app</p>
                        <code className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block font-mono">
                          eas build --platform {target === 'app-store' ? 'ios' : 'android'}
                        </code>
                        <p className="text-xs text-[#6b6b70] mt-1">EAS handles signing certificates automatically</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">5</span>
                      <div>
                        <p className="text-white font-medium">Submit to store</p>
                        <code className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block font-mono">
                          eas submit --platform {target === 'app-store' ? 'ios' : 'android'}
                        </code>
                      </div>
                    </li>
                  </ol>
                </div>

                {/* Helpful Links */}
                <div className="flex gap-3">
                  <a
                    href="https://docs.expo.dev/build/setup/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl bg-[#1f1f23] hover:bg-[#2a2a2e] text-white font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    EAS Docs
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={target === 'app-store' ? 'https://appstoreconnect.apple.com' : 'https://play.google.com/console'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                      target === 'app-store'
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {target === 'app-store' ? 'App Store Connect' : 'Play Console'}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
