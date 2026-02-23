import { StateCreator } from 'zustand';
import type { EditorTab, EditorType, SelectionRange } from '@/types/editor';

export interface EditorStoreState {
  // === Editor Tabs ===
  editorTabs: EditorTab[];
  activeEditorTabId: string | null;
  
  // === Selection Ranges (for drag-drop) ===
  selectionRanges: Map<string, SelectionRange>;
  activeSelectionRangeId: string | null;
  
  // === Editor Actions ===
  addEditorTab: (tab: Omit<EditorTab, 'id'>) => string;
  removeEditorTab: (tabId: string) => void;
  setActiveEditorTab: (tabId: string | null) => void;
  updateEditorTab: (tabId: string, updates: Partial<EditorTab>) => void;
  markTabDirty: (tabId: string, isDirty: boolean) => void;
  
  // === Selection Range Actions ===
  setSelectionRange: (tabId: string, range: SelectionRange) => void;
  clearSelectionRange: (tabId: string) => void;
  getSelectionRange: (tabId: string) => SelectionRange | undefined;
  
  // === Utility ===
  getActiveEditorTab: () => EditorTab | null;
  getEditorTabsByType: (type: EditorType) => EditorTab[];
}

export type EditorStore = EditorStoreState;

export const createEditorStoreSlice: StateCreator<EditorStore, [], [], EditorStore> = (set, get) => ({
  // === Initial State ===
  editorTabs: [],
  activeEditorTabId: null,
  selectionRanges: new Map(),
  activeSelectionRangeId: null,
  
  // === Tab Actions ===
  addEditorTab: (tab) => {
    const id = `editor-tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTab: EditorTab = {
      ...tab,
      id,
      canClose: tab.canClose ?? true,
    };
    
    set((state) => ({
      editorTabs: [...state.editorTabs, newTab],
      activeEditorTabId: id,
    }));
    
    return id;
  },
  
  removeEditorTab: (tabId) => {
    set((state) => {
      const newTabs = state.editorTabs.filter((t) => t.id !== tabId);
      const newActiveId = state.activeEditorTabId === tabId 
        ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
        : state.activeEditorTabId;
      
      // Also clean up selection range
      const newSelectionRanges = new Map(state.selectionRanges);
      newSelectionRanges.delete(tabId);
      
      return {
        editorTabs: newTabs,
        activeEditorTabId: newActiveId,
        selectionRanges: newSelectionRanges,
      };
    });
  },
  
  setActiveEditorTab: (tabId) => {
    set({ activeEditorTabId: tabId });
  },
  
  updateEditorTab: (tabId, updates) => {
    set((state) => ({
      editorTabs: state.editorTabs.map((t) =>
        t.id === tabId ? { ...t, ...updates } : t
      ),
    }));
  },
  
  markTabDirty: (tabId, isDirty) => {
    set((state) => ({
      editorTabs: state.editorTabs.map((t) =>
        t.id === tabId ? { ...t, isDirty } : t
      ),
    }));
  },
  
  // === Selection Range Actions ===
  setSelectionRange: (tabId, range) => {
    set((state) => {
      const newSelectionRanges = new Map(state.selectionRanges);
      newSelectionRanges.set(tabId, range);
      return {
        selectionRanges: newSelectionRanges,
        activeSelectionRangeId: tabId,
      };
    });
  },
  
  clearSelectionRange: (tabId) => {
    set((state) => {
      const newSelectionRanges = new Map(state.selectionRanges);
      newSelectionRanges.delete(tabId);
      return {
        selectionRanges: newSelectionRanges,
        activeSelectionRangeId: state.activeSelectionRangeId === tabId ? null : state.activeSelectionRangeId,
      };
    });
  },
  
  getSelectionRange: (tabId) => {
    return get().selectionRanges.get(tabId);
  },
  
  // === Utilities ===
  getActiveEditorTab: () => {
    const { editorTabs, activeEditorTabId } = get();
    return editorTabs.find((t) => t.id === activeEditorTabId) || null;
  },
  
  getEditorTabsByType: (type) => {
    return get().editorTabs.filter((t) => t.type === type);
  },
});
