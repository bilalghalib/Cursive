/**
 * Plugin System Type Definitions
 */

export interface PluginConfig {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category?: PluginCategory;
  enabled?: boolean;
  version?: string;
  author?: string;
  settings?: Record<string, any>;
}

export type PluginCategory = 'general' | 'drawing' | 'analysis' | 'utility';

export interface IPlugin {
  // Metadata
  id: string;
  name: string;
  description: string;
  icon: string;
  category: PluginCategory;
  enabled: boolean;
  version: string;
  author: string;

  // State
  isActive: boolean;
  isInitialized: boolean;

  // Settings
  settings: Record<string, any>;

  // Canvas context
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;

  // Lifecycle methods
  initialize(): Promise<boolean>;
  activate(): Promise<boolean>;
  deactivate(): Promise<boolean>;
  cleanup(): Promise<boolean>;

  // Event handlers
  onActivate(): void;
  onDeactivate(): void;
  onPointerDown?(e: PointerEvent): void;
  onPointerMove?(e: PointerEvent): void;
  onPointerUp?(e: PointerEvent): void;
  onKeyDown?(e: KeyboardEvent): void;
  onKeyUp?(e: KeyboardEvent): void;

  // UI methods
  render?(): void;
  getToolbarHTML?(): string;
  getSettingsHTML?(): string;
}

export interface PluginManager {
  plugins: Map<string, IPlugin>;
  activePlugin: IPlugin | null;

  register(plugin: IPlugin): void;
  unregister(pluginId: string): void;
  activate(pluginId: string): Promise<void>;
  deactivate(): Promise<void>;
  getPlugin(pluginId: string): IPlugin | undefined;
  getAllPlugins(): IPlugin[];
  getPluginsByCategory(category: PluginCategory): IPlugin[];
}
