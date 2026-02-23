export type AIBackendType = 'copilot' | 'opencode';

export type AIConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface AIBackendStatus {
  backend: AIBackendType;
  status: AIConnectionStatus;
  detail?: string;
  lastUpdated: number;
}

export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AIImage {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export interface AIImageRef {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl?: string;
  url?: string;
}

export interface AIMessage {
  role: AIMessageRole;
  content: string;
  images?: AIImageRef[];
}

export interface AISendRequest {
  messages: AIMessage[];
  temperature?: number;
  model?: string;
  stream?: boolean;
}

export interface AIResponse {
  message: AIMessage;
  raw?: unknown;
}

export type AIStreamChunk =
  | { type: 'delta'; content: string }
  | { type: 'done'; response?: AIResponse }
  | { type: 'error'; error: string };

export interface AIBackendConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  allowVision?: boolean;
  metadata?: Record<string, string>;
}

export interface AIBackend {
  type: AIBackendType;
  initialize?: (config?: AIBackendConfig) => Promise<void>;
  sendMessage: (request: AISendRequest) => Promise<AIResponse | AsyncIterable<AIStreamChunk>>;
  uploadImage?: (image: AIImage) => Promise<AIImageRef>;
  getStatus: () => Promise<AIBackendStatus>;
  dispose?: () => Promise<void>;
}

export type AIBackendFactory = (config?: AIBackendConfig) => AIBackend;
