export type AIBackendType = 'copilot' | 'opencode';

export type AIConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface AIBackendStatus {
  backend: AIBackendType;
  status: AIConnectionStatus;
  detail?: string;
  lastUpdated: number;
}

export interface AIModelInfo {
  id: string;
  label: string;
  rateLabel: string;
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
  role: 'user' | 'assistant' | 'system';
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

export type AIAuthState = 'authenticated' | 'unauthenticated' | 'pending' | 'error';

export interface AIAuthUser {
  id?: string;
  login?: string;
  name?: string;
}

export interface AIAuthStatus {
  state: AIAuthState;
  detail?: string;
  lastUpdated: number;
  user?: AIAuthUser;
  credentialSource?: 'store' | 'env' | 'logged-in-user' | 'none';
}

export interface AIAuthStartRequest {
  token?: string;
  user?: AIAuthUser;
  expiresAt?: number;
  refreshToken?: string;
}
