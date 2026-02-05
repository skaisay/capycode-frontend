import { create } from 'zustand';

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

interface BuildState {
  // State
  builds: Build[];
  currentBuild: Build | null;
  isBuilding: boolean;
  progress: number;
  logs: string[];
  
  // Actions
  setBuilds: (builds: Build[]) => void;
  addBuild: (build: Build) => void;
  updateBuild: (id: string, updates: Partial<Build>) => void;
  setCurrentBuild: (build: Build | null) => void;
  setIsBuilding: (isBuilding: boolean) => void;
  setProgress: (progress: number) => void;
  addLog: (log: string) => void;
  clearLogs: () => void;
  reset: () => void;
}

export const useBuildStore = create<BuildState>((set, get) => ({
  // Initial state
  builds: [],
  currentBuild: null,
  isBuilding: false,
  progress: 0,
  logs: [],

  // Actions
  setBuilds: (builds) => {
    set({ builds });
  },

  addBuild: (build) => {
    set((state) => ({
      builds: [build, ...state.builds],
    }));
  },

  updateBuild: (id, updates) => {
    set((state) => ({
      builds: state.builds.map(b => 
        b.id === id ? { ...b, ...updates } : b
      ),
      currentBuild: state.currentBuild?.id === id 
        ? { ...state.currentBuild, ...updates }
        : state.currentBuild,
    }));
  },

  setCurrentBuild: (build) => {
    set({ currentBuild: build });
  },

  setIsBuilding: (isBuilding) => {
    set({ isBuilding });
  },

  setProgress: (progress) => {
    set({ progress });
  },

  addLog: (log) => {
    set((state) => ({
      logs: [...state.logs, log],
    }));
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  reset: () => {
    set({
      builds: [],
      currentBuild: null,
      isBuilding: false,
      progress: 0,
      logs: [],
    });
  },
}));
