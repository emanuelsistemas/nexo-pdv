import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate URL format
let isValidUrl = false;
try {
  new URL(supabaseUrl);
  isValidUrl = true;
} catch (e) {
  isValidUrl = false;
}

if (!isValidUrl || !supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Configuração inválida do Supabase. Verifique se as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas corretamente no arquivo .env'
  );
}

// Configuração do cliente Supabase com site URL e opções adicionais
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
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
  }
});

// Função para lidar com o redirecionamento após autenticação
export const handleAuthRedirect = async () => {
  try {
    // Verifica se é um fluxo de recuperação de senha
    const hash = window.location.hash;
    const isRecoveryFlow = hash && hash.includes('type=recovery');
    
    if (isRecoveryFlow) {
      // Extrai o token de acesso do hash
      const accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
      if (accessToken) {
        // Armazena o token para uso na página de reset de senha
        localStorage.setItem('recovery_token', accessToken);
        return true;
      }
      return false;
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao obter sessão:', error);
      return false;
    }
    
    if (session) {
      // Remove os parâmetros de autenticação da URL
      window.location.hash = '';
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao processar redirecionamento:', error);
    return false;
  }
};