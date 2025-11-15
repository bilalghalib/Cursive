/**
 * Notebook Data Manager - Supabase integration for notebooks and drawings
 */

import { supabase } from './supabase';

export interface Drawing {
  id?: string;
  notebook_id?: string;
  stroke_data: any[];
  created_at?: string;
  updated_at?: string;
}

export interface Notebook {
  id?: string;
  user_id?: string;
  title: string;
  description?: string;
  is_public: boolean;
  share_token?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotebookItem {
  id: string;
  type: 'transcription' | 'chat';
  content: string;
  selectionBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  tags?: string[];
  timestamp: string;
}

/**
 * Get or create the default notebook for the current user
 */
export async function getOrCreateDefaultNotebook(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Check if user has a default notebook
  const { data: notebooks, error: fetchError } = await supabase
    .from('notebooks')
    .select('id')
    .eq('user_id', user.id)
    .eq('title', 'Default Notebook')
    .limit(1);

  if (fetchError) {
    throw new Error(`Error fetching notebooks: ${fetchError.message}`);
  }

  if (notebooks && notebooks.length > 0) {
    return notebooks[0].id;
  }

  // Create default notebook
  const { data: newNotebook, error: createError } = await supabase
    .from('notebooks')
    .insert([
      {
        user_id: user.id,
        title: 'Default Notebook',
        description: 'Your first notebook',
        is_public: false
      }
    ])
    .select()
    .single();

  if (createError) {
    throw new Error(`Error creating notebook: ${createError.message}`);
  }

  return newNotebook.id;
}

/**
 * Get all notebooks for the current user
 */
export async function getAllNotebooks(): Promise<Notebook[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return []; // Return empty array for guests
  }

  const { data, error } = await supabase
    .from('notebooks')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Error fetching notebooks: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new notebook
 */
export async function createNotebook(notebook: Partial<Notebook>): Promise<Notebook> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { data, error } = await supabase
    .from('notebooks')
    .insert([
      {
        user_id: user.id,
        ...notebook
      }
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating notebook: ${error.message}`);
  }

  return data;
}

/**
 * Update a notebook
 */
export async function updateNotebook(id: string, updates: Partial<Notebook>): Promise<Notebook> {
  const { data, error } = await supabase
    .from('notebooks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating notebook: ${error.message}`);
  }

  return data;
}

/**
 * Delete a notebook and all its drawings
 */
export async function deleteNotebook(id: string): Promise<void> {
  // Delete all drawings first (CASCADE should handle this, but being explicit)
  const { error: drawingsError } = await supabase
    .from('drawings')
    .delete()
    .eq('notebook_id', id);

  if (drawingsError) {
    console.error('Error deleting drawings:', drawingsError);
  }

  // Delete the notebook
  const { error } = await supabase
    .from('notebooks')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Error deleting notebook: ${error.message}`);
  }
}

/**
 * Get drawings for a specific notebook
 */
export async function getDrawings(notebookId: string): Promise<Drawing[]> {
  const { data, error } = await supabase
    .from('drawings')
    .select('*')
    .eq('notebook_id', notebookId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Error fetching drawings: ${error.message}`);
  }

  return data || [];
}

/**
 * Save drawings to a notebook
 */
export async function saveDrawings(notebookId: string, drawings: any[]): Promise<void> {
  // Clear existing drawings
  const { error: deleteError } = await supabase
    .from('drawings')
    .delete()
    .eq('notebook_id', notebookId);

  if (deleteError) {
    throw new Error(`Error clearing drawings: ${deleteError.message}`);
  }

  // Insert new drawings
  if (drawings.length > 0) {
    const { error: insertError } = await supabase
      .from('drawings')
      .insert(
        drawings.map(drawing => ({
          notebook_id: notebookId,
          stroke_data: drawing
        }))
      );

    if (insertError) {
      throw new Error(`Error saving drawings: ${insertError.message}`);
    }
  }
}

/**
 * Create a shareable link for a notebook
 */
export async function createShareLink(notebookId: string): Promise<string> {
  // Generate a random share token
  const shareToken = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Update the notebook with the share token and make it public
  await updateNotebook(notebookId, {
    is_public: true,
    share_token: shareToken
  });

  // Return the shareable URL
  const baseUrl = window.location.origin;
  return `${baseUrl}/share/${shareToken}`;
}

/**
 * Get a notebook by share token
 */
export async function getNotebookByShareToken(shareToken: string): Promise<Notebook | null> {
  const { data, error } = await supabase
    .from('notebooks')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .single();

  if (error) {
    console.error('Error fetching shared notebook:', error);
    return null;
  }

  return data;
}

/**
 * Export notebook as JSON
 */
export async function exportNotebookAsJSON(notebookId: string): Promise<Blob> {
  const notebook = await supabase
    .from('notebooks')
    .select('*')
    .eq('id', notebookId)
    .single();

  const drawings = await getDrawings(notebookId);

  const exportData = {
    notebook: notebook.data,
    drawings: drawings
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  return new Blob([dataStr], { type: "application/json" });
}

/**
 * Import notebook from JSON
 */
export async function importNotebookFromJSON(file: File): Promise<Notebook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);

        // Create a new notebook
        const newNotebook = await createNotebook({
          title: importedData.notebook?.title || 'Imported Notebook',
          description: importedData.notebook?.description || '',
          is_public: false
        });

        // Save drawings
        if (importedData.drawings && Array.isArray(importedData.drawings)) {
          await saveDrawings(newNotebook.id!, importedData.drawings.map((d: any) => d.stroke_data));
        }

        resolve(newNotebook);
      } catch (error) {
        console.error('Error importing notebook:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsText(file);
  });
}

/**
 * Search public notebooks
 */
export async function searchPublicNotebooks(query?: string): Promise<Notebook[]> {
  let queryBuilder = supabase
    .from('notebooks')
    .select('*')
    .eq('is_public', true);

  if (query) {
    queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }

  const { data, error } = await queryBuilder
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Error searching notebooks: ${error.message}`);
  }

  return data || [];
}
