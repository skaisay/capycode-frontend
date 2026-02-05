import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { config } from 'dotenv';

// Load environment variables
config();

// Import routes
import { generatorRoutes } from './modules/generator/routes.js';
import { previewRoutes } from './modules/preview/routes.js';
import { buildRoutes } from './modules/build/routes.js';
import { storeRoutes } from './modules/store/routes.js';
import { projectRoutes } from './modules/project/routes.js';
import { webhookRoutes } from './modules/webhooks/routes.js';
import { authMiddleware } from './middleware/auth.js';
import { WebSocketServer } from './websocket/server.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://codevibe.app'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API version prefix
const api = new Hono();

// Public routes (webhooks)
api.route('/webhooks', webhookRoutes);

// Protected routes
api.use('*', authMiddleware);
api.route('/generate', generatorRoutes);
api.route('/preview', previewRoutes);
api.route('/build', buildRoutes);
api.route('/store', storeRoutes);
api.route('/projects', projectRoutes);

// Mount API
app.route('/api/v1', api);

// Error handling
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  }, 500);
});

// Not found
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

const port = parseInt(process.env.PORT || '3001', 10);

console.log(`🚀 CodeVibe Backend starting on port ${port}...`);

const server = serve({
  fetch: app.fetch,
  port,
});

// Initialize WebSocket server for real-time updates
const wsServer = new WebSocketServer(server);
export { wsServer };

console.log(`✅ Server running at http://localhost:${port}`);
console.log(`📡 WebSocket server initialized`);
