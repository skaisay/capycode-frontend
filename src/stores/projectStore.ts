import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Cache user ID to avoid repeated localStorage reads
let cachedUserId: string | null = null;
let userIdValidated = false;

// Get current user ID for data isolation
// CRITICAL: Returns null if user is not authenticated - prevents data leakage between users
const getCurrentUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Return cached value if we've already validated the user
  if (userIdValidated && cachedUserId) {
    return cachedUserId;
  }
  
  try {
    // Try to get user ID from Supabase session in localStorage
    const supabaseAuth = localStorage.getItem('sb-ollckpiykoiizdwtfnle-auth-token');
    if (supabaseAuth) {
      const parsed = JSON.parse(supabaseAuth);
      if (parsed?.user?.id) {
        cachedUserId = parsed.user.id;
        userIdValidated = true;
        return cachedUserId;
      }
    }
  } catch (e) {
    console.error('[ProjectStore] Error getting user ID:', e);
  }
  
  // IMPORTANT: Return null instead of 'anonymous' to prevent data leakage
  // This means unauthenticated users won't see any projects
  return null;
};

// Reset cached user ID (call on logout or user change)
export const resetUserIdCache = () => {
  cachedUserId = null;
  userIdValidated = false;
};

// Get storage key with user isolation
// Returns null if no authenticated user - prevents cross-user data access
const getStorageKey = (key: string): string | null => {
  const userId = getCurrentUserId();
  if (!userId) return null;
  return `capycode_${userId}_${key}`;
};

// Clean up old anonymous data to prevent data leakage
// This should be called once on app initialization
export const cleanupAnonymousData = () => {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  
  // Find all keys with anonymous prefix
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('capycode_anonymous_')) {
      keysToRemove.push(key);
    }
  }
  
  // Remove them
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log('[ProjectStore] Removed anonymous data:', key);
  });
  
  if (keysToRemove.length > 0) {
    console.log(`[ProjectStore] Cleaned up ${keysToRemove.length} anonymous data entries`);
  }
};

export interface ProjectFile {
  path: string;
  content: string;
  type: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  files: ProjectFile[];
  expo_config: Record<string, unknown>;
  dependencies: Record<string, string>;
  dev_dependencies: Record<string, string>;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectBackup {
  id: string;
  projectId: string;
  timestamp: number;
  description: string;
  files: ProjectFile[];
}

export interface RecentProject {
  id: string;
  name: string;
  description: string;
  lastModified: string;
  filesCount: number;
}

interface ProjectState {
  // State
  project: Project | null;
  currentFile: ProjectFile | null;
  isLoading: boolean;
  error: string | null;
  unsavedChanges: Set<string>;
  recentProjects: RecentProject[];
  backups: ProjectBackup[];
  maxBackups: number;
  lastUserPrompt: string | null;

  // Actions
  setProject: (project: Project | null, skipBackup?: boolean) => void;
  setProjectWithBackup: (project: Project, userPrompt: string) => void;
  setLastUserPrompt: (prompt: string) => void;
  setCurrentFile: (file: ProjectFile) => void;
  updateFileContent: (path: string, content: string) => void;
  addFile: (file: ProjectFile) => void;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markSaved: (path: string) => void;
  hasUnsavedChanges: () => boolean;
  saveToRecent: () => void;
  loadProject: (id: string) => void;
  deleteRecentProject: (id: string) => void;
  reset: () => void;
  
