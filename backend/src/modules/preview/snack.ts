import type { ProjectFile } from '../../types/database.js';
import { nanoid } from 'nanoid';

interface SnackFile {
  type: 'CODE' | 'ASSET';
  contents: string;
}

interface SnackSession {
  id: string;
  url: string;
  webPreviewUrl: string;
  qrCodeUrl: string;
  expoGoUrl: string;
  files: Record<string, SnackFile>;
  dependencies: Record<string, string>;
  createdAt: Date;
  expiresAt: Date;
}

// In-memory store for snack sessions (in production, use Redis)
const snackSessions = new Map<string, SnackSession>();

/**
 * Service for integrating with Expo Snack SDK
 * Provides live preview functionality through Expo Go and web browser
 */
export class SnackService {
  private readonly SNACK_API_URL = 'https://snack.expo.dev';
  private readonly EXPO_API_URL = 'https://exp.host';
  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Create a new Snack session from project files
   */
  async createSnack(
    name: string, 
    projectFiles: ProjectFile[], 
    dependencies: Record<string, string>
  ): Promise<SnackSession> {
    const snackId = `snack-${nanoid(12)}`;
    
    // Convert project files to Snack format
    const files = this.convertToSnackFiles(projectFiles);
    
    // Clean dependencies for Snack compatibility
    const snackDependencies = this.cleanDependencies(dependencies);

    // Create session
    const session: SnackSession = {
      id: snackId,
      url: `${this.SNACK_API_URL}/@codevibe/${snackId}`,
      webPreviewUrl: `${this.SNACK_API_URL}/embedded/@codevibe/${snackId}`,
      qrCodeUrl: `${this.SNACK_API_URL}/qr/@codevibe/${snackId}`,
      expoGoUrl: `exp://exp.host/@codevibe/${snackId}`,
      files,
      dependencies: snackDependencies,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_DURATION_MS),
    };

    // Save to Snack API
    await this.saveToSnackAPI(session, name);

    // Store locally
    snackSessions.set(snackId, session);

    return session;
  }

  /**
   * Update files in an existing Snack session
   */
  async updateSnackFiles(snackId: string, files: Record<string, SnackFile>): Promise<void> {
    const session = snackSessions.get(snackId);
    if (!session) {
      throw new Error('Snack session not found');
    }

    // Update local session
    session.files = { ...session.files, ...files };
    snackSessions.set(snackId, session);

    // Push to Snack API (real-time update)
    await this.pushUpdateToSnack(snackId, files);
  }

  /**
   * Get Snack session information
   */
  async getSnackInfo(snackId: string): Promise<SnackSession | null> {
    const session = snackSessions.get(snackId);
    
    if (!session) {
      // Try to fetch from Snack API
      return this.fetchFromSnackAPI(snackId);
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      snackSessions.delete(snackId);
      return null;
    }

    return session;
  }

  /**
   * Generate QR code SVG for Expo Go
   */
  async generateQRCode(snackId: string): Promise<string> {
    const session = snackSessions.get(snackId);
    if (!session) {
      throw new Error('Snack session not found');
    }

    // Generate QR code as SVG
    const qrData = session.expoGoUrl;
    return this.createQRCodeSVG(qrData);
  }

  /**
   * Convert project files to Snack format
   */
  private convertToSnackFiles(projectFiles: ProjectFile[]): Record<string, SnackFile> {
    const files: Record<string, SnackFile> = {};

    for (const file of projectFiles) {
      const isAsset = this.isAssetFile(file.path);
      
      files[file.path] = {
        type: isAsset ? 'ASSET' : 'CODE',
        contents: file.content,
      };
    }

    return files;
  }

  /**
   * Check if file is an asset (image, font, etc.)
   */
  private isAssetFile(path: string): boolean {
    const assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ttf', '.otf', '.woff'];
    return assetExtensions.some(ext => path.toLowerCase().endsWith(ext));
  }

  /**
   * Clean dependencies for Snack compatibility
   */
  private cleanDependencies(deps: Record<string, string>): Record<string, string> {
    const cleaned: Record<string, string> = {};
    
    // Snack-supported packages
    const supportedPrefixes = ['expo', 'react', '@react-', '@expo'];
    
    for (const [pkg, version] of Object.entries(deps)) {
      // Include if it's a supported package
      if (supportedPrefixes.some(prefix => pkg.startsWith(prefix))) {
        cleaned[pkg] = version;
      }
    }

    return cleaned;
  }

  /**
   * Save session to Snack API
   */
  private async saveToSnackAPI(session: SnackSession, name: string): Promise<void> {
    try {
      const response = await fetch(`${this.SNACK_API_URL}/api/v2/snacks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          files: session.files,
          dependencies: session.dependencies,
          sdkVersion: '50.0.0',
        }),
      });

      if (!response.ok) {
        console.warn('Failed to save to Snack API, using local session');
      }
    } catch (err) {
      console.warn('Snack API unavailable, using local session:', err);
    }
  }

  /**
   * Push real-time update to Snack
   */
  private async pushUpdateToSnack(snackId: string, files: Record<string, SnackFile>): Promise<void> {
    try {
      await fetch(`${this.SNACK_API_URL}/api/v2/snacks/${snackId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files }),
      });
    } catch (err) {
      console.warn('Failed to push update to Snack:', err);
    }
  }

  /**
   * Fetch session from Snack API
   */
  private async fetchFromSnackAPI(snackId: string): Promise<SnackSession | null> {
    try {
      const response = await fetch(`${this.SNACK_API_URL}/api/v2/snacks/${snackId}`);
      if (!response.ok) return null;

      const data = await response.json();
      return {
        id: snackId,
        url: `${this.SNACK_API_URL}/@codevibe/${snackId}`,
        webPreviewUrl: `${this.SNACK_API_URL}/embedded/@codevibe/${snackId}`,
        qrCodeUrl: `${this.SNACK_API_URL}/qr/@codevibe/${snackId}`,
        expoGoUrl: `exp://exp.host/@codevibe/${snackId}`,
        files: data.files,
        dependencies: data.dependencies,
        createdAt: new Date(data.createdAt),
        expiresAt: new Date(Date.now() + this.SESSION_DURATION_MS),
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate QR code SVG
   */
  private createQRCodeSVG(data: string): string {
    // Simple QR code placeholder - in production use a proper QR library
    const size = 200;
    const moduleCount = 25;
    const moduleSize = size / moduleCount;

    // This is a simplified placeholder - use 'qrcode' package for real implementation
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`;
    svg += `<rect width="${size}" height="${size}" fill="white"/>`;
    
    // Generate pseudo-random pattern based on data hash
    const hash = this.simpleHash(data);
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        const index = row * moduleCount + col;
        if ((hash >> (index % 32)) & 1 || this.isPositionPattern(row, col, moduleCount)) {
          svg += `<rect x="${col * moduleSize}" y="${row * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
        }
      }
    }
    
    svg += '</svg>';
    return svg;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private isPositionPattern(row: number, col: number, size: number): boolean {
    // Position detection patterns in corners
    const isTopLeft = row < 7 && col < 7;
    const isTopRight = row < 7 && col >= size - 7;
    const isBottomLeft = row >= size - 7 && col < 7;
    
    if (isTopLeft || isTopRight || isBottomLeft) {
      const r = isTopLeft ? row : (isTopRight ? row : row - (size - 7));
      const c = isTopLeft ? col : (isTopRight ? col - (size - 7) : col);
      return (r === 0 || r === 6 || c === 0 || c === 6) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
    }
    
    return false;
  }
}
