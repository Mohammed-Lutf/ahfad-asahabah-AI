export type ThinkingMode = "fast" | "balanced" | "deep";

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64 without prefix
  previewUrl?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  sources?: GroundingSource[];
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
  systemInstruction?: string;
  pinned?: boolean;
}

export interface PersonaPreset {
  id: string;
  name: string;
  description: string;
  instruction: string;
}
