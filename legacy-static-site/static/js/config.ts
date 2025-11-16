/**
 * Configuration loader for Cursive
 * Loads and caches YAML configuration file
 */

import type { AppConfig } from '../types/config';

// Declare global jsyaml (loaded via CDN in index.html)
declare const jsyaml: {
  load(yaml: string): any;
};

let config: AppConfig | null = null;
let configPromise: Promise<AppConfig> | null = null;

/**
 * Loads and caches the application configuration
 * @returns Promise resolving to the application configuration
 */
export async function getConfig(): Promise<AppConfig> {
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
      config = jsyaml.load(yamlText) as AppConfig;
      return config;
    })().catch(error => {
      console.error('Failed to load configuration:', error);
      configPromise = null;
      throw error;
    });
  }

  return configPromise;
}

// Attempt to load the configuration immediately
getConfig().catch(error => {
  console.error('Initial configuration load failed:', error);
});
