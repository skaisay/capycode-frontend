/**
 * Sandbox Service - интеграция с E2B для выполнения кода
 * 
 * E2B (e2b.dev) - платформа для AI-агентов, выполняющих код.
 * Предоставляет изолированные Linux-контейнеры с:
 * - Полноценным терминалом
 * - Файловой системой
 * - Пробросом портов
 * - WebSocket стримингом
 * 
 * Использует Resilient Service для автоматического failover между провайдерами
 */

import { getResilientSandbox } from './services/resilient-sandbox';

// Types
export interface SandboxSession {
  id: string;
  status: 'creating' | 'ready' | 'running' | 'stopped' | 'error';
  createdAt: number;
  expiresAt: number;
  ports: Record<number, string>; // port -> public URL
  terminalUrl?: string;
}

export interface TerminalOutput {
  type: 'stdout' | 'stderr' | 'exit';
  data: string;
  timestamp: number;
}

export interface SandboxFile {
  path: string;
  content: string;
}

export interface ExpoDevServer {
  url: string;
  qrCode: string;
  port: number;
}

export interface ExpoStatus {
  status: 'starting' | 'installing' | 'installing-expo' | 'starting-expo' | 'running' | 'ready' | 'error';
  message: string;
  url?: string;
  qrCode?: string;
  log?: string;
}

// Sandbox API client
class SandboxService {
  private apiUrl: string;
  private wsUrl: string;
  private isExternalApi: boolean;
  private sessions: Map<string, SandboxSession> = new Map();
  private terminals: Map<string, WebSocket> = new Map();
  private outputListeners: Map<string, ((output: TerminalOutput) => void)[]> = new Map();
  private resilientSandbox = getResilientSandbox();

  constructor() {
    // API endpoints - will be configured based on environment
    // Используем resilient сервис для автоматического failover
    const envUrl = process.env.NEXT_PUBLIC_SANDBOX_API_URL;
    this.isExternalApi = !!envUrl && !envUrl.includes('/api/sandbox');
    
    // Если внешний API - используем resilient service
    if (this.isExternalApi) {
      this.apiUrl = this.resilientSandbox.getActiveUrl();
    } else {
      this.apiUrl = envUrl || '/api/sandbox';
    }
    
    this.wsUrl = process.env.NEXT_PUBLIC_SANDBOX_WS_URL || '';
    
    console.log('[Sandbox] API URL:', this.apiUrl, 'External:', this.isExternalApi);
  }

  // Helper to get current API URL (may change if provider switches)
  private getCurrentApiUrl(): string {
    if (this.isExternalApi) {
      return this.resilientSandbox.getActiveUrl();
    }
    return this.apiUrl;
  }

  // Helper to build API URL
  private buildUrl(action: string): string {
    const baseUrl = this.getCurrentApiUrl();
    if (this.isExternalApi) {
      // External API: /sandbox/create, /sandbox/upload, etc.
      return `${baseUrl}/sandbox/${action}`;
    } else {
      // Vercel API: /api/sandbox?action=create
      return `${baseUrl}?action=${action}`;
    }
  }

  // Helper for resilient fetch with automatic failover
  private async resilientFetch(action: string, options: RequestInit): Promise<Response> {
    if (this.isExternalApi) {
      // Use resilient service with automatic failover
      return this.resilientSandbox.fetch(`/sandbox/${action}`, options);
    } else {
      // Local API - normal fetch
      return fetch(this.buildUrl(action), options);
    }
  }

  /**
   * Create a new sandbox session for a project
   */
  async createSession(projectId: string, template: 'expo' | 'node' | 'react' = 'expo'): Promise<SandboxSession> {
    try {
      const response = await this.resilientFetch('create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, template }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to create sandbox session');
      }

      const session: SandboxSession = await response.json();
      this.sessions.set(session.id, session);
      return session;
    } catch (error) {
      console.error('[Sandbox] Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Upload project files to sandbox
   */
  async uploadFiles(sessionId: string, files: SandboxFile[]): Promise<void> {
    const response = await this.resilientFetch('upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxId: sessionId, files }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to upload files to sandbox');
    }
  }

  /**
   * Execute a command in the sandbox terminal
   */
  async executeCommand(sessionId: string, command: string): Promise<{ exitCode: number; output: string }> {
    const response = await this.resilientFetch('exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxId: sessionId, command }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to execute command');
    }

    return response.json();
  }

