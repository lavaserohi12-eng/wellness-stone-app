import { config } from './env';

export const appConfig = {
  appName: 'AI Wellness Stone',
  appVersion: 'v0.1',
  appEnv: config.appEnv,
  enableDebugScreen: config.enableDebugScreen,
  supabaseUrlConfigured: Boolean(config.supabaseUrl),
  supabaseAnonKeyConfigured: Boolean(config.supabaseAnonKey),
  apiBaseUrlConfigured: Boolean(config.apiBaseUrl),
};

export type AppConfig = typeof appConfig;
