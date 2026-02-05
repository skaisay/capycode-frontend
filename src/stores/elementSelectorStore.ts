'use client';

import { create } from 'zustand';

export interface SelectedElement {
  id: string;
  type: string; // button, text, container, image, etc.
  displayName: string; // Human-readable name like "Header", "Submit Button", etc.
  path: string; // CSS selector or data-path
  preview?: string; // HTML preview of the element
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ElementSelectorState {
  // Is selection mode active
  isSelecting: boolean;
  setIsSelecting: (value: boolean) => void;
  toggleSelecting: () => void;
  
  // Currently hovered element (not yet selected)
  hoveredElement: SelectedElement | null;
  setHoveredElement: (element: SelectedElement | null) => void;
  
  // Selected elements (can be multiple)
  selectedElements: SelectedElement[];
  addSelectedElement: (element: SelectedElement) => void;
  removeSelectedElement: (id: string) => void;
  clearSelectedElements: () => void;
  
  // Get elements as text for AI prompt
  getSelectionDescription: () => string;
}

export const useElementSelectorStore = create<ElementSelectorState>((set, get) => ({
  isSelecting: false,
  setIsSelecting: (value) => set({ isSelecting: value }),
  toggleSelecting: () => set((state) => ({ 
    isSelecting: !state.isSelecting,
    // Clear hovered element when toggling off
    hoveredElement: state.isSelecting ? null : state.hoveredElement
  })),
  
  hoveredElement: null,
  setHoveredElement: (element) => set({ hoveredElement: element }),
  
  selectedElements: [],
  addSelectedElement: (element) => set((state) => {
    // Don't add duplicates
    if (state.selectedElements.find(e => e.id === element.id)) {
      return state;
    }
    return { selectedElements: [...state.selectedElements, element] };
  }),
  removeSelectedElement: (id) => set((state) => ({
    selectedElements: state.selectedElements.filter(e => e.id !== id)
  })),
  clearSelectedElements: () => set({ selectedElements: [] }),
  
  getSelectionDescription: () => {
    const { selectedElements } = get();
    if (selectedElements.length === 0) return '';
    
    if (selectedElements.length === 1) {
      const el = selectedElements[0];
      return `[Выбранный элемент: ${el.displayName} (${el.type})]`;
    }
    
    const names = selectedElements.map(e => e.displayName).join(', ');
    return `[Выбранные элементы: ${names}]`;
  }
}));
