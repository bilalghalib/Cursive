let config = null;
let configPromise = null;

// Attempt to load the configuration immediately
getConfig().catch(error => {
    console.error('Initial configuration load failed:', error);
});

export async function getConfig() {
  if (config) {
    return config;
  }

  if (!configPromise) {
    configPromise = (async () => {
      const response = await fetch('/static/config/config.yaml');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const yamlText = await response.text();
      config = jsyaml.load(yamlText);
      return config;
    })().catch(error => {
      console.error('Failed to load configuration:', error);
      configPromise = null;
      throw error;
    });
  }

  return configPromise;
}
