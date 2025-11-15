/**
 * Handwriting Simulation Module
 * Generates realistic SVG handwriting simulations
 */

// Character path templates for different letter types
const letterTemplates = {
  ascender: [
    'M 0 10 q 2 -15 4 -10 q 2 10 4 10', // like 'l', 'h', 'k'
    'M 0 10 q 3 -12 5 -8 q 1 8 3 8',    // alternative
  ],
  descender: [
    'M 0 10 q 2 0 3 0 q 1 15 5 10',     // like 'g', 'y', 'j'
    'M 0 10 q 1 0 2 5 q 1 10 6 5',      // alternative
  ],
  middle: [
    'M 0 10 q 2 -5 4 0 q 2 5 4 0',      // like 'a', 'e', 'o'
    'M 0 10 q 3 -3 5 0 q 2 3 3 0',      // alternative
  ],
  narrow: [
    'M 0 10 q 1 -2 2 0 q 1 2 2 0',      // like 'i', 'c'
    'M 0 10 q 1 -3 1.5 0 q 0.5 3 1.5 0' // alternative
  ],
  wide: [
    'M 0 10 q 4 -5 8 0 q 4 5 8 0',      // like 'w', 'm'
    'M 0 10 q 4 -3 7 0 q 3 3 7 0'       // alternative
  ],
  connector: [
    'M 0 10 C 2 10, 3 10, 5 10',        // simple horizontal connector
    'M 0 10 C 1.5 9, 3.5 11, 5 10'      // wavy connector
  ]
};

type LetterType = keyof typeof letterTemplates;

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
  wordLimit?: number;
  animationDelay?: boolean;
  consistentStyle?: boolean;
  width?: number;
}

// Map characters to their types
function getLetterType(char: string): LetterType {
  const lowerChar = char.toLowerCase();

  if ('bdfhklt'.includes(lowerChar)) return 'ascender';
  if ('gjpqy'.includes(lowerChar)) return 'descender';
  if ('aeiounrsxz'.includes(lowerChar)) return 'middle';
  if ('c'.includes(lowerChar)) return 'narrow';
  if ('mw'.includes(lowerChar)) return 'wide';

  // Default for numbers and other characters
  return 'middle';
}

// Get random variation within a range
function getVariation(base: number, percent: number): number {
  const variation = base * percent;
  return base + (Math.random() * variation * 2) - variation;
}

/**
 * Creates a realistic handwriting simulation SVG with only the specified words
 */
