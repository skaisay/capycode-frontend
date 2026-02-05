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

  // Auto-refresh preview when content changes
  useEffect(() => {
    if (appContent) {
      setRefreshKey(k => k + 1);
    }
  }, [appContent]);

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

  // Handle wheel zoom - use native event listener to avoid passive warning
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setScale(s => Math.min(Math.max(s + delta, 0.3), 1.5));
    };
    
    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
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
        style={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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

// Generate visual preview HTML from React Native code
function generatePreviewHTML(code: string, appName: string): string {
  // Extract colors, styles and UI info from the code
  const colors = extractColors(code);
  const uiElements = extractUIElements(code);
  
  const primaryColor = colors.primary || '#10b981';
  const backgroundColor = colors.background || '#000000';
  const textColor = colors.text || '#ffffff';
  
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
    }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      background: ${backgroundColor};
      color: ${textColor};
      min-height: 100vh;
      overflow-x: hidden;
      overflow-y: auto;
    }
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 16px;
    }
    .header {
      padding: 12px 0;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: ${textColor};
    }
    .header p {
      font-size: 14px;
      color: rgba(255,255,255,0.6);
      margin-top: 4px;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 12px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .card h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .card p {
      font-size: 14px;
      color: rgba(255,255,255,0.6);
      line-height: 1.5;
    }
    .button {
      background: ${primaryColor};
      color: white;
      border: none;
      padding: 14px 24px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      width: 100%;
      margin-top: 8px;
      cursor: pointer;
    }
    .button-secondary {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.2);
      color: ${textColor};
    }
    .input-field {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      color: ${textColor};
      padding: 14px 16px;
      border-radius: 12px;
      font-size: 16px;
      width: 100%;
      margin-bottom: 12px;
    }
    .input-field::placeholder {
      color: rgba(255,255,255,0.4);
    }
    .list-item {
      display: flex;
      align-items: center;
      padding: 12px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      margin-bottom: 8px;
    }
    .list-item-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: ${primaryColor}22;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      color: ${primaryColor};
    }
    .list-item-content h4 {
      font-size: 15px;
      font-weight: 500;
    }
    .list-item-content p {
      font-size: 13px;
      color: rgba(255,255,255,0.5);
      margin-top: 2px;
    }
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      padding: 12px 16px 24px;
      background: rgba(0,0,0,0.9);
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: rgba(255,255,255,0.5);
      font-size: 10px;
    }
    .nav-item.active {
      color: ${primaryColor};
    }
    .nav-item svg {
      width: 24px;
      height: 24px;
      margin-bottom: 4px;
    }
    .image-placeholder {
      background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
      border-radius: 12px;
      height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      color: rgba(255,255,255,0.2);
    }
    .image-placeholder svg {
      width: 48px;
      height: 48px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      background: ${primaryColor}22;
      color: ${primaryColor};
    }
    .flex-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .spacer {
      flex: 1;
    }
  </style>
</head>
<body>
  <div class="app-container">
    ${renderUIFromCode(uiElements, appName, primaryColor)}
  </div>
