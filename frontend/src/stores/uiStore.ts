import { create } from 'zustand';

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  
  // Panels
  aiPanelOpen: boolean;
  buildPanelOpen: boolean;
  terminalOpen: boolean;
  
  // Tabs
  activeTab: 'code' | 'preview' | 'build';
  
  // Preview
  previewDevice: 'iphone' | 'android' | 'web';
  showQRCode: boolean;
  
  // Modals
  activeModal: string | null;
  modalData: Record<string, unknown>;
  
  // Theme
  theme: 'dark' | 'light';
  
  // Actions
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  toggleAIPanel: () => void;
  toggleBuildPanel: () => void;
  toggleTerminal: () => void;
  setActiveTab: (tab: 'code' | 'preview' | 'build') => void;
  setPreviewDevice: (device: 'iphone' | 'android' | 'web') => void;
  toggleQRCode: () => void;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  sidebarCollapsed: false,
  sidebarWidth: 260,
  aiPanelOpen: true,
  buildPanelOpen: false,
  terminalOpen: false,
  activeTab: 'code',
  previewDevice: 'iphone',
  showQRCode: false,
  activeModal: null,
  modalData: {},
  theme: 'dark',

  // Actions
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarWidth: (width) => {
    set({ sidebarWidth: width });
  },

  toggleAIPanel: () => {
    set((state) => ({ aiPanelOpen: !state.aiPanelOpen }));
  },

  toggleBuildPanel: () => {
    set((state) => ({ buildPanelOpen: !state.buildPanelOpen }));
  },

  toggleTerminal: () => {
    set((state) => ({ terminalOpen: !state.terminalOpen }));
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setPreviewDevice: (device) => {
    set({ previewDevice: device });
  },

  toggleQRCode: () => {
    set((state) => ({ showQRCode: !state.showQRCode }));
  },

  openModal: (modalId, data = {}) => {
    set({ activeModal: modalId, modalData: data });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: {} });
  },

  setTheme: (theme) => {
    set({ theme });
  },
}));
