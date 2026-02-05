import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AppStoreConnectService } from './app-store.js';
import { GooglePlayService } from './google-play.js';
import { supabase } from '../../lib/supabase.js';
import { wsServer } from '../../index.js';

export const storeRoutes = new Hono();

// Schema validation
const submitSchema = z.object({
  buildId: z.string().uuid(),
  store: z.enum(['app_store', 'play_store']),
  metadata: z.object({
    releaseNotes: z.string().optional(),
    whatsNew: z.string().optional(),
  }).optional(),
});

const connectAppleSchema = z.object({
  issuerId: z.string(),
  keyId: z.string(),
  privateKey: z.string(), // Base64 encoded .p8 key
});

const connectGoogleSchema = z.object({
  serviceAccountKey: z.string(), // JSON string
});

// Submit build to store
storeRoutes.post('/submit', zValidator('json', submitSchema), async (c) => {
  const user = c.get('user');
  const { buildId, store, metadata } = await c.req.json();

  try {
    // Get build
    const { data: build, error: buildError } = await supabase
      .from('builds')
      .select('*, projects(*)')
      .eq('id', buildId)
      .eq('user_id', user.id)
      .single();

    if (buildError || !build) {
      return c.json({ error: 'Build not found' }, 404);
    }

    if (build.status !== 'completed' || !build.artifact_url) {
      return c.json({ error: 'Build is not ready for submission' }, 400);
    }

    // Validate platform matches store
    if (store === 'app_store' && build.platform !== 'ios') {
      return c.json({ error: 'App Store requires iOS build' }, 400);
    }
    if (store === 'play_store' && build.platform !== 'android') {
      return c.json({ error: 'Play Store requires Android build' }, 400);
    }

    // Get user's store credentials
    const credKey = store === 'app_store' ? 'APPLE_CREDENTIALS' : 'GOOGLE_CREDENTIALS';
    const { data: secrets } = await supabase
      .from('user_secrets')
      .select('*')
      .eq('user_id', user.id)
      .eq('key', credKey)
      .single();

    if (!secrets) {
      return c.json({ 
        error: `${store === 'app_store' ? 'Apple' : 'Google'} credentials not configured`,
        setup_required: true,
      }, 400);
    }

    // Create submission record
    const { data: submission, error: subError } = await supabase
      .from('store_submissions')
      .insert({
        build_id: buildId,
        user_id: user.id,
        store,
        status: 'pending',
      })
      .select()
      .single();

    if (subError || !submission) {
      return c.json({ error: 'Failed to create submission record' }, 500);
    }

    // Start submission process
    try {
      const credentials = JSON.parse(secrets.encrypted_value);
      let submissionId: string;

      if (store === 'app_store') {
        const appleService = new AppStoreConnectService(credentials);
        const result = await appleService.submitApp(
          build.artifact_url,
          build.projects.expo_config,
          metadata
        );
        submissionId = result.submissionId;
      } else {
        const googleService = new GooglePlayService(credentials);
        const result = await googleService.submitApp(
          build.artifact_url,
          build.projects.expo_config,
          metadata
        );
        submissionId = result.submissionId;
      }

      // Update submission status
      await supabase
        .from('store_submissions')
        .update({
          status: 'submitted',
          submission_id: submissionId,
        })
        .eq('id', submission.id);

      wsServer.sendToUser(user.id, {
        type: 'store_submission',
        submissionId: submission.id,
        status: 'submitted',
        store,
      });

      return c.json({
        success: true,
        submissionId: submission.id,
        storeSubmissionId: submissionId,
        status: 'submitted',
      });
    } catch (err) {
      await supabase
        .from('store_submissions')
        .update({
          status: 'failed',
          error_message: (err as Error).message,
        })
        .eq('id', submission.id);

      return c.json({ 
        error: 'Submission failed', 
        message: (err as Error).message 
      }, 500);
    }
  } catch (err) {
    console.error('Store submission error:', err);
    return c.json({ error: 'Submission failed' }, 500);
  }
});

