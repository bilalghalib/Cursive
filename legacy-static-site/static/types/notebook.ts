/**
 * Notebook and Data Storage Type Definitions
 */

import type { SelectionBox } from './canvas';

export interface NotebookItem {
  id: string;
  type: NotebookItemType;
  content: string;
  tags: string[];
  timestamp: number;
  selectionBox: SelectionBox;
  imageData?: string;
  aiResponse?: string;
}

export type NotebookItemType = 'transcription' | 'response' | 'note';

export interface Notebook {
  id: string;
  title: string;
  items: NotebookItem[];
  created: Date;
  modified: Date;
}

export interface ExportOptions {
  format: 'pdf' | 'json' | 'web';
  includeImages?: boolean;
  includeResponses?: boolean;
}

export interface ExportData {
  version: string;
  exported: Date;
  notebooks: Notebook[];
  metadata?: Record<string, any>;
}

export interface ShareablePageData {
  id: string;
  title: string;
  content: NotebookItem[];
  created: Date;
  imageData?: string;
}
