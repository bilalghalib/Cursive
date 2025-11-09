/**
 * Templates Plugin for Cursive
 *
 * Provides quick-start templates and backgrounds for the canvas
 * including grid paper, lined paper, dot grid, calendars, and more.
 */

import { BasePlugin } from '../pluginManager.js';

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
        if (!this.ctx) {
            console.error('Canvas context not available');
            return;
        }

        this.currentTemplate = templateKey;

        // Clear previous template layer
        // In a real implementation, you'd want a separate layer for templates

        switch (templateKey) {
            case 'blank':
                this.applyBlank();
                break;
            case 'grid':
                this.applyGrid();
                break;
            case 'lines':
                this.applyLines();
                break;
            case 'dots':
                this.applyDots();
                break;
            case 'music':
                this.applyMusicStaff();
                break;
            case 'calendar':
                this.applyCalendar();
                break;
            case 'cornell':
                this.applyCornellNotes();
                break;
            case 'storyboard':
                this.applyStoryboard();
                break;
            case 'kanban':
                this.applyKanban();
                break;
            case 'mindmap':
                this.applyMindMap();
                break;
        }

        console.log(`Template applied: ${templateKey}`);
    }

    applyBlank() {
        // Clear canvas
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    applyGrid() {
        const spacing = this.settings.gridSpacing;
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${this.settings.templateOpacity})`;
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x < width; x += spacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y < height; y += spacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    applyLines() {
        const spacing = this.settings.lineSpacing;
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${this.settings.templateOpacity})`;
        this.ctx.lineWidth = 1;

        for (let y = spacing; y < height; y += spacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    applyDots() {
        const spacing = this.settings.dotSpacing;
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.save();
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.templateOpacity})`;

        for (let x = spacing; x < width; x += spacing) {
            for (let y = spacing; y < height; y += spacing) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.restore();
    }

    applyMusicStaff() {
        const staffHeight = 100;
        const lineSpacing = 15;
        const marginTop = 50;
        const width = this.canvas.width;

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${this.settings.templateOpacity})`;
        this.ctx.lineWidth = 1;

        // Draw multiple staffs
        for (let staffY = marginTop; staffY < this.canvas.height - staffHeight; staffY += staffHeight + 50) {
            // Draw 5 lines for each staff
            for (let i = 0; i < 5; i++) {
                const y = staffY + i * lineSpacing;
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(width, y);
                this.ctx.stroke();
            }
        }

        this.ctx.restore();
    }

    applyCalendar() {
        const cols = 7;
        const rows = 5;
        const cellWidth = this.canvas.width / cols;
        const cellHeight = (this.canvas.height - 50) / rows;
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${this.settings.templateOpacity})`;
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.templateOpacity * 2})`;
        this.ctx.lineWidth = 2;
        this.ctx.font = '14px Arial';

        // Draw header
        days.forEach((day, i) => {
            const x = i * cellWidth;
            this.ctx.fillText(day, x + 10, 25);
        });

        // Draw grid
        for (let i = 0; i <= cols; i++) {
            const x = i * cellWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 40);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let i = 0; i <= rows; i++) {
            const y = 40 + i * cellHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    applyCornellNotes() {
        const cueWidth = this.canvas.width * 0.3;
        const summaryHeight = this.canvas.height * 0.2;

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${this.settings.templateOpacity})`;
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.templateOpacity * 2})`;
        this.ctx.lineWidth = 2;
        this.ctx.font = 'bold 16px Arial';

        // Vertical divider
        this.ctx.beginPath();
        this.ctx.moveTo(cueWidth, 0);
        this.ctx.lineTo(cueWidth, this.canvas.height - summaryHeight);
        this.ctx.stroke();

        // Horizontal divider
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height - summaryHeight);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - summaryHeight);
        this.ctx.stroke();

        // Labels
        this.ctx.fillText('Cues', 10, 30);
        this.ctx.fillText('Notes', cueWidth + 10, 30);
        this.ctx.fillText('Summary', 10, this.canvas.height - summaryHeight + 30);

        this.ctx.restore();
    }

    applyStoryboard() {
        const cols = 3;
        const rows = 2;
        const cellWidth = (this.canvas.width - 40) / cols;
        const cellHeight = (this.canvas.height - 40) / rows;
        const margin = 20;

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${this.settings.templateOpacity})`;
        this.ctx.lineWidth = 2;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = margin + col * cellWidth;
                const y = margin + row * cellHeight;

                this.ctx.strokeRect(x, y, cellWidth - 10, cellHeight - 10);
            }
        }

        this.ctx.restore();
    }

    applyKanban() {
        const cols = 3;
        const colWidth = this.canvas.width / cols;
        const labels = ['To Do', 'In Progress', 'Done'];

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${this.settings.templateOpacity})`;
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.templateOpacity * 2})`;
        this.ctx.lineWidth = 2;
        this.ctx.font = 'bold 18px Arial';

        for (let i = 0; i <= cols; i++) {
            const x = i * colWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Header line
        this.ctx.beginPath();
        this.ctx.moveTo(0, 50);
        this.ctx.lineTo(this.canvas.width, 50);
        this.ctx.stroke();

        // Labels
        labels.forEach((label, i) => {
            const x = i * colWidth + colWidth / 2;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(label, x, 30);
        });

        this.ctx.restore();
    }

    applyMindMap() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = 60;
        const branches = 6;

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${this.settings.templateOpacity})`;
        this.ctx.fillStyle = `rgba(0, 123, 255, ${this.settings.templateOpacity})`;
        this.ctx.lineWidth = 2;

        // Central circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Branch lines
        for (let i = 0; i < branches; i++) {
            const angle = (i * 2 * Math.PI) / branches;
            const x = centerX + Math.cos(angle) * 200;
            const y = centerY + Math.sin(angle) * 200;

            this.ctx.beginPath();
            this.ctx.moveTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();

            // Branch circles
            this.ctx.beginPath();
            this.ctx.arc(x, y, 40, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(100, 200, 100, ${this.settings.templateOpacity})`;
            this.ctx.fill();
            this.ctx.stroke();
        }

        this.ctx.restore();
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
