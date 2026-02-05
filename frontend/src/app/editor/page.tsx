'use client';

import { Suspense, useEffect } from 'react';
import { IDELayout } from '@/components/ide/IDELayout';

export default function EditorPage() {
  // Prevent zoom on the editor page only
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    // Add touch-action to body for this page only
    document.body.style.touchAction = 'pan-x pan-y';
    document.body.style.overflow = 'hidden';
    
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('gesturechange', preventGesture);
    document.addEventListener('gestureend', preventGesture);

    return () => {
      document.body.style.touchAction = '';
      document.body.style.overflow = '';
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend', preventGesture);
    };
  }, []);

  return (
    <Suspense fallback={<EditorLoading />}>
      <IDELayout />
    </Suspense>
  );
}

function EditorLoading() {
  return (
    <div className="h-screen w-screen bg-surface-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-surface-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}
