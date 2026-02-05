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
  Loader2,
  MousePointer2,
  Crosshair,
  X
} from 'lucide-react';
import { useElementSelectorStore } from '@/stores/elementSelectorStore';
import { motion, AnimatePresence } from 'framer-motion';

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
  onElementSelected?: (description: string) => void;
}

interface AIStatus {
  connected: boolean;
  model: string | null;
  provider?: string;
}

type DeviceType = 'iphone' | 'android' | 'ipad';

export function Preview({ project, isGenerating, onElementSelected }: PreviewProps) {
  const [device, setDevice] = useState<DeviceType>('iphone');
  const [scale, setScale] = useState(0.65);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiStatus, setAiStatus] = useState<AIStatus>({ connected: false, model: null });
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Element selector state
  const { 
    isSelecting, 
    toggleSelecting, 
    hoveredElement, 
    setHoveredElement,
    selectedElements,
    addSelectedElement,
    removeSelectedElement,
    clearSelectedElements,
    getSelectionDescription
  } = useElementSelectorStore();
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for messages from iframe (element selection)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isSelecting) return;
      
      if (event.data.type === 'ELEMENT_HOVER') {
        const { element } = event.data;
        if (element) {
          setHoveredElement({
            id: element.id || `el-${Date.now()}`,
            type: element.tagName?.toLowerCase() || 'element',
            displayName: element.displayName || element.tagName || 'Element',
            path: element.path || '',
          });
        }
      } else if (event.data.type === 'ELEMENT_LEAVE') {
        setHoveredElement(null);
      } else if (event.data.type === 'ELEMENT_CLICK') {
        const { element } = event.data;
        if (element) {
          addSelectedElement({
            id: element.id || `el-${Date.now()}`,
            type: element.tagName?.toLowerCase() || 'element',
            displayName: element.displayName || element.tagName || 'Element',
            path: element.path || '',
            preview: element.preview,
          });
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isSelecting, setHoveredElement, addSelectedElement]);

  // Send selection mode state to iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ 
        type: 'SET_SELECTION_MODE', 
        enabled: isSelecting 
      }, '*');
    }
  }, [isSelecting, refreshKey]);

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

  // Create combined content from ALL project files for preview
  const allFilesContent = useMemo(() => {
    if (!project?.files) return null;
    
    // Combine all TSX/JS files for analysis
    const codeFiles = project.files.filter(f => 
      f.path.endsWith('.tsx') || 
      f.path.endsWith('.ts') || 
      f.path.endsWith('.js') || 
      f.path.endsWith('.jsx')
    );
    
    return codeFiles.map(f => `// === ${f.path} ===\n${f.content}`).join('\n\n');
  }, [project?.files]);

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

  // Auto-refresh preview when ANY file changes
  useEffect(() => {
    if (allFilesContent) {
      setRefreshKey(k => k + 1);
      console.log('[Preview] Files changed, refreshing preview');
    }
  }, [allFilesContent]);

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
        <div className="flex items-center gap-2">
          {/* Device buttons */}
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
          
          {/* Element Selector Button */}
          <motion.button
            onClick={toggleSelecting}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              isSelecting 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                : 'bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 text-[#6b6b70] hover:text-white hover:border-emerald-500/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={isSelecting ? 'Выйти из режима выбора' : 'Выбрать элемент для редактирования'}
          >
            {isSelecting ? (
              <>
                <Crosshair className="w-4 h-4 animate-pulse" />
                <span>Выбор</span>
              </>
            ) : (
              <>
                <MousePointer2 className="w-4 h-4" />
                <span>Выбрать</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Hovered Element Info - Below device selector */}
      <AnimatePresence>
        {isSelecting && hoveredElement && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-4 z-30"
          >
            <div className="bg-[#1a1a1c]/95 backdrop-blur-xl border border-emerald-500/30 rounded-xl px-3 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-white font-medium">
                  {hoveredElement.displayName}
                </span>
                <span className="text-xs text-[#6b6b70]">
                  {hoveredElement.type}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Mode Hint */}
      <AnimatePresence>
        {isSelecting && selectedElements.length === 0 && !hoveredElement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
          >
            <div className="bg-[#111113]/90 backdrop-blur-md border border-emerald-500/30 rounded-2xl px-6 py-4 max-w-xs text-center">
              <Crosshair className="w-8 h-8 text-emerald-500 mx-auto mb-3 animate-pulse" />
              <p className="text-white text-sm font-medium mb-1">
                Режим выбора элементов
              </p>
              <p className="text-[#6b6b70] text-xs">
                Наведите мышку на элемент и кликните для выбора
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Elements Panel - Bottom */}
      <AnimatePresence>
        {selectedElements.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 z-30"
          >
            <div className="bg-[#111113]/95 backdrop-blur-xl border border-[#1f1f23] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#6b6b70]">
                  Выбрано: {selectedElements.length}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const description = getSelectionDescription();
                      if (onElementSelected) {
                        onElementSelected(description);
                      }
                      // Also copy to clipboard
                      navigator.clipboard.writeText(description);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1 bg-emerald-500/10 rounded-lg"
                  >
                    → Отправить в AI
                  </button>
                  <button 
                    onClick={clearSelectedElements}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Очистить
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedElements.map((el) => (
                  <motion.div
                    key={el.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg"
                  >
                    <span className="text-xs text-emerald-400 font-medium">
                      {el.displayName}
                    </span>
                    <span className="text-xs text-emerald-400/60">
                      ({el.type})
                    </span>
                    <button
                      onClick={() => removeSelectedElement(el.id)}
                      className="ml-1 text-emerald-400/60 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              allFilesContent={allFilesContent || ''}
              iframeRef={iframeRef}
              isSelectingElement={isSelecting}
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

interface LivePreviewContentProps {
  project: Project | null;
  appContent: string | null;
  allFilesContent: string;
  iframeRef?: React.RefObject<HTMLIFrameElement>;
  isSelectingElement?: boolean;
}

function LivePreviewContent({ project, appContent, allFilesContent, iframeRef, isSelectingElement }: LivePreviewContentProps) {
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

  // Use all files content for full analysis, fallback to appContent
  const codeToAnalyze = allFilesContent || appContent;

  // Render actual iframe with React Native Web preview
  // Allow pointer events when in selection mode
  return (
    <div 
      className="h-full w-full bg-[#0a0a0b] overflow-hidden select-none" 
      style={{ 
        userSelect: 'none', 
        WebkitUserSelect: 'none', 
        pointerEvents: isSelectingElement ? 'auto' : 'none' 
      }}
    >
      <iframe
        ref={iframeRef}
        srcDoc={generatePreviewHTML(codeToAnalyze, project.name, project.files)}
        className={`w-full h-full border-0 ${isSelectingElement ? '' : 'pointer-events-none'}`}
        sandbox="allow-scripts allow-same-origin"
        title="App Preview"
        style={{ userSelect: 'none' }}
      />
    </div>
  );
}

// Generate visual preview HTML from React Native code
function generatePreviewHTML(code: string, appName: string, files?: Array<{ path: string; content: string }>): string {
  // Smart analysis of ALL project files
  const analysis = analyzeProjectCode(code, files || []);
  
  const primaryColor = analysis.colors.primary || '#10b981';
  const backgroundColor = analysis.colors.background || '#0a0a0b';
  const textColor = analysis.colors.text || '#ffffff';
  const secondaryColor = analysis.colors.secondary || '#1f1f23';
  
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
      padding-bottom: ${analysis.hasNav ? '80px' : '16px'};
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
      background: ${secondaryColor};
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
      background: ${secondaryColor};
      border-radius: 12px;
      margin-bottom: 8px;
      border: 1px solid rgba(255,255,255,0.05);
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
      background: rgba(0,0,0,0.95);
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
      background: linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor} 100%);
      border-radius: 16px;
      height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      color: ${primaryColor};
    }
    .image-placeholder svg {
      width: 48px;
      height: 48px;
      opacity: 0.5;
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
    .spacer { flex: 1; }
    .calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .calc-btn { 
      background: ${secondaryColor}; 
      border: none; 
      border-radius: 50%; 
      width: 60px; 
      height: 60px; 
      font-size: 24px; 
      color: ${textColor}; 
      display: flex; 
      align-items: center; 
      justify-content: center;
    }
    .calc-btn.primary { background: ${primaryColor}; }
    .calc-btn.operator { background: #333; color: ${primaryColor}; }
    .calc-display { 
      text-align: right; 
      font-size: 48px; 
      font-weight: 300; 
      padding: 20px; 
      margin-bottom: 20px; 
      color: ${textColor};
    }
    .stat-card {
      background: linear-gradient(135deg, ${primaryColor}22 0%, ${secondaryColor} 100%);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 12px;
    }
    .stat-value { font-size: 32px; font-weight: 700; color: ${primaryColor}; }
    .stat-label { font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 4px; }
    .progress-bar { 
      height: 8px; 
      background: rgba(255,255,255,0.1); 
      border-radius: 4px; 
      overflow: hidden;
      margin-top: 12px;
    }
    .progress-fill { height: 100%; background: ${primaryColor}; border-radius: 4px; }
    .avatar { 
      width: 80px; 
      height: 80px; 
      border-radius: 50%; 
      background: ${primaryColor}33;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .chat-bubble {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 18px;
      margin-bottom: 8px;
      font-size: 15px;
    }
    .chat-bubble.received {
      background: ${secondaryColor};
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }
    .chat-bubble.sent {
      background: ${primaryColor};
      border-bottom-right-radius: 4px;
      align-self: flex-end;
    }
    .chat-container { display: flex; flex-direction: column; flex: 1; }
    .chat-input-area {
      display: flex;
      gap: 8px;
      padding: 12px 0;
      margin-top: auto;
    }
    .chat-input {
      flex: 1;
      background: ${secondaryColor};
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 12px 16px;
      color: ${textColor};
      font-size: 15px;
    }
    .send-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .todo-item {
      display: flex;
      align-items: center;
      padding: 16px;
      background: ${secondaryColor};
      border-radius: 12px;
      margin-bottom: 8px;
    }
    .todo-checkbox {
      width: 24px;
      height: 24px;
      border: 2px solid ${primaryColor};
      border-radius: 6px;
      margin-right: 12px;
    }
    .todo-checkbox.checked {
      background: ${primaryColor};
    }
    .weather-icon { font-size: 64px; margin: 20px 0; }
    .temp-display { font-size: 72px; font-weight: 200; }
    
    /* Element selector styles */
    .element-highlight {
      outline: 2px solid #10b981 !important;
      outline-offset: 2px !important;
      cursor: pointer !important;
    }
    .selection-mode * {
      cursor: crosshair !important;
    }
  </style>
</head>
<body>
  <div class="app-container" data-element-name="App Container">
    ${renderSmartUI(analysis, appName, primaryColor)}
  </div>
  
  <script>
    // Element Selection System
    let selectionMode = false;
    let highlightedElement = null;
    
    // Get readable name for element
    function getElementName(el) {
      // Check for data attribute
      if (el.dataset && el.dataset.elementName) {
        return el.dataset.elementName;
      }
      // Use class name
      if (el.className) {
        const classes = el.className.split(' ').filter(c => c && c !== 'element-highlight');
        if (classes.length > 0) {
          return classes[0].replace(/-/g, ' ').replace(/^./, s => s.toUpperCase());
        }
      }
      // Use tag name
      const tagNames = {
        'div': 'Container',
        'button': 'Button',
        'input': 'Input Field',
        'h1': 'Heading',
        'h2': 'Subheading',
        'h3': 'Title',
        'p': 'Text',
        'span': 'Text',
        'img': 'Image',
        'a': 'Link',
        'ul': 'List',
        'li': 'List Item',
        'nav': 'Navigation',
        'header': 'Header',
        'footer': 'Footer',
        'section': 'Section',
        'form': 'Form'
      };
      return tagNames[el.tagName.toLowerCase()] || el.tagName;
    }
    
    // Get CSS path for element
    function getCSSPath(el) {
      const path = [];
      while (el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
          selector += '#' + el.id;
          path.unshift(selector);
          break;
        }
        if (el.className) {
          const classes = el.className.split(' ').filter(c => c && c !== 'element-highlight');
          if (classes.length) {
            selector += '.' + classes.join('.');
          }
        }
        path.unshift(selector);
        el = el.parentNode;
      }
      return path.join(' > ');
    }
    
    // Handle mouse events
    document.addEventListener('mouseover', function(e) {
      if (!selectionMode) return;
      
      const target = e.target;
      if (target === document.body || target.classList.contains('app-container')) return;
      
      if (highlightedElement) {
        highlightedElement.classList.remove('element-highlight');
      }
      
      target.classList.add('element-highlight');
      highlightedElement = target;
      
      // Send hover info to parent
      const rect = target.getBoundingClientRect();
      window.parent.postMessage({
        type: 'ELEMENT_HOVER',
        element: {
          id: target.id || 'el-' + Date.now(),
          tagName: target.tagName,
          displayName: getElementName(target),
          path: getCSSPath(target),
          className: target.className.replace('element-highlight', '').trim()
        },
        bounds: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        }
      }, '*');
    });
    
    document.addEventListener('mouseout', function(e) {
      if (!selectionMode) return;
      
      const target = e.target;
      if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) {
        if (highlightedElement) {
          highlightedElement.classList.remove('element-highlight');
          highlightedElement = null;
        }
        window.parent.postMessage({ type: 'ELEMENT_LEAVE' }, '*');
      }
    });
    
    document.addEventListener('click', function(e) {
      if (!selectionMode) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target;
      if (target === document.body) return;
      
      const rect = target.getBoundingClientRect();
      window.parent.postMessage({
        type: 'ELEMENT_CLICK',
        element: {
          id: target.id || 'el-' + Date.now(),
          tagName: target.tagName,
          displayName: getElementName(target),
          path: getCSSPath(target),
          className: target.className.replace('element-highlight', '').trim(),
          preview: target.outerHTML.substring(0, 200)
        },
        bounds: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        }
      }, '*');
    }, true);
    
    // Listen for messages from parent
    window.addEventListener('message', function(e) {
      if (e.data.type === 'SET_SELECTION_MODE') {
        selectionMode = e.data.enabled;
        
        if (selectionMode) {
          document.body.classList.add('selection-mode');
        } else {
          document.body.classList.remove('selection-mode');
          if (highlightedElement) {
            highlightedElement.classList.remove('element-highlight');
            highlightedElement = null;
          }
        }
      }
    });
  </script>
</body>
</html>
`;
}

// Smart analysis of project code
interface ProjectAnalysis {
  appType: 'calculator' | 'fitness' | 'social' | 'chat' | 'todo' | 'notes' | 'weather' | 'music' | 'shop' | 'profile' | 'dashboard' | 'generic';
  colors: { primary?: string; background?: string; text?: string; secondary?: string };
  title: string;
  subtitle: string;
  hasNav: boolean;
  hasHeader: boolean;
  buttons: string[];
  inputs: string[];
  listItems: Array<{ title: string; subtitle?: string }>;
  features: string[];
}

function analyzeProjectCode(code: string, files: Array<{ path: string; content: string }>): ProjectAnalysis {
  const allCode = code.toLowerCase();
  
  // Determine app type from code patterns
  let appType: ProjectAnalysis['appType'] = 'generic';
  
  if (/calculator|калькулятор|calc|numpad|digit|операт/i.test(code)) {
    appType = 'calculator';
  } else if (/fitness|workout|exercise|тренир|фитнес|calories|steps|бег|run/i.test(code)) {
    appType = 'fitness';
  } else if (/chat|message|мессенджер|чат|сообщен|messenger|conversation/i.test(code)) {
    appType = 'chat';
  } else if (/todo|task|задач|список|checklist|напомин|reminder/i.test(code)) {
    appType = 'todo';
  } else if (/note|заметк|блокнот|notepad|memo/i.test(code)) {
    appType = 'notes';
  } else if (/weather|погод|температур|forecast|прогноз/i.test(code)) {
    appType = 'weather';
  } else if (/music|player|плеер|музык|song|track|audio/i.test(code)) {
    appType = 'music';
  } else if (/shop|store|магазин|cart|корзин|товар|product|купить|buy/i.test(code)) {
    appType = 'shop';
  } else if (/profile|профиль|account|аккаунт|user info|пользовател/i.test(code)) {
    appType = 'profile';
  } else if (/dashboard|панель|статистик|analytics|overview/i.test(code)) {
    appType = 'dashboard';
  } else if (/social|соц|friend|друз|feed|лента|post|публикац/i.test(code)) {
    appType = 'social';
  }

  // Extract colors from code
  const colors: ProjectAnalysis['colors'] = {};
  
  // Look for hex colors
  const hexColors = code.match(/#[0-9a-fA-F]{6}/g) || [];
  if (hexColors.length > 0) {
    // Filter out black/white/gray, use first colorful one as primary
    const colorfulHex = hexColors.find(c => {
      const r = parseInt(c.slice(1,3), 16);
      const g = parseInt(c.slice(3,5), 16);
      const b = parseInt(c.slice(5,7), 16);
      return Math.abs(r-g) > 20 || Math.abs(g-b) > 20 || Math.abs(r-b) > 20;
    });
    if (colorfulHex) colors.primary = colorfulHex;
  }
  
  // Check for named colors in code
  if (/emerald|изумруд/i.test(code)) colors.primary = '#10b981';
  if (/blue|синий|голуб/i.test(code)) colors.primary = '#3b82f6';
  if (/violet|purple|фиолет/i.test(code)) colors.primary = '#8b5cf6';
  if (/orange|оранж/i.test(code)) colors.primary = '#f97316';
  if (/red|красн/i.test(code)) colors.primary = '#ef4444';
  if (/pink|розов/i.test(code)) colors.primary = '#ec4899';
  if (/yellow|желт/i.test(code)) colors.primary = '#eab308';
  if (/green|зелен/i.test(code)) colors.primary = '#22c55e';
  if (/cyan|бирюз/i.test(code)) colors.primary = '#06b6d4';
  
  // Extract title from code
  let title = '';
  const titlePatterns = [
    /title[=:]\s*['"`]([^'"`]+)['"`]/i,
    /header[^>]*>([^<]+)</i,
    /<Text[^>]*style[^>]*(?:title|heading)[^>]*>([^<]+)/i,
    /['"`](Welcome[^'"`]*|Hello[^'"`]*|My [^'"`]+|Dashboard|Profile|Settings)['"`]/i,
  ];
  for (const pattern of titlePatterns) {
    const match = code.match(pattern);
    if (match && match[1]) {
      title = match[1].trim();
      break;
    }
  }
  
  // Extract buttons
  const buttons: string[] = [];
  const buttonPattern = /['"`]((?:Submit|Save|Continue|Next|Add|Create|Buy|Order|Sign|Log|Get|Start|Send|Confirm|Cancel|Delete|Update|Calculate|Play|Pause|Stop|Share|Like|Follow|Comment|Post|Search|Filter|Apply|Reset|Done|OK|Yes|No|Back|Forward|Refresh|Добавить|Создать|Сохранить|Отправить|Войти|Выйти|Далее|Назад|Купить|Заказать|Удалить|Подтвердить)[^'"`]{0,15})['"`]/gi;
  let buttonMatch;
  while ((buttonMatch = buttonPattern.exec(code)) !== null) {
    if (buttonMatch[1] && !buttons.includes(buttonMatch[1]) && buttons.length < 5) {
      buttons.push(buttonMatch[1]);
    }
  }
  
  // Extract input placeholders
  const inputs: string[] = [];
  const inputPattern = /placeholder\s*[=:]\s*['"`]([^'"`]+)['"`]/gi;
  let inputMatch;
  while ((inputMatch = inputPattern.exec(code)) !== null) {
    if (inputMatch[1] && !inputs.includes(inputMatch[1]) && inputs.length < 5) {
      inputs.push(inputMatch[1]);
    }
  }
  
  // Extract list items or data
  const listItems: Array<{ title: string; subtitle?: string }> = [];
  const dataPattern = /title\s*[=:]\s*['"`]([^'"`]+)['"`]/gi;
  let dataMatch;
  while ((dataMatch = dataPattern.exec(code)) !== null) {
    if (dataMatch[1] && listItems.length < 5) {
      listItems.push({ title: dataMatch[1] });
    }
  }
  
  // Check for navigation
  const hasNav = /BottomTab|TabNavigator|bottom.*nav|navigation.*tab|createBottomTab|навигац/i.test(code);
  const hasHeader = /header|title|заголов/i.test(code);
  
  // Extract features mentioned
  const features: string[] = [];
  if (/search|поиск/i.test(code)) features.push('search');
  if (/filter|фильтр/i.test(code)) features.push('filter');
  if (/sort|сортир/i.test(code)) features.push('sort');
  if (/auth|login|sign|вход|авториз/i.test(code)) features.push('auth');
  if (/notification|уведомлен/i.test(code)) features.push('notifications');
  
  return {
    appType,
    colors,
    title,
    subtitle: '',
    hasNav,
    hasHeader,
    buttons,
    inputs,
    listItems,
    features,
  };
}

// Render smart UI based on analysis
function renderSmartUI(analysis: ProjectAnalysis, appName: string, primaryColor: string): string {
  switch (analysis.appType) {
    case 'calculator':
      return renderCalculatorUI(analysis, primaryColor);
    case 'fitness':
      return renderFitnessUI(analysis, primaryColor);
    case 'chat':
      return renderChatUI(analysis, primaryColor);
    case 'todo':
      return renderTodoUI(analysis, primaryColor);
    case 'weather':
      return renderWeatherUI(analysis, primaryColor);
    case 'shop':
      return renderShopUI(analysis, primaryColor);
    case 'profile':
      return renderProfileUI(analysis, primaryColor);
    case 'social':
      return renderSocialUI(analysis, primaryColor);
    default:
      return renderGenericUI(analysis, appName, primaryColor);
  }
}

function renderCalculatorUI(analysis: ProjectAnalysis, primaryColor: string): string {
  return `
    <div class="calc-display">0</div>
    <div class="calc-grid">
      <button class="calc-btn" style="background: #333;">C</button>
      <button class="calc-btn" style="background: #333;">±</button>
      <button class="calc-btn" style="background: #333;">%</button>
      <button class="calc-btn operator">÷</button>
      <button class="calc-btn">7</button>
      <button class="calc-btn">8</button>
      <button class="calc-btn">9</button>
      <button class="calc-btn operator">×</button>
      <button class="calc-btn">4</button>
      <button class="calc-btn">5</button>
      <button class="calc-btn">6</button>
      <button class="calc-btn operator">−</button>
      <button class="calc-btn">1</button>
      <button class="calc-btn">2</button>
      <button class="calc-btn">3</button>
      <button class="calc-btn operator">+</button>
      <button class="calc-btn" style="grid-column: span 2; width: 100%; border-radius: 30px;">0</button>
      <button class="calc-btn">.</button>
      <button class="calc-btn primary">=</button>
    </div>
  `;
}

function renderFitnessUI(analysis: ProjectAnalysis, primaryColor: string): string {
  return `
    <div class="header">
      <h1>${analysis.title || 'Fitness Tracker'}</h1>
      <p>Today's Progress</p>
    </div>
    <div class="stat-card">
      <div class="stat-value">8,456</div>
      <div class="stat-label">Steps Today</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 84%;"></div>
      </div>
    </div>
    <div class="flex-row" style="margin-bottom: 16px;">
      <div class="card" style="flex: 1;">
        <div style="color: ${primaryColor}; font-size: 24px; font-weight: 700;">342</div>
        <div style="font-size: 12px; color: rgba(255,255,255,0.5);">Calories</div>
      </div>
      <div class="card" style="flex: 1;">
        <div style="color: ${primaryColor}; font-size: 24px; font-weight: 700;">4.2</div>
        <div style="font-size: 12px; color: rgba(255,255,255,0.5);">km</div>
      </div>
      <div class="card" style="flex: 1;">
        <div style="color: ${primaryColor}; font-size: 24px; font-weight: 700;">52</div>
        <div style="font-size: 12px; color: rgba(255,255,255,0.5);">min</div>
      </div>
    </div>
    <button class="button">${analysis.buttons[0] || 'Start Workout'}</button>
    ${analysis.hasNav ? renderNavBar(primaryColor) : ''}
  `;
}

function renderChatUI(analysis: ProjectAnalysis, primaryColor: string): string {
  return `
    <div class="header" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
      <div class="flex-row">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: ${primaryColor}33;"></div>
        <div>
          <h1 style="font-size: 16px;">John Doe</h1>
          <p style="font-size: 12px; color: #22c55e;">Online</p>
        </div>
      </div>
    </div>
    <div class="chat-container">
      <div class="chat-bubble received">Hey! How are you doing?</div>
      <div class="chat-bubble sent">I'm good, thanks! What about you?</div>
      <div class="chat-bubble received">Great! Want to meet up later?</div>
      <div class="chat-input-area">
        <input class="chat-input" placeholder="${analysis.inputs[0] || 'Type a message...'}" />
        <button class="send-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderTodoUI(analysis: ProjectAnalysis, primaryColor: string): string {
  const items = analysis.listItems.length > 0 
    ? analysis.listItems 
    : [{ title: 'Complete project' }, { title: 'Review code' }, { title: 'Deploy app' }];
  
  return `
    <div class="header">
      <h1>${analysis.title || 'My Tasks'}</h1>
      <p>${items.length} tasks remaining</p>
    </div>
    ${items.map((item, i) => `
      <div class="todo-item">
        <div class="todo-checkbox ${i === 0 ? 'checked' : ''}">
          ${i === 0 ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
        </div>
        <span style="${i === 0 ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${item.title}</span>
      </div>
    `).join('')}
    <button class="button" style="margin-top: 16px;">${analysis.buttons[0] || 'Add Task'}</button>
    ${analysis.hasNav ? renderNavBar(primaryColor) : ''}
  `;
}

function renderWeatherUI(analysis: ProjectAnalysis, primaryColor: string): string {
  return `
    <div style="text-align: center; padding-top: 20px;">
      <p style="color: rgba(255,255,255,0.6);">New York City</p>
      <div class="weather-icon">☀️</div>
      <div class="temp-display">24°</div>
      <p style="color: rgba(255,255,255,0.6); margin-bottom: 30px;">Sunny</p>
    </div>
    <div class="flex-row" style="justify-content: space-around; margin-bottom: 20px;">
      <div style="text-align: center;">
        <p style="font-size: 12px; color: rgba(255,255,255,0.5);">Humidity</p>
        <p style="font-size: 18px; font-weight: 600;">45%</p>
      </div>
      <div style="text-align: center;">
        <p style="font-size: 12px; color: rgba(255,255,255,0.5);">Wind</p>
        <p style="font-size: 18px; font-weight: 600;">12 km/h</p>
      </div>
      <div style="text-align: center;">
        <p style="font-size: 12px; color: rgba(255,255,255,0.5);">UV Index</p>
        <p style="font-size: 18px; font-weight: 600;">3</p>
      </div>
    </div>
    <div class="card">
      <h3>5-Day Forecast</h3>
      <div class="flex-row" style="justify-content: space-between; margin-top: 12px;">
        <div style="text-align: center;"><p>Mon</p><p>🌤️</p><p>22°</p></div>
        <div style="text-align: center;"><p>Tue</p><p>☀️</p><p>25°</p></div>
        <div style="text-align: center;"><p>Wed</p><p>🌧️</p><p>18°</p></div>
        <div style="text-align: center;"><p>Thu</p><p>⛅</p><p>20°</p></div>
        <div style="text-align: center;"><p>Fri</p><p>☀️</p><p>24°</p></div>
      </div>
    </div>
  `;
}

function renderShopUI(analysis: ProjectAnalysis, primaryColor: string): string {
  return `
    <div class="header">
      <h1>${analysis.title || 'Shop'}</h1>
    </div>
    ${analysis.inputs.length > 0 ? `<input class="input-field" placeholder="${analysis.inputs[0]}" />` : '<input class="input-field" placeholder="Search products..." />'}
    <div class="flex-row" style="margin-bottom: 16px; overflow-x: auto;">
      <div class="badge">All</div>
      <div class="badge" style="background: transparent; border: 1px solid rgba(255,255,255,0.2);">Electronics</div>
      <div class="badge" style="background: transparent; border: 1px solid rgba(255,255,255,0.2);">Clothing</div>
    </div>
    <div class="card">
      <div class="image-placeholder" style="height: 120px; margin-bottom: 12px;"></div>
      <h3>Product Name</h3>
      <p style="color: ${primaryColor}; font-weight: 600; margin-top: 4px;">$99.99</p>
      <button class="button" style="margin-top: 12px;">${analysis.buttons[0] || 'Add to Cart'}</button>
    </div>
    ${analysis.hasNav ? renderNavBar(primaryColor) : ''}
  `;
}

function renderProfileUI(analysis: ProjectAnalysis, primaryColor: string): string {
  return `
    <div style="text-align: center; padding-top: 20px;">
      <div class="avatar">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${primaryColor}" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <h1 style="font-size: 20px;">John Doe</h1>
      <p style="color: rgba(255,255,255,0.5);">@johndoe</p>
    </div>
    <div class="flex-row" style="justify-content: space-around; margin: 24px 0;">
      <div style="text-align: center;">
        <p style="font-size: 20px; font-weight: 700;">256</p>
        <p style="font-size: 12px; color: rgba(255,255,255,0.5);">Posts</p>
      </div>
      <div style="text-align: center;">
        <p style="font-size: 20px; font-weight: 700;">14.2K</p>
        <p style="font-size: 12px; color: rgba(255,255,255,0.5);">Followers</p>
      </div>
      <div style="text-align: center;">
        <p style="font-size: 20px; font-weight: 700;">523</p>
        <p style="font-size: 12px; color: rgba(255,255,255,0.5);">Following</p>
      </div>
    </div>
    <button class="button">${analysis.buttons[0] || 'Edit Profile'}</button>
    <button class="button button-secondary">${analysis.buttons[1] || 'Settings'}</button>
    ${analysis.hasNav ? renderNavBar(primaryColor) : ''}
  `;
}

function renderSocialUI(analysis: ProjectAnalysis, primaryColor: string): string {
  return `
    <div class="header">
      <h1>${analysis.title || 'Feed'}</h1>
    </div>
    <div class="card">
      <div class="flex-row" style="margin-bottom: 12px;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: ${primaryColor}33;"></div>
        <div>
          <h4 style="font-size: 14px;">Jane Smith</h4>
          <p style="font-size: 12px; color: rgba(255,255,255,0.5);">2 hours ago</p>
        </div>
      </div>
      <p style="margin-bottom: 12px;">Just finished building my new app! 🚀</p>
      <div class="image-placeholder" style="height: 150px;"></div>
      <div class="flex-row" style="margin-top: 12px;">
        <button style="background: none; border: none; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 4px;">
          ❤️ 124
        </button>
        <button style="background: none; border: none; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 4px;">
          💬 23
        </button>
        <button style="background: none; border: none; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 4px;">
          🔄 Share
        </button>
      </div>
    </div>
    ${analysis.hasNav ? renderNavBar(primaryColor) : ''}
  `;
}

function renderGenericUI(analysis: ProjectAnalysis, appName: string, primaryColor: string): string {
  let html = `
    <div class="header">
      <h1>${analysis.title || appName}</h1>
      <p>Your React Native App</p>
    </div>
  `;
  
  // Inputs
  if (analysis.inputs.length > 0) {
    for (const placeholder of analysis.inputs.slice(0, 3)) {
      html += `<input class="input-field" placeholder="${placeholder}" />`;
    }
  }
  
  // List items or cards
  if (analysis.listItems.length > 0) {
    for (const item of analysis.listItems.slice(0, 4)) {
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
            ${item.subtitle ? `<p>${item.subtitle}</p>` : ''}
          </div>
        </div>
      `;
    }
  } else {
    // Default card
    html += `
      <div class="card">
        <h3>Welcome</h3>
        <p>Your app content will appear here. Start building amazing features!</p>
      </div>
    `;
  }
  
  // Buttons
  if (analysis.buttons.length > 0) {
    html += `<button class="button">${analysis.buttons[0]}</button>`;
    if (analysis.buttons.length > 1) {
      html += `<button class="button button-secondary">${analysis.buttons[1]}</button>`;
    }
  }
  
  if (analysis.hasNav) {
    html += renderNavBar(primaryColor);
  }
  
  return html;
}

function renderNavBar(primaryColor: string): string {
  return `
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
