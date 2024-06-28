let config = null;
let configLoaded = false;

async function loadConfig() {
    try {
        const response = await fetch('/config/config.yaml');
        const yamlText = await response.text();
        config = jsyaml.load(yamlText);
        configLoaded = true;
    } catch (error) {
        console.error('Failed to load configuration:', error);
    }
}

// Attempt to load the configuration immediately
getConfig().catch(error => {
    console.error('Initial configuration load failed:', error);
});

// Load the config immediately
loadConfig();

export async function getConfig() {
    if (config) {
        return config;
    }
    
    try {
        const response = await fetch('/static/config/config.yaml');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const yamlText = await response.text();
        config = jsyaml.load(yamlText);
        return config;
    } catch (error) {
        console.error('Failed to load configuration:', error);
        throw error;
    }
}