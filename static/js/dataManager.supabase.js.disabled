/**
 * Data Manager - Supabase Version
 *
 * This replaces the localStorage-based dataManager.js with Supabase database storage.
 * To use: rename this file to dataManager.js (backup the old one first!)
 *
 * Key changes:
 * - All data now stored in Supabase database
 * - Automatic sync across devices
 * - No localStorage limits
 * - Row-level security enforced
 */

import { getConfig } from './config.js';
import getSupabase, { getCurrentUser } from './supabaseClient.js';

// ============================================================================
// NOTEBOOKS (replaces "notebook items")
// ============================================================================

/**
 * Get current notebook ID (stored in localStorage for session persistence)
 * Creates a default notebook if none exists.
 *
 * @returns {Promise<string>} Current notebook ID
 */
async function getCurrentNotebookId() {
  let notebookId = localStorage.getItem('current_notebook_id');

  if (!notebookId) {
    // Create default notebook
    const notebook = await createNotebook('My Notebook', 'Default notebook');
    notebookId = notebook.id;
    localStorage.setItem('current_notebook_id', notebookId);
  }

  return notebookId;
}

/**
 * Set current notebook ID
 *
 * @param {string} notebookId - Notebook ID to set as current
 */
export function setCurrentNotebookId(notebookId) {
  localStorage.setItem('current_notebook_id', notebookId);
}

/**
 * Create a new notebook
 *
 * @param {string} title - Notebook title
 * @param {string} description - Optional description
 * @returns {Promise<Object>} Created notebook
 */
export async function createNotebook(title = 'New Notebook', description = '') {
  const supabase = getSupabase();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('notebooks')
    .insert({
      user_id: user.id,
      title,
      description,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notebook:', error);
    throw new Error('Failed to create notebook');
  }

  console.log('✅ Notebook created:', data.id);
  return data;
}

/**
 * Get all notebooks for current user
 *
 * @returns {Promise<Array>} Array of notebooks
 */
export async function getAllNotebooks() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('notebooks')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching notebooks:', error);
    return [];
  }

  return data || [];
}

/**
 * Update a notebook
 *
 * @param {string} notebookId - Notebook ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated notebook
 */
export async function updateNotebook(notebookId, updates) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('notebooks')
    .update(updates)
    .eq('id', notebookId)
    .select()
    .single();

  if (error) {
    console.error('Error updating notebook:', error);
    throw new Error('Failed to update notebook');
  }

  return data;
}

/**
 * Delete a notebook and all its drawings
 *
 * @param {string} notebookId - Notebook ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteNotebook(notebookId) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('notebooks')
    .delete()
    .eq('id', notebookId);

  if (error) {
    console.error('Error deleting notebook:', error);
    throw new Error('Failed to delete notebook');
  }

  // Clear current notebook if it was deleted
  if (localStorage.getItem('current_notebook_id') === notebookId) {
    localStorage.removeItem('current_notebook_id');
  }

  return true;
}

// ============================================================================
// DRAWINGS (replaces "notebook items")
// ============================================================================

/**
 * Save a drawing/notebook item
 * Maintains backward compatibility with old localStorage-based API
 *
 * @param {Object} item - Drawing item to save
 * @returns {Promise<Object>} Saved drawing
 */