  /**
   * Connect to terminal WebSocket for real-time output
   * NOTE: WebSocket not currently supported, this is a no-op placeholder
   */
  connectTerminal(sessionId: string, onOutput: (output: TerminalOutput) => void): () => void {
    // WebSocket not currently implemented in the API
    // Just log a message and return a no-op cleanup function
    console.log('[Sandbox] WebSocket not available, using polling mode');
    
    // Return cleanup function
    return () => {
      // No-op
    };
  }

  /**
   * Send input to terminal
   * NOTE: Not currently supported
   */
  sendTerminalInput(sessionId: string, input: string): void {
    console.log('[Sandbox] sendTerminalInput not supported yet');
  }

  /**
   * Start Expo Dev Server - initiates the process, returns immediately
   */
  async startExpoServer(sessionId: string, onStatusUpdate?: (status: ExpoStatus) => void): Promise<ExpoDevServer> {
    // Start Expo (this returns immediately, process runs in background)
    const response = await this.resilientFetch('expo-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxId: sessionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      // Check for specific error codes
      if (response.status === 410) {
        throw new Error('SANDBOX_EXPIRED: ' + (error.message || 'Session expired, please restart terminal'));
      }
      throw new Error(error.message || error.error || 'Failed to start Expo server');
    }

    // Now poll for status until we get a URL or error
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      try {
        const statusResponse = await this.resilientFetch('expo-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sandboxId: sessionId }),
        });
        
        if (!statusResponse.ok) {
          if (statusResponse.status === 410) {
            throw new Error('SANDBOX_EXPIRED: Session expired');
          }
          continue; // Retry on other errors
        }
        
        const status = await statusResponse.json();
        
        // Notify caller of status updates
        if (onStatusUpdate) {
          onStatusUpdate(status);
        }
        
        console.log('[Sandbox] Expo status:', status.status, status.message);
        
        if (status.status === 'ready' && status.url) {
          return {
            url: status.url,
            qrCode: status.qrCode,
            port: 8081,
          };
        }
        
        if (status.status === 'error') {
          throw new Error(status.message || 'Expo failed to start');
        }
      } catch (err) {
        // Re-throw sandbox expired errors
        if (err instanceof Error && err.message.includes('SANDBOX_EXPIRED')) {
          throw err;
        }
        // Continue polling on network errors
        console.warn('[Sandbox] Status poll failed, retrying...', err);
      }
    }
    
    throw new Error('Timeout waiting for Expo to start');
  }

  /**
   * Get Expo status (for manual polling)
   */
  async getExpoStatus(sessionId: string): Promise<ExpoStatus> {
    const response = await this.resilientFetch('expo-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxId: sessionId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get Expo status');
    }
    
    return response.json();
  }

  /**
   * Stop Expo Dev Server
   */
  async stopExpoServer(sessionId: string): Promise<void> {
    await this.resilientFetch('expo-stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxId: sessionId }),
    });
  }

  /**
   * Get public URL for a port
   */
  async getPortUrl(sessionId: string, port: number): Promise<string> {
    const baseUrl = this.getCurrentApiUrl();
    const response = await fetch(`${baseUrl}/sessions/${sessionId}/ports/${port}`);
    
    if (!response.ok) {
      throw new Error('Failed to get port URL');
    }

    const { url } = await response.json();
    return url;
  }

  /**
   * Destroy sandbox session
   */
  async destroySession(sessionId: string): Promise<void> {
    // Close terminal connection
    const ws = this.terminals.get(sessionId);
    if (ws) {
      ws.close();
      this.terminals.delete(sessionId);
    }

    // Delete session
    const baseUrl = this.getCurrentApiUrl();
    await fetch(`${baseUrl}/sessions/${sessionId}`, {
      method: 'DELETE',
    });

    this.sessions.delete(sessionId);
  }

  /**
   * Get session status
   */
  async getSession(sessionId: string): Promise<SandboxSession | null> {
    const cached = this.sessions.get(sessionId);
    if (cached) return cached;

    try {
      const baseUrl = this.getCurrentApiUrl();
      const response = await fetch(`${baseUrl}/sessions/${sessionId}`);
      if (!response.ok) return null;
      
      const session = await response.json();
      this.sessions.set(sessionId, session);
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Subscribe to terminal output
   */
  onOutput(sessionId: string, listener: (output: TerminalOutput) => void): () => void {
    const listeners = this.outputListeners.get(sessionId) || [];
    listeners.push(listener);
    this.outputListeners.set(sessionId, listeners);

    return () => {
      const updated = (this.outputListeners.get(sessionId) || []).filter(l => l !== listener);
      this.outputListeners.set(sessionId, updated);
    };
  }
}

// Singleton instance
export const sandboxService = new SandboxService();

// React hook for sandbox
import { useState, useEffect, useCallback } from 'react';

export function useSandbox(projectId: string | null) {
  const [session, setSession] = useState<SandboxSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<TerminalOutput[]>([]);
  const [expoServer, setExpoServer] = useState<ExpoDevServer | null>(null);

  // Create session
  const createSession = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newSession = await sandboxService.createSession(projectId, 'expo');
      setSession(newSession);
      
      // Add welcome message to terminal output
      setTerminalOutput(prev => [...prev, {
        type: 'stdout',
        data: `✓ Sandbox created (${newSession.id.slice(0, 20)}...)\n`,
        timestamp: Date.now(),
      }]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Upload files
  const uploadFiles = useCallback(async (files: SandboxFile[]) => {
    if (!session) throw new Error('No active session');
    
    setTerminalOutput(prev => [...prev, {
      type: 'stdout',
      data: `📁 Uploading ${files.length} files...\n`,
      timestamp: Date.now(),
    }]);
    
    await sandboxService.uploadFiles(session.id, files);
    
    setTerminalOutput(prev => [...prev, {
      type: 'stdout',
      data: `✓ Files uploaded successfully!\n`,
      timestamp: Date.now(),
    }]);
  }, [session]);

  // Execute command
  const executeCommand = useCallback(async (command: string) => {
    if (!session) throw new Error('No active session');
    
    // Add command to output
    setTerminalOutput(prev => [...prev, {
      type: 'stdout',
      data: `$ ${command}\n`,
      timestamp: Date.now(),
    }]);
    
    return sandboxService.executeCommand(session.id, command);
  }, [session]);

  // Start Expo
  const startExpo = useCallback(async () => {
    if (!session) throw new Error('No active session');
    
    setIsLoading(true);
    setTerminalOutput(prev => [...prev, {
      type: 'stdout',
      data: '📦 Starting Expo (this may take a few minutes)...\n',
      timestamp: Date.now(),
    }]);
    
    try {
      const server = await sandboxService.startExpoServer(session.id, (status) => {
        // Update terminal with status changes
        setTerminalOutput(prev => {
          // Avoid duplicate messages
          const lastMsg = prev[prev.length - 1]?.data;
          const newMsg = `  ⏳ ${status.message}\n`;
          if (lastMsg === newMsg) return prev;
          return [...prev, {
            type: 'stdout',
            data: newMsg,
            timestamp: Date.now(),
          }];
        });
      });
      
      setTerminalOutput(prev => [...prev, {
        type: 'stdout',
        data: `\n✓ Expo started!\n📱 Scan QR code in Expo Go\n🔗 URL: ${server.url}\n`,
        timestamp: Date.now(),
      }]);
      
      setExpoServer(server);
      return server;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start Expo';
      setTerminalOutput(prev => [...prev, {
        type: 'stderr',
        data: `❌ Error: ${errorMessage}\n`,
        timestamp: Date.now(),
      }]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Stop Expo
  const stopExpo = useCallback(async () => {
    if (!session) return;
    await sandboxService.stopExpoServer(session.id);
    setExpoServer(null);
  }, [session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (session) {
        sandboxService.destroySession(session.id).catch(console.error);
      }
    };
  }, [session]);

  return {
    session,
    isLoading,
    error,
    terminalOutput,
    expoServer,
    createSession,
    uploadFiles,
    executeCommand,
    startExpo,
    stopExpo,
  };
}
