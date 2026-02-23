import {
  AIBackend,
  AIBackendConfig,
  AIBackendFactory,
  AIBackendStatus,
  AIBackendType,
  AIImage,
  AIImageRef,
  AISendRequest,
  AIResponse,
  AIStreamChunk,
} from './types';

export class BackendManager {
  private registry = new Map<AIBackendType, AIBackendFactory>();
  private activeBackend: AIBackend | null = null;
  private activeType: AIBackendType | null = null;

  registerBackend(type: AIBackendType, factory: AIBackendFactory): void {
    this.registry.set(type, factory);
  }

  listBackends(): AIBackendType[] {
    return Array.from(this.registry.keys());
  }

  async setActiveBackend(type: AIBackendType, config?: AIBackendConfig): Promise<AIBackend> {
    if (!this.registry.has(type)) {
      throw new Error(`Backend not registered: ${type}`);
    }

    if (this.activeBackend && this.activeType === type) {
      return this.activeBackend;
    }

    if (this.activeBackend?.dispose) {
      await this.activeBackend.dispose();
    }

    const backend = this.registry.get(type)!(config);
    this.activeBackend = backend;
    this.activeType = type;

    if (backend.initialize) {
      await backend.initialize(config);
    }

    return backend;
  }

  getActiveBackend(): AIBackend {
    if (!this.activeBackend) {
      throw new Error('No active backend selected');
    }

    return this.activeBackend;
  }

  async sendMessage(request: AISendRequest): Promise<AIResponse | AsyncIterable<AIStreamChunk>> {
    const backend = this.getActiveBackend();
    return backend.sendMessage(request);
  }

  async uploadImage(image: AIImage): Promise<AIImageRef> {
    const backend = this.getActiveBackend();

    if (!backend.uploadImage) {
      throw new Error(`Backend ${backend.type} does not support image upload`);
    }

    return backend.uploadImage(image);
  }

  async getStatus(): Promise<AIBackendStatus> {
    if (!this.activeBackend) {
      return {
        backend: this.activeType ?? 'copilot',
        status: 'disconnected',
        detail: 'No active backend selected',
        lastUpdated: Date.now(),
      };
    }

    return this.activeBackend.getStatus();
  }
}
