'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
  Smartphone, 
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  Tablet,
  RefreshCw,
  Cpu,
  Loader2
} from 'lucide-react';

interface ProjectFile {
  path: string;
  content: string;
  type: string;
}

interface Project {
  id: string;
  name: string;
  files: ProjectFile[];
}

interface PreviewProps {
  project: Project | null;
  isGenerating?: boolean;
}

interface AIStatus {
  connected: boolean;
  model: string | null;
  provider?: string;
}

type DeviceType = 'iphone' | 'android' | 'ipad';

export function Preview({ project, isGenerating }: PreviewProps) {
  const [device, setDevice] = useState<DeviceType>('iphone');
  const [scale, setScale] = useState(0.65);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiStatus, setAiStatus] = useState<AIStatus>({ connected: false, model: null });
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Update real time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check AI status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/ai/status');
        const data = await response.json();
        setAiStatus(data);
      } catch {
        setAiStatus({ connected: false, model: null });
      } finally {
        setCheckingStatus(false);
      }
    };
    checkStatus();
  }, []);

  // Extract app content from project files
  const appContent = useMemo(() => {
    if (!project?.files) return null;
    
    // Find main App file
    const appFile = project.files.find(f => 
      f.path.includes('App.tsx') || 
      f.path.includes('App.js') ||
      f.path.includes('index.tsx')
    );
    
    return appFile?.content || null;
  }, [project?.files]);

  // Force refresh preview
  const handleRefresh = () => setRefreshKey(k => k + 1);

  // Handle mouse drag for moving preview
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel zoom - prevent page scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale(s => Math.min(Math.max(s + delta, 0.3), 1.5));
  }, []);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 1.5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.3));
  const handleReset = () => {
    setScale(0.65);
    setPosition({ x: 0, y: 0 });
  };

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center bg-transparent relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[100px]" />
        </div>
        <div className="text-center text-[#6b6b70] relative z-10">
          <Smartphone className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg text-white">No project to preview</p>
          <p className="text-sm mt-2">Generate a project first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent relative overflow-hidden">
      {/* Subtle glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[80px]" />
      </div>

      {/* Device selector - Top left */}
      <div className="absolute top-4 left-4 z-20">
        <div className="flex items-center bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-xl p-1">
          <button
            onClick={() => setDevice('iphone')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              device === 'iphone' 
                ? 'bg-[#1f1f23] text-white' 
                : 'text-[#6b6b70] hover:text-white'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            iOS
          </button>
          <button
            onClick={() => setDevice('android')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              device === 'android' 
                ? 'bg-[#1f1f23] text-white' 
                : 'text-[#6b6b70] hover:text-white'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            Android
          </button>
          <button
            onClick={() => setDevice('ipad')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              device === 'ipad' 
                ? 'bg-[#1f1f23] text-white' 
                : 'text-[#6b6b70] hover:text-white'
            }`}
          >
            <Tablet className="w-3 h-3" />
            iPad
          </button>
        </div>
      </div>

      {/* AI Status Badge - Top center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-xl px-3 py-1.5">
          {checkingStatus ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6b6b70]" />
          ) : (
            <>
              <div className={`w-2 h-2 rounded-full ${aiStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <Cpu className={`w-3.5 h-3.5 ${aiStatus.connected ? 'text-emerald-400' : 'text-red-400'}`} />
              <span className={`text-xs font-medium ${aiStatus.connected ? 'text-emerald-400' : 'text-red-400'}`}>
                {aiStatus.connected ? 'Gemini AI' : 'AI Offline'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Zoom controls - Top right */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center gap-1 bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-xl p-1">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg text-[#6b6b70] hover:text-white hover:bg-[#1f1f23] transition-all"
            title="Refresh preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-[#1f1f23]" />
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg text-[#6b6b70] hover:text-white hover:bg-[#1f1f23] transition-all"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#6b6b70] w-10 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg text-[#6b6b70] hover:text-white hover:bg-[#1f1f23] transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg text-[#6b6b70] hover:text-white hover:bg-[#1f1f23] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Content - Draggable area */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
          className="relative z-10 select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
          onDragStart={(e) => e.preventDefault()}
        >
          <DeviceFrame device={device} currentTime={currentTime}>
            <LivePreviewContent 
              key={refreshKey} 
              project={project} 
              appContent={appContent} 
            />
          </DeviceFrame>
        </div>
      </div>

      {/* Info notice - Bottom right */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-xl px-3 py-2 flex items-center gap-2 max-w-xs">
          <Info className="w-4 h-4 text-[#6b6b70] shrink-0" />
          <p className="text-xs text-[#6b6b70]">Scroll to zoom • Drag to move</p>
        </div>
      </div>
    </div>
  );
}

interface DeviceFrameProps {
  device: DeviceType;
  children?: React.ReactNode;
  currentTime?: string;
}

function DeviceFrame({ device, children, currentTime }: DeviceFrameProps) {
  if (device === 'iphone') {
    return (
      <div className="relative">
        {/* iPhone Frame - iPhone 15 Pro style */}
        <div className="relative w-[320px] h-[660px] rounded-[55px] p-[3px] bg-gradient-to-b from-[#2a2a2c] via-[#1a1a1c] to-[#2a2a2c] shadow-2xl shadow-black/60">
          {/* Inner frame */}
          <div className="relative w-full h-full bg-[#0a0a0b] rounded-[52px] overflow-hidden">
            {/* Dynamic Island */}
            <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[100px] h-[32px] bg-black rounded-full z-30 flex items-center justify-center gap-3">
              <div className="w-[8px] h-[8px] rounded-full bg-[#1a1a1c]" />
              <div className="w-[4px] h-[4px] rounded-full bg-[#1a1a1c]" />
            </div>

            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-[52px] z-20 flex items-end justify-between px-8 pb-1 select-none pointer-events-none">
              <span className="text-white text-[15px] font-semibold">{currentTime || '9:41'}</span>
              <div className="flex items-center gap-1.5">
                {/* Signal */}
                <div className="flex items-end gap-[2px]">
                  <div className="w-[3px] h-[4px] bg-white rounded-sm" />
                  <div className="w-[3px] h-[6px] bg-white rounded-sm" />
                  <div className="w-[3px] h-[8px] bg-white rounded-sm" />
                  <div className="w-[3px] h-[10px] bg-white rounded-sm" />
                </div>
                {/* WiFi */}
                <svg className="w-[15px] h-[11px] text-white" viewBox="0 0 15 11" fill="currentColor">
                  <path d="M7.5 2.5C9.5 2.5 11.3 3.3 12.6 4.6L14 3.2C12.3 1.5 10 0.5 7.5 0.5C5 0.5 2.7 1.5 1 3.2L2.4 4.6C3.7 3.3 5.5 2.5 7.5 2.5ZM7.5 5.5C8.6 5.5 9.6 5.9 10.4 6.7L11.8 5.3C10.7 4.2 9.2 3.5 7.5 3.5C5.8 3.5 4.3 4.2 3.2 5.3L4.6 6.7C5.4 5.9 6.4 5.5 7.5 5.5ZM7.5 8.5C8 8.5 8.5 8.7 8.9 9.1L10.3 7.7C9.5 6.9 8.5 6.5 7.5 6.5C6.5 6.5 5.5 6.9 4.7 7.7L6.1 9.1C6.5 8.7 7 8.5 7.5 8.5ZM7.5 9.5C6.9 9.5 6.5 9.9 6.5 10.5C6.5 11.1 6.9 11.5 7.5 11.5C8.1 11.5 8.5 11.1 8.5 10.5C8.5 9.9 8.1 9.5 7.5 9.5Z"/>
                </svg>
                {/* Battery */}
                <div className="flex items-center">
                  <div className="w-[22px] h-[11px] border border-white/50 rounded-[3px] relative p-[2px]">
                    <div className="h-full w-full bg-white rounded-[1px]" />
                  </div>
                  <div className="w-[1.5px] h-[4px] bg-white/50 rounded-r-full ml-[0.5px]" />
                </div>
              </div>
            </div>

            {/* Screen content */}
            <div className="absolute inset-0 pt-[52px] pb-[25px]">
              {children}
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[120px] h-[4px] bg-white/30 rounded-full" />
          </div>
        </div>

        {/* Side buttons */}
        <div className="absolute left-[-2px] top-[100px] w-[2px] h-[25px] bg-[#2a2a2c] rounded-l-sm" />
        <div className="absolute left-[-2px] top-[150px] w-[2px] h-[50px] bg-[#2a2a2c] rounded-l-sm" />
        <div className="absolute left-[-2px] top-[210px] w-[2px] h-[50px] bg-[#2a2a2c] rounded-l-sm" />
        <div className="absolute right-[-2px] top-[170px] w-[2px] h-[70px] bg-[#2a2a2c] rounded-r-sm" />
      </div>
    );
  }

  if (device === 'ipad') {
    return (
      <div className="relative">
        {/* iPad Frame - Landscape orientation */}
        <div className="relative w-[680px] h-[480px] rounded-[28px] p-[3px] bg-gradient-to-b from-[#2a2a2c] via-[#1a1a1c] to-[#2a2a2c] shadow-2xl shadow-black/60">
          <div className="relative w-full h-full bg-[#0a0a0b] rounded-[25px] overflow-hidden">
            {/* Camera */}
            <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[8px] h-[8px] bg-[#1a1a1c] rounded-full z-30" />

            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-[28px] z-20 flex items-center justify-between px-6 select-none pointer-events-none">
              <span className="text-white text-[12px] font-semibold">{currentTime || '9:41'}</span>
              <div className="flex items-center gap-1">
                <div className="flex items-center">
                  <div className="w-[18px] h-[9px] border border-white/50 rounded-[2px] relative p-[1px]">
                    <div className="h-full w-full bg-white rounded-[1px]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Screen content - no scrollbar */}
            <div className="absolute inset-0 pt-[28px] pb-[20px] overflow-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className="h-full overflow-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`::-webkit-scrollbar { display: none; }`}</style>
                {children}
              </div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-white/30 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Android device (Pixel style)
  return (
    <div className="relative">
      <div className="relative w-[320px] h-[680px] rounded-[35px] p-[3px] bg-gradient-to-b from-[#2a2a2c] via-[#1a1a1c] to-[#2a2a2c] shadow-2xl shadow-black/60">
        <div className="relative w-full h-full bg-[#0a0a0b] rounded-[32px] overflow-hidden">
          {/* Punch hole camera */}
          <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] bg-[#1a1a1a] rounded-full z-30" />

          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 h-[36px] z-20 flex items-center justify-between px-6 pt-1 select-none pointer-events-none">
            <span className="text-white text-[13px]">{currentTime || '12:00'}</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-[2px]">
                <div className="w-[3px] h-[8px] bg-white/70 rounded-sm" />
                <div className="w-[3px] h-[10px] bg-white/70 rounded-sm" />
                <div className="w-[3px] h-[12px] bg-white/70 rounded-sm" />
                <div className="w-[3px] h-[14px] bg-white rounded-sm" />
              </div>
              <div className="w-[20px] h-[10px] border border-white/70 rounded-[2px] ml-1">
                <div className="w-[60%] h-full bg-white/70 rounded-[1px]" />
              </div>
            </div>
          </div>

          {/* Screen content */}
          <div className="absolute inset-0 pt-[36px] pb-[20px]">
            {children}
          </div>

          {/* Navigation bar */}
          <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-white/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function LivePreviewContent({ project, appContent }: { project: Project | null; appContent: string | null }) {
  // No demo data - show waiting message when no real project code exists
  if (!project || !appContent) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0a0a0b] px-6">
        <div className="w-20 h-20 bg-[#1f1f23]/50 rounded-3xl flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-emerald-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <h3 className="text-white text-lg font-semibold mb-2">No Preview Available</h3>
        <p className="text-[#6b6b70] text-sm text-center max-w-[200px]">
          Generate a project using AI to see the live preview here
        </p>
        <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium">Waiting for code...</span>
        </div>
      </div>
    );
  }

  // Render actual iframe with React Native Web preview
  return (
    <div className="h-full w-full bg-[#0a0a0b] overflow-hidden select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', pointerEvents: 'none' }}>
      <iframe
        srcDoc={generatePreviewHTML(appContent, project.name)}
        className="w-full h-full border-0 pointer-events-none"
        sandbox="allow-scripts allow-same-origin"
        title="App Preview"
        style={{ userSelect: 'none' }}
      />
    </div>
  );
}

// Generate HTML for previewing React Native code
function generatePreviewHTML(code: string, appName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <title>${appName}</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box;
      user-select: none !important;
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
    }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0b;
      color: white;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      pointer-events: none;
      overflow: hidden;
    }
    .preview-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px;
    }
    .preview-header {
      padding: 12px 0;
      margin-bottom: 16px;
    }
    .preview-title {
      font-size: 24px;
      font-weight: 700;
      color: white;
    }
    .preview-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #6b6b70;
    }
    .code-indicator {
      background: #1f1f23;
      border-radius: 12px;
      padding: 16px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 11px;
      color: #10b981;
      max-width: 100%;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .success-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 20px;
      color: #10b981;
      font-size: 12px;
      margin-bottom: 16px;
    }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="preview-header">
      <h1 class="preview-title">${appName}</h1>
    </div>
    <div class="preview-content">
      <div class="success-badge">
        <div class="dot"></div>
        Code Generated
      </div>
      <p style="margin-bottom: 16px; text-align: center; font-size: 14px;">
        Your app code is ready!<br>
        Use Expo Go to test on device.
      </p>
      <div class="code-indicator">
        ${code.substring(0, 500).replace(/</g, '&lt;').replace(/>/g, '&gt;')}${code.length > 500 ? '...' : ''}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
