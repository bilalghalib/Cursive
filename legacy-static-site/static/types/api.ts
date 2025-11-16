/**
 * Claude API Type Definitions
 */

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeMessageContent[];
}

export interface ClaudeMessageContent {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  stream?: boolean;
}

export interface ClaudeResponseContent {
  type: 'text';
  text: string;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ClaudeResponseContent[];
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface TranscriptionResponse {
  transcription: string;
  tags: string[];
  fullResponse: string;
}

export interface StreamChunk {
  type: 'content_block_delta' | 'content_block_start' | 'message_start' | 'message_delta' | 'message_stop';
  content?: ClaudeResponseContent[];
  delta?: {
    type: 'text_delta';
    text: string;
  };
}

export type OnProgressCallback = (text: string) => void;
