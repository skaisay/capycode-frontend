import type { ProjectFile } from '../../types/database.js';
import { nanoid } from 'nanoid';

interface WebPreviewSession {
  id: string;
  projectId: string;
  url: string;
  iframeUrl: string;
  files: ProjectFile[];
  dependencies: Record<string, string>;
  bundleUrl: string;
  status: 'building' | 'ready' | 'error';
  createdAt: Date;
  expiresAt: Date;
}

// In-memory store (use Redis in production)
const webSessions = new Map<string, WebPreviewSession>();

/**
 * Service for creating web previews using react-native-web
 * Allows instant preview in browser without Expo Go
 */
export class WebPreviewService {
  private readonly PREVIEW_BASE_URL = process.env.PREVIEW_URL || 'http://localhost:3002';
  private readonly SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Create a new web preview session
   */
  async createSession(
    projectId: string,
    files: ProjectFile[],
    dependencies: Record<string, string>
  ): Promise<WebPreviewSession> {
    const sessionId = `web-${nanoid(12)}`;

    // Transform files for web compatibility
    const webFiles = this.transformForWeb(files);

    // Create bundle
    const bundleUrl = await this.createBundle(sessionId, webFiles, dependencies);

    const session: WebPreviewSession = {
      id: sessionId,
      projectId,
      url: `${this.PREVIEW_BASE_URL}/preview/${sessionId}`,
      iframeUrl: `${this.PREVIEW_BASE_URL}/embed/${sessionId}`,
      files: webFiles,
      dependencies: this.addWebDependencies(dependencies),
      bundleUrl,
      status: 'ready',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_DURATION_MS),
    };

    webSessions.set(sessionId, session);

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<WebPreviewSession | null> {
    const session = webSessions.get(sessionId);

    if (!session) return null;

    if (new Date() > session.expiresAt) {
      webSessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session files (hot reload)
   */
  async updateSession(sessionId: string, files: ProjectFile[]): Promise<void> {
    const session = webSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const webFiles = this.transformForWeb(files);
    session.files = webFiles;
    session.status = 'building';

    // Rebuild bundle
    session.bundleUrl = await this.createBundle(sessionId, webFiles, session.dependencies);
    session.status = 'ready';

    webSessions.set(sessionId, session);
  }

  /**
   * Generate the HTML wrapper for web preview
   */
  generatePreviewHTML(session: WebPreviewSession): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>CodeVibe Preview</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body, #root {
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    /* React Native Web reset */
    #root {
      display: flex;
      flex-direction: column;
    }
    /* Device frame for preview */
    .device-frame {
      position: relative;
      max-width: 375px;
      max-height: 812px;
      margin: 0 auto;
      border-radius: 40px;
      border: 12px solid #1a1a1a;
      background: #1a1a1a;
      overflow: hidden;
    }
    .device-frame::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 150px;
      height: 25px;
      background: #1a1a1a;
      border-radius: 0 0 20px 20px;
      z-index: 10;
    }
    .device-content {
      width: 100%;
      height: 100%;
      overflow: auto;
      background: #fff;
    }
    /* Error overlay */
    .error-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 20px;
      font-family: monospace;
      overflow: auto;
      z-index: 9999;
    }
    /* Loading indicator */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 18px;
      color: #666;
    }
    .loading::after {
      content: '';
      width: 30px;
      height: 30px;
      margin-left: 10px;
      border: 3px solid #ddd;
      border-top-color: #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">Loading preview...</div>
  </div>
  
  <!-- React & React Native Web -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/react-native-web@0.19/dist/index.umd.js"></script>
  
  <!-- Babel for JSX transformation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  
  <!-- App Bundle -->
  <script type="text/babel" data-presets="react" data-plugins="transform-modules-umd">
    ${this.generateBundleCode(session.files)}
  </script>
  
  <!-- Hot reload connection -->
  <script>
    const ws = new WebSocket('${this.PREVIEW_BASE_URL.replace('http', 'ws')}/ws/${session.id}');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'reload') {
        window.location.reload();
      }
    };
  </script>
