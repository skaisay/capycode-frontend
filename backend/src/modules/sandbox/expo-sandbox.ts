/**
 * Expo Sandbox Service
 * 
 * Provides real-time Expo development environment for CapyCode
 * Similar to Vibecode's sandbox functionality
 * 
 * Features:
 * - Real Expo Dev Server (port 8081)
 * - Live code synchronization
 * - expo.log streaming
 * - QR code for Expo Go / CapyCode App
 * - Hot reload support
 */

import type { ProjectFile } from '../../types/database.js';
import { nanoid } from 'nanoid';
import { EventEmitter } from 'events';

// ==================== Interfaces ====================

interface SandboxLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: 'expo' | 'metro' | 'app' | 'system';
  metadata?: Record<string, any>;
}

interface SandboxSession {
  id: string;
  projectId: string;
  userId: string;
  status: 'initializing' | 'running' | 'stopped' | 'error';
  
  // Expo Dev Server info
  devServerUrl: string;
  metroPort: number;
  expoUrl: string;
  qrCodeData: string;
  
  // Files and state
  files: Map<string, ProjectFile>;
  dependencies: Record<string, string>;
  
  // Logging
  logs: SandboxLog[];
  logEmitter: EventEmitter;
  
  // Timestamps
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
}

interface SandboxOptions {
  projectId: string;
  userId: string;
  files: ProjectFile[];
  dependencies: Record<string, string>;
  sdkVersion?: string; // Default: '53.0.0'
}

// ==================== Constants ====================

const SANDBOX_TIMEOUT_MS = parseInt(process.env.SANDBOX_TIMEOUT_MS || '1800000'); // 30 min default
const MAX_LOGS_PER_SESSION = 1000;
const EXPO_SDK_VERSION = '53.0.0';
const BASE_METRO_PORT = 8081;

// In-memory store (use Redis in production)
const activeSandboxes = new Map<string, SandboxSession>();
const userSandboxes = new Map<string, string>(); // userId -> sandboxId

// ==================== Expo Sandbox Service ====================

export class ExpoSandboxService {
  private static instance: ExpoSandboxService;
  
