/**
 * Handwriting Simulation Library
 * Generates realistic SVG handwriting and renders on canvas
 */

// Character path templates for different letter types
const letterTemplates = {
  ascender: [
    'M 0 10 q 2 -15 4 -10 q 2 10 4 10', // like 'l', 'h', 'k'
    'M 0 10 q 3 -12 5 -8 q 1 8 3 8',
  ],
  descender: [
    'M 0 10 q 2 0 3 0 q 1 15 5 10', // like 'g', 'y', 'j'
    'M 0 10 q 1 0 2 5 q 1 10 6 5',
  ],
  middle: [
    'M 0 10 q 2 -5 4 0 q 2 5 4 0', // like 'a', 'e', 'o'
    'M 0 10 q 3 -3 5 0 q 2 3 3 0',
  ],
  narrow: [
    'M 0 10 q 1 -2 2 0 q 1 2 2 0', // like 'i', 'c'
    'M 0 10 q 1 -3 1.5 0 q 0.5 3 1.5 0'
  ],
  wide: [
    'M 0 10 q 4 -5 8 0 q 4 5 8 0', // like 'w', 'm'
    'M 0 10 q 4 -3 7 0 q 3 3 7 0'
  ],
  connector: [
    'M 0 10 C 2 10, 3 10, 5 10',
    'M 0 10 C 1.5 9, 3.5 11, 5 10'
  ]
};

type LetterType = 'ascender' | 'descender' | 'middle' | 'narrow' | 'wide' | 'connector';

// Map characters to their types
function getLetterType(char: string): LetterType {
  const lowerChar = char.toLowerCase();

  if ('bdfhklt'.includes(lowerChar)) return 'ascender';
  if ('gjpqy'.includes(lowerChar)) return 'descender';
  if ('aeiounrsxz'.includes(lowerChar)) return 'middle';
  if ('c'.includes(lowerChar)) return 'narrow';
  if ('mw'.includes(lowerChar)) return 'wide';

  return 'middle';
}

// Get random variation within a range
function getVariation(base: number, percent: number): number {
  const variation = base * percent;
  return base + (Math.random() * variation * 2) - variation;
}

export interface HandwritingOptions {
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  color?: string;
  slant?: number;
  connectLetters?: boolean;
  jitter?: number;
  thickness?: number;
  thicknessVariation?: number;
  baselineVariation?: number;
  characterVariation?: number;
  consistentStyle?: boolean;
  // Mood-based parameters (from Living Fonts)
  messiness?: number;  // 0-1, affects baseline variation and jitter
  speed?: number;      // multiplier for spacing
}

/**
 * Pre-defined handwriting styles
 */
export const handwritingStyles = {
  neat: {
    jitter: 0.1,
    slant: 0.05,
    baselineVariation: 1,
    characterVariation: 0.2,
    connectLetters: true,
    thickness: 1.3
  },
  messy: {
    jitter: 0.4,
    slant: 0.2,
    baselineVariation: 3,
    characterVariation: 0.5,
    connectLetters: false,
    thickness: 1.8,
    thicknessVariation: 0.6
  },
  cursive: {
    jitter: 0.15,
    slant: 0.3,
    baselineVariation: 1.5,
    characterVariation: 0.3,
    connectLetters: true,
    thickness: 1.5,
    letterSpacing: 6
  },
  print: {
    jitter: 0.2,
    slant: 0,
    baselineVariation: 1,
    characterVariation: 0.4,
    connectLetters: false,
    thickness: 1.6,
    letterSpacing: 10
  },
  architect: {
    jitter: 0.05,
    slant: 0,
    baselineVariation: 0.5,
    characterVariation: 0.1,
    connectLetters: false,
    thickness: 1.2,
    letterSpacing: 9
  }
};

/**
 * Convert mood-based parameters to handwriting options
 */
export function moodToHandwritingOptions(
  slant: number,
  spacing: number,
  messiness: number,
  speed: number
): Partial<HandwritingOptions> {
  return {
    slant: slant / 60,  // Convert degrees to decimal (e.g., 8° → 0.133)
    letterSpacing: 8 * spacing,
    wordSpacing: 15 * spacing,
    jitter: messiness * 0.4,  // messiness affects jitter
    baselineVariation: messiness * 4,  // messiness affects baseline
    characterVariation: messiness * 0.5,  // messiness affects character variation
    speed: speed
  };
}

/**
 * Creates a realistic handwriting simulation SVG
 */
