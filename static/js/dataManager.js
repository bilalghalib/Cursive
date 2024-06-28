import { getConfig } from './config.js';

async function getMaxNotebookItems() {
    const config = await getConfig();
    return config.app.max_notebook_items;
}


export async function saveNotebookItem(item) {
    const STORAGE_KEY = await getStorageKey();
    const items = await getAllNotebookItems();
    items.push(item);
    const maxItems = await getMaxNotebookItems();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-maxItems)));
}


export async function updateNotebookItem(updatedItem) {
    const STORAGE_KEY = await getStorageKey();
    const items = await getAllNotebookItems();
    const index = items.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
        items[index] = updatedItem;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
}

export async function deleteNotebookItem(itemId) {
    const STORAGE_KEY = await getStorageKey();
    const items = await getAllNotebookItems();
    const updatedItems = items.filter(item => item.id !== itemId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
}


export async function clearNotebook() {
    const STORAGE_KEY = await getStorageKey();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('drawings');
}

export async function batchUpdateNotebookItems(items) {
    const STORAGE_KEY = await getStorageKey();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function getNotebookItemsInArea(x, y, width, height) {
    const items = await getAllNotebookItems();
    return items.filter(item => {
        return (item.selectionBox.x < x + width &&
                item.selectionBox.x + item.selectionBox.width > x &&
                item.selectionBox.y < y + height &&
                item.selectionBox.y + item.selectionBox.height > y);
    });
}



export async function getInitialDrawingData() {
    try {
        const response = await fetch('./js/initialDrawing.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
            throw new Error('Loaded data is not an array');
        }
        return data;
    } catch (error) {
        console.error('Error loading initial drawing data:', error);
        return []; // Return an empty array if there's an error loading the file
    }
}









async function getStorageKey() {
    const config = await getConfig();
    return config.storage.key;
}

async function getExportFilename() {
    const config = await getConfig();
    return config.export.filename;
}

export async function getAllNotebookItems() {
    const STORAGE_KEY = await getStorageKey();
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

export async function getDrawings() {
    return JSON.parse(localStorage.getItem('drawings') || '[]');
}

export async function saveDrawings(drawings) {
    localStorage.setItem('drawings', JSON.stringify(drawings));
}

export async function exportNotebook() {
    const items = await getAllNotebookItems();
    const drawings = await getDrawings();
    
    const exportData = { items, drawings };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    
    const exportFileDefaultName = await getExportFilename();
    saveAs(blob, exportFileDefaultName);
}

export async function importNotebook(file, config, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        const timeoutId = setTimeout(() => {
            reader.abort();
            reject(new Error('Import timed out'));
        }, timeout);
        
        reader.onload = async function(e) {
            clearTimeout(timeoutId);
            try {
                const importedData = JSON.parse(e.target.result);
                const STORAGE_KEY = config.storage.key;
                
                if (importedData.items && Array.isArray(importedData.items)) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(importedData.items));
                }
                
                if (importedData.drawings && Array.isArray(importedData.drawings)) {
                    localStorage.setItem('drawings', JSON.stringify(importedData.drawings));
                }
                
                resolve(importedData);
            } catch (error) {
                console.error('Error importing notebook:', error);
                reject(error);
            }
        };
        reader.onerror = (error) => {
            clearTimeout(timeoutId);
            reject(error);
        };
        reader.readAsText(file);
    });
}


export async function saveToWeb() {
    try {
        const items = await getAllNotebookItems();
        const drawings = await getDrawings();
        
        const exportData = { items, drawings };
        
        const response = await fetch('/api/save-to-web', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(exportData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            return result.url;
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error saving to web:', error);
        throw error;
    }
}