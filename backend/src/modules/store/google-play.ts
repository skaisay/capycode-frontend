import type { ExpoConfig } from '../../types/database.js';

interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

interface SubmissionResult {
  submissionId: string;
  status: string;
}

interface SubmissionStatus {
  status: string;
  reviewNotes?: string;
}

/**
 * Service for integrating with Google Play Console API
 * Handles app submission and status tracking for Android apps
 */
export class GooglePlayService {
  private readonly API_URL = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
  private readonly credentials: GoogleCredentials;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(credentials: GoogleCredentials) {
    this.credentials = credentials;
  }

  /**
   * Validate credentials by making a test API call
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      // Try to list apps (this will fail if credentials are invalid)
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Submit app to Google Play Console
   */
  async submitApp(
    artifactUrl: string,
    expoConfig: ExpoConfig,
    metadata?: { releaseNotes?: string; whatsNew?: string }
  ): Promise<SubmissionResult> {
    const packageName = expoConfig.android?.package || `com.codevibe.${expoConfig.slug}`;
    const token = await this.getAccessToken();

    // Step 1: Create a new edit session
    const edit = await this.createEdit(packageName, token);

    // Step 2: Upload the APK/AAB
    const upload = await this.uploadBundle(packageName, edit.id, artifactUrl, token);

    // Step 3: Assign to track (internal, alpha, beta, production)
    await this.assignToTrack(packageName, edit.id, upload.versionCode, 'internal', metadata?.releaseNotes, token);

    // Step 4: Commit the edit
    await this.commitEdit(packageName, edit.id, token);

    return {
      submissionId: edit.id,
      status: 'submitted',
    };
  }

  /**
   * Get submission status
   */
  async getSubmissionStatus(submissionId: string): Promise<SubmissionStatus> {
    // Google Play doesn't have a direct submission status API
    // We track the release status through track info
    // For now, return a default status
    return {
      status: 'submitted',
      reviewNotes: undefined,
    };
  }

  /**
   * Get OAuth2 access token using service account
   */
  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    // Reuse token if still valid
    if (this.accessToken && now < this.tokenExpiry - 60) {
      return this.accessToken;
    }

    // Create JWT for service account
    const jwt = this.createServiceAccountJWT();

    // Exchange JWT for access token
    const response = await fetch(this.credentials.token_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get access token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = now + data.expires_in;

    return this.accessToken!;
  }

  /**
   * Create JWT for service account authentication
   */
  private createServiceAccountJWT(): string {
    const now = Math.floor(Date.now() / 1000);

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const payload = {
      iss: this.credentials.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: this.credentials.token_uri,
      iat: now,
      exp: now + 3600,
    };

    // In production, use proper JWT library with RS256 signing
    // For now, create a simple unsigned token (will need proper implementation)
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // Sign with private key (simplified - use jsonwebtoken in production)
    const crypto = require('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${headerB64}.${payloadB64}`);
    const signature = sign.sign(this.credentials.private_key, 'base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Create a new edit session
   */
  private async createEdit(
    packageName: string,
    token: string
  ): Promise<{ id: string }> {
    const response = await fetch(
      `${this.API_URL}/applications/${packageName}/edits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create edit: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return { id: data.id };
  }

  /**
   * Upload APK or AAB bundle
   */
  private async uploadBundle(
    packageName: string,
    editId: string,
    artifactUrl: string,
    token: string
  ): Promise<{ versionCode: number }> {
    // Download the artifact
    const artifactResponse = await fetch(artifactUrl);
    if (!artifactResponse.ok) {
      throw new Error('Failed to download artifact');
    }

    const artifactBuffer = await artifactResponse.arrayBuffer();
    const isAAB = artifactUrl.includes('.aab');

    // Upload to Google Play
    const uploadUrl = isAAB
      ? `${this.API_URL}/applications/${packageName}/edits/${editId}/bundles`
      : `${this.API_URL}/applications/${packageName}/edits/${editId}/apks`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': isAAB ? 'application/octet-stream' : 'application/vnd.android.package-archive',
      },
      body: artifactBuffer,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(`Failed to upload bundle: ${JSON.stringify(error)}`);
    }

    const data = await uploadResponse.json();
    return { versionCode: data.versionCode };
  }

  /**
   * Assign build to a release track
   */
  private async assignToTrack(
    packageName: string,
    editId: string,
    versionCode: number,
    track: 'internal' | 'alpha' | 'beta' | 'production',
    releaseNotes?: string,
    token?: string
  ): Promise<void> {
    const release: Record<string, unknown> = {
      versionCodes: [versionCode.toString()],
      status: track === 'production' ? 'completed' : 'draft',
    };

    if (releaseNotes) {
      release.releaseNotes = [
        {
          language: 'en-US',
          text: releaseNotes,
        },
      ];
    }

    const response = await fetch(
      `${this.API_URL}/applications/${packageName}/edits/${editId}/tracks/${track}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          track,
          releases: [release],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to assign to track: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Commit the edit to publish changes
   */
  private async commitEdit(
    packageName: string,
    editId: string,
    token: string
  ): Promise<void> {
    const response = await fetch(
      `${this.API_URL}/applications/${packageName}/edits/${editId}:commit`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to commit edit: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Get track information
   */
  async getTrackInfo(
    packageName: string,
    track: string
  ): Promise<{ releases: Array<{ status: string; versionCodes: string[] }> }> {
    const token = await this.getAccessToken();

    // First create an edit to read data
    const edit = await this.createEdit(packageName, token);

    const response = await fetch(
      `${this.API_URL}/applications/${packageName}/edits/${edit.id}/tracks/${track}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return { releases: [] };
    }

    return response.json();
  }
}