export function simulateHandwriting(text: string, width: number, options: HandwritingOptions = {}): string {
  // Default options
  const settings: Required<HandwritingOptions> = {
    fontSize: options.fontSize || 20,
    lineHeight: options.lineHeight || 30,
    letterSpacing: options.letterSpacing || 8,
    wordSpacing: options.wordSpacing || 15,
    color: options.color || '#000000',
    slant: options.slant || 0.1,
    connectLetters: options.connectLetters !== undefined ? options.connectLetters : true,
    jitter: options.jitter !== undefined ? options.jitter : 0.15,
    thickness: options.thickness || 1.5,
    thicknessVariation: options.thicknessVariation || 0.3,
    baselineVariation: options.baselineVariation || 1.5,
    characterVariation: options.characterVariation || 0.2,
    wordLimit: options.wordLimit || 0,
    animationDelay: options.animationDelay || false,
    consistentStyle: options.consistentStyle !== undefined ? options.consistentStyle : true,
    width: width
  };

  // Create SVG element
  if (typeof document === 'undefined') {
    // Server-side: return empty SVG
    return `<svg width="${width}" height="100" xmlns="http://www.w3.org/2000/svg"></svg>`;
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", "600");
  svg.setAttribute("viewBox", `0 0 ${width} 1000`);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.style.maxHeight = "600px";

  let currentX = 10;
  let currentY = settings.fontSize;
  let previousEnd: { x: number; y: number } | null = null;

  // Handle empty text
  if (!text || typeof text !== 'string' || text.trim() === '') {
    svg.setAttribute("height", String(settings.fontSize + settings.lineHeight));
    svg.setAttribute("viewBox", `0 0 ${width} ${settings.fontSize + settings.lineHeight}`);
    return svg.outerHTML;
  }

  // Split text into words
  const words = text.split(" ");

  // Limit the number of words if wordLimit is specified
  const wordsToRender = settings.wordLimit ? words.slice(0, settings.wordLimit) : words;

  // Store consistent character styles if enabled
  const characterStyles: Record<string, { templateIndex: number }> = {};

  // Process each word
  wordsToRender.forEach((word, wordIndex) => {
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

      // Select a template based on letter type with some variation
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
      if (!templateSet || templateSet.length === 0) {
        console.warn(`No template found for letter '${char}' with type '${letterType}'`);
        continue;
      }

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

      // Apply slant (italic effect)
      const slantTransform = `skewX(${-settings.slant * 15})`;

      // Apply baseline variation
      const baselineJitter = (Math.random() * 2 - 1) * settings.baselineVariation;

      // Apply jitter to the horizontal position
      const xJitter = (Math.random() * 2 - 1) * settings.jitter * 3;

      // Scale the path according to font size
      const scale = settings.fontSize / 20;

      // Set the transform
      path.setAttribute("transform",
        `translate(${currentX + xJitter}, ${currentY + baselineJitter}) scale(${scale}) ${slantTransform}`);

      path.setAttribute("d", pathData);

      // Apply stroke style with variation in thickness
      const strokeWidth = getVariation(settings.thickness, settings.thicknessVariation);
      path.setAttribute("stroke", settings.color);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-width", String(strokeWidth));
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");

      // Add animation if enabled
      if (settings.animationDelay) {
        const totalChars = wordsToRender.reduce((acc, w) => acc + w.length, 0);
        const charIndex = wordsToRender.slice(0, wordIndex).reduce((acc, w) => acc + w.length, 0) + i;
        const delay = (charIndex / totalChars) * 2;

        const pathLength = 100;
        path.setAttribute("stroke-dasharray", String(pathLength));
        path.setAttribute("stroke-dashoffset", String(pathLength));
        path.setAttribute("style", `animation: drawPath 0.5s ease forwards ${delay}s;`);
      }

      svg.appendChild(path);

      // Add connectors if enabled
      if (settings.connectLetters && previousEnd && i > 0) {
        const connector = document.createElementNS("http://www.w3.org/2000/svg", "path");

        const connectorTemplate = letterTemplates.connector[Math.floor(Math.random() * letterTemplates.connector.length)];

        connector.setAttribute("transform",
          `translate(${previousEnd.x}, ${previousEnd.y}) scale(${scale})`);

        connector.setAttribute("d", connectorTemplate);
        connector.setAttribute("stroke", settings.color);
        connector.setAttribute("fill", "none");
        connector.setAttribute("stroke-width", String(strokeWidth * 0.7));

        if (settings.animationDelay) {
          const totalChars = wordsToRender.reduce((acc, w) => acc + w.length, 0);
          const charIndex = wordsToRender.slice(0, wordIndex).reduce((acc, w) => acc + w.length, 0) + i;
          const delay = (charIndex / totalChars) * 2 - 0.05;

          const pathLength = 100;
          connector.setAttribute("stroke-dasharray", String(pathLength));
          connector.setAttribute("stroke-dashoffset", String(pathLength));
          connector.setAttribute("style", `animation: drawPath 0.3s ease forwards ${delay}s;`);
        }

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
  svg.setAttribute("height", String(currentY + settings.lineHeight));
  svg.setAttribute("viewBox", `0 0 ${width} ${currentY + settings.lineHeight}`);

  // Add animation styles if enabled
  if (settings.animationDelay) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      @keyframes drawPath {
        to {
          stroke-dashoffset: 0;
        }
      }
    `;
    svg.appendChild(style);
  }

  return svg.outerHTML;
}

/**
 * Renders handwriting onto a canvas
 */
export async function renderHandwritingOnCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  options: HandwritingOptions = {}
): Promise<void> {
  const svgString = simulateHandwriting(text, width, options);

  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

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

// Pre-defined handwriting styles
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
} as const;