</body>
</html>`;
  }

  /**
   * Transform React Native files for web compatibility
   */
  private transformForWeb(files: ProjectFile[]): ProjectFile[] {
    return files.map(file => {
      if (!file.path.match(/\.(tsx?|jsx?)$/)) {
        return file;
      }

      let content = file.content;

      // Replace React Native imports with react-native-web
      content = content.replace(
        /from ['"]react-native['"]/g,
        "from 'react-native-web'"
      );

      // Handle platform-specific code
      content = content.replace(
        /Platform\.OS\s*===\s*['"]ios['"]/g,
        'false'
      );
      content = content.replace(
        /Platform\.OS\s*===\s*['"]android['"]/g,
        'false'
      );
      content = content.replace(
        /Platform\.OS\s*===\s*['"]web['"]/g,
        'true'
      );

      // Handle native modules that don't exist on web
      const nativeModules = [
        'NativeModules',
        'requireNativeComponent',
        'UIManager',
      ];
      for (const mod of nativeModules) {
        content = content.replace(
          new RegExp(`\\b${mod}\\b`, 'g'),
          `/* ${mod} */null`
        );
      }

      return {
        ...file,
        content,
      };
    });
  }

  /**
   * Add web-specific dependencies
   */
  private addWebDependencies(deps: Record<string, string>): Record<string, string> {
    return {
      ...deps,
      'react-native-web': '^0.19.0',
      'react-dom': '^18.2.0',
    };
  }

  /**
   * Create bundle from files
   */
  private async createBundle(
    sessionId: string,
    files: ProjectFile[],
    dependencies: Record<string, string>
  ): Promise<string> {
    // In production, this would use esbuild or webpack to create a proper bundle
    // For now, we'll create an in-memory bundle URL
    return `${this.PREVIEW_BASE_URL}/bundles/${sessionId}.js`;
  }

  /**
   * Generate bundle code from files
   */
  private generateBundleCode(files: ProjectFile[]): string {
    // Find entry point
    const entryFile = files.find(f => 
      f.path === 'App.tsx' || 
      f.path === 'App.js' || 
      f.path === 'src/App.tsx'
    );

    if (!entryFile) {
      return `
        const { View, Text } = window.ReactNativeWeb;
        const App = () => (
          React.createElement(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center' } },
            React.createElement(Text, null, 'No App.tsx found')
          )
        );
        ReactDOM.render(React.createElement(App), document.getElementById('root'));
      `;
    }

    // Create virtual module system
    const moduleCode = files
      .filter(f => f.path.match(/\.(tsx?|jsx?)$/))
      .map(f => `
        // ${f.path}
        modules['${f.path}'] = (function(exports, require, module) {
          ${this.transformImports(f.content)}
        });
      `)
      .join('\n');

    return `
      const modules = {};
      const moduleCache = {};
      
      function require(path) {
        if (moduleCache[path]) return moduleCache[path].exports;
        
        // Handle react-native-web
        if (path === 'react-native' || path === 'react-native-web') {
          return window.ReactNativeWeb;
        }
        if (path === 'react') return window.React;
        if (path === 'react-dom') return window.ReactDOM;
        
        const module = { exports: {} };
        moduleCache[path] = module;
        
        if (modules[path]) {
          modules[path](module.exports, require, module);
        }
        
        return module.exports;
      }
      
      ${moduleCode}
      
      // Run entry point
      const App = require('App.tsx').default || require('App.tsx');
      ReactDOM.render(React.createElement(App), document.getElementById('root'));
    `;
  }

  /**
   * Transform ES6 imports to require calls
   */
  private transformImports(code: string): string {
    // Simple import transformation
    return code
      .replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, 
        'const $1 = require("$2").default || require("$2")')
      .replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/g,
        (_, imports, path) => {
          const vars = imports.split(',').map((v: string) => v.trim());
          return vars.map((v: string) => `const ${v} = require("${path}").${v}`).join(';');
        })
      .replace(/export\s+default\s+/g, 'exports.default = ')
      .replace(/export\s+const\s+(\w+)/g, 'exports.$1 = const $1');
  }
}
