'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { MousePointer2, X, Check, Crosshair } from 'lucide-react';
import { useElementSelectorStore, SelectedElement } from '@/stores/elementSelectorStore';
import { motion, AnimatePresence } from 'framer-motion';

interface ElementSelectorOverlayProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ElementSelectorOverlay({ iframeRef, containerRef }: ElementSelectorOverlayProps) {
  const { 
    isSelecting, 
    toggleSelecting, 
    hoveredElement, 
    setHoveredElement,
    selectedElements,
    addSelectedElement,
    removeSelectedElement,
    clearSelectedElements 
  } = useElementSelectorStore();
  
  const [highlightBounds, setHighlightBounds] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_HOVER') {
        const { element, bounds } = event.data;
        if (element && bounds) {
          setHoveredElement({
            id: element.id || `el-${Date.now()}`,
            type: element.tagName?.toLowerCase() || 'element',
            displayName: element.displayName || element.tagName || 'Element',
            path: element.path || '',
            bounds: bounds
          });
          setHighlightBounds(bounds);
        }
      } else if (event.data.type === 'ELEMENT_LEAVE') {
        setHoveredElement(null);
        setHighlightBounds(null);
      } else if (event.data.type === 'ELEMENT_CLICK') {
        const { element, bounds } = event.data;
        if (element) {
          addSelectedElement({
            id: element.id || `el-${Date.now()}`,
            type: element.tagName?.toLowerCase() || 'element',
            displayName: element.displayName || element.tagName || 'Element',
            path: element.path || '',
            preview: element.preview,
            bounds: bounds
          });
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setHoveredElement, addSelectedElement]);

  // Send selection mode state to iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ 
        type: 'SET_SELECTION_MODE', 
        enabled: isSelecting 
      }, '*');
    }
  }, [isSelecting, iframeRef]);

  return (
    <>
      {/* Selection Mode Button - Left side of preview */}
      <div className="absolute top-4 left-4 z-30">
        <motion.button
          onClick={toggleSelecting}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            isSelecting 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
              : 'bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 text-[#6b6b70] hover:text-white hover:border-emerald-500/50'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSelecting ? (
            <>
              <Crosshair className="w-4 h-4 animate-pulse" />
              <span>Выбор элементов</span>
            </>
          ) : (
            <>
              <MousePointer2 className="w-4 h-4" />
              <span>Выбрать</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Selected Elements Pills */}
      <AnimatePresence>
        {selectedElements.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 right-4 z-30"
          >
            <div className="bg-[#111113]/95 backdrop-blur-xl border border-[#1f1f23] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#6b6b70]">
                  Выбрано элементов: {selectedElements.length}
                </span>
                <button 
                  onClick={clearSelectedElements}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Очистить все
                </button>
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

      {/* Hover highlight info tooltip */}
      <AnimatePresence>
        {isSelecting && hoveredElement && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-16 left-4 z-30 pointer-events-none"
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

      {/* Selection mode overlay hint */}
      <AnimatePresence>
        {isSelecting && selectedElements.length === 0 && !hoveredElement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <div className="bg-[#111113]/80 backdrop-blur-md border border-emerald-500/30 rounded-2xl px-6 py-4 max-w-xs text-center">
              <Crosshair className="w-8 h-8 text-emerald-500 mx-auto mb-3 animate-pulse" />
              <p className="text-white text-sm font-medium mb-1">
                Режим выбора элементов
              </p>
              <p className="text-[#6b6b70] text-xs">
                Наведите мышку на элемент в превью и кликните для выбора
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
