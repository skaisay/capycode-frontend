import jwt from 'jsonwebtoken';
import type { ExpoConfig } from '../../types/database.js';

interface AppleCredentials {
  issuerId: string;
  keyId: string;
  privateKey: string; // Base64 encoded .p8 key
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
 * Service for integrating with Apple App Store Connect API
 * Handles app submission and status tracking
 */
export class AppStoreConnectService {
  private readonly API_URL = 'https://api.appstoreconnect.apple.com/v1';
  private readonly credentials: AppleCredentials;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(credentials: AppleCredentials) {
    this.credentials = credentials;
  }

  /**
   * Validate credentials by making a test API call
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const token = this.generateToken();
      const response = await fetch(`${this.API_URL}/apps?limit=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Submit app to App Store Connect
   */
  async submitApp(
    artifactUrl: string,
    expoConfig: ExpoConfig,
    metadata?: { releaseNotes?: string; whatsNew?: string }
  ): Promise<SubmissionResult> {
    const token = this.generateToken();

    // Step 1: Find or create the app
    const app = await this.findOrCreateApp(expoConfig, token);

    // Step 2: Create a new version
    const version = await this.createAppVersion(app.id, expoConfig.version!, token);

    // Step 3: Upload the build
    const build = await this.uploadBuild(app.id, artifactUrl, token);

    // Step 4: Associate build with version
    await this.associateBuildWithVersion(version.id, build.id, token);

    // Step 5: Set release notes if provided
    if (metadata?.whatsNew) {
      await this.setWhatsNew(version.id, metadata.whatsNew, token);
    }

    // Step 6: Submit for review
    const submission = await this.submitForReview(version.id, token);

    return {
      submissionId: submission.id,
      status: 'submitted',
    };
  }

  /**
   * Get submission status
   */
  async getSubmissionStatus(submissionId: string): Promise<SubmissionStatus> {
    const token = this.generateToken();

    try {
      const response = await fetch(
        `${this.API_URL}/appStoreVersionSubmissions/${submissionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        return { status: 'unknown' };
      }

      const data = await response.json();
      const state = data.data?.attributes?.state;

      return {
        status: this.mapAppStoreStatus(state),
        reviewNotes: data.data?.attributes?.reviewNotes,
      };
    } catch {
      return { status: 'unknown' };
    }
  }

  /**
   * Generate JWT token for App Store Connect API
   */
  private generateToken(): string {
    const now = Math.floor(Date.now() / 1000);

    // Reuse token if still valid
    if (this.token && now < this.tokenExpiry - 60) {
      return this.token;
    }

    const privateKey = Buffer.from(this.credentials.privateKey, 'base64').toString('utf-8');

    const payload = {
      iss: this.credentials.issuerId,
      iat: now,
      exp: now + 20 * 60, // 20 minutes
      aud: 'appstoreconnect-v1',
    };

    this.token = jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      keyid: this.credentials.keyId,
    });

    this.tokenExpiry = now + 20 * 60;

    return this.token;
  }

  /**
   * Find existing app or create new one
   */
  private async findOrCreateApp(
    expoConfig: ExpoConfig,
    token: string
  ): Promise<{ id: string; bundleId: string }> {
    const bundleId = expoConfig.ios?.bundleIdentifier || `com.codevibe.${expoConfig.slug}`;

    // Search for existing app
    const searchResponse = await fetch(
      `${this.API_URL}/apps?filter[bundleId]=${bundleId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (searchResponse.ok) {
      const data = await searchResponse.json();
      if (data.data?.length > 0) {
        return {
          id: data.data[0].id,
          bundleId: data.data[0].attributes.bundleId,
        };
      }
    }

    // App doesn't exist - would need to create via App Store Connect UI
    // or throw error to let user know they need to create the app first
    throw new Error(`App with bundle ID ${bundleId} not found in App Store Connect. Please create it first.`);
  }

  /**
   * Create a new app version
   */
  private async createAppVersion(
    appId: string,
    version: string,
    token: string
  ): Promise<{ id: string }> {
    const response = await fetch(`${this.API_URL}/appStoreVersions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          type: 'appStoreVersions',
          attributes: {
            platform: 'IOS',
            versionString: version,
          },
          relationships: {
            app: {
              data: {
                type: 'apps',
                id: appId,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create version: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return { id: data.data.id };
  }

  /**
   * Upload build to App Store Connect
   */
  private async uploadBuild(
    appId: string,
    artifactUrl: string,
    token: string
  ): Promise<{ id: string }> {
    // In production, this would:
    // 1. Download the IPA from artifactUrl
    // 2. Use Transporter or altool to upload to App Store Connect
    // 3. Wait for processing
    // 4. Return the build ID

    // For now, simulate the process
    // The actual upload would use Apple's Transporter API
    
    console.log(`Uploading build from ${artifactUrl} to app ${appId}`);

    // Wait for build processing (mock)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return mock build ID
    return { id: `build-${Date.now()}` };
  }

  /**
   * Associate build with version
   */
  private async associateBuildWithVersion(
    versionId: string,
    buildId: string,
    token: string
  ): Promise<void> {
    await fetch(`${this.API_URL}/appStoreVersions/${versionId}/relationships/build`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          type: 'builds',
          id: buildId,
        },
      }),
    });
  }

  /**
   * Set "What's New" text for version
   */
  private async setWhatsNew(
    versionId: string,
    whatsNew: string,
    token: string
  ): Promise<void> {
    // Get localizations
    const locResponse = await fetch(
      `${this.API_URL}/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!locResponse.ok) return;

    const locData = await locResponse.json();
    const enLocalization = locData.data?.find(
      (loc: { attributes: { locale: string } }) => loc.attributes.locale === 'en-US'
    );

    if (enLocalization) {
      await fetch(
        `${this.API_URL}/appStoreVersionLocalizations/${enLocalization.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              type: 'appStoreVersionLocalizations',
              id: enLocalization.id,
              attributes: {
                whatsNew,
              },
            },
          }),
        }
      );
    }
  }

  /**
   * Submit version for review
   */
  private async submitForReview(
    versionId: string,
    token: string
  ): Promise<{ id: string }> {
    const response = await fetch(`${this.API_URL}/appStoreVersionSubmissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          type: 'appStoreVersionSubmissions',
          relationships: {
            appStoreVersion: {
              data: {
                type: 'appStoreVersions',
                id: versionId,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to submit for review: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return { id: data.data.id };
  }

  /**
   * Map App Store Connect status to our status
   */
  private mapAppStoreStatus(state: string): string {
    const statusMap: Record<string, string> = {
      'WAITING_FOR_REVIEW': 'in_review',
      'IN_REVIEW': 'in_review',
      'PENDING_DEVELOPER_RELEASE': 'approved',
      'READY_FOR_SALE': 'approved',
      'REJECTED': 'rejected',
      'DEVELOPER_REJECTED': 'rejected',
    };

    return statusMap[state] || 'pending';
  }
}
