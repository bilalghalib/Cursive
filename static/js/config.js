let config = null;
let configLoaded = false;

async function loadConfig() {
    try {
        const response = await fetch('config.yaml');
        const yamlText = await response.text();
        config = jsyaml.load(yamlText);
        configLoaded = true;
    } catch (error) {
        console.error('Failed to load configuration:', error);
    }
}

// Load the config immediately
loadConfig();

export async function getConfig() {
    if (!configLoaded) {
        await loadConfig();
    }
    return config;
}
