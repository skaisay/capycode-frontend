import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// Helper to save backups to localStorage
const saveBackupsToStorage = (backups: ProjectBackup[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('capycode_backups', JSON.stringify(backups));
  }
};

// Helper to load backups from localStorage
const loadBackupsFromStorage = (): ProjectBackup[] => {
  if (typeof window !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem('capycode_backups') || '[]');
    } catch {
      return [];
    }
  }
  return [];
};

// Helper to save full project to localStorage
const saveFullProject = (project: Project) => {
  if (typeof window !== 'undefined') {
    const projects = JSON.parse(localStorage.getItem('capycode_projects') || '{}');
    projects[project.id] = project;
    localStorage.setItem('capycode_projects', JSON.stringify(projects));
  }
};

// Helper to load full project from localStorage
const loadFullProject = (id: string): Project | null => {
  if (typeof window !== 'undefined') {
    const projects = JSON.parse(localStorage.getItem('capycode_projects') || '{}');
    return projects[id] || null;
  }
  return null;
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
      recentProjects: [],
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
          // Save current project ID for restoration on page reload
          if (typeof window !== 'undefined') {
            localStorage.setItem('capycode_current_project_id', project.id);
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
          localStorage.setItem('capycode_current_project_id', project.id);
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
    
    // Also delete from full storage
    if (typeof window !== 'undefined') {
      const projects = JSON.parse(localStorage.getItem('capycode_projects') || '{}');
      delete projects[id];
      localStorage.setItem('capycode_projects', JSON.stringify(projects));
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
    // Clear current project ID
    if (typeof window !== 'undefined') {
      localStorage.removeItem('capycode_current_project_id');
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
      partialize: (state) => ({ 
        recentProjects: state.recentProjects,
      }),
    }
  )
);

// Auto-restore last project on load
if (typeof window !== 'undefined') {
  // Delay to ensure store is ready
  setTimeout(() => {
    const currentProjectId = localStorage.getItem('capycode_current_project_id');
    if (currentProjectId) {
      const fullProject = loadFullProject(currentProjectId);
      if (fullProject) {
        useProjectStore.getState().setProject(fullProject);
        console.log('[ProjectStore] Restored project:', fullProject.name);
      }
    }
  }, 100);
}

// Selectors
export const selectProject = (state: ProjectState) => state.project;
export const selectCurrentFile = (state: ProjectState) => state.currentFile;
export const selectIsLoading = (state: ProjectState) => state.isLoading;
export const selectRecentProjects = (state: ProjectState) => state.recentProjects;
export const selectBackups = (state: ProjectState) => state.backups;
