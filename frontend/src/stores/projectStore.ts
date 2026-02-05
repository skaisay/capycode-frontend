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

  // Actions
  setProject: (project: Project | null) => void;
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
}

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

      // Actions
      setProject: (project) => {
        set({ 
          project, 
          currentFile: project?.files[0] || null,
          unsavedChanges: new Set(),
        });
        // Auto-save to recent and localStorage
        if (project) {
          saveFullProject(project);
          get().saveToRecent();
        }
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

// Selectors
export const selectProject = (state: ProjectState) => state.project;
export const selectCurrentFile = (state: ProjectState) => state.currentFile;
export const selectIsLoading = (state: ProjectState) => state.isLoading;
export const selectRecentProjects = (state: ProjectState) => state.recentProjects;
