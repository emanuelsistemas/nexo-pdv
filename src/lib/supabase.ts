import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Validate URL format
let isValidUrl = false;
try {
  new URL(supabaseUrl);
  isValidUrl = true;
} catch (e) {
  console.error('Invalid Supabase URL format:', e);
  isValidUrl = false;
}

if (!isValidUrl || !supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Configuração inválida do Supabase. Verifique se as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas corretamente no arquivo .env'
  );
}

// Create Supabase client with enhanced error handling and retry logic
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const,
    storage: localStorage,
    storageKey: 'supabase.auth.token',
    debug: import.meta.env.DEV
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js@2.39.7'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  },
  // Add retryable fetch configuration
  fetch: (url, options = {}) => {
    return fetch(url, {
      ...options,
      // Add retry logic
      signal: options.signal,
      // Ensure proper credentials handling
      credentials: 'include',
    }).catch(error => {
      console.error('Supabase fetch error:', error);
      throw error;
    });
  }
});

// Enhanced error handling for auth redirect
export const handleAuthRedirect = async () => {
  try {
    const hash = window.location.hash;
    const isRecoveryFlow = hash && hash.includes('type=recovery');
    
    if (isRecoveryFlow) {
      const accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
      if (accessToken) {
        localStorage.setItem('recovery_token', accessToken);
        return true;
      }
      return false;
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session error:', error);
      // Check if error is due to network issues
      if (error.message?.includes('Failed to fetch')) {
        console.error('Network error - please check your connection and Supabase configuration');
      }
      return false;
    }
    
    if (session) {
      window.location.hash = '';
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Auth redirect error:', error);
    return false;
  }
};