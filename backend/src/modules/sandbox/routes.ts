/**
 * Expo Sandbox Routes
 * 
 * API endpoints for Expo sandbox management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { expoSandbox } from './expo-sandbox.js';
import type { AuthContext } from '../../middleware/auth.js';

export const sandboxRoutes = new Hono<{ Variables: AuthContext }>();

// ==================== Schemas ====================

const createSandboxSchema = z.object({
  projectId: z.string(),
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    type: z.string().optional(),
  })),
  dependencies: z.record(z.string()).optional(),
});

const updateFilesSchema = z.object({
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    type: z.string().optional(),
  })),
});

// ==================== Routes ====================

/**
 * Create new sandbox session
 * POST /api/sandbox/create
 */
sandboxRoutes.post('/create', zValidator('json', createSandboxSchema), async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { projectId, files, dependencies = {} } = await c.req.json();

  try {
    const session = await expoSandbox.createSandbox({
      projectId,
      userId: user.id,
      files,
      dependencies,
    });

    return c.json({
      success: true,
      sandbox: {
        id: session.id,
        status: session.status,
        devServerUrl: session.devServerUrl,
        expoUrl: session.expoUrl,
        qrCodeData: session.qrCodeData,
        metroPort: session.metroPort,
      },
    });
  } catch (error: any) {
    console.error('Sandbox creation error:', error);
    return c.json({ error: error.message || 'Failed to create sandbox' }, 500);
  }
});

/**
 * Get sandbox status
 * GET /api/sandbox/:sandboxId
 */
sandboxRoutes.get('/:sandboxId', async (c) => {
  const { sandboxId } = c.req.param();

  const session = expoSandbox.getSandbox(sandboxId);
  if (!session) {
    return c.json({ error: 'Sandbox not found' }, 404);
  }

  return c.json({
    id: session.id,
    projectId: session.projectId,
    status: session.status,
    devServerUrl: session.devServerUrl,
    expoUrl: session.expoUrl,
    qrCodeData: session.qrCodeData,
    filesCount: session.files.size,
    logsCount: session.logs.length,
    createdAt: session.createdAt.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
  });
});

/**
 * Get current user's sandbox
 * GET /api/sandbox/current
 */
sandboxRoutes.get('/user/current', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const session = expoSandbox.getSandboxByUser(user.id);
  if (!session) {
    return c.json({ sandbox: null });
  }

  return c.json({
    sandbox: {
      id: session.id,
      projectId: session.projectId,
      status: session.status,
      devServerUrl: session.devServerUrl,
      expoUrl: session.expoUrl,
      qrCodeData: session.qrCodeData,
    },
  });
});

/**
 * Update sandbox files (hot reload)
 * PUT /api/sandbox/:sandboxId/files
 */
sandboxRoutes.put('/:sandboxId/files', zValidator('json', updateFilesSchema), async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { sandboxId } = c.req.param();
  const { files } = await c.req.json();

  try {
    const session = expoSandbox.getSandbox(sandboxId);
    if (!session) {
      return c.json({ error: 'Sandbox not found' }, 404);
    }

    // Verify ownership
    if (session.userId !== user.id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await expoSandbox.updateFiles(sandboxId, files);

    return c.json({ success: true, message: 'Files updated, hot reload triggered' });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to update files' }, 500);
  }
});

/**
 * Get sandbox logs
 * GET /api/sandbox/:sandboxId/logs
 */
sandboxRoutes.get('/:sandboxId/logs', async (c) => {
  const { sandboxId } = c.req.param();
  const limit = parseInt(c.req.query('limit') || '100');
  const level = c.req.query('level') as any;

  const session = expoSandbox.getSandbox(sandboxId);
  if (!session) {
    return c.json({ error: 'Sandbox not found' }, 404);
  }

  const logs = expoSandbox.getLogs(sandboxId, { limit, level });

  return c.json({ logs });
});

/**
 * Export logs as expo.log file
 * GET /api/sandbox/:sandboxId/logs/export
 */
sandboxRoutes.get('/:sandboxId/logs/export', async (c) => {
  const { sandboxId } = c.req.param();

  const session = expoSandbox.getSandbox(sandboxId);
  if (!session) {
    return c.json({ error: 'Sandbox not found' }, 404);
  }

  const logContent = expoSandbox.exportLogsAsFile(sandboxId);

  c.header('Content-Type', 'text/plain');
  c.header('Content-Disposition', 'attachment; filename="expo.log"');
  return c.body(logContent);
});

/**
 * Stop sandbox
 * DELETE /api/sandbox/:sandboxId
 */
sandboxRoutes.delete('/:sandboxId', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { sandboxId } = c.req.param();

  const session = expoSandbox.getSandbox(sandboxId);
  if (!session) {
    return c.json({ error: 'Sandbox not found' }, 404);
  }

  // Verify ownership
  if (session.userId !== user.id) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  await expoSandbox.stopSandbox(sandboxId);

  return c.json({ success: true, message: 'Sandbox stopped' });
});

/**
 * Get sandbox statistics (admin)
 * GET /api/sandbox/stats
 */
sandboxRoutes.get('/admin/stats', async (c) => {
  const stats = expoSandbox.getStats();
  return c.json(stats);
});

/**
 * Stream logs via SSE (Server-Sent Events)
 * GET /api/sandbox/:sandboxId/logs/stream
 */
sandboxRoutes.get('/:sandboxId/logs/stream', async (c) => {
  const { sandboxId } = c.req.param();

  const session = expoSandbox.getSandbox(sandboxId);
  if (!session) {
    return c.json({ error: 'Sandbox not found' }, 404);
  }

  // Set SSE headers
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', sandboxId })}\n\n`));

      // Subscribe to logs
      const unsubscribe = expoSandbox.subscribeToLogs(sandboxId, (log) => {
        const data = JSON.stringify({ type: 'log', log });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      });

      // Handle connection close
      // Note: In production, you'd want proper cleanup when client disconnects
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});
