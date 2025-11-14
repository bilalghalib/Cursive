/**
 * Templates Plugin for Cursive
 *
 * Provides quick-start templates and backgrounds for the canvas
 * including grid paper, lined paper, dot grid, calendars, and more.
 */

import { BasePlugin } from '../pluginManager.js';
import { setBackgroundTemplate, toggleBackgroundTemplate, isBackgroundTemplateEnabled } from '../canvasManager.js';

class TemplatesPlugin extends BasePlugin {
    constructor() {
        super({
            id: 'templates-tool',
            name: 'Templates',
            description: 'Add templates and backgrounds to canvas',
            icon: 'fa-file-alt',
            category: 'utility',
            version: '1.0.0',
            author: 'Cursive Team',
            settings: {
                templateOpacity: 0.3,
                gridSpacing: 20,
                lineSpacing: 30,
                dotSpacing: 20,
                customTemplates: []
            }
        });

        this.templates = {
            blank: {
                name: 'Blank',
                description: 'Clear canvas',
                icon: 'fa-file'
            },
            grid: {
                name: 'Grid Paper',
                description: 'Square grid pattern',
                icon: 'fa-th'
            },
            lines: {
                name: 'Lined Paper',
                description: 'Horizontal lines',
                icon: 'fa-align-justify'
            },
            dots: {
                name: 'Dot Grid',
                description: 'Dot grid pattern',
                icon: 'fa-braille'
            },
            music: {
                name: 'Music Staff',
                description: 'Musical notation lines',
                icon: 'fa-music'
            },
            calendar: {
                name: 'Weekly Calendar',
                description: '7-day calendar grid',
                icon: 'fa-calendar-week'
            },
            Cornell: {
                name: 'Cornell Notes',
                description: 'Cornell note-taking format',
                icon: 'fa-columns'
            },
            storyboard: {
                name: 'Storyboard',
                description: '6-panel storyboard',
                icon: 'fa-film'
            },
            kanban: {
                name: 'Kanban Board',
                description: 'Todo/In Progress/Done columns',
                icon: 'fa-tasks'
            },
            mindmap: {
                name: 'Mind Map',
                description: 'Central topic with branches',
                icon: 'fa-project-diagram'
            }
        };

        this.currentTemplate = null;
    }

    async initialize() {
        await super.initialize();
        console.log('Templates Plugin initialized');
        return true;
    }

    onActivate() {
        this.showTemplatePanel();
    }

    onDeactivate() {
        this.hideTemplatePanel();
    }

    showTemplatePanel() {
        let panel = document.getElementById('template-panel');
        if (panel) {
            panel.style.display = 'block';
            return;
        }

        panel = document.createElement('div');
        panel.id = 'template-panel';
        panel.style.cssText = `
            position: fixed;
            right: 20px;
            top: 80px;
            width: 350px;
            max-height: 80vh;
            overflow-y: auto;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
        `;

        panel.innerHTML = `
            <div class="template-panel-header">
                <h3 style="margin: 0 0 12px 0;">Templates</h3>
                <button id="template-close-btn" style="float: right; margin-top: -30px;">×</button>
            </div>

            <div class="template-options" style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <button id="template-toggle-btn" style="padding: 8px 16px; flex: 1; cursor: pointer; border-radius: 4px; border: 2px solid #007bff; background: ${isBackgroundTemplateEnabled() ? '#007bff' : 'white'}; color: ${isBackgroundTemplateEnabled() ? 'white' : '#007bff'}; font-weight: bold;">
                        <i class="fas fa-${isBackgroundTemplateEnabled() ? 'eye' : 'eye-slash'}"></i>
                        ${isBackgroundTemplateEnabled() ? 'Hide Background' : 'Show Background'}
                    </button>
                </div>
                <label style="display: flex; align-items: center; gap: 8px;">
                    <span>Opacity:</span>
                    <input type="range" id="template-opacity" min="0" max="100"
                           value="${this.settings.templateOpacity * 100}"
                           style="flex: 1;">
                    <span id="opacity-value">${Math.round(this.settings.templateOpacity * 100)}%</span>
                </label>
            </div>

            <div class="template-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                ${Object.entries(this.templates).map(([key, template]) => `
                    <div class="template-card" data-template="${key}"
                         style="border: 2px solid #ccc; border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.2s; text-align: center;">
                        <i class="fas ${template.icon}" style="font-size: 32px; margin-bottom: 8px; color: #666;"></i>
                        <h4 style="margin: 0 0 4px 0; font-size: 14px;">${template.name}</h4>
                        <p style="margin: 0; font-size: 11px; color: #666;">${template.description}</p>
                    </div>
                `).join('')}
            </div>

            <div class="template-custom" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #ccc;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">Custom Templates</h4>
                <button id="save-template-btn" class="btn-secondary" style="width: 100%; padding: 8px;">
                    <i class="fas fa-save"></i> Save Current as Template
                </button>
            </div>
        `;

        document.body.appendChild(panel);
        this.attachTemplatePanelListeners();
    }

