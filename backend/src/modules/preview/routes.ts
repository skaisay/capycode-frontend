import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SnackService } from './snack.js';
import { WebPreviewService } from './web-preview.js';
import { supabase } from '../../lib/supabase.js';

export const previewRoutes = new Hono();

// Schema validation
const createPreviewSchema = z.object({
  projectId: z.string().uuid(),
});

const updatePreviewSchema = z.object({
  snackId: z.string(),
  files: z.record(z.object({
    type: z.enum(['CODE', 'ASSET']),
    contents: z.string(),
  })),
});

// Create a new Snack preview session
previewRoutes.post('/snack', zValidator('json', createPreviewSchema), async (c) => {
  const user = c.get('user');
  const { projectId } = await c.req.json();

  try {
    // Get project files
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Create Snack session
    const snackService = new SnackService();
    const snack = await snackService.createSnack(project.name, project.files, project.dependencies);

    return c.json({
      success: true,
      snackId: snack.id,
      url: snack.url,
      webUrl: snack.webPreviewUrl,
      qrCode: snack.qrCodeUrl,
      expoGoUrl: snack.expoGoUrl,
    });
  } catch (err) {
    console.error('Snack creation error:', err);
    return c.json({ error: 'Failed to create preview' }, 500);
  }
});

// Update Snack files in real-time
previewRoutes.put('/snack/:snackId', zValidator('json', updatePreviewSchema), async (c) => {
  const { snackId } = c.req.param();
  const { files } = await c.req.json();

  try {
    const snackService = new SnackService();
    await snackService.updateSnackFiles(snackId, files);

    return c.json({ success: true });
  } catch (err) {
    console.error('Snack update error:', err);
    return c.json({ error: 'Failed to update preview' }, 500);
  }
});

// Get Snack session info
previewRoutes.get('/snack/:snackId', async (c) => {
  const { snackId } = c.req.param();

  try {
    const snackService = new SnackService();
    const info = await snackService.getSnackInfo(snackId);

    return c.json(info);
  } catch (err) {
    return c.json({ error: 'Snack not found' }, 404);
  }
});

// Create web preview (react-native-web)
previewRoutes.post('/web', zValidator('json', createPreviewSchema), async (c) => {
  const user = c.get('user');
  const { projectId } = await c.req.json();

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const webPreview = new WebPreviewService();
    const session = await webPreview.createSession(project.id, project.files, project.dependencies);

    return c.json({
      success: true,
      sessionId: session.id,
      previewUrl: session.url,
      iframeUrl: session.iframeUrl,
    });
  } catch (err) {
    console.error('Web preview error:', err);
    return c.json({ error: 'Failed to create web preview' }, 500);
  }
});

// Get web preview session
previewRoutes.get('/web/:sessionId', async (c) => {
  const { sessionId } = c.req.param();

  try {
    const webPreview = new WebPreviewService();
    const session = await webPreview.getSession(sessionId);

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    return c.json(session);
  } catch (err) {
    return c.json({ error: 'Failed to get session' }, 500);
  }
});

// Update web preview files
previewRoutes.put('/web/:sessionId', async (c) => {
  const { sessionId } = c.req.param();
  const { files } = await c.req.json();

  try {
    const webPreview = new WebPreviewService();
    await webPreview.updateSession(sessionId, files);

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to update preview' }, 500);
  }
});

// Generate QR code for Expo Go
previewRoutes.get('/qr/:snackId', async (c) => {
  const { snackId } = c.req.param();

  try {
    const snackService = new SnackService();
    const qrCode = await snackService.generateQRCode(snackId);

    c.header('Content-Type', 'image/svg+xml');
    return c.body(qrCode);
  } catch (err) {
    return c.json({ error: 'Failed to generate QR code' }, 500);
  }
});