// Get submission status
storeRoutes.get('/status/:submissionId', async (c) => {
  const user = c.get('user');
  const { submissionId } = c.req.param();

  try {
    const { data: submission, error } = await supabase
      .from('store_submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .single();

    if (error || !submission) {
      return c.json({ error: 'Submission not found' }, 404);
    }

    // Get real-time status from store if submitted
    if (submission.submission_id && submission.status === 'submitted') {
      const credKey = submission.store === 'app_store' ? 'APPLE_CREDENTIALS' : 'GOOGLE_CREDENTIALS';
      const { data: secrets } = await supabase
        .from('user_secrets')
        .select('*')
        .eq('user_id', user.id)
        .eq('key', credKey)
        .single();

      if (secrets) {
        const credentials = JSON.parse(secrets.encrypted_value);
        let storeStatus: { status: string; reviewNotes?: string };

        if (submission.store === 'app_store') {
          const appleService = new AppStoreConnectService(credentials);
          storeStatus = await appleService.getSubmissionStatus(submission.submission_id);
        } else {
          const googleService = new GooglePlayService(credentials);
          storeStatus = await googleService.getSubmissionStatus(submission.submission_id);
        }

        // Update local status if changed
        if (storeStatus.status !== submission.status) {
          await supabase
            .from('store_submissions')
            .update({ status: storeStatus.status })
            .eq('id', submissionId);
        }

        return c.json({
          ...submission,
          currentStatus: storeStatus.status,
          reviewNotes: storeStatus.reviewNotes,
        });
      }
    }

    return c.json(submission);
  } catch (err) {
    return c.json({ error: 'Failed to get status' }, 500);
  }
});

// Connect Apple Developer Account
storeRoutes.post('/connect/apple', zValidator('json', connectAppleSchema), async (c) => {
  const user = c.get('user');
  const { issuerId, keyId, privateKey } = await c.req.json();

  try {
    // Validate credentials by making a test API call
    const credentials = { issuerId, keyId, privateKey };
    const appleService = new AppStoreConnectService(credentials);
    
    const isValid = await appleService.validateCredentials();
    if (!isValid) {
      return c.json({ error: 'Invalid Apple credentials' }, 400);
    }

    // Store encrypted credentials
    await supabase
      .from('user_secrets')
      .upsert({
        user_id: user.id,
        key: 'APPLE_CREDENTIALS',
        encrypted_value: JSON.stringify(credentials),
      }, {
        onConflict: 'user_id,key',
      });

    return c.json({ success: true, message: 'Apple Developer account connected' });
  } catch (err) {
    console.error('Apple connect error:', err);
    return c.json({ error: 'Failed to connect Apple account' }, 500);
  }
});

// Connect Google Play Console
storeRoutes.post('/connect/google', zValidator('json', connectGoogleSchema), async (c) => {
  const user = c.get('user');
  const { serviceAccountKey } = await c.req.json();

  try {
    // Validate credentials
    const credentials = JSON.parse(serviceAccountKey);
    const googleService = new GooglePlayService(credentials);
    
    const isValid = await googleService.validateCredentials();
    if (!isValid) {
      return c.json({ error: 'Invalid Google credentials' }, 400);
    }

    // Store encrypted credentials
    await supabase
      .from('user_secrets')
      .upsert({
        user_id: user.id,
        key: 'GOOGLE_CREDENTIALS',
        encrypted_value: serviceAccountKey,
      }, {
        onConflict: 'user_id,key',
      });

    return c.json({ success: true, message: 'Google Play Console connected' });
  } catch (err) {
    console.error('Google connect error:', err);
    return c.json({ error: 'Failed to connect Google account' }, 500);
  }
});

// Check store connection status
storeRoutes.get('/connections', async (c) => {
  const user = c.get('user');

  try {
    const { data: secrets } = await supabase
      .from('user_secrets')
      .select('key')
      .eq('user_id', user.id)
      .in('key', ['APPLE_CREDENTIALS', 'GOOGLE_CREDENTIALS']);

    const connections = {
      apple: secrets?.some(s => s.key === 'APPLE_CREDENTIALS') || false,
      google: secrets?.some(s => s.key === 'GOOGLE_CREDENTIALS') || false,
    };

    return c.json({ connections });
  } catch (err) {
    return c.json({ error: 'Failed to check connections' }, 500);
  }
});

// Disconnect store
storeRoutes.delete('/disconnect/:store', async (c) => {
  const user = c.get('user');
  const { store } = c.req.param();

  const keyMap: Record<string, string> = {
    apple: 'APPLE_CREDENTIALS',
    google: 'GOOGLE_CREDENTIALS',
  };

  const key = keyMap[store];
  if (!key) {
    return c.json({ error: 'Invalid store' }, 400);
  }

  try {
    await supabase
      .from('user_secrets')
      .delete()
      .eq('user_id', user.id)
      .eq('key', key);

    return c.json({ success: true, message: `${store} disconnected` });
  } catch (err) {
    return c.json({ error: 'Failed to disconnect' }, 500);
  }
});

// List all submissions
storeRoutes.get('/submissions', async (c) => {
  const user = c.get('user');
  const store = c.req.query('store');

  try {
    let query = supabase
      .from('store_submissions')
      .select('*, builds(*, projects(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (store) {
      query = query.eq('store', store);
    }

    const { data: submissions, error } = await query;

    if (error) {
      return c.json({ error: 'Failed to fetch submissions' }, 500);
    }

    return c.json({ submissions });
  } catch (err) {
    return c.json({ error: 'Failed to fetch submissions' }, 500);
  }
});