export function simulateHandwriting(text: string, width: number, options: HandwritingOptions = {}): string {
  // Apply mood-based parameters if messiness/speed provided
  let adjustedOptions = { ...options };
  if (options.messiness !== undefined || options.speed !== undefined) {
    const messiness = options.messiness ?? 0.3;
    const speed = options.speed ?? 1.0;
    adjustedOptions = {
      ...options,
      jitter: options.jitter ?? messiness * 0.4,
      baselineVariation: options.baselineVariation ?? messiness * 4,
      characterVariation: options.characterVariation ?? messiness * 0.5,
      letterSpacing: options.letterSpacing ?? 8 * speed,
      wordSpacing: options.wordSpacing ?? 15 * speed
    };
  }

  // Default options
  const settings = {
    fontSize: adjustedOptions.fontSize || 20,
    lineHeight: adjustedOptions.lineHeight || 30,
    letterSpacing: adjustedOptions.letterSpacing || 8,
    wordSpacing: adjustedOptions.wordSpacing || 15,
    color: adjustedOptions.color || '#000000',
    slant: adjustedOptions.slant || 0.1,
    connectLetters: adjustedOptions.connectLetters !== undefined ? adjustedOptions.connectLetters : true,
    jitter: adjustedOptions.jitter !== undefined ? adjustedOptions.jitter : 0.15,
    thickness: adjustedOptions.thickness || 1.5,
    thicknessVariation: adjustedOptions.thicknessVariation || 0.3,
    baselineVariation: adjustedOptions.baselineVariation || 1.5,
    characterVariation: adjustedOptions.characterVariation || 0.2,
    consistentStyle: adjustedOptions.consistentStyle !== undefined ? adjustedOptions.consistentStyle : true
  };

  // Create SVG element
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width.toString());
  svg.setAttribute("height", "600");
  svg.setAttribute("viewBox", `0 0 ${width} 1000`);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  let currentX = 10;
  let currentY = settings.fontSize;
  let previousEnd: { x: number; y: number } | null = null;

  // Handle empty text
  if (!text || typeof text !== 'string' || text.trim() === '') {
    svg.setAttribute("height", (settings.fontSize + settings.lineHeight).toString());
    svg.setAttribute("viewBox", `0 0 ${width} ${settings.fontSize + settings.lineHeight}`);
    return svg.outerHTML;
  }

  // Split text into words
  const words = text.split(" ");

  // Store consistent character styles if enabled
  const characterStyles: Record<string, { templateIndex: number }> = {};

  // Process each word
  words.forEach((word) => {
    if (!word || word.trim() === '') {
      currentX += settings.wordSpacing;
      return;
    }

    // Check if word fits current line
    const wordWidth = word.length * settings.letterSpacing;
    if (currentX + wordWidth > width - 20) {
      currentX = 10;
      currentY += settings.lineHeight;
      previousEnd = null;
    }

    // Process each character in the word
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const letterType = getLetterType(char);

      // Select a template
      let templateIndex: number;
      if (settings.consistentStyle && characterStyles[char] !== undefined) {
        templateIndex = characterStyles[char].templateIndex;
      } else {
        const templateSet = letterTemplates[letterType];
        templateIndex = templateSet && templateSet.length > 0 ?
          Math.floor(Math.random() * templateSet.length) : 0;

        if (settings.consistentStyle) {
          characterStyles[char] = { templateIndex };
        }
      }

      const templateSet = letterTemplates[letterType] || letterTemplates.middle;
      if (!templateSet || templateSet.length === 0) continue;

      let pathData = templateSet[templateIndex] || templateSet[0];

      // Apply character variation
      if (Math.random() < settings.characterVariation) {
        pathData = pathData.replace(/(\d+(\.\d+)?)/g, (match) => {
          const num = parseFloat(match);
          const variation = num * 0.15;
          return (num + (Math.random() * variation * 2) - variation).toFixed(1);
        });
      }

      // Create the path element
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

      const slantTransform = `skewX(${-settings.slant * 15})`;
      const baselineJitter = (Math.random() * 2 - 1) * settings.baselineVariation;
      const xJitter = (Math.random() * 2 - 1) * settings.jitter * 3;
      const scale = settings.fontSize / 20;

      path.setAttribute("transform",
        `translate(${currentX + xJitter}, ${currentY + baselineJitter}) scale(${scale}) ${slantTransform}`);
      path.setAttribute("d", pathData);

      const strokeWidth = getVariation(settings.thickness, settings.thicknessVariation);
      path.setAttribute("stroke", settings.color);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-width", strokeWidth.toString());
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");

      svg.appendChild(path);

      // Add connectors
      if (settings.connectLetters && previousEnd && i > 0) {
        const connector = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const connectorTemplate = letterTemplates.connector[Math.floor(Math.random() * letterTemplates.connector.length)];

        connector.setAttribute("transform",
          `translate(${previousEnd.x}, ${previousEnd.y}) scale(${scale})`);
        connector.setAttribute("d", connectorTemplate);
        connector.setAttribute("stroke", settings.color);
        connector.setAttribute("fill", "none");
        connector.setAttribute("stroke-width", (strokeWidth * 0.7).toString());

        svg.appendChild(connector);
      }

      previousEnd = {
        x: currentX + settings.letterSpacing * scale,
        y: currentY + baselineJitter
      };

      currentX += settings.letterSpacing;
    }

    currentX += settings.wordSpacing - settings.letterSpacing;
    previousEnd = null;
  });

  // Set the final SVG height
  svg.setAttribute("height", (currentY + settings.lineHeight).toString());
  svg.setAttribute("viewBox", `0 0 ${width} ${currentY + settings.lineHeight}`);

  return svg.outerHTML;
}

/**
 * Renders handwriting directly onto a canvas
 */
export async function renderHandwritingOnCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  options: HandwritingOptions = {}
): Promise<void> {
  // Create an SVG string
  const svgString = simulateHandwriting(text, width, options);

  // Create a Blob from the SVG string
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  // Create an image from the SVG
  const img = new Image();

  return new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, x, y);
      URL.revokeObjectURL(url);
      resolve();
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };

    img.src = url;
  });
}
