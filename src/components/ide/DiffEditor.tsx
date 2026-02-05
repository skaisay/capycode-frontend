'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { DiffEditor as MonacoDiffEditor, DiffOnMount } from '@monaco-editor/react';
import { X, Check, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

interface DiffEditorProps {
  originalContent: string;
  modifiedContent: string;
  fileName: string;
  language?: string;
  onAccept: (content: string) => void;
  onReject: () => void;
  onClose: () => void;
}

export function DiffEditor({ 
  originalContent, 
  modifiedContent, 
  fileName,
  language = 'typescript',
  onAccept, 
  onReject,
  onClose 
}: DiffEditorProps) {
  const editorRef = useRef<any>(null);
  const [currentDiffIndex, setCurrentDiffIndex] = useState(0);
  const [totalDiffs, setTotalDiffs] = useState(0);

  const handleEditorMount: DiffOnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure theme
    monaco.editor.defineTheme('codevibe-diff-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
      ],
      colors: {
        'editor.background': '#0a0a0a',
        'editor.foreground': '#D4D4D4',
        'diffEditor.insertedTextBackground': '#22c55e22',
        'diffEditor.removedTextBackground': '#ef444422',
        'diffEditor.insertedLineBackground': '#22c55e15',
        'diffEditor.removedLineBackground': '#ef444415',
        'editorCursor.foreground': '#0ea5e9',
        'editor.lineHighlightBackground': '#1a1a1a',
        'editorLineNumber.foreground': '#5A5A5A',
      },
    });

    monaco.editor.setTheme('codevibe-diff-dark');
  };
  
  // Count diffs based on content differences
  useEffect(() => {
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');
    let diffCount = 0;
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    for (let i = 0; i < maxLines; i++) {
      if (originalLines[i] !== modifiedLines[i]) {
        diffCount++;
      }
    }
    setTotalDiffs(diffCount);
  }, [originalContent, modifiedContent]);

  const handleAccept = useCallback(() => {
    onAccept(modifiedContent);
  }, [modifiedContent, onAccept]);

  const handleReject = useCallback(() => {
    onReject();
  }, [onReject]);

  const goToPreviousDiff = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      try {
        const diffNavigator = editor.getDiffNavigator?.();
        if (diffNavigator) {
          diffNavigator.previous();
          setCurrentDiffIndex(prev => Math.max(0, prev - 1));
        }
      } catch (e) {
        // Navigate manually by scrolling
      }
    }
  }, []);

  const goToNextDiff = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      try {
        const diffNavigator = editor.getDiffNavigator?.();
        if (diffNavigator) {
          diffNavigator.next();
          setCurrentDiffIndex(prev => Math.min(totalDiffs - 1, prev + 1));
        }
      } catch (e) {
        // Navigate manually by scrolling
      }
    }
  }, [totalDiffs]);

  // Count lines changed
  const originalLines = originalContent.split('\n').length;
  const modifiedLines = modifiedContent.split('\n').length;
  const linesAdded = Math.max(0, modifiedLines - originalLines);
  const linesRemoved = Math.max(0, originalLines - modifiedLines);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111113] border-b border-[#1f1f23]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">{fileName}</span>
          <div className="flex items-center gap-2 text-xs">
            {linesAdded > 0 && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                +{linesAdded} lines
              </span>
            )}
            {linesRemoved > 0 && (
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                -{linesRemoved} lines
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Diff navigation */}
          <div className="flex items-center gap-1 mr-4">
            <button
              onClick={goToPreviousDiff}
              className="p-1.5 rounded-lg hover:bg-[#1f1f23] text-[#6b6b70] hover:text-white transition-colors"
              title="Previous change"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-[#6b6b70] min-w-[60px] text-center">
              {totalDiffs > 0 ? `${currentDiffIndex + 1} / ${totalDiffs}` : 'Loading...'}
            </span>
            <button
              onClick={goToNextDiff}
              className="p-1.5 rounded-lg hover:bg-[#1f1f23] text-[#6b6b70] hover:text-white transition-colors"
              title="Next change"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={handleReject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
            title="Reject changes"
          >
            <RotateCcw className="w-4 h-4" />
            Отклонить
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-sm"
            title="Accept changes"
          >
            <Check className="w-4 h-4" />
            Принять
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1f1f23] text-[#6b6b70] hover:text-white transition-colors ml-2"
            title="Close diff view"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Labels */}
      <div className="flex border-b border-[#1f1f23]">
        <div className="flex-1 px-4 py-2 bg-[#111113] text-xs text-[#6b6b70]">
          Оригинал
        </div>
        <div className="w-px bg-[#1f1f23]" />
        <div className="flex-1 px-4 py-2 bg-[#111113] text-xs text-[#6b6b70]">
          Изменения (AI)
        </div>
      </div>

      {/* Diff Editor */}
      <div className="flex-1">
        <MonacoDiffEditor
          height="100%"
          language={language}
          original={originalContent}
          modified={modifiedContent}
          onMount={handleEditorMount}
          theme="codevibe-diff-dark"
          options={{
            fontSize: 14,
            automaticLayout: true,
            readOnly: true,
            renderSideBySide: true,
            ignoreTrimWhitespace: false,
            renderOverviewRuler: false,
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            padding: { top: 10 },
          }}
          loading={
            <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        />
      </div>
    </div>
  );
}

export default DiffEditor;
