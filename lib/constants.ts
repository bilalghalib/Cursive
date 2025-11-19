// Application-wide constants

export const TRAINING = {
  /** Number of samples to collect per character */
  SAMPLES_PER_CHARACTER: 5,

  /** Number of variations to collect per item (for diversity) */
  VARIATIONS_PER_ITEM: 3,

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

  /** Training character sets */
  ALPHABET_LOWERCASE: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  ALPHABET_UPPERCASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  NUMBERS: '0123456789'.split(''),

  /** Common two-letter ligatures for cursive training */
  LIGATURES: [
    'tt', 'ff', 'th', 'sh', 'ch', 'wh', 'oo', 'll', 'ss', 'ee',
    'qu', 'ck', 'ng', 'st', 'nt', 'nd', 'ct', 'ph', 'rr', 'pp'
  ],

  /** Common words for natural handwriting flow */
  COMMON_WORDS: [
    'and', 'the', 'is', 'of', 'to', 'in', 'it', 'for', 'you', 'that',
    'with', 'from', 'have', 'this', 'but'
  ],

  /** Emotional states for Living Fonts training */
  EMOTIONS: ['neutral', 'excited', 'thoughtful', 'calm', 'urgent'] as const,

  /** Environment/music suggestions for each emotional state */
  EMOTION_PROMPTS: {
    neutral: {
      title: 'Neutral Baseline',
      prompt: 'Write naturally and comfortably',
      music: 'Optional: Light background music',
      icon: '📝',
      color: '#64748b' // slate-500
    },
    excited: {
      title: 'Excited State',
      prompt: 'Feel energized! Stand up, smile, get pumped!',
      music: '🎵 Suggestion: Play upbeat music (pop, electronic, dance)',
      icon: '🎉',
      color: '#f97316' // orange-500
    },
    thoughtful: {
      title: 'Thoughtful State',
      prompt: 'Think deeply. Contemplate a complex problem.',
      music: '🎼 Suggestion: Play lo-fi, ambient, or classical music',
      icon: '💭',
      color: '#8b5cf6' // purple-500
    },
    calm: {
      title: 'Calm State',
      prompt: 'Deep breaths. Feel peaceful and relaxed.',
      music: '😌 Suggestion: Play meditation or nature sounds',
      icon: '😌',
      color: '#0ea5e9' // sky-500
    },
    urgent: {
      title: 'Urgent State',
      prompt: 'Feel rushed! Set a 30-second timer, imagine being late!',
      music: '⚡ Suggestion: Set timer on your device, feel the rush!',
      icon: '⚡',
      color: '#ef4444' // red-500
    }
  },

  /** Emotional sentences for realistic training */
  EMOTIONAL_SENTENCES: {
    excited: [
      "This is amazing! I love this project!",
      "Wow! I can't believe how well this works!",
      "Yes! Finally got it working!",
      "This is going to be incredible!",
      "I'm so pumped about this idea!"
    ],
    thoughtful: [
      "Let me think about this carefully...",
      "There are many factors to consider here.",
      "I wonder if there's a better approach.",
      "This requires deep consideration.",
      "What if we looked at it this way?"
    ],
    calm: [
      "Everything is peaceful and clear.",
      "I feel relaxed and centered.",
      "There's no rush, take your time.",
      "Breathe deeply and stay present.",
      "This moment is all that matters."
    ],
    urgent: [
      "Quick! We need to finish this now!",
      "Hurry! The deadline is approaching!",
      "Fast! Write this down before I forget!",
      "Now! Don't waste any time!",
      "Urgent: This needs immediate attention!"
    ]
  },
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
