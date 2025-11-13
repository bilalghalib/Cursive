/**
 * Application Configuration Type Definitions
 */

export interface AppConfig {
  app: {
    version: string;
    name: string;
    max_notebook_items: number;
  };
  canvas: {
    line_color: string;
    line_width: number;
    background_color: string;
  };
  claude: {
    model: string;
    max_tokens: number;
  };
  storage: {
    key: string;
  };
  export: {
    filename: string;
  };
  handwriting: {
    fonts: HandwritingFont[];
    default_font: string;
  };
}

export interface HandwritingFont {
  id: string;
  name: string;
  family: string;
  style?: string;
  weight?: number;
}

export interface RuntimeConfig extends AppConfig {
  baseUrl: string;
  apiEndpoint: string;
}
