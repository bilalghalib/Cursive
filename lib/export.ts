/**
 * Export functionality for Cursive
 * Handles JSON and PDF export/import
 */

import type { Stroke, ChatMessage, TextOverlay } from './types';

export interface ExportData {
  version: string;
  timestamp: number;
  drawings: Stroke[];
  chatHistory: ChatMessage[];
  textOverlays: TextOverlay[];
  metadata: {
    totalStrokes: number;
    totalMessages: number;
    totalOverlays: number;
  };
}

/**
 * Export canvas data as JSON
 */
export function exportToJSON(
  drawings: Stroke[],
  chatHistory: ChatMessage[],
  textOverlays: TextOverlay[]
): string {
  const data: ExportData = {
    version: '2.0.0',
    timestamp: Date.now(),
    drawings,
    chatHistory,
    textOverlays,
    metadata: {
      totalStrokes: drawings.length,
      totalMessages: chatHistory.length,
      totalOverlays: textOverlays.length
    }
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Download JSON file
 */
export function downloadJSON(
  drawings: Stroke[],
  chatHistory: ChatMessage[],
  textOverlays: TextOverlay[],
  filename?: string
): void {
  const json = exportToJSON(drawings, chatHistory, textOverlays);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `cursive-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import JSON file
 */
export async function importFromJSON(file: File): Promise<ExportData | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as ExportData;

    // Validate data structure
    if (!data.version || !data.drawings || !Array.isArray(data.drawings)) {
      throw new Error('Invalid JSON format');
    }

    return data;
  } catch (error) {
    console.error('Error importing JSON:', error);
    return null;
  }
}

/**
 * Export canvas as PDF
 * Note: Requires jsPDF library - install with: npm install jspdf
 */
export async function exportToPDF(
  canvasElement: HTMLCanvasElement,
  filename?: string
): Promise<void> {
  try {
    // Dynamically import jsPDF to reduce bundle size
    const { default: jsPDF } = await import('jspdf');

    // Get canvas image data
    const imgData = canvasElement.toDataURL('image/png');

    // Calculate PDF dimensions (A4 size)
    const pdf = new jsPDF({
      orientation: canvasElement.width > canvasElement.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvasElement.width, canvasElement.height]
    });

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 0, 0, canvasElement.width, canvasElement.height);

    // Download PDF
    pdf.save(filename || `cursive-${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      alert('PDF export requires the jsPDF library. Please install it with: npm install jspdf');
    } else {
      alert('Failed to export PDF. Please try again.');
    }
  }
}
