/**
 * Plugin Manager for Cursive
 *
 * A flexible plugin system that allows extending the canvas application
 * with custom tools and functionality.
 *
 * Plugin Lifecycle:
 * 1. Register - Plugins register with the manager
 * 2. Initialize - Plugins set up their UI and state
 * 3. Activate - User selects the plugin
 * 4. Deactivate - User switches to another plugin
 * 5. Cleanup - Plugin is unloaded
 */

class BasePlugin {
    constructor(config = {}) {
        this.id = config.id || 'unknown';
        this.name = config.name || 'Unknown Plugin';
        this.description = config.description || '';
        this.icon = config.icon || 'fa-plug';
        this.category = config.category || 'general'; // general, drawing, analysis, utility
        this.enabled = config.enabled !== false;
        this.version = config.version || '1.0.0';
        this.author = config.author || 'Unknown';

        // Plugin state
        this.isActive = false;
        this.isInitialized = false;

        // Plugin settings
        this.settings = config.settings || {};

        // Canvas context (set by plugin manager)
        this.canvas = null;
        this.ctx = null;
    }

    /**
     * Initialize the plugin - called once when plugin is registered
     */
    async initialize() {
        console.log(`Initializing plugin: ${this.name}`);
        this.isInitialized = true;
        return true;
    }

    /**
     * Activate the plugin - called when user selects this plugin
     */
    async activate() {
        console.log(`Activating plugin: ${this.name}`);
        this.isActive = true;
        this.onActivate();
        return true;
    }

    /**
     * Deactivate the plugin - called when user switches to another plugin
     */
    async deactivate() {
        console.log(`Deactivating plugin: ${this.name}`);
        this.isActive = false;
        this.onDeactivate();
        return true;
    }

    /**
     * Cleanup the plugin - called when plugin is being removed
     */
    async cleanup() {
        console.log(`Cleaning up plugin: ${this.name}`);
        this.isInitialized = false;
        this.isActive = false;
        return true;
    }

    // Event handlers - override in subclasses
    onActivate() {}
    onDeactivate() {}

    // Canvas event handlers - override in subclasses
    onMouseDown(event, canvasX, canvasY) {}
    onMouseMove(event, canvasX, canvasY) {}
    onMouseUp(event, canvasX, canvasY) {}
    onClick(event, canvasX, canvasY) {}
    onKeyDown(event) {}
    onKeyUp(event) {}

    /**
     * Render plugin UI in the toolbar
     */
    renderToolbarButton() {
        return `
            <button id="${this.id}-btn" class="plugin-btn" data-plugin-id="${this.id}" title="${this.description}">
                <i class="fas ${this.icon}"></i>
                <span class="btn-label">${this.name}</span>
            </button>
        `;
    }

    /**
     * Render plugin settings panel
     */
    renderSettings() {
        return `
            <div class="plugin-settings" id="${this.id}-settings">
                <h3>${this.name} Settings</h3>
                <p>No settings available</p>
            </div>
        `;
    }

    /**
     * Get plugin metadata
     */
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            icon: this.icon,
            category: this.category,
            enabled: this.enabled,
            version: this.version,
            author: this.author,
            isActive: this.isActive,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Update plugin settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.onSettingsChanged(newSettings);
    }

    onSettingsChanged(settings) {}
}

