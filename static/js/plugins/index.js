/**
 * Plugin Registry Index
 *
 * Central export point for all Cursive plugins
 */

import CalculatorPlugin from './calculatorPlugin.js';
import ColorPickerPlugin from './colorPickerPlugin.js';
import ShapeToolsPlugin from './shapeToolsPlugin.js';
import TemplatesPlugin from './templatesPlugin.js';

// Export all plugins
export {
    CalculatorPlugin,
    ColorPickerPlugin,
    ShapeToolsPlugin,
    TemplatesPlugin
};

// Plugin registry helper
export function getAllPlugins() {
    return [
        new CalculatorPlugin(),
        new ColorPickerPlugin(),
        new ShapeToolsPlugin(),
        new TemplatesPlugin()
    ];
}

// Plugin categories
export const pluginCategories = {
    drawing: ['color-picker-tool', 'shape-tools'],
    utility: ['calculator-tool', 'templates-tool'],
    general: []
};

// Plugin metadata
export const pluginMetadata = {
    version: '1.0.0',
    totalPlugins: 4,
    categories: Object.keys(pluginCategories),
    lastUpdated: '2025-11-15'
};
