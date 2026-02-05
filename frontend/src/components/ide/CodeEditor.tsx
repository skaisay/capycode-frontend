'use client';

import { useEffect, useRef } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { FileCode } from 'lucide-react';

interface ProjectFile {
  path: string;
  content: string;
  type: string;
}

interface CodeEditorProps {
  file: ProjectFile | null;
  onChange: (path: string, content: string) => void;
}

export function CodeEditor({ file, onChange }: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure TypeScript/JavaScript
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    // Add React Native types (simplified)
    monaco.languages.typescript.typescriptDefaults.addExtraLib(`
      declare module 'react-native' {
        export const View: React.ComponentType<any>;
        export const Text: React.ComponentType<any>;
        export const StyleSheet: {
          create<T extends Record<string, any>>(styles: T): T;
        };
        export const TouchableOpacity: React.ComponentType<any>;
        export const ScrollView: React.ComponentType<any>;
        export const Image: React.ComponentType<any>;
        export const TextInput: React.ComponentType<any>;
        export const FlatList: React.ComponentType<any>;
        export const SafeAreaView: React.ComponentType<any>;
        export const ActivityIndicator: React.ComponentType<any>;
        export const Platform: { OS: 'ios' | 'android' | 'web' };
        export const Dimensions: { get: (dim: string) => { width: number; height: number } };
      }
      
      declare module 'expo-status-bar' {
        export const StatusBar: React.ComponentType<any>;
      }
      
      declare module '@react-navigation/native' {
        export function useNavigation(): any;
        export function useRoute(): any;
        export const NavigationContainer: React.ComponentType<any>;
      }
    `, 'react-native.d.ts');

    // Configure theme
    monaco.editor.defineTheme('codevibe-dark', {
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
        'editorCursor.foreground': '#0ea5e9',
        'editor.lineHighlightBackground': '#1a1a1a',
        'editorLineNumber.foreground': '#5A5A5A',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
      },
    });

    monaco.editor.setTheme('codevibe-dark');
  };

  const handleChange: OnChange = (value) => {
    if (file && value !== undefined) {
      onChange(file.path, value);
    }
  };

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'json':
        return 'json';
      case 'css':
        return 'css';
      case 'md':
        return 'markdown';
      case 'html':
        return 'html';
      default:
        return 'plaintext';
    }
  };

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-950">
        <div className="text-center text-surface-500">
          <FileCode className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Select a file to edit</p>
          <p className="text-sm mt-2">or use AI to generate your app</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={getLanguage(file.path)}
        value={file.content}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="codevibe-dark"
        options={{
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          automaticLayout: true,
          lineNumbers: 'on',
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          renderLineHighlight: 'line',
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          padding: { top: 10 },
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
        }}
        loading={
          <div className="h-full flex items-center justify-center bg-surface-950">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      />
    </div>
  );
}