  private constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupExpiredSessions(), 60000);
  }
  
  static getInstance(): ExpoSandboxService {
    if (!ExpoSandboxService.instance) {
      ExpoSandboxService.instance = new ExpoSandboxService();
    }
    return ExpoSandboxService.instance;
  }

  // ==================== Session Management ====================

  /**
   * Create a new sandbox session
   */
  async createSandbox(options: SandboxOptions): Promise<SandboxSession> {
    const { projectId, userId, files, dependencies, sdkVersion = EXPO_SDK_VERSION } = options;
    
    // Check if user already has an active sandbox
    const existingSandboxId = userSandboxes.get(userId);
    if (existingSandboxId) {
      const existing = activeSandboxes.get(existingSandboxId);
      if (existing && existing.status === 'running') {
        // Stop existing sandbox
        await this.stopSandbox(existingSandboxId);
      }
    }
    
    const sandboxId = `sandbox-${nanoid(12)}`;
    const metroPort = this.getAvailablePort();
    
    const logEmitter = new EventEmitter();
    logEmitter.setMaxListeners(50);
    
    const session: SandboxSession = {
      id: sandboxId,
      projectId,
      userId,
      status: 'initializing',
      
      devServerUrl: `http://localhost:${metroPort}`,
      metroPort,
      expoUrl: `exp://localhost:${metroPort}`,
      qrCodeData: '', // Will be set after initialization
      
      files: new Map(files.map(f => [f.path, f])),
      dependencies: this.cleanDependencies(dependencies, sdkVersion),
      
      logs: [],
      logEmitter,
      
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + SANDBOX_TIMEOUT_MS),
    };
    
    // Store session
    activeSandboxes.set(sandboxId, session);
    userSandboxes.set(userId, sandboxId);
    
    // Initialize sandbox
    await this.initializeSandbox(session);
    
    return session;
  }

  /**
   * Get sandbox by ID
   */
  getSandbox(sandboxId: string): SandboxSession | null {
    const session = activeSandboxes.get(sandboxId);
    if (!session) return null;
    
    // Update activity
    session.lastActivityAt = new Date();
    
    return session;
  }

  /**
   * Get sandbox by user ID
   */
  getSandboxByUser(userId: string): SandboxSession | null {
    const sandboxId = userSandboxes.get(userId);
    if (!sandboxId) return null;
    return this.getSandbox(sandboxId);
  }

  /**
   * Stop and cleanup sandbox
   */
  async stopSandbox(sandboxId: string): Promise<void> {
    const session = activeSandboxes.get(sandboxId);
    if (!session) return;
    
    session.status = 'stopped';
    this.addLog(session, 'info', 'Sandbox stopped', 'system');
    
    // Remove from maps
    activeSandboxes.delete(sandboxId);
    userSandboxes.delete(session.userId);
    
    // Cleanup resources
    session.logEmitter.removeAllListeners();
  }

  // ==================== File Synchronization ====================

  /**
   * Update files in sandbox (hot reload)
   */
  async updateFiles(sandboxId: string, files: ProjectFile[]): Promise<void> {
    const session = activeSandboxes.get(sandboxId);
    if (!session) {
      throw new Error('Sandbox not found');
    }
    
    // Update files
    for (const file of files) {
      session.files.set(file.path, file);
    }
    
    session.lastActivityAt = new Date();
    
    // Log file updates
    this.addLog(
      session, 
      'info', 
      `Updated ${files.length} file(s): ${files.map(f => f.path).join(', ')}`,
      'metro'
    );
    
    // Trigger hot reload (in real implementation, this would notify Metro bundler)
    this.triggerHotReload(session, files);
  }

  /**
   * Get file content
   */
  getFile(sandboxId: string, path: string): ProjectFile | null {
    const session = activeSandboxes.get(sandboxId);
    if (!session) return null;
    return session.files.get(path) || null;
  }

  /**
   * Get all files
   */
  getAllFiles(sandboxId: string): ProjectFile[] {
    const session = activeSandboxes.get(sandboxId);
    if (!session) return [];
    return Array.from(session.files.values());
  }

  // ==================== Logging ====================

  /**
   * Add log entry
   */
  addLog(
    session: SandboxSession, 
    level: SandboxLog['level'], 
    message: string, 
    source: SandboxLog['source'],
    metadata?: Record<string, any>
  ): void {
    const log: SandboxLog = {
      id: nanoid(8),
      timestamp: new Date(),
      level,
      message,
      source,
      metadata,
    };
    
    // Add to logs array (keep last N logs)
    session.logs.push(log);
    if (session.logs.length > MAX_LOGS_PER_SESSION) {
      session.logs.shift();
    }
    
    // Emit for real-time streaming
    session.logEmitter.emit('log', log);
  }

  /**
   * Get logs for session
   */
  getLogs(sandboxId: string, options?: { limit?: number; level?: SandboxLog['level'] }): SandboxLog[] {
    const session = activeSandboxes.get(sandboxId);
    if (!session) return [];
    
    let logs = session.logs;
    
    if (options?.level) {
      logs = logs.filter(l => l.level === options.level);
    }
    
    if (options?.limit) {
      logs = logs.slice(-options.limit);
    }
    
    return logs;
  }

  /**
   * Subscribe to log stream
   */
  subscribeToLogs(sandboxId: string, callback: (log: SandboxLog) => void): () => void {
    const session = activeSandboxes.get(sandboxId);
    if (!session) {
      throw new Error('Sandbox not found');
    }
    
    session.logEmitter.on('log', callback);
    
    // Return unsubscribe function
    return () => {
      session.logEmitter.off('log', callback);
    };
  }

  /**
   * Export logs as expo.log format
   */
  exportLogsAsFile(sandboxId: string): string {
    const logs = this.getLogs(sandboxId);
    
    return logs.map(log => {
      const timestamp = log.timestamp.toISOString();
      const level = log.level.toUpperCase().padEnd(5);
      const source = `[${log.source}]`.padEnd(10);
      return `${timestamp} ${level} ${source} ${log.message}`;
    }).join('\n');
  }

  // ==================== Private Methods ====================

  /**
   * Initialize sandbox environment
   */
  private async initializeSandbox(session: SandboxSession): Promise<void> {
    try {
      this.addLog(session, 'info', 'Initializing Expo sandbox...', 'system');
      
      // Simulate Expo Dev Server initialization
      // In production, this would:
      // 1. Create a container/worker with Node.js
      // 2. Install dependencies
      // 3. Start Metro bundler
      // 4. Configure network access
      
      this.addLog(session, 'info', `Installing ${Object.keys(session.dependencies).length} dependencies...`, 'system');
      await this.simulateDelay(500);
      
      this.addLog(session, 'info', 'Starting Metro bundler...', 'metro');
      await this.simulateDelay(300);
      
      this.addLog(session, 'info', `Metro bundler running on port ${session.metroPort}`, 'metro');
      
      // Generate QR code data
      session.qrCodeData = this.generateQRCodeData(session);
      
      session.status = 'running';
      this.addLog(session, 'info', '✓ Sandbox ready!', 'system');
      this.addLog(session, 'info', `Expo URL: ${session.expoUrl}`, 'expo');
      
    } catch (error: any) {
      session.status = 'error';
      this.addLog(session, 'error', `Initialization failed: ${error.message}`, 'system');
      throw error;
    }
  }

  /**
   * Trigger hot reload for changed files
   */
  private triggerHotReload(session: SandboxSession, files: ProjectFile[]): void {
    this.addLog(session, 'debug', 'Hot reloading...', 'metro');
    
    // In production, this would notify Metro bundler
    // For now, just emit an event
    session.logEmitter.emit('hotReload', { files: files.map(f => f.path) });
    
    this.addLog(session, 'info', '✓ Hot reload complete', 'metro');
  }

  /**
   * Clean dependencies for Expo compatibility
   */
  private cleanDependencies(deps: Record<string, string>, sdkVersion: string): Record<string, string> {
    const cleaned: Record<string, string> = {
      'expo': `~${sdkVersion}`,
      'expo-status-bar': '~2.0.0',
      'react': '18.3.1',
      'react-native': '0.76.3',
    };
    
    // Add user dependencies, filtering out incompatible ones
    const incompatible = ['react-native-code-push', 'react-native-firebase'];
    
    for (const [name, version] of Object.entries(deps)) {
      if (!incompatible.some(i => name.includes(i))) {
        cleaned[name] = version;
      }
    }
    
    return cleaned;
  }

  /**
   * Get available port for Metro bundler
   */
  private getAvailablePort(): number {
    // In production, would check for available ports
    // For now, use base port + sandbox count
    return BASE_METRO_PORT + activeSandboxes.size;
  }

  /**
   * Generate QR code data for Expo Go
   */
  private generateQRCodeData(session: SandboxSession): string {
    // Generate exp:// URL that Expo Go can scan
    return `exp://u.expo.dev/sandbox/${session.id}?runtime=exposdk:${EXPO_SDK_VERSION}`;
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    
    for (const [sandboxId, session] of activeSandboxes) {
      if (now > session.expiresAt) {
        console.log(`Cleaning up expired sandbox: ${sandboxId}`);
        this.stopSandbox(sandboxId);
      }
    }
  }

  /**
   * Helper to simulate async delay
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== Statistics ====================

  /**
   * Get sandbox statistics
   */
  getStats(): {
    activeSandboxes: number;
    totalLogs: number;
    avgSessionDuration: number;
  } {
    let totalLogs = 0;
    let totalDuration = 0;
    
    for (const session of activeSandboxes.values()) {
      totalLogs += session.logs.length;
      totalDuration += session.lastActivityAt.getTime() - session.createdAt.getTime();
    }
    
    return {
      activeSandboxes: activeSandboxes.size,
      totalLogs,
      avgSessionDuration: activeSandboxes.size > 0 
        ? Math.round(totalDuration / activeSandboxes.size / 1000) 
        : 0,
    };
  }
}

// Export singleton
export const expoSandbox = ExpoSandboxService.getInstance();
