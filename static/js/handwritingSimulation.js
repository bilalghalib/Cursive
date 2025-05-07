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

// Map characters to their types
function getLetterType(char) {
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
function getVariation(base, percent) {
    const variation = base * percent;
    return base + (Math.random() * variation * 2) - variation;
}

/**
 * Creates a realistic handwriting simulation SVG
 * @param {string} text - The text to render as handwriting
 * @param {number} width - Maximum width of the resulting SVG
 * @param {Object} options - Customization options
 * @returns {string} SVG string representing the handwritten text
 */
export function simulateHandwriting(text, width, options = {}) {
    // Default options
    const settings = {
        fontSize: options.fontSize || 20,
        lineHeight: options.lineHeight || 30,
        letterSpacing: options.letterSpacing || 8,
        wordSpacing: options.wordSpacing || 15,
        color: options.color || '#000000',
        slant: options.slant || 0.1, // 0-1 range for italic effect
        connectLetters: options.connectLetters !== undefined ? options.connectLetters : true,
        jitter: options.jitter !== undefined ? options.jitter : 0.2, // 0-1 range for randomness
        thickness: options.thickness || 1.5,
        thicknessVariation: options.thicknessVariation || 0.4, // 0-1 range
        baselineVariation: options.baselineVariation || 2, // pixels
        characterVariation: options.characterVariation || 0.3 // 0-1 range for character shape variation
    };
    
    // Create SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", "auto");
    svg.setAttribute("viewBox", `0 0 ${width} 1000`); // Large enough viewBox to accommodate text
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    
    let currentX = 10; // Start with some padding
    let currentY = settings.fontSize;
    let previousEnd = null; // Track the endpoint of the previous letter for connections
    
    // Split text into words
    const words = text.split(" ");
    
    // Process each word
    words.forEach((word, wordIndex) => {
        // Check if word fits current line
        const wordWidth = word.length * settings.letterSpacing;
        if (currentX + wordWidth > width - 20) { // 20px padding on right side
            currentX = 10; // Reset to left margin
            currentY += settings.lineHeight; // Move to next line
            previousEnd = null; // Reset connections at line breaks
        }
        
        // Process each character in the word
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const letterType = getLetterType(char);
            
            // Select a template based on letter type with some variation
            const templateSet = letterTemplates[letterType];
            const templateIndex = Math.floor(Math.random() * templateSet.length);
            let pathData = templateSet[templateIndex];
            
            // Apply character variation - slightly modify the path data
            if (Math.random() < settings.characterVariation) {
                // Modify the path data by tweaking the numbers slightly
                pathData = pathData.replace(/(\d+(\.\d+)?)/g, (match) => {
                    const num = parseFloat(match);
                    const variation = num * 0.2; // 20% variation
                    return (num + (Math.random() * variation * 2) - variation).toFixed(1);
                });
            }
            
            // Create the path element
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            
            // Apply slant (italic effect)
            const slantTransform = `skewX(${-settings.slant * 15})`; // Convert to degrees
            
            // Apply baseline variation
            const baselineJitter = (Math.random() * 2 - 1) * settings.baselineVariation;
            
            // Apply jitter to the horizontal position
            const xJitter = (Math.random() * 2 - 1) * settings.jitter * 3;
            
            // Scale the path according to font size
            const scale = settings.fontSize / 20; // Template is designed for 20px
            
            // Set the transform to apply all effects
            path.setAttribute("transform", 
                `translate(${currentX + xJitter}, ${currentY + baselineJitter}) scale(${scale}) ${slantTransform}`);
            
            // Set the path data
            path.setAttribute("d", pathData);
            
            // Apply stroke style with variation in thickness
            const strokeWidth = getVariation(settings.thickness, settings.thicknessVariation);
            path.setAttribute("stroke", settings.color);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke-width", strokeWidth);
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            
            // Add the path to the SVG
            svg.appendChild(path);
            
            // If connecting letters is enabled, add connectors between letters
            if (settings.connectLetters && previousEnd && i > 0) {
                const connector = document.createElementNS("http://www.w3.org/2000/svg", "path");
                
                // Get a random connector template
                const connectorTemplate = letterTemplates.connector[Math.floor(Math.random() * letterTemplates.connector.length)];
                
                // Position the connector between the previous letter and the current one
                connector.setAttribute("transform", 
                    `translate(${previousEnd.x}, ${previousEnd.y}) scale(${scale})`);
                
                connector.setAttribute("d", connectorTemplate);
                connector.setAttribute("stroke", settings.color);
                connector.setAttribute("fill", "none");
                connector.setAttribute("stroke-width", strokeWidth * 0.7); // Slightly thinner
                
                svg.appendChild(connector);
            }
            
            // Store the endpoint of this letter for the next connector
            // This is an approximation - for a real implementation we'd need to calculate 
            // the actual endpoint of each specific path
            previousEnd = {
                x: currentX + settings.letterSpacing * scale,
                y: currentY + baselineJitter
            };
            
            // Move to the next letter position
            currentX += settings.letterSpacing;
        }
        
        // Add space after word
        currentX += settings.wordSpacing - settings.letterSpacing; // Adjust because we already added letterSpacing for the last letter
        
        // Reset connections between words
        previousEnd = null;
    });
    
    // Set the final SVG height based on the content
    svg.setAttribute("height", currentY + settings.lineHeight);
    svg.setAttribute("viewBox", `0 0 ${width} ${currentY + settings.lineHeight}`);
    
    return svg.outerHTML;
}

/**
 * Creates a div with SVG handwriting inside
 * @param {string} text - Text to render
 * @param {number} width - Maximum width
 * @param {Object} options - Customization options
 * @returns {HTMLElement} Div containing the SVG handwriting
 */
export function createHandwritingElement(text, width, options = {}) {
    const container = document.createElement('div');
    container.className = 'handwriting-svg-container';
    container.innerHTML = simulateHandwriting(text, width, options);
    return container;
}

/**
 * Renders handwriting onto an HTML element
 * @param {HTMLElement} element - The element to render into
 * @param {string} text - Text to render
 * @param {Object} options - Customization options
 */
export function renderHandwriting(element, text, options = {}) {
    const width = options.width || element.offsetWidth || 400;
    element.innerHTML = '';
    element.appendChild(createHandwritingElement(text, width, options));
}

/**
 * Renders handwriting directly onto a canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to render
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Maximum width
 * @param {Object} options - Customization options
 */
export function renderHandwritingOnCanvas(ctx, text, x, y, width, options = {}) {
    // Create an SVG string
    const svgString = simulateHandwriting(text, width, options);
    
    // Create a Blob from the SVG string
    const blob = new Blob([svgString], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    
    // Create an image from the SVG
    const img = new Image();
    
    // Return a promise that resolves when the image is loaded and drawn
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
};