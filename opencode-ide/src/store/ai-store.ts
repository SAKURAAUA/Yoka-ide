import type { StateCreator } from 'zustand';
import type { AIBackendStatus, AIBackendType, AIConnectionStatus } from '@/types/ai';

export interface AIStoreState {
  activeBackend: AIBackendType;
  connectionStatus: AIConnectionStatus;
  availableBackends: AIBackendType[];
  backendStatus: AIBackendStatus | null;
  setActiveBackend: (backend: AIBackendType) => void;
  setConnectionStatus: (status: AIConnectionStatus) => void;
  setAvailableBackends: (backends: AIBackendType[]) => void;
  setBackendStatus: (status: AIBackendStatus | null) => void;
  refreshBackendStatus: () => Promise<void>;
}

export const createAIStoreSlice: StateCreator<AIStoreState, [], [], AIStoreState> = (set, get) => ({
  activeBackend: 'copilot',
  connectionStatus: 'disconnected',
  availableBackends: ['copilot'],
  backendStatus: null,
  setActiveBackend: (backend) => set({ activeBackend: backend }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setAvailableBackends: (backends) => set({ availableBackends: backends }),
  setBackendStatus: (status) => set({ backendStatus: status }),
  refreshBackendStatus: async () => {
    if (typeof window === 'undefined' || !window.electronAPI?.ai) {
      return;
    }

    try {
      const status = await window.electronAPI.ai.status();
      set({
        backendStatus: status,
        connectionStatus: status.status,
        activeBackend: status.backend,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch AI status';
      set({
        backendStatus: {
          backend: 'copilot',
          status: 'error',
          detail: message,
          lastUpdated: Date.now(),
        },
        connectionStatus: 'error',
      });
    }
  },
});