    hideTemplatePanel() {
        const panel = document.getElementById('template-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    attachTemplatePanelListeners() {
        // Toggle button
        const toggleBtn = document.getElementById('template-toggle-btn');
        toggleBtn.addEventListener('click', () => {
            const isEnabled = toggleBackgroundTemplate();
            toggleBtn.style.background = isEnabled ? '#007bff' : 'white';
            toggleBtn.style.color = isEnabled ? 'white' : '#007bff';
            toggleBtn.innerHTML = `
                <i class="fas fa-${isEnabled ? 'eye' : 'eye-slash'}"></i>
                ${isEnabled ? 'Hide Background' : 'Show Background'}
            `;
        });

        // Template cards
        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                const templateKey = card.dataset.template;
                this.applyTemplate(templateKey);

                // Visual feedback
                document.querySelectorAll('.template-card').forEach(c =>
                    c.style.borderColor = '#ccc'
                );
                card.style.borderColor = '#007bff';
            });

            card.addEventListener('mouseenter', () => {
                card.style.transform = 'scale(1.05)';
                card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'scale(1)';
                card.style.boxShadow = 'none';
            });
        });

        // Opacity slider
        const opacitySlider = document.getElementById('template-opacity');
        const opacityValue = document.getElementById('opacity-value');

        opacitySlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.settings.templateOpacity = value / 100;
            opacityValue.textContent = `${value}%`;

            // Reapply current template with new opacity
            if (this.currentTemplate) {
                this.applyTemplate(this.currentTemplate);
            }
        });

        // Save template button
        document.getElementById('save-template-btn').addEventListener('click', () => {
            this.saveCurrentAsTemplate();
        });

        // Close button
        document.getElementById('template-close-btn').addEventListener('click', () => {
            this.hideTemplatePanel();
        });
    }

    applyTemplate(templateKey) {
        this.currentTemplate = templateKey;

        // Use the new background template system
        setBackgroundTemplate(templateKey, {
            templateOpacity: this.settings.templateOpacity,
            gridSpacing: this.settings.gridSpacing,
            lineSpacing: this.settings.lineSpacing,
            dotSpacing: this.settings.dotSpacing
        });

        console.log(`Template applied: ${templateKey}`);
    }

    saveCurrentAsTemplate() {
        // Save current canvas state as a custom template
        if (!this.canvas) return;

        const templateName = prompt('Enter a name for this template:');
        if (!templateName) return;

        const dataURL = this.canvas.toDataURL();

        this.settings.customTemplates.push({
            name: templateName,
            data: dataURL,
            created: new Date().toISOString()
        });

        alert(`Template "${templateName}" saved successfully!`);
    }

    renderSettings() {
        return `
            <div class="plugin-settings" id="${this.id}-settings">
                <h3>${this.name} Settings</h3>
                <label>
                    Grid spacing (px):
                    <input type="number" id="template-grid-spacing" min="5" max="100"
                           value="${this.settings.gridSpacing}">
                </label>
                <label>
                    Line spacing (px):
                    <input type="number" id="template-line-spacing" min="10" max="100"
                           value="${this.settings.lineSpacing}">
                </label>
            </div>
        `;
    }
}

export default TemplatesPlugin;
