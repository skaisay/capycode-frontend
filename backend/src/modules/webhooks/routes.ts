import { Hono } from 'hono';
import { EASWebhookHandler } from '../build/eas-service.js';
import { supabase } from '../../lib/supabase.js';
import { wsServer } from '../../index.js';

export const webhookRoutes = new Hono();

// EAS Build webhook - receives build status updates
webhookRoutes.post('/eas-build', async (c) => {
  const signature = c.req.header('expo-signature') || '';
  
  try {
    const payload = await c.req.json();
    
    // Process the webhook
    const result = await EASWebhookHandler.processWebhook(payload, signature);

    // Find our build record by EAS build ID
    const { data: build, error } = await supabase
      .from('builds')
      .select('id, user_id, project_id')
      .eq('eas_build_id', result.buildId)
      .single();

    if (error || !build) {
      console.warn('Build not found for webhook:', result.buildId);
      return c.json({ received: true });
    }

    // Update build status
    const updateData: Record<string, unknown> = {
      status: result.status,
    };

    if (result.artifactUrl) {
      updateData.artifact_url = result.artifactUrl;
    }

    if (['completed', 'failed', 'cancelled'].includes(result.status)) {
      updateData.completed_at = new Date().toISOString();

      // Update project status if all builds are done
      await updateProjectStatus(build.project_id);
    }

    await supabase
      .from('builds')
      .update(updateData)
      .eq('id', build.id);

    // Notify user via WebSocket
    wsServer.sendToUser(build.user_id, {
      type: 'build_update',
      buildId: build.id,
      status: result.status,
      artifactUrl: result.artifactUrl,
    });

    return c.json({ received: true, processed: true });
  } catch (err) {
    console.error('EAS webhook error:', err);
    return c.json({ received: true, error: 'Processing failed' }, 200);
  }
});

// Store submission webhook (for future use)
webhookRoutes.post('/store-update', async (c) => {
  try {
    const payload = await c.req.json();
    
    // Handle App Store Connect or Google Play webhooks
    const store = c.req.header('x-store-type') || 'unknown';
    
    console.log(`Store webhook received from ${store}:`, payload);

    // Find and update submission
    const submissionId = payload.submissionId || payload.id;
    
    if (submissionId) {
      const { data: submission } = await supabase
        .from('store_submissions')
        .select('id, user_id')
        .eq('submission_id', submissionId)
        .single();

      if (submission) {
        await supabase
          .from('store_submissions')
          .update({
            status: mapStoreStatus(payload.status),
          })
          .eq('id', submission.id);

        wsServer.sendToUser(submission.user_id, {
          type: 'store_update',
          submissionId: submission.id,
          status: payload.status,
        });
      }
    }

    return c.json({ received: true });
  } catch (err) {
    console.error('Store webhook error:', err);
    return c.json({ received: true }, 200);
  }
});

// Health check for webhooks
webhookRoutes.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper to update project status based on builds
async function updateProjectStatus(projectId: string): Promise<void> {
  const { data: builds } = await supabase
    .from('builds')
    .select('status')
    .eq('project_id', projectId);

  if (!builds || builds.length === 0) return;

  const allCompleted = builds.every(b => 
    ['completed', 'failed', 'cancelled'].includes(b.status)
  );

  if (allCompleted) {
    const hasSuccess = builds.some(b => b.status === 'completed');
    await supabase
      .from('projects')
      .update({
        status: hasSuccess ? 'ready' : 'error',
      })
      .eq('id', projectId);
  }
}

// Map external store status to our status
function mapStoreStatus(externalStatus: string): string {
  const statusMap: Record<string, string> = {
    // App Store Connect statuses
    'WAITING_FOR_REVIEW': 'in_review',
    'IN_REVIEW': 'in_review',
    'PENDING_DEVELOPER_RELEASE': 'approved',
    'READY_FOR_SALE': 'approved',
    'REJECTED': 'rejected',
    // Google Play statuses
    'pending': 'pending',
    'inProgress': 'in_review',
    'completed': 'approved',
    'failed': 'failed',
  };

  return statusMap[externalStatus] || 'pending';
}