  // Backup actions
  createBackup: (description?: string) => void;
  restoreBackup: (backupId: string) => void;
  deleteBackup: (backupId: string) => void;
  getBackups: () => ProjectBackup[];
  undoLastChange: () => void;
}

// Helper to save backups to localStorage (user-isolated)
const saveBackupsToStorage = (backups: ProjectBackup[]) => {
  if (typeof window !== 'undefined') {
    const storageKey = getStorageKey('backups');
    if (!storageKey) return; // Not authenticated - don't save
    localStorage.setItem(storageKey, JSON.stringify(backups));
  }
};

// Helper to load backups from localStorage (user-isolated)
const loadBackupsFromStorage = (): ProjectBackup[] => {
  if (typeof window !== 'undefined') {
    try {
      const storageKey = getStorageKey('backups');
      if (!storageKey) return []; // Not authenticated - return empty
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  }
  return [];
};

// Helper to save full project to localStorage (user-isolated)
const saveFullProject = (project: Project) => {
  if (typeof window !== 'undefined') {
    const storageKey = getStorageKey('projects');
    if (!storageKey) return; // Not authenticated - don't save
    const projects = JSON.parse(localStorage.getItem(storageKey) || '{}');
    projects[project.id] = project;
    localStorage.setItem(storageKey, JSON.stringify(projects));
  }
};

// Helper to load full project from localStorage (user-isolated)
const loadFullProject = (id: string): Project | null => {
  if (typeof window !== 'undefined') {
    const storageKey = getStorageKey('projects');
    if (!storageKey) return null; // Not authenticated - return null
    const projects = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return projects[id] || null;
  }
  return null;
};

// Helper to save recent projects to localStorage (user-isolated)
const saveRecentProjectsToStorage = (recentProjects: RecentProject[]) => {
  if (typeof window !== 'undefined') {
    const storageKey = getStorageKey('recent_projects');
    if (!storageKey) return; // Not authenticated - don't save
    localStorage.setItem(storageKey, JSON.stringify(recentProjects));
  }
};

// Helper to load recent projects from localStorage (user-isolated)
const loadRecentProjectsFromStorage = (): RecentProject[] => {
  if (typeof window !== 'undefined') {
    try {
      const storageKey = getStorageKey('recent_projects');
      if (!storageKey) return []; // Not authenticated - return empty
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  }
  return [];
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // Initial state
      project: null,
      currentFile: null,
      isLoading: false,
      error: null,
      unsavedChanges: new Set(),
      recentProjects: loadRecentProjectsFromStorage(), // Load user-isolated recent projects
      backups: loadBackupsFromStorage(),
      maxBackups: 10,
      lastUserPrompt: null,

      // Actions
      setProject: (project, skipBackup = false) => {
        // Only set project, no auto-backup here
        // Use setProjectWithBackup for changes that need backup
        set({ 
          project, 
          currentFile: project?.files[0] || null,
          unsavedChanges: new Set(),
        });
        // Auto-save to recent and localStorage
        if (project) {
          saveFullProject(project);
          // Save current project ID for restoration on page reload (user-isolated)
          if (typeof window !== 'undefined') {
            const storageKey = getStorageKey('current_project_id');
            if (storageKey) {
              localStorage.setItem(storageKey, project.id);
            }
          }
          get().saveToRecent();
        }
      },
      
      setProjectWithBackup: (project, userPrompt) => {
        const { project: oldProject } = get();
        
        // Create backup ONLY when we have real changes to files
        if (oldProject && oldProject.files.length > 0) {
          // Check if files actually changed
          const filesChanged = JSON.stringify(oldProject.files) !== JSON.stringify(project.files);
          if (filesChanged) {
            get().createBackup(userPrompt || 'Changes');
          }
        }
        
        set({ 
          project, 
          currentFile: project?.files[0] || null,
          unsavedChanges: new Set(),
          lastUserPrompt: userPrompt,
        });
        // Auto-save
        saveFullProject(project);
        if (typeof window !== 'undefined') {
          const storageKey = getStorageKey('current_project_id');
          if (storageKey) {
            localStorage.setItem(storageKey, project.id);
          }
        }
        get().saveToRecent();
      },
      
      setLastUserPrompt: (prompt) => {
        set({ lastUserPrompt: prompt });
      },

      setCurrentFile: (file) => {
        set({ currentFile: file });
      },

      updateFileContent: (path, content) => {
        const { project, currentFile, unsavedChanges } = get();
        if (!project) return;

        const updatedFiles = project.files.map(f => 
          f.path === path ? { ...f, content } : f
        );

        const updatedProject = { 
          ...project, 
          files: updatedFiles,
          updated_at: new Date().toISOString()
        };

        const newUnsavedChanges = new Set(unsavedChanges);
        newUnsavedChanges.add(path);

        set({
          project: updatedProject,
          currentFile: currentFile?.path === path 
            ? { ...currentFile, content }
            : currentFile,
          unsavedChanges: newUnsavedChanges,
        });

        // Auto-save to localStorage
        saveFullProject(updatedProject);
        get().saveToRecent();
      },

  addFile: (file) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        files: [...project.files, file],
      },
    });
  },

  deleteFile: (path) => {
    const { project, currentFile, unsavedChanges } = get();
    if (!project) return;

    const updatedFiles = project.files.filter(f => f.path !== path);
    const newUnsavedChanges = new Set(unsavedChanges);
    newUnsavedChanges.delete(path);

    set({
      project: { ...project, files: updatedFiles },
      currentFile: currentFile?.path === path 
        ? updatedFiles[0] || null 
        : currentFile,
      unsavedChanges: newUnsavedChanges,
    });
  },

  renameFile: (oldPath, newPath) => {
    const { project, currentFile, unsavedChanges } = get();
    if (!project) return;

    const updatedFiles = project.files.map(f => 
      f.path === oldPath ? { ...f, path: newPath } : f
    );

    const newUnsavedChanges = new Set(unsavedChanges);
    if (newUnsavedChanges.has(oldPath)) {
      newUnsavedChanges.delete(oldPath);
      newUnsavedChanges.add(newPath);
    }

    set({
      project: { ...project, files: updatedFiles },
      currentFile: currentFile?.path === oldPath 
        ? { ...currentFile, path: newPath }
        : currentFile,
      unsavedChanges: newUnsavedChanges,
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  markSaved: (path) => {
    const { unsavedChanges } = get();
    const newUnsavedChanges = new Set(unsavedChanges);
    newUnsavedChanges.delete(path);
    set({ unsavedChanges: newUnsavedChanges });
  },

  hasUnsavedChanges: () => {
    return get().unsavedChanges.size > 0;
  },

  saveToRecent: () => {
    const { project, recentProjects } = get();
    if (!project) return;

    const recentEntry: RecentProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      lastModified: new Date().toISOString(),
      filesCount: project.files.length,
    };

    // Update or add to recent projects
    const filtered = recentProjects.filter(p => p.id !== project.id);
    const updated = [recentEntry, ...filtered].slice(0, 10); // Keep last 10

    set({ recentProjects: updated });
    // Save to user-isolated storage
    saveRecentProjectsToStorage(updated);
  },

  loadProject: (id: string) => {
    const fullProject = loadFullProject(id);
    if (fullProject) {
      set({
        project: fullProject,
        currentFile: fullProject.files[0] || null,
        unsavedChanges: new Set(),
      });
    }
  },

  deleteRecentProject: (id: string) => {
    const { recentProjects } = get();
    const updated = recentProjects.filter(p => p.id !== id);
    set({ recentProjects: updated });
    // Save to user-isolated storage
    saveRecentProjectsToStorage(updated);
    
    // Also delete from full storage (user-isolated)
    if (typeof window !== 'undefined') {
      const storageKey = getStorageKey('projects');
      if (storageKey) {
        const projects = JSON.parse(localStorage.getItem(storageKey) || '{}');
        delete projects[id];
        localStorage.setItem(storageKey, JSON.stringify(projects));
      }
    }
  },

  reset: () => {
    set({
      project: null,
      currentFile: null,
      isLoading: false,
      error: null,
      unsavedChanges: new Set(),
    });
    // Clear current project ID (user-isolated)
    if (typeof window !== 'undefined') {
      const storageKey = getStorageKey('current_project_id');
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    }
  },

  // Backup actions
  createBackup: (description?: string) => {
    const { project, backups, maxBackups } = get();
    if (!project || project.files.length === 0) return;
    
    const backup: ProjectBackup = {
      id: `backup_${Date.now()}`,
      projectId: project.id,
      timestamp: Date.now(),
      description: description || `Backup at ${new Date().toLocaleTimeString()}`,
      files: JSON.parse(JSON.stringify(project.files)), // Deep clone
    };
    
    // Keep only backups for current project and limit total
    const projectBackups = backups.filter(b => b.projectId === project.id);
    const otherBackups = backups.filter(b => b.projectId !== project.id);
    
    // Keep last N backups for this project
    const updatedProjectBackups = [backup, ...projectBackups].slice(0, maxBackups);
    const allBackups = [...updatedProjectBackups, ...otherBackups];
    
    set({ backups: allBackups });
    saveBackupsToStorage(allBackups);
    
    console.log('[ProjectStore] Created backup:', backup.description, 'Total files:', backup.files.length);
  },
  
  restoreBackup: (backupId: string) => {
    const { backups, project } = get();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup || !project) {
      console.error('[ProjectStore] Backup not found:', backupId);
      return;
    }
    
    // Create a backup of current state before restoring
    get().createBackup('Auto-backup before restore');
    
    // Restore files from backup
    const restoredProject = {
      ...project,
      files: JSON.parse(JSON.stringify(backup.files)),
      updated_at: new Date().toISOString(),
    };
    
    set({
      project: restoredProject,
      currentFile: restoredProject.files[0] || null,
      unsavedChanges: new Set(),
    });
    
    saveFullProject(restoredProject);
    console.log('[ProjectStore] Restored backup:', backup.description);
  },
  
  deleteBackup: (backupId: string) => {
    const { backups } = get();
    const updatedBackups = backups.filter(b => b.id !== backupId);
    set({ backups: updatedBackups });
    saveBackupsToStorage(updatedBackups);
  },
  
  getBackups: () => {
    const { backups, project } = get();
    if (!project) return [];
    return backups.filter(b => b.projectId === project.id).sort((a, b) => b.timestamp - a.timestamp);
  },
  
  undoLastChange: () => {
    const { backups, project } = get();
    if (!project) return;
    
    // Find the most recent backup for this project
    const projectBackups = backups
      .filter(b => b.projectId === project.id)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (projectBackups.length === 0) {
      console.log('[ProjectStore] No backups available to undo');
      return;
    }
    
    const latestBackup = projectBackups[0];
    
    // Restore without creating another backup
    const restoredProject = {
      ...project,
      files: JSON.parse(JSON.stringify(latestBackup.files)),
      updated_at: new Date().toISOString(),
    };
    
    // Remove the used backup
    const updatedBackups = backups.filter(b => b.id !== latestBackup.id);
    
    set({
      project: restoredProject,
      currentFile: restoredProject.files[0] || null,
      unsavedChanges: new Set(),
      backups: updatedBackups,
    });
    
    saveFullProject(restoredProject);
    saveBackupsToStorage(updatedBackups);
    console.log('[ProjectStore] Undo completed, restored to:', latestBackup.description);
  },
    }),
    {
      name: 'capycode-project-store',
      // Don't persist recentProjects via middleware - we handle it manually with user isolation
      partialize: () => ({}),
    }
  )
);

// Function to reload user data after authentication
// Call this when user logs in to load their projects
export const reloadUserData = () => {
  // Reset cache so we pick up the new user ID
  resetUserIdCache();
  
  // Reload user-specific data
  const recentProjects = loadRecentProjectsFromStorage();
  const backups = loadBackupsFromStorage();
  
  useProjectStore.setState({
    recentProjects,
    backups,
  });
  
  console.log('[ProjectStore] Reloaded user data:', { 
    recentProjects: recentProjects.length,
    backups: backups.length 
  });
};

// DISABLED: Auto-restore was causing bugs - new projects were being overwritten
// Restoration now happens explicitly in components that need it
// if (typeof window !== 'undefined') { ... }

// Selectors
export const selectProject = (state: ProjectState) => state.project;
export const selectCurrentFile = (state: ProjectState) => state.currentFile;
export const selectIsLoading = (state: ProjectState) => state.isLoading;
export const selectRecentProjects = (state: ProjectState) => state.recentProjects;
export const selectBackups = (state: ProjectState) => state.backups;
