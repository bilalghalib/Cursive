/**
 * Collaboration Service
 *
 * Handles real-time collaboration features using Supabase Realtime:
 * - Active cursor tracking
 * - Live drawing synchronization
 * - Presence awareness (who's online)
 */

import { supabaseClient } from './supabaseClient.js';
import { getCurrentUser } from './authService.js';

// Active collaborators Map: user_id -> { name, email, color, cursor: {x, y} }
const activeCollaborators = new Map();

// Realtime channel for collaboration
let collaborationChannel = null;

// Current notebook/page ID being collaborated on
let currentNotebookId = null;

// User's assigned color for cursor
let myColor = null;

// Cursor colors palette
const cursorColors = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
  '#F8B739', // Orange
  '#52C891', // Green
];

/**
 * Get a random color from the palette
 */
function getRandomColor() {
  return cursorColors[Math.floor(Math.random() * cursorColors.length)];
}

/**
 * Initialize collaboration for a notebook
 * @param {string} notebookId - The notebook/page ID to collaborate on
 */
export async function initCollaboration(notebookId) {
  if (!notebookId) {
    console.warn('No notebook ID provided for collaboration');
    return;
  }

  currentNotebookId = notebookId;
  const user = await getCurrentUser();

  if (!user) {
    console.error('User not authenticated, cannot join collaboration');
    return;
  }

  // Assign a random color to this user
  myColor = getRandomColor();

  // Create or join a Realtime channel for this notebook
  collaborationChannel = supabaseClient.channel(`notebook:${notebookId}`, {
    config: {
      presence: {
        key: user.id,
      },
    },
  });

  // Track presence (who's online)
  collaborationChannel
    .on('presence', { event: 'sync' }, () => {
      const state = collaborationChannel.presenceState();
      updateCollaboratorsList(state);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key, newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key, leftPresences);
      activeCollaborators.delete(key);
      removeCollaboratorCursor(key);
    });

  // Track cursor movements
  collaborationChannel.on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
    updateCollaboratorCursor(payload);
  });

  // Track drawing events
  collaborationChannel.on('broadcast', { event: 'draw' }, ({ payload }) => {
    handleRemoteDrawing(payload);
  });

  // Subscribe to the channel
  collaborationChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Joined collaboration for notebook:', notebookId);

      // Track own presence
      await collaborationChannel.track({
        user_id: user.id,
        email: user.email,
        color: myColor,
        online_at: new Date().toISOString(),
      });
    }
  });
}

/**
 * Leave collaboration (cleanup)
 */
export async function leaveCollaboration() {
  if (collaborationChannel) {
    await collaborationChannel.unsubscribe();
    collaborationChannel = null;
  }

  activeCollaborators.clear();
  clearAllCollaboratorCursors();
  currentNotebookId = null;
  myColor = null;

  console.log('✅ Left collaboration');
}

/**
 * Broadcast cursor position to other users
 * @param {number} x - Canvas X coordinate
 * @param {number} y - Canvas Y coordinate
 */
export function broadcastCursorMove(x, y) {
  if (!collaborationChannel) return;

  collaborationChannel.send({
    type: 'broadcast',
    event: 'cursor-move',
    payload: { x, y, color: myColor },
  });
}

/**
 * Broadcast drawing event to other users
 * @param {object} drawingData - Drawing stroke data
 */
export function broadcastDrawing(drawingData) {
  if (!collaborationChannel) return;

  collaborationChannel.send({
    type: 'broadcast',
    event: 'draw',
    payload: drawingData,
  });
}

/**
 * Update collaborators list from presence state
 */
function updateCollaboratorsList(presenceState) {
  activeCollaborators.clear();

  Object.entries(presenceState).forEach(([userId, presences]) => {
    if (presences.length > 0) {
      const presence = presences[0];
      activeCollaborators.set(userId, {
        user_id: presence.user_id,
        email: presence.email,
        color: presence.color,
        cursor: null,
      });
    }
  });

  // Update UI to show active collaborators count
  updateCollaboratorsUI();
}

/**
 * Update a collaborator's cursor position
 */
function updateCollaboratorCursor(payload) {
  const { x, y, color } = payload;

  // Find the user by color (since broadcast doesn't include user_id)
  let userId = null;
  for (const [id, collab] of activeCollaborators.entries()) {
    if (collab.color === color) {
      userId = id;
      break;
    }
  }

  if (!userId) return;

  // Update cursor position
  const collaborator = activeCollaborators.get(userId);
  if (collaborator) {
    collaborator.cursor = { x, y };
  }

  // Render cursor on canvas
  renderCollaboratorCursor(userId, x, y, color);
}

/**
 * Render a collaborator's cursor on the canvas
 */
function renderCollaboratorCursor(userId, x, y, color) {
  // Check if cursor element already exists
  let cursorElement = document.getElementById(`cursor-${userId}`);

  if (!cursorElement) {
    cursorElement = document.createElement('div');
    cursorElement.id = `cursor-${userId}`;
    cursorElement.className = 'collaborator-cursor';
    cursorElement.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" style="fill: ${color};">
        <path d="M3,3 L10,16 L13,13 L16,10 Z"/>
      </svg>
    `;
    document.body.appendChild(cursorElement);
  }

  // Position the cursor
  cursorElement.style.left = `${x}px`;
  cursorElement.style.top = `${y}px`;
  cursorElement.style.display = 'block';

  // Add label with user email (first part)
  const collaborator = activeCollaborators.get(userId);
  if (collaborator) {
    const email = collaborator.email.split('@')[0];
    cursorElement.setAttribute('data-user', email);
  }
}

/**
 * Remove a collaborator's cursor
 */
function removeCollaboratorCursor(userId) {
  const cursorElement = document.getElementById(`cursor-${userId}`);
  if (cursorElement) {
    cursorElement.remove();
  }
}

/**
 * Clear all collaborator cursors
 */
function clearAllCollaboratorCursors() {
  document.querySelectorAll('.collaborator-cursor').forEach((el) => el.remove());
}

/**
 * Handle remote drawing event
 */
function handleRemoteDrawing(drawingData) {
  // This will be implemented to integrate with canvasManager
  console.log('Remote drawing:', drawingData);

  // Dispatch custom event that canvasManager can listen to
  window.dispatchEvent(
    new CustomEvent('remote-drawing', {
      detail: drawingData,
    })
  );
}

/**
 * Update collaborators UI (show count, avatars, etc.)
 */
function updateCollaboratorsUI() {
  const count = activeCollaborators.size;

  // Try to find a collaborators indicator element
  let indicator = document.getElementById('collaborators-indicator');

  if (!indicator && count > 0) {
    // Create indicator if it doesn't exist
    indicator = document.createElement('div');
    indicator.id = 'collaborators-indicator';
    indicator.className = 'collaborators-indicator';
    document.body.appendChild(indicator);
  }

  if (indicator) {
    if (count === 0) {
      indicator.style.display = 'none';
    } else {
      indicator.style.display = 'flex';
      indicator.innerHTML = `
        <i class="fas fa-users"></i>
        <span>${count} online</span>
      `;
    }
  }
}

/**
 * Get all active collaborators
 */
export function getActiveCollaborators() {
  return Array.from(activeCollaborators.values());
}

console.log('✅ Collaboration Service initialized');
