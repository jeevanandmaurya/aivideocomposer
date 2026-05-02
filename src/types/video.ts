export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'script';
  url: string; // Object URL or base64 data
  peaks?: number[]; // Pre-computed audio peaks for waveform
  createdAt: number;
}

export interface Scene {
  id: string;
  text: string;
  duration: number; // in seconds
  startTime: number;
  zIndex?: number; // 0 is bottom layer
  type?: 'text' | 'image' | 'video' | 'audio' | 'html';
  assetId?: string;
  html?: string;
  background?: string;
  style?: any;
}

export interface VideoProject {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  scenes: Scene[];
  thumbnail?: string;
  aspectRatio?: '16:9' | '9:16';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  thinking?: string;
}
