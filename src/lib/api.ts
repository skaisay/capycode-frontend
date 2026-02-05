const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiOptions extends RequestInit {
  token?: string;
}

interface ApiError {
  error: string;
  message: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<T> {
    const { token, ...fetchOptions } = options;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    const authToken = token || this.token;
    if (authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'Unknown error',
        message: response.statusText,
        status: response.status,
      }));
      throw new Error(error.message || error.error);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;
    
    return JSON.parse(text);
  }

  private async stream(
    endpoint: string,
    options: ApiOptions = {},
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const { token, ...fetchOptions } = options;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    const authToken = token || this.token;
    if (authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  }

  // General HTTP methods
  async get<T = any>(endpoint: string): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint);
    return { data };
  }

  async post<T = any>(endpoint: string, body?: any): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  }

  // ==================== Projects ====================
  
  async getProjects() {
    return this.request<{ projects: Project[] }>('/api/projects');
  }

  async getProject(id: string) {
    return this.request<{ project: Project }>(`/api/projects/${id}`);
  }

  async createProject(data: CreateProjectInput) {
    return this.request<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: Partial<Project>) {
    return this.request<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request<{ success: boolean }>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== Generator ====================

  async generateProject(prompt: string, options?: GenerateOptions) {
    return this.request<GenerateResult>('/api/generator/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, ...options }),
    });
  }

  async generateProjectStream(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: GenerateOptions
  ) {
    return this.stream(
      '/api/generator/generate/stream',
      {
        method: 'POST',
        body: JSON.stringify({ prompt, ...options }),
      },
      onChunk
    );
  }

  async generateComponent(prompt: string, projectId: string) {
    return this.request<{ component: GeneratedFile }>('/api/generator/component', {
      method: 'POST',
      body: JSON.stringify({ prompt, projectId }),
    });
  }

  async getTemplates() {
    return this.request<{ templates: Template[] }>('/api/generator/templates');
  }

  async generateFromTemplate(templateId: string, appName: string, customization: string) {
    return this.request<GenerateResult>('/api/generator/template', {
      method: 'POST',
      body: JSON.stringify({ templateId, appName, customization }),
    });
  }

  // ==================== Preview ====================

  async createSnackSession(projectId: string) {
    return this.request<SnackSession>('/api/preview/snack/session', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  }

  async updateSnackSession(sessionId: string, files: Record<string, { type: string; contents: string }>) {
    return this.request<{ success: boolean }>(`/api/preview/snack/session/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify({ files }),
    });
  }

  async getSnackQRCode(sessionId: string) {
    return this.request<{ qrCodeUrl: string; expoUrl: string }>(`/api/preview/snack/session/${sessionId}/qr`);
  }

  async createWebPreview(projectId: string) {
    return this.request<WebPreview>('/api/preview/web', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  }

  async getWebPreview(projectId: string) {
    return this.request<WebPreview>(`/api/preview/web/${projectId}`);
  }

  // ==================== Build ====================

  async getBuilds(projectId: string) {
    return this.request<{ builds: Build[] }>(`/api/build/${projectId}`);
  }

  async startBuild(
    projectId: string,
    platform: 'ios' | 'android' | 'all',
    profile: 'development' | 'preview' | 'production'
  ) {
    return this.request<{ build: Build }>('/api/build/start', {
      method: 'POST',
      body: JSON.stringify({ projectId, platform, profile }),
    });
  }

  async getBuildStatus(buildId: string) {
    return this.request<{ build: Build }>(`/api/build/status/${buildId}`);
  }

  async cancelBuild(buildId: string) {
    return this.request<{ success: boolean }>(`/api/build/cancel/${buildId}`, {
      method: 'POST',
    });
  }

  // ==================== Store ====================

  async getStoreCredentials(projectId: string) {
    return this.request<{ credentials: StoreCredentials }>(`/api/store/credentials/${projectId}`);
  }

  async saveStoreCredentials(projectId: string, credentials: Partial<StoreCredentials>) {
    return this.request<{ success: boolean }>(`/api/store/credentials/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(credentials),
    });
  }

  async submitToAppStore(projectId: string, buildId: string, metadata: AppStoreMetadata) {
    return this.request<{ submission: StoreSubmission }>('/api/store/appstore/submit', {
      method: 'POST',
      body: JSON.stringify({ projectId, buildId, metadata }),
    });
  }

  async submitToGooglePlay(projectId: string, buildId: string, metadata: GooglePlayMetadata) {
    return this.request<{ submission: StoreSubmission }>('/api/store/googleplay/submit', {
      method: 'POST',
      body: JSON.stringify({ projectId, buildId, metadata }),
    });
  }

  async getSubmissions(projectId: string) {
    return this.request<{ submissions: StoreSubmission[] }>(`/api/store/submissions/${projectId}`);
  }
}

// Types
interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  files: Array<{ path: string; content: string; type: string }>;
  expo_config: Record<string, unknown>;
  dependencies: Record<string, string>;
  dev_dependencies: Record<string, string>;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CreateProjectInput {
  name: string;
  description?: string;
}

interface GenerateOptions {
  useTemplate?: boolean;
  templateId?: string;
  streaming?: boolean;
}

interface GeneratedFile {
  path: string;
  content: string;
  type: string;
}

interface GenerateResult {
  files: GeneratedFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  expoConfig: Record<string, unknown>;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
}

interface SnackSession {
  sessionId: string;
  url: string;
  expoUrl: string;
}

interface WebPreview {
  html: string;
  bundleUrl?: string;
}

interface Build {
  id: string;
  project_id: string;
  platform: 'ios' | 'android';
  profile: 'development' | 'preview' | 'production';
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'canceled';
  eas_build_id: string | null;
  artifact_url: string | null;
  logs_url: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface StoreCredentials {
  appstore_key_id?: string;
  appstore_issuer_id?: string;
  appstore_private_key?: string;
  googleplay_service_account?: string;
}

interface AppStoreMetadata {
  version: string;
  whatsNew: string;
  description?: string;
  keywords?: string[];
  screenshots?: string[];
}

interface GooglePlayMetadata {
  versionName: string;
  versionCode: number;
  track: 'internal' | 'alpha' | 'beta' | 'production';
  releaseNotes: string;
}

interface StoreSubmission {
  id: string;
  project_id: string;
  store: 'appstore' | 'googleplay';
  build_id: string;
  status: 'pending' | 'submitted' | 'in_review' | 'approved' | 'rejected';
  version: string;
  metadata: Record<string, unknown>;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

// Export singleton
export const api = new ApiClient(API_BASE_URL);

// Export types
export type {
  Project,
  CreateProjectInput,
  GenerateOptions,
  GeneratedFile,
  GenerateResult,
  Template,
  SnackSession,
  WebPreview,
  Build,
  StoreCredentials,
  AppStoreMetadata,
  GooglePlayMetadata,
  StoreSubmission,
};
