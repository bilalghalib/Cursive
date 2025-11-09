/**
 * Plugin Registry Index
 *
 * Central export point for all Cursive plugins
 */

import OCRPlugin from './ocrPlugin.js';
import CalculatorPlugin from './calculatorPlugin.js';
import ColorPickerPlugin from './colorPickerPlugin.js';
import ShapeToolsPlugin from './shapeToolsPlugin.js';
import TemplatesPlugin from './templatesPlugin.js';

// Export all plugins
export {
    OCRPlugin,
    CalculatorPlugin,
    ColorPickerPlugin,
    ShapeToolsPlugin,
    TemplatesPlugin
};

// Plugin registry helper
export function getAllPlugins() {
    return [
        new OCRPlugin(),
        new CalculatorPlugin(),
        new ColorPickerPlugin(),
        new ShapeToolsPlugin(),
        new TemplatesPlugin()
    ];
}

// Plugin categories
export const pluginCategories = {
    drawing: ['color-picker-tool', 'shape-tools'],
    analysis: ['ocr-tool'],
    utility: ['calculator-tool', 'templates-tool'],
    general: []
};

// Plugin metadata
export const pluginMetadata = {
    version: '1.0.0',
    totalPlugins: 5,
    categories: Object.keys(pluginCategories),
    lastUpdated: '2025-11-09'
};
