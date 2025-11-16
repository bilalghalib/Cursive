// Application-wide constants

export const TRAINING = {
  /** Number of samples to collect per character */
  SAMPLES_PER_CHARACTER: 5,

  /** Delay before auto-advancing to next character (ms) */
  AUTO_ADVANCE_DELAY_MS: 100,

  /** Typography guide opacity (0-1) */
  GUIDE_OPACITY: 0.3,

  /** Typography guide color */
  GUIDE_COLOR: '#3b82f6',

  /** Default baseline Y position (px from top) */
  DEFAULT_BASELINE: 300,

  /** X-height for lowercase letters (px) */
  DEFAULT_X_HEIGHT: 50,

  /** Cap height for uppercase letters (px) */
  DEFAULT_CAP_HEIGHT: 80,

  /** Ascender height (px above baseline) */
  DEFAULT_ASCENDER: 100,

  /** Descender depth (px below baseline) */
  DEFAULT_DESCENDER: 70,
} as const;

export const CANVAS = {
  /** Default zoom scale */
  DEFAULT_SCALE: 1,

  /** Minimum allowed zoom level */
  MIN_SCALE: 0.1,

  /** Maximum allowed zoom level */
  MAX_SCALE: 5,

  /** Zoom factor per scroll/pinch */
  ZOOM_FACTOR: 1.1,

  /** Default stroke width (px) */
  STROKE_WIDTH: 2,

  /** Minimum stroke width (px) */
  MIN_STROKE_WIDTH: 0.5,

  /** Maximum stroke width (px) */
  MAX_STROKE_WIDTH: 10,

  /** Default stroke color */
  DEFAULT_COLOR: '#000000',

  /** Selection rectangle color */
  SELECTION_COLOR: '#2563eb',

  /** Selection rectangle opacity */
  SELECTION_OPACITY: 0.1,
} as const;

export const UI = {
  /** Toast notification duration (ms) */
  TOAST_DURATION: 3000,

  /** Debounce delay for pan/zoom (ms) */
  PAN_DEBOUNCE_MS: 16, // ~60fps

  /** Maximum undo/redo stack size */
  MAX_HISTORY_SIZE: 50,
} as const;

export const API = {
  /** Maximum retries for failed AI requests */
  MAX_RETRIES: 3,

  /** Timeout for AI requests (ms) */
  REQUEST_TIMEOUT_MS: 30000,

  /** Default AI model */
  DEFAULT_MODEL: 'claude-3-5-sonnet-20241022',
} as const;

export const STORAGE_KEYS = {
  /** LocalStorage key for training data */
  TRAINING_DATA: 'cursive-training-data',

  /** LocalStorage key for user preferences */
  USER_PREFERENCES: 'cursive-preferences',

  /** LocalStorage key for draft notebooks */
  DRAFT_NOTEBOOK: 'cursive-draft',
} as const;