export async function saveNotebookItem(item) {
  const supabase = getSupabase();
  const notebookId = await getCurrentNotebookId();

  const { data, error } = await supabase
    .from('drawings')
    .insert({
      notebook_id: notebookId,
      stroke_data: item.strokes || item.stroke_data,
      transcription: item.transcription,
      ai_response: item.aiResponse || item.ai_response,
      drawing_type: item.type || 'handwriting',
      canvas_state: {
        selectionBox: item.selectionBox,
        id: item.id,
        timestamp: item.timestamp,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving drawing:', error);
    throw new Error('Failed to save drawing');
  }

  console.log('✅ Drawing saved:', data.id);
  return data;
}

/**
 * Update a drawing/notebook item
 *
 * @param {Object} updatedItem - Updated item data
 * @returns {Promise<Object>} Updated drawing
 */
export async function updateNotebookItem(updatedItem) {
  const supabase = getSupabase();

  // Extract drawing ID from canvas_state or use id directly
  const drawingId = updatedItem.drawing_id || updatedItem.id;

  const updates = {
    stroke_data: updatedItem.strokes || updatedItem.stroke_data,
    transcription: updatedItem.transcription,
    ai_response: updatedItem.aiResponse || updatedItem.ai_response,
    drawing_type: updatedItem.type || updatedItem.drawing_type,
    canvas_state: {
      selectionBox: updatedItem.selectionBox,
      id: updatedItem.id,
      timestamp: updatedItem.timestamp || new Date().toISOString(),
    },
  };

  const { data, error } = await supabase
    .from('drawings')
    .update(updates)
    .eq('id', drawingId)
    .select()
    .single();

  if (error) {
    console.error('Error updating drawing:', error);
    throw new Error('Failed to update drawing');
  }

  return data;
}

/**
 * Delete a drawing/notebook item
 *
 * @param {string} itemId - Drawing ID to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deleteNotebookItem(itemId) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('drawings')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Error deleting drawing:', error);
    throw new Error('Failed to delete drawing');
  }

  return true;
}

/**
 * Get all notebook items (drawings) for current notebook
 * Maintains backward compatibility
 *
 * @returns {Promise<Array>} Array of drawings
 */
export async function getAllNotebookItems() {
  const notebookId = await getCurrentNotebookId();
  return await getDrawings(notebookId);
}

/**
 * Get all drawings for a specific notebook
 *
 * @param {string} notebookId - Optional notebook ID (uses current if not provided)
 * @returns {Promise<Array>} Array of drawings
 */
export async function getDrawings(notebookId) {
  const supabase = getSupabase();

  if (!notebookId) {
    notebookId = await getCurrentNotebookId();
  }

  const { data, error } = await supabase
    .from('drawings')
    .select('*')
    .eq('notebook_id', notebookId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching drawings:', error);
    return [];
  }

  // Transform to match old localStorage format for backward compatibility
  return (data || []).map(drawing => ({
    id: drawing.id,
    strokes: drawing.stroke_data,
    transcription: drawing.transcription,
    aiResponse: drawing.ai_response,
    type: drawing.drawing_type,
    selectionBox: drawing.canvas_state?.selectionBox,
    timestamp: drawing.created_at,
    // Keep original fields too
    ...drawing,
  }));
}

/**
 * Save multiple drawings (batch update)
 *
 * @param {Array} drawings - Array of drawings to save
 * @returns {Promise<Array>} Saved drawings
 */
export async function saveDrawings(drawings) {
  const supabase = getSupabase();
  const notebookId = await getCurrentNotebookId();

  // Transform drawings to database format
  const drawingsToInsert = drawings.map(drawing => ({
    notebook_id: notebookId,
    stroke_data: drawing.strokes || drawing.stroke_data,
    transcription: drawing.transcription,
    ai_response: drawing.aiResponse || drawing.ai_response,
    drawing_type: drawing.type || drawing.drawing_type || 'handwriting',
    canvas_state: {
      selectionBox: drawing.selectionBox,
      id: drawing.id,
      timestamp: drawing.timestamp,
    },
  }));

  const { data, error } = await supabase
    .from('drawings')
    .insert(drawingsToInsert)
    .select();

  if (error) {
    console.error('Error batch saving drawings:', error);
    throw new Error('Failed to save drawings');
  }

  return data;
}

/**
 * Batch update notebook items
 *
 * @param {Array} items - Items to update
 * @returns {Promise<void>}
 */
export async function batchUpdateNotebookItems(items) {
  // For now, update one by one (Supabase doesn't have easy bulk update)
  const promises = items.map(item => updateNotebookItem(item));
  await Promise.all(promises);
}

/**
 * Get drawings in a specific area (for selection)
 *
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Width of area
 * @param {number} height - Height of area
 * @returns {Promise<Array>} Drawings in the specified area
 */
export async function getNotebookItemsInArea(x, y, width, height) {
  const items = await getAllNotebookItems();

  return items.filter(item => {
    if (!item.selectionBox) return false;

    return (
      item.selectionBox.x < x + width &&
      item.selectionBox.x + item.selectionBox.width > x &&
      item.selectionBox.y < y + height &&
      item.selectionBox.y + item.selectionBox.height > y
    );
  });
}

/**
 * Clear current notebook (delete all drawings)
 *
 * @returns {Promise<boolean>} Success status
 */
export async function clearNotebook() {
  const supabase = getSupabase();
  const notebookId = await getCurrentNotebookId();

  const { error } = await supabase
    .from('drawings')
    .delete()
    .eq('notebook_id', notebookId);

  if (error) {
    console.error('Error clearing notebook:', error);
    throw new Error('Failed to clear notebook');
  }

  return true;
}

/**
 * Get most recent drawings
 * Alias for getDrawings for backward compatibility
 *
 * @returns {Promise<Array>} Recent drawings
 */
export async function getMostRecentDrawings() {
  return await getDrawings();
}

// ============================================================================
// EXPORT / IMPORT
// ============================================================================

/**
 * Export notebook to JSON file
 *
 * @returns {Promise<void>}
 */
export async function exportNotebook() {
  const notebooks = await getAllNotebooks();
  const currentNotebookId = await getCurrentNotebookId();
  const currentNotebook = notebooks.find(nb => nb.id === currentNotebookId);
  const drawings = await getDrawings(currentNotebookId);

  const exportData = {
    notebook: currentNotebook,
    drawings: drawings,
    exportedAt: new Date().toISOString(),
    version: '2.0-supabase',
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });

  const filename = `cursive-${currentNotebook?.title || 'notebook'}-${Date.now()}.json`;
  saveAs(blob, filename);

  console.log('✅ Notebook exported:', filename);
}

/**
 * Import notebook from JSON file
 *
 * @param {File} file - JSON file to import
 * @param {Object} config - App config (backward compatibility)
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Object>} Imported data
 */
export async function importNotebook(file, config, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    const timeoutId = setTimeout(() => {
      reader.abort();
      reject(new Error('Import timed out'));
    }, timeout);

    reader.onload = async function (e) {
      clearTimeout(timeoutId);

      try {
        const importedData = JSON.parse(e.target.result);

        // Handle old localStorage format
        if (importedData.items && Array.isArray(importedData.items)) {
          // Old format: { items: [], drawings: [] }
          const notebook = await createNotebook('Imported Notebook');
          await saveDrawings(importedData.items);
          resolve({ notebook, drawings: importedData.items });
        }
        // Handle new Supabase format
        else if (importedData.notebook && importedData.drawings) {
          // New format: { notebook: {}, drawings: [] }
          const notebook = await createNotebook(
            importedData.notebook.title + ' (Imported)',
            importedData.notebook.description
          );

          setCurrentNotebookId(notebook.id);
          await saveDrawings(importedData.drawings);

          resolve({ notebook, drawings: importedData.drawings });
        } else {
          reject(new Error('Invalid import file format'));
        }
      } catch (error) {
        console.error('Error importing notebook:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      clearTimeout(timeoutId);
      reject(error);
    };

    reader.readAsText(file);
  });
}

/**
 * Save notebook to web (generate shareable link)
 *
 * @returns {Promise<string>} Shareable URL
 */
export async function saveToWeb() {
  const supabase = getSupabase();
  const notebookId = await getCurrentNotebookId();

  // Generate a unique share ID
  const shareId = Math.random().toString(36).substring(2, 10);

  // Update notebook to enable sharing
  const { data, error } = await supabase
    .from('notebooks')
    .update({
      is_shared: true,
      share_id: shareId,
    })
    .eq('id', notebookId)
    .select()
    .single();

  if (error) {
    console.error('Error sharing notebook:', error);
    throw new Error('Failed to create shareable link');
  }

  // Return shareable URL
  const shareUrl = `${window.location.origin}/shared/${shareId}`;
  console.log('✅ Notebook shared:', shareUrl);

  return shareUrl;
}

// ============================================================================
// INITIAL DATA
// ============================================================================

/**
 * Get initial drawing data (for demo/tutorial)
 *
 * @returns {Promise<Array>} Initial drawings
 */
export async function getInitialDrawingData() {
  try {
    const response = await fetch('./js/initialDrawing.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const data = JSON.parse(text);

    if (!Array.isArray(data)) {
      throw new Error('Loaded data is not an array');
    }

    return data;
  } catch (error) {
    console.error('Error loading initial drawing data:', error);
    return [];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get max notebook items from config
 *
 * @returns {Promise<number>} Max items
 */
async function getMaxNotebookItems() {
  const config = await getConfig();
  return config.app.max_notebook_items || 1000;
}

/**
 * Update drawings (legacy function)
 *
 * @param {Array} newDrawings - New drawings to save
 * @returns {Promise<void>}
 */
export async function updateDrawings(newDrawings) {
  await saveDrawings(newDrawings);
  // Note: redrawCanvas() should be called by the app after this
}