class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.activePlugin = null;
        this.categories = {
            drawing: [],
            analysis: [],
            utility: [],
            general: []
        };

        // Plugin storage key
        this.STORAGE_KEY = 'cursive_plugins_config';
    }

    /**
     * Register a new plugin
     */
    async registerPlugin(plugin) {
        if (!(plugin instanceof BasePlugin)) {
            throw new Error('Plugin must extend BasePlugin class');
        }

        if (this.plugins.has(plugin.id)) {
            console.warn(`Plugin ${plugin.id} already registered. Skipping.`);
            return false;
        }

        // Initialize the plugin
        await plugin.initialize();

        // Register the plugin
        this.plugins.set(plugin.id, plugin);

        // Add to category
        if (this.categories[plugin.category]) {
            this.categories[plugin.category].push(plugin.id);
        } else {
            this.categories.general.push(plugin.id);
        }

        console.log(`Plugin registered: ${plugin.name} (${plugin.id})`);

        // Save plugin state
        this.savePluginState();

        return true;
    }

    /**
     * Unregister a plugin
     */
    async unregisterPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            console.warn(`Plugin ${pluginId} not found`);
            return false;
        }

        // Deactivate if active
        if (plugin.isActive) {
            await this.deactivatePlugin(pluginId);
        }

        // Cleanup
        await plugin.cleanup();

        // Remove from category
        const category = this.categories[plugin.category] || this.categories.general;
        const index = category.indexOf(pluginId);
        if (index > -1) {
            category.splice(index, 1);
        }

        // Remove from registry
        this.plugins.delete(pluginId);

        console.log(`Plugin unregistered: ${plugin.name}`);

        // Save state
        this.savePluginState();

        return true;
    }

    /**
     * Activate a plugin
     */
    async activatePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            console.warn(`Plugin ${pluginId} not found`);
            return false;
        }

        if (!plugin.enabled) {
            console.warn(`Plugin ${pluginId} is disabled`);
            return false;
        }

        // Deactivate current plugin
        if (this.activePlugin && this.activePlugin !== plugin) {
            await this.activePlugin.deactivate();
        }

        // Activate new plugin
        await plugin.activate();
        this.activePlugin = plugin;

        // Update UI
        this.updateToolbarUI();

        console.log(`Plugin activated: ${plugin.name}`);
        return true;
    }

    /**
     * Deactivate a plugin
     */
    async deactivatePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            console.warn(`Plugin ${pluginId} not found`);
            return false;
        }

        if (!plugin.isActive) {
            return true;
        }

        await plugin.deactivate();

        if (this.activePlugin === plugin) {
            this.activePlugin = null;
        }

        // Update UI
        this.updateToolbarUI();

        return true;
    }

    /**
     * Get a plugin by ID
     */
    getPlugin(pluginId) {
        return this.plugins.get(pluginId);
    }

    /**
     * Get all plugins
     */
    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * Get plugins by category
     */
    getPluginsByCategory(category) {
        const pluginIds = this.categories[category] || [];
        return pluginIds.map(id => this.plugins.get(id)).filter(p => p);
    }

    /**
     * Get active plugin
     */
    getActivePlugin() {
        return this.activePlugin;
    }

    /**
     * Enable/disable a plugin
     */
    setPluginEnabled(pluginId, enabled) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;

        plugin.enabled = enabled;

        if (!enabled && plugin.isActive) {
            this.deactivatePlugin(pluginId);
        }

        this.savePluginState();
        this.updateToolbarUI();

        return true;
    }

    /**
     * Update toolbar UI to reflect plugin state
     */
    updateToolbarUI() {
        const buttons = document.querySelectorAll('.plugin-btn');
        buttons.forEach(btn => {
            const pluginId = btn.dataset.pluginId;
            const plugin = this.plugins.get(pluginId);

            if (plugin && plugin.isActive) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Render plugin toolbar
     */
    renderPluginToolbar(containerId = 'plugin-toolbar') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container ${containerId} not found`);
            return;
        }

        let html = '';

        // Render plugins by category
        for (const [category, pluginIds] of Object.entries(this.categories)) {
            if (pluginIds.length === 0) continue;

            html += `<div class="toolbar-section plugin-category-${category}">`;

            pluginIds.forEach(id => {
                const plugin = this.plugins.get(id);
                if (plugin && plugin.enabled) {
                    html += plugin.renderToolbarButton();
                }
            });

            html += '</div>';
        }

        container.innerHTML = html;

        // Attach event listeners
        this.attachToolbarListeners();
    }

    /**
     * Attach event listeners to plugin buttons
     */
    attachToolbarListeners() {
        const buttons = document.querySelectorAll('.plugin-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pluginId = btn.dataset.pluginId;
                this.activatePlugin(pluginId);
            });
        });
    }

    /**
     * Forward canvas events to active plugin
     */
    handleCanvasEvent(eventType, ...args) {
        if (!this.activePlugin) return;

        switch (eventType) {
            case 'mousedown':
                this.activePlugin.onMouseDown(...args);
                break;
            case 'mousemove':
                this.activePlugin.onMouseMove(...args);
                break;
            case 'mouseup':
                this.activePlugin.onMouseUp(...args);
                break;
            case 'click':
                this.activePlugin.onClick(...args);
                break;
            case 'keydown':
                this.activePlugin.onKeyDown(...args);
                break;
            case 'keyup':
                this.activePlugin.onKeyUp(...args);
                break;
        }
    }

    /**
     * Save plugin state to localStorage
     */
    savePluginState() {
        const state = {
            plugins: Array.from(this.plugins.values()).map(p => ({
                id: p.id,
                enabled: p.enabled,
                settings: p.settings
            })),
            activePluginId: this.activePlugin ? this.activePlugin.id : null
        };

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    }

    /**
     * Load plugin state from localStorage
     */
    loadPluginState() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (!stored) return null;

        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error loading plugin state:', e);
            return null;
        }
    }

    /**
     * Export plugin configuration
     */
    exportPluginConfig() {
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            plugins: Array.from(this.plugins.values()).map(p => p.getMetadata())
        };
    }

    /**
     * Get plugin statistics
     */
    getStats() {
        return {
            total: this.plugins.size,
            enabled: Array.from(this.plugins.values()).filter(p => p.enabled).length,
            active: this.activePlugin ? 1 : 0,
            byCategory: Object.entries(this.categories).reduce((acc, [cat, ids]) => {
                acc[cat] = ids.length;
                return acc;
            }, {})
        };
    }
}

// Create and export singleton instance
const pluginManager = new PluginManager();

export { BasePlugin, PluginManager, pluginManager };
