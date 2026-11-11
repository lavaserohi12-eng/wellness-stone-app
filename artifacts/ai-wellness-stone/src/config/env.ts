export const env = {
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'dev',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ??
    (typeof window !== 'undefined' && window.location?.origin ? `${window.location.origin}/api` : ''),
  enableDebugScreen:
    (process.env.EXPO_PUBLIC_ENABLE_DEBUG_SCREEN ?? 'true').toLowerCase() === 'true',
};

export const config = {
  appEnv: env.appEnv,
  supabaseUrl: env.supabaseUrl,
  supabaseAnonKey: env.supabaseAnonKey,
  apiBaseUrl: env.apiBaseUrl,
  enableDebugScreen: env.enableDebugScreen,
};
