/**
 * Sharing Service
 *
 * Handles page/notebook sharing with Supabase:
 * - Create shareable links
 * - Manage share permissions (private, view-only, editable)
 * - Load shared pages
 */

import { supabaseClient } from './supabaseClient.js';
import { getCurrentUser } from './authService.js';

/**
 * Generate a unique share ID
 */
function generateShareId() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * Create or get a default notebook for the user
 * @returns {Promise<string>} - Notebook ID
 */
export async function getOrCreateDefaultNotebook() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Check if user has a notebook
  const { data: notebooks, error: fetchError } = await supabaseClient
    .from('notebooks')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error('Error fetching notebooks:', fetchError);
    throw fetchError;
  }

  // If user has notebooks, return the most recent one
  if (notebooks && notebooks.length > 0) {
    return notebooks[0].id;
  }

  // Otherwise, create a new notebook
  const { data: newNotebook, error: createError } = await supabaseClient
    .from('notebooks')
    .insert({
      user_id: user.id,
      title: 'My Notebook',
      description: 'Default notebook',
      is_shared: false,
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating notebook:', createError);
    throw createError;
  }

  console.log('✅ Created default notebook:', newNotebook.id);
  return newNotebook.id;
}

/**
 * Save drawings to Supabase
 * @param {string} notebookId - Notebook ID
 * @param {object[]} drawings - Array of drawing objects
 * @returns {Promise<void>}
 */
export async function saveDrawingsToSupabase(notebookId, drawings) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Delete existing drawings for this notebook
  const { error: deleteError } = await supabaseClient
    .from('drawings')
    .delete()
    .eq('notebook_id', notebookId);

  if (deleteError) {
    console.error('Error deleting old drawings:', deleteError);
  }

  // Insert new drawings
  const drawingsToInsert = drawings.map((drawing) => ({
    notebook_id: notebookId,
    stroke_data: drawing,
    drawing_type: 'handwriting',
  }));

  const { error: insertError } = await supabaseClient
    .from('drawings')
    .insert(drawingsToInsert);

  if (insertError) {
    console.error('Error saving drawings:', insertError);
    throw insertError;
  }

  // Update notebook's updated_at timestamp
  const { error: updateError } = await supabaseClient
    .from('notebooks')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', notebookId);

  if (updateError) {
    console.error('Error updating notebook timestamp:', updateError);
  }

  console.log('✅ Saved drawings to Supabase');
}

/**
 * Load drawings from Supabase
 * @param {string} notebookId - Notebook ID
 * @returns {Promise<object[]>} - Array of drawings
 */
export async function loadDrawingsFromSupabase(notebookId) {
  const { data, error } = await supabaseClient
    .from('drawings')
    .select('stroke_data')
    .eq('notebook_id', notebookId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading drawings:', error);
    throw error;
  }

  // Extract stroke_data from each drawing
  const drawings = data.map((d) => d.stroke_data);

  console.log(`✅ Loaded ${drawings.length} drawings from Supabase`);
  return drawings;
}

/**
 * Create a shareable link for a notebook
 * @param {string} notebookId - Notebook ID
 * @param {boolean} isEditable - Whether the link allows editing (default: false, view-only)
 * @returns {Promise<string>} - Shareable URL
 */
export async function createShareLink(notebookId, isEditable = false) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Check if notebook belongs to user
  const { data: notebook, error: fetchError } = await supabaseClient
    .from('notebooks')
    .select('*')
    .eq('id', notebookId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !notebook) {
    throw new Error('Notebook not found or access denied');
  }

  // Generate share ID if it doesn't exist
  let shareId = notebook.share_id;

  if (!shareId) {
    shareId = generateShareId();

    const { error: updateError } = await supabaseClient
      .from('notebooks')
      .update({
        share_id: shareId,
        is_shared: true,
      })
      .eq('id', notebookId);

    if (updateError) {
      console.error('Error updating share settings:', updateError);
      throw updateError;
    }
  } else {
    // Just enable sharing if it was disabled
    const { error: updateError } = await supabaseClient
      .from('notebooks')
      .update({ is_shared: true })
      .eq('id', notebookId);

    if (updateError) {
      console.error('Error enabling sharing:', updateError);
      throw updateError;
    }
  }

  // Build shareable URL
  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/share/${shareId}`;

  console.log('✅ Created share link:', shareUrl);
  return shareUrl;
}

/**
 * Revoke sharing for a notebook
 * @param {string} notebookId - Notebook ID
 */
export async function revokeShareLink(notebookId) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { error } = await supabaseClient
    .from('notebooks')
    .update({ is_shared: false })
    .eq('id', notebookId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error revoking share link:', error);
    throw error;
  }

  console.log('✅ Revoked share link for notebook:', notebookId);
}

/**
 * Load a shared notebook by share ID (public access)
 * @param {string} shareId - Public share ID
 * @returns {Promise<{notebook: object, drawings: object[]}>}
 */
export async function loadSharedNotebook(shareId) {
  // Fetch notebook by share_id
  const { data: notebook, error: notebookError } = await supabaseClient
    .from('notebooks')
    .select('*')
    .eq('share_id', shareId)
    .eq('is_shared', true)
    .single();

  if (notebookError || !notebook) {
    throw new Error('Shared notebook not found or access denied');
  }

  // Fetch drawings for this notebook
  const { data: drawings, error: drawingsError } = await supabaseClient
    .from('drawings')
    .select('stroke_data, created_at')
    .eq('notebook_id', notebook.id)
    .order('created_at', { ascending: true });

  if (drawingsError) {
    console.error('Error loading drawings:', drawingsError);
    throw drawingsError;
  }

  console.log(`✅ Loaded shared notebook: ${notebook.title}`);

  return {
    notebook,
    drawings: drawings.map((d) => d.stroke_data),
  };
}

/**
 * Check if current user owns a notebook
 * @param {string} notebookId - Notebook ID
 * @returns {Promise<boolean>}
 */
export async function isNotebookOwner(notebookId) {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabaseClient
    .from('notebooks')
    .select('user_id')
    .eq('id', notebookId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.user_id === user.id;
}

/**
 * List all notebooks for current user
 * @returns {Promise<object[]>}
 */
export async function listUserNotebooks() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { data, error } = await supabaseClient
    .from('notebooks')
    .select('id, title, description, is_shared, share_id, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error listing notebooks:', error);
    throw error;
  }

  return data;
}

console.log('✅ Sharing Service initialized');
