export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          slug: string;
          files: ProjectFile[];
          expo_config: ExpoConfig;
          dependencies: Record<string, string>;
          dev_dependencies: Record<string, string>;
          status: ProjectStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      builds: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          platform: 'ios' | 'android';
          status: BuildStatus;
          eas_build_id: string | null;
          build_url: string | null;
          artifact_url: string | null;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['builds']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['builds']['Insert']>;
      };
      store_submissions: {
        Row: {
          id: string;
          build_id: string;
          user_id: string;
          store: 'app_store' | 'play_store';
          status: SubmissionStatus;
          submission_id: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['store_submissions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['store_submissions']['Insert']>;
      };
      user_secrets: {
        Row: {
          id: string;
          user_id: string;
          key: string;
          encrypted_value: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_secrets']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_secrets']['Insert']>;
      };
    };
  };
}

export interface ProjectFile {
  path: string;
  content: string;
  type: 'component' | 'screen' | 'config' | 'style' | 'util' | 'hook' | 'service' | 'type' | 'asset';
}

export interface ExpoConfig {
  name: string;
  slug: string;
  version: string;
  orientation?: 'portrait' | 'landscape' | 'default';
  icon?: string;
  userInterfaceStyle?: 'light' | 'dark' | 'automatic';
  splash?: {
    image?: string;
    resizeMode?: 'cover' | 'contain';
    backgroundColor?: string;
  };
  ios?: {
    supportsTablet?: boolean;
    bundleIdentifier?: string;
    buildNumber?: string;
  };
  android?: {
    package?: string;
    versionCode?: number;
    adaptiveIcon?: {
      foregroundImage?: string;
      backgroundColor?: string;
    };
  };
  extra?: Record<string, unknown>;
  plugins?: string[];
}

export type ProjectStatus = 'draft' | 'generating' | 'ready' | 'building' | 'published' | 'error';
export type BuildStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type SubmissionStatus = 'pending' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'failed';

export interface GenerationRequest {
  prompt: string;
  type: 'full_project' | 'component' | 'screen' | 'feature';
  projectId?: string;
  context?: {
    existingFiles?: ProjectFile[];
    style?: 'minimal' | 'detailed' | 'enterprise';
    features?: string[];
  };
}

export interface GenerationResult {
  success: boolean;
  projectName?: string;
  files: ProjectFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  expoConfig: ExpoConfig;
  errors?: string[];
}

export interface BuildRequest {
  projectId: string;
  platform: 'ios' | 'android' | 'all';
  profile?: 'development' | 'preview' | 'production';
}

export interface StoreSubmitRequest {
  buildId: string;
  store: 'app_store' | 'play_store';
  metadata?: {
    releaseNotes?: string;
    whatsNew?: string;
  };
}
