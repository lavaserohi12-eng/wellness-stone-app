export const config = {
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'dev',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};
