import { WebSocket, WebSocketServer as WSServer } from 'ws';
import type { Server } from 'http';
import { verify } from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface WSMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * WebSocket server for real-time updates
 * Handles build progress, preview updates, and store notifications
 */
export class WebSocketServer {
  private wss: WSServer;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private pingInterval: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WSServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      this.handleConnection(ws, req);
    });

    // Heartbeat to detect dead connections
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const authWs = ws as AuthenticatedWebSocket;
        if (authWs.isAlive === false) {
          this.removeClient(authWs);
          return authWs.terminate();
        }
        authWs.isAlive = false;
        authWs.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(this.pingInterval);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: AuthenticatedWebSocket, req: { url?: string }): Promise<void> {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(ws, message);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      this.removeClient(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      this.removeClient(ws);
    });

    // Try to authenticate from URL token
    const url = new URL(req.url || '/', 'http://localhost');
    const token = url.searchParams.get('token');

    if (token) {
      const userId = await this.authenticateToken(token);
      if (userId) {
        this.addClient(userId, ws);
        ws.send(JSON.stringify({ type: 'connected', userId }));
      } else {
        ws.send(JSON.stringify({ type: 'auth_required' }));
      }
    } else {
      ws.send(JSON.stringify({ type: 'auth_required' }));
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(ws: AuthenticatedWebSocket, message: WSMessage): Promise<void> {
    switch (message.type) {
      case 'auth':
        const userId = await this.authenticateToken(message.token as string);
        if (userId) {
          this.addClient(userId, ws);
          ws.send(JSON.stringify({ type: 'authenticated', userId }));
        } else {
          ws.send(JSON.stringify({ type: 'auth_failed' }));
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      case 'subscribe':
        // Subscribe to specific channels (build updates, project updates, etc.)
        if (ws.userId && message.channel) {
          ws.send(JSON.stringify({ 
            type: 'subscribed', 
            channel: message.channel 
          }));
        }
        break;

      case 'unsubscribe':
        if (ws.userId && message.channel) {
          ws.send(JSON.stringify({ 
            type: 'unsubscribed', 
            channel: message.channel 
          }));
        }
        break;

      default:
        ws.send(JSON.stringify({ type: 'unknown_message_type' }));
    }
  }

  /**
   * Authenticate token and return user ID
   */
  private async authenticateToken(token: string): Promise<string | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return null;
      return user.id;
    } catch {
      return null;
    }
  }

  /**
   * Add client to user's connection set
   */
  private addClient(userId: string, ws: AuthenticatedWebSocket): void {
    ws.userId = userId;

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(ws);
  }

  /**
   * Remove client from tracking
   */
  private removeClient(ws: AuthenticatedWebSocket): void {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
    }
  }

  /**
   * Send message to all connections of a specific user
   */
  sendToUser(userId: string, message: WSMessage): void {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const messageStr = JSON.stringify(message);
    userClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WSMessage): void {
    const messageStr = JSON.stringify(message);
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * Send build progress update
   */
  sendBuildProgress(userId: string, buildId: string, progress: number, stage: string): void {
    this.sendToUser(userId, {
      type: 'build_progress',
      buildId,
      progress,
      stage,
    });
  }

  /**
   * Send preview update notification
   */
  sendPreviewUpdate(userId: string, previewId: string, status: string): void {
    this.sendToUser(userId, {
      type: 'preview_update',
      previewId,
      status,
    });
  }

  /**
   * Send generation progress update
   */
  sendGenerationProgress(userId: string, stage: string, percent: number, currentFile?: string): void {
    this.sendToUser(userId, {
      type: 'generation_progress',
      stage,
      percent,
      currentFile,
    });
  }

  /**
   * Get number of connected clients for a user
   */
  getClientCount(userId: string): number {
    return this.clients.get(userId)?.size || 0;
  }

  /**
   * Get total number of connected clients
   */
  getTotalClients(): number {
    let total = 0;
    this.clients.forEach((clients) => {
      total += clients.size;
    });
    return total;
  }
}
