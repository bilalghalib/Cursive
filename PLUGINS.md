# Cursive Plugin System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Available Plugins](#available-plugins)
4. [Creating Custom Plugins](#creating-custom-plugins)
5. [Plugin API Reference](#plugin-api-reference)
6. [Future Improvements](#future-improvements)

---

## Overview

The Cursive Plugin System is an extensible architecture that allows developers to add new tools and functionality to the canvas application without modifying the core codebase. Plugins can provide drawing tools, analysis features, utilities, and more.

### Key Features

- **Modular Architecture**: Each plugin is self-contained with its own logic, UI, and settings
- **Lifecycle Management**: Plugins have defined lifecycle hooks (initialize, activate, deactivate, cleanup)
- **Category-based Organization**: Plugins are organized into categories (drawing, analysis, utility)
- **Canvas Integration**: Direct access to canvas context and events
- **State Management**: Built-in state persistence and settings management
- **Hot-swappable**: Plugins can be enabled/disabled without app restart

### Terminology

Throughout the Cursive ecosystem, we use **"plugin"** and **"tool"** interchangeably:

- **Plugin**: The technical term for the modular component
- **Tool**: The user-facing term (e.g., "OCR Tool", "Calculator Tool")

This documentation standardizes on "plugin" for consistency, but you may see "tool" in the UI and user-facing contexts.

---

## Architecture

### Plugin Manager (`pluginManager.js`)

The Plugin Manager is the core system that handles plugin registration, lifecycle, and coordination.

```javascript
import { pluginManager } from './pluginManager.js';

// Register a plugin
await pluginManager.registerPlugin(myPlugin);

// Activate a plugin
await pluginManager.activatePlugin('plugin-id');

// Get all plugins
const plugins = pluginManager.getAllPlugins();
```

### Base Plugin Class

All plugins extend the `BasePlugin` class which provides:

- Lifecycle hooks (initialize, activate, deactivate, cleanup)
- Event handlers (onMouseDown, onMouseMove, onMouseUp, onClick, onKeyDown, onKeyUp)
- UI rendering methods (renderToolbarButton, renderSettings)
- Canvas access (canvas, ctx)
- State management (settings, getMetadata, updateSettings)

### Plugin Structure

```
static/js/plugins/
├── index.js           # Plugin registry and exports
├── ocrPlugin.js       # OCR functionality
├── calculatorPlugin.js # Math calculations
├── colorPickerPlugin.js # Advanced color selection
├── shapeToolsPlugin.js # Geometric shapes
└── templatesPlugin.js  # Canvas templates
```

---

## Available Plugins

### 1. OCR Plugin (`ocrPlugin.js`)

**Category**: Analysis
**Icon**: fa-font
**Description**: Extract text from handwritten content or images

#### Features

- Select regions of the canvas to extract text
- AI-powered text recognition
- Copy extracted text to clipboard
- Supports multiple output formats (plain text, markdown, JSON)
- Preserves formatting option

#### How It Works

1. Activate the OCR tool from the plugin toolbar
2. Click and drag to select an area containing text
3. The plugin captures the selection and sends it to Claude AI
4. Extracted text appears in a popup bubble
5. Click to copy or save the extracted text

#### Current Implementation

- Uses canvas selection to capture image data
- Integrates with existing `aiService.js` for Claude API calls
- Displays results in an inline popup bubble
- Auto-saves to history

#### Future Improvements

- Multi-language support with auto-detection
- Batch processing for multiple selections
- Export to various formats (PDF, Word, plain text)
- Handwriting training to improve accuracy
- Real-time OCR as you write
- OCR result editing before saving

### 2. Calculator Plugin (`calculatorPlugin.js`)

**Category**: Utility
**Icon**: fa-calculator
**Description**: Evaluate mathematical expressions

#### Features

- Full calculator interface with number pad
- Support for basic operations (+, -, ×, ÷)
- Advanced functions (sin, cos, tan, sqrt, log, exp)
- Calculation history
- Click on canvas to place results
- Auto-evaluate as you type (optional)
- Precision control (decimal places)

#### How It Works

1. Activate the Calculator tool
2. Enter expressions using the calculator panel or keyboard
3. Results appear in real-time (if auto-evaluate is enabled)
4. Click "=" or press Enter to evaluate
5. Click on canvas to place the result as text
6. View calculation history for reference

#### Current Implementation

- Side panel with calculator UI
- Real-time expression evaluation
- History tracking (last 10 calculations)
- Canvas integration for result placement

#### Future Improvements

- Graph plotting for functions
- Unit conversion support
- Scientific notation
- Variable storage (x = 5, y = 10, etc.)
- Expression templates (quadratic formula, etc.)
- Integration with spreadsheet data
- Voice input for calculations
- Step-by-step solution display

### 3. Color Picker Plugin (`colorPickerPlugin.js`)

**Category**: Drawing
**Icon**: fa-palette
**Description**: Advanced color selection and palette management

#### Features

- Native color picker integration
- Pre-defined color palettes (Basic, Warm, Cool, Pastel, Material Design)
- Recent colors tracking (12 most recent)
- Eyedropper tool to pick colors from canvas
- Color harmony generator (complementary, triadic, analogous)
- Custom palette creation
- Hex color input

#### How It Works

1. Activate the Color Picker tool
2. Choose a color from palettes or use the color picker
3. Click eyedropper to pick colors from the canvas
4. View color harmonies for design inspiration
5. Recently used colors are automatically saved
6. Selected color integrates with drawing tools

#### Current Implementation

- Side panel with palette grid
- Color conversion utilities (RGB, HSL, Hex)
- Local storage for recent colors
- Color harmony algorithm
- Eyedropper mode with canvas sampling

#### Future Improvements

- Gradient creation tools
- Color scheme import/export
- Color blindness simulation
- Integration with popular color palette services
- Color naming (CSS color names)
- Opacity/transparency controls
- Color contrast checker (WCAG compliance)
- Favorite colors/palettes
- Import colors from images

### 4. Shape Tools Plugin (`shapeToolsPlugin.js`)

**Category**: Drawing
**Icon**: fa-shapes
**Description**: Draw geometric shapes and arrows

#### Features

- 9 pre-made shapes: Rectangle, Circle, Ellipse, Triangle, Arrow, Line, Star, Pentagon, Hexagon
- Adjustable stroke color and width
- Optional fill with color selection
- Snap to grid functionality
- Visual shape selector
- Real-time preview while drawing

#### How It Works

1. Activate the Shape Tools plugin
2. Select desired shape from the grid
3. Configure stroke/fill options
4. Click and drag on canvas to draw the shape
5. Release to finalize
6. Enable snap to grid for precise alignment

#### Current Implementation

- Click and drag drawing interaction
- Shape preview during drawing
- Settings panel for customization
- Nine different shape types
- Grid snapping with configurable size

#### Future Improvements

- Custom polygon creation (n-sided shapes)
- Bezier curves and paths
- 3D shapes (perspective)
- Shape libraries (flowchart symbols, UML diagrams, etc.)
- Shape rotation and transformation
- Connector lines between shapes
- Smart guides and alignment tools
- Shape duplication and templates
- Export shapes as SVG
- Boolean operations (union, subtract, intersect)

### 5. Templates Plugin (`templatesPlugin.js`)

**Category**: Utility
**Icon**: fa-file-alt
**Description**: Quick-start templates and backgrounds

#### Features

- 10 built-in templates:
  - Blank canvas
  - Grid paper (square grid)
  - Lined paper (horizontal lines)
  - Dot grid
  - Music staff (musical notation)
  - Weekly calendar
  - Cornell notes format
  - Storyboard (6 panels)
  - Kanban board (Todo/In Progress/Done)
  - Mind map structure
- Adjustable template opacity
- Custom template saving
- Template-specific settings (grid size, line spacing, etc.)

#### How It Works

1. Activate the Templates plugin
2. Choose a template from the grid
3. Adjust opacity if desired
4. Template is applied as background layer
5. Draw or write on top of the template
6. Save current canvas as a custom template

#### Current Implementation

- Pre-defined template rendering
- Opacity control
- Template preview cards
- Custom template storage
- Category-based organization

#### Future Improvements

- Template marketplace/sharing
- Import templates from files
- Multi-page templates (notebooks)
- Template animation (breathing guides, timers)
- Template categories and search
- Template editing tools
- Responsive templates (adapt to canvas size)
- Template versioning
- Collaborative template creation
- PDF import as template
- Template layers (combine multiple templates)

---

## Creating Custom Plugins

### Step 1: Create Plugin File

Create a new file in `static/js/plugins/yourPlugin.js`:

```javascript
import { BasePlugin } from '../pluginManager.js';

class YourPlugin extends BasePlugin {
    constructor() {
        super({
            id: 'your-plugin-id',
            name: 'Your Plugin Name',
            description: 'What your plugin does',
            icon: 'fa-your-icon', // Font Awesome icon
            category: 'utility', // drawing, analysis, utility, general
            version: '1.0.0',
            author: 'Your Name',
            settings: {
                // Your default settings
            }
        });
    }

    async initialize() {
        await super.initialize();
        // Your initialization code
        return true;
    }

    onActivate() {
        // Called when user selects your plugin
    }

    onDeactivate() {
        // Called when user switches to another plugin
    }

    onMouseDown(event, canvasX, canvasY) {
        // Handle mouse down events
    }

    onMouseMove(event, canvasX, canvasY) {
        // Handle mouse move events
    }

    onMouseUp(event, canvasX, canvasY) {
        // Handle mouse up events
    }

    onClick(event, canvasX, canvasY) {
        // Handle click events
    }

    renderSettings() {
        return `
            <div class="plugin-settings">
                <h3>${this.name} Settings</h3>
                <!-- Your settings UI -->
            </div>
        `;
    }
}

export default YourPlugin;
```

### Step 2: Register Plugin

Add your plugin to `static/js/plugins/index.js`:

```javascript
import YourPlugin from './yourPlugin.js';

export function getAllPlugins() {
    return [
        // ... existing plugins
        new YourPlugin()
    ];
}
```

### Step 3: Update Categories (Optional)

If using a new category, update `pluginCategories` in `index.js`.

### Best Practices

1. **Namespace your IDs**: Use descriptive, unique IDs (e.g., `your-company-your-plugin`)
2. **Clean up resources**: Implement proper cleanup in `deactivate()` and `cleanup()`
3. **Error handling**: Wrap async operations in try-catch blocks
4. **User feedback**: Provide visual feedback for all user actions
5. **Responsive UI**: Ensure your plugin panels work on different screen sizes
6. **Settings persistence**: Use the built-in settings system
7. **Documentation**: Add JSDoc comments to your methods
8. **Testing**: Test activation/deactivation cycles thoroughly

---

## Plugin API Reference

### BasePlugin Class

#### Constructor Config

```javascript
{
    id: string,           // Unique plugin identifier
    name: string,         // Display name
    description: string,  // Short description
    icon: string,         // Font Awesome icon class
    category: string,     // 'drawing' | 'analysis' | 'utility' | 'general'
    enabled: boolean,     // Default: true
    version: string,      // Semantic version
    author: string,       // Author name
    settings: object      // Plugin-specific settings
}
```

#### Properties

- `id`: Plugin identifier
- `name`: Display name
- `isActive`: Current activation state
- `isInitialized`: Initialization state
- `canvas`: HTMLCanvasElement reference
- `ctx`: Canvas 2D context
- `settings`: Plugin settings object

#### Lifecycle Methods

```javascript
async initialize()        // Called once when plugin is registered
async activate()          // Called when user selects plugin
async deactivate()       // Called when user switches away
async cleanup()          // Called when plugin is unregistered
```

#### Event Handlers

```javascript
onMouseDown(event, canvasX, canvasY)
onMouseMove(event, canvasX, canvasY)
onMouseUp(event, canvasX, canvasY)
onClick(event, canvasX, canvasY)
onKeyDown(event)
onKeyUp(event)
```

#### UI Methods

```javascript
renderToolbarButton()    // Returns HTML for toolbar button
renderSettings()         // Returns HTML for settings panel
```

#### Utility Methods

```javascript
getMetadata()           // Returns plugin metadata object
updateSettings(obj)     // Updates plugin settings
onSettingsChanged(obj)  // Override to react to setting changes
```

### Plugin Manager API

```javascript
// Registration
await pluginManager.registerPlugin(plugin)
await pluginManager.unregisterPlugin(pluginId)

// Activation
await pluginManager.activatePlugin(pluginId)
await pluginManager.deactivatePlugin(pluginId)

// Retrieval
pluginManager.getPlugin(pluginId)
pluginManager.getAllPlugins()
pluginManager.getPluginsByCategory(category)
pluginManager.getActivePlugin()

// Management
pluginManager.setPluginEnabled(pluginId, enabled)
pluginManager.updateToolbarUI()
pluginManager.renderPluginToolbar(containerId)

// Events
pluginManager.handleCanvasEvent(eventType, ...args)

// State
pluginManager.savePluginState()
pluginManager.loadPluginState()
pluginManager.getStats()
pluginManager.exportPluginConfig()
```

---

## Future Improvements

### Architecture Enhancements

1. **Plugin Marketplace**
   - Browse and install community plugins
   - Rating and review system
   - Version management
   - Auto-updates

2. **Plugin Communication**
   - Event bus for inter-plugin messaging
   - Shared state management
   - Plugin dependencies and composition

3. **Advanced Canvas Integration**
   - Layer support for plugins
   - Z-index control
   - Clipping and masking
   - Non-destructive editing

4. **Performance**
   - Lazy loading for plugins
   - Web Worker support for intensive operations
   - Canvas caching and optimization
   - Memory management tools

5. **Developer Tools**
   - Plugin debugger
   - Performance profiler
   - Visual plugin builder
   - Testing framework
   - Documentation generator

### UI/UX Improvements

1. **Customizable Toolbar**
   - Drag-and-drop plugin reordering
   - Custom toolbar layouts
   - Keyboard shortcuts for plugins
   - Quick action menus

2. **Plugin Settings**
   - Global settings panel
   - Import/export settings
   - Presets and profiles
   - Keyboard shortcut customization

3. **Mobile Support**
   - Touch-optimized plugin UIs
   - Gesture support
   - Responsive panels
   - Mobile-specific plugins

### New Plugin Ideas

1. **AI Assistant Plugin**: Contextual AI suggestions and automation
2. **Export Plugin**: Multiple export formats (PDF, SVG, PNG, etc.)
3. **Collaboration Plugin**: Real-time multi-user editing
4. **Voice Input Plugin**: Voice commands and dictation
5. **Animation Plugin**: Create animated drawings
6. **Data Visualization Plugin**: Charts and graphs from data
7. **Ruler & Measurement Plugin**: Precise measurements and guides
8. **Text Formatting Plugin**: Rich text with fonts, sizes, styles
9. **Image Import Plugin**: Import and trace images
10. **Layers Plugin**: Professional layer management

### Integration Improvements

1. **Cloud Storage**: Save plugins and settings to cloud
2. **Version Control**: Track changes and history
3. **API Integration**: Connect to external services
4. **Webhooks**: Trigger external actions from plugins
5. **Embed Mode**: Use plugins in embedded canvas instances

---

## Migration Guide

### From Old Tool System to Plugins

If you have custom code that interacted with the old toolbar tools, here's how to migrate:

#### Before (Direct Tool Access)

```javascript
// Old way
document.getElementById('draw-btn').click();
```

#### After (Plugin System)

```javascript
// New way
import { pluginManager } from './app.js';

// Activate a plugin
await pluginManager.activatePlugin('shape-tools');

// Get active plugin
const activePlugin = pluginManager.getActivePlugin();
```

---

## Support and Contributing

### Getting Help

- Check the [API Reference](#plugin-api-reference)
- Review existing plugin implementations
- Open an issue on GitHub

### Contributing Plugins

1. Fork the repository
2. Create your plugin following the guidelines
3. Test thoroughly
4. Submit a pull request with:
   - Plugin code
   - Documentation
   - Examples
   - Tests (if applicable)

### Plugin Review Criteria

- Code quality and style compliance
- Proper error handling
- Resource cleanup
- User experience
- Performance considerations
- Documentation completeness

---

## License

The Cursive Plugin System is part of the Cursive project and follows the same license.

---

## Changelog

### Version 1.0.0 (2025-11-09)

- Initial plugin system release
- 5 core plugins: OCR, Calculator, Color Picker, Shape Tools, Templates
- Plugin Manager with full lifecycle support
- Category-based organization
- Settings management
- State persistence
- UI integration

---

## Appendix

### Plugin Categories

- **drawing**: Tools for creating content (shapes, colors, etc.)
- **analysis**: Tools for analyzing content (OCR, data extraction)
- **utility**: Helper tools (calculator, templates)
- **general**: Misc plugins that don't fit other categories

### Font Awesome Icons

Common icons for plugins:
- `fa-pencil-alt` - Drawing
- `fa-shapes` - Shapes
- `fa-palette` - Colors
- `fa-calculator` - Math
- `fa-font` - Text/OCR
- `fa-file-alt` - Templates
- `fa-magic` - AI/Automation
- `fa-cog` - Settings

### Keyboard Shortcuts (Planned)

- `Ctrl/Cmd + P` - Plugin palette
- `Ctrl/Cmd + Shift + P` - Plugin settings
- `1-9` - Quick activate plugins 1-9
- `Esc` - Deactivate current plugin

---

**Last Updated**: November 9, 2025
**Version**: 1.0.0
**Author**: Cursive Team