</body>
</html>
`;
}

// Extract colors from code
function extractColors(code: string): { primary?: string; background?: string; text?: string; secondary?: string } {
  const colors: any = {};
  
  // Look for color definitions
  const colorPatterns = [
    /primary[:\s'"]*([#][0-9a-fA-F]{6}|[#][0-9a-fA-F]{3})/gi,
    /backgroundColor[:\s'"]*([#][0-9a-fA-F]{6}|[#][0-9a-fA-F]{3})/gi,
    /background[:\s'"]*([#][0-9a-fA-F]{6}|[#][0-9a-fA-F]{3})/gi,
    /color[:\s'"]*([#][0-9a-fA-F]{6}|[#][0-9a-fA-F]{3})/gi,
  ];
  
  const bgMatch = code.match(/backgroundColor\s*[:=]\s*['"]?([#][0-9a-fA-F]{3,8})/i);
  if (bgMatch) colors.background = bgMatch[1];
  
  const primaryMatch = code.match(/primary|accent|brand/i);
  if (primaryMatch) {
    const nearbyColor = code.slice(Math.max(0, primaryMatch.index! - 50), primaryMatch.index! + 100)
      .match(/[#][0-9a-fA-F]{6}/);
    if (nearbyColor) colors.primary = nearbyColor[0];
  }
  
  // Common color keywords
  if (code.includes('#10b981') || code.includes('emerald')) colors.primary = '#10b981';
  if (code.includes('#3b82f6') || code.includes('blue')) colors.primary = '#3b82f6';
  if (code.includes('#8b5cf6') || code.includes('violet')) colors.primary = '#8b5cf6';
  if (code.includes('#f59e0b') || code.includes('amber')) colors.primary = '#f59e0b';
  if (code.includes('#ef4444') || code.includes('red')) colors.primary = '#ef4444';
  
  return colors;
}

// Extract UI elements from code to determine what to render
function extractUIElements(code: string): { 
  hasHeader: boolean; 
  hasNav: boolean; 
  hasCards: boolean;
  hasInputs: boolean;
  hasButtons: boolean;
  hasList: boolean;
  hasImages: boolean;
  title?: string;
  subtitle?: string;
  buttonTexts: string[];
  inputPlaceholders: string[];
  listItems: string[];
} {
  const result = {
    hasHeader: /header|title|<Text[^>]*style[^>]*title/i.test(code),
    hasNav: /bottom|tab|navigation|navigator/i.test(code),
    hasCards: /card|item|box|container/i.test(code),
    hasInputs: /TextInput|input|search|email|password/i.test(code),
    hasButtons: /Button|TouchableOpacity|Pressable|onPress/i.test(code),
    hasList: /FlatList|list|map\(|scroll/i.test(code),
    hasImages: /Image|photo|avatar|icon|picture/i.test(code),
    title: '',
    subtitle: '',
    buttonTexts: [] as string[],
    inputPlaceholders: [] as string[],
    listItems: [] as string[],
  };
  
  // Extract title from code
  const titleMatch = code.match(/['"`]((?:Welcome|Hello|Home|Dashboard|Profile|Settings|Shop|Store|Cart|My |Get Started|Sign|Log)[^'"`]{0,30})['"`]/i);
  if (titleMatch) result.title = titleMatch[1];
  
  // Extract button texts
  const buttonRegex = /['"`]((?:Submit|Save|Continue|Next|Add|Create|Buy|Order|Sign|Log|Get|Start|Send|Confirm|Cancel|Delete|Update)[^'"`]{0,20})['"`]/gi;
  let buttonMatch;
  while ((buttonMatch = buttonRegex.exec(code)) !== null) {
    if (buttonMatch[1] && !result.buttonTexts.includes(buttonMatch[1])) {
      result.buttonTexts.push(buttonMatch[1]);
    }
  }
  
  // Extract placeholders
  const placeholderRegex = /placeholder\s*[=:]\s*['"`]([^'"`]+)['"`]/gi;
  let placeholderMatch;
  while ((placeholderMatch = placeholderRegex.exec(code)) !== null) {
    if (placeholderMatch[1]) result.inputPlaceholders.push(placeholderMatch[1]);
  }
  
  return result;
}

// Render UI based on extracted elements
function renderUIFromCode(ui: ReturnType<typeof extractUIElements>, appName: string, primaryColor: string): string {
  let html = '';
  
  // Header
  html += `
    <div class="header">
      <h1>${ui.title || appName}</h1>
      ${ui.subtitle ? `<p>${ui.subtitle}</p>` : '<p>Your React Native App</p>'}
    </div>
  `;
  
  // Image placeholder if app has images
  if (ui.hasImages) {
    html += `
      <div class="image-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
    `;
  }
  
  // Input fields
  if (ui.hasInputs) {
    const placeholders = ui.inputPlaceholders.length > 0 
      ? ui.inputPlaceholders 
      : ['Enter your email...', 'Password'];
    
    for (const placeholder of placeholders.slice(0, 3)) {
      const inputType = placeholder.toLowerCase().includes('password') ? 'password' : 'text';
      html += `<input type="${inputType}" class="input-field" placeholder="${placeholder}" />`;
    }
  }
  
  // Cards or list items
  if (ui.hasCards || ui.hasList) {
    const items = [
      { title: 'Item 1', desc: 'Description here' },
      { title: 'Item 2', desc: 'Another item' },
      { title: 'Item 3', desc: 'More content' },
    ];
    
    for (const item of items) {
      html += `
        <div class="list-item">
          <div class="list-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="list-item-content">
            <h4>${item.title}</h4>
            <p>${item.desc}</p>
          </div>
        </div>
      `;
    }
  }
  
  // Buttons
  if (ui.hasButtons) {
    const buttonText = ui.buttonTexts[0] || 'Continue';
    html += `<button class="button">${buttonText}</button>`;
    
    if (ui.buttonTexts.length > 1) {
      html += `<button class="button button-secondary">${ui.buttonTexts[1]}</button>`;
    }
  }
  
  // Bottom nav
  if (ui.hasNav) {
    html += `
      <div class="bottom-nav">
        <div class="nav-item active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Home</span>
        </div>
        <div class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span>Search</span>
        </div>
        <div class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>Profile</span>
        </div>
      </div>
    `;
  }
  
  return html;
}
