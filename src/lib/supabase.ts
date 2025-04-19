import { createClient } from '@supabase/supabase-js';

// Criação de um cliente Supabase adiado que não bloqueia a renderização
let supabaseInstance: ReturnType<typeof createClient> | null = null;

// Função para obter o cliente Supabase - inicializa lazily
export const getSupabase = () => {
  // Se já inicializamos, retorne a instância existente
  if (supabaseInstance) return supabaseInstance;
  
  try {
    // Get environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    // Validate URL and keys
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Configuração inválida do Supabase. Variáveis de ambiente não estão definidas.');
      return null;
    }

    // Validate URL format
    try { new URL(supabaseUrl); } catch (e) {
      console.error('Invalid Supabase URL format:', e);
      return null;
    }

    // Create Supabase client with optimized configuration
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce' as const,
        storage: window.localStorage,
        storageKey: 'sb-auth-token', // Updated storage key
        debug: import.meta.env.DEV // Enable debug in development
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
      // Add optimized fetch configuration
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: options.signal,
          credentials: 'include',
        }).catch(error => {
          console.error('Supabase fetch error:', error);
          throw error;
        });
      }
    });
    
    return supabaseInstance;
  } catch (error) {
    console.error('Erro ao inicializar o Supabase:', error);
    return null;
  }
};

// Exporta o supabase para compatibilidade com código existente
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get: (target, prop) => {
    const client = getSupabase();
    if (!client) {
      console.error(`Tentativa de acessar propriedade '${String(prop)}' do Supabase, mas o cliente não foi inicializado.`);
      return () => Promise.reject(new Error('Cliente Supabase não inicializado'));
    }
    return client[prop as keyof typeof client];
  }
});

// Enhanced error handling for auth redirect
export const handleAuthRedirect = async () => {
  try {
    // Verificamos se há um hash de autenticação na URL
    const hash = window.location.hash;
    const isRecoveryFlow = hash && hash.includes('type=recovery');
    
    // Manipulamos o fluxo de recuperação de senha
    if (isRecoveryFlow) {
      const accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
      if (accessToken) {
        localStorage.setItem('recovery_token', accessToken);
        return true;
      }
      return false;
    }

    // Inicializamos o Supabase apenas quando necessário
    const client = getSupabase();
    if (!client) {
      console.error('Cliente Supabase não inicializado durante o redirecionamento de autenticação');
      return false;
    }

    // Utilizamos um timeout para não bloquear a interface
    const timeoutPromise = new Promise<false>((resolve) => setTimeout(() => resolve(false), 3000));
    
    // Obtemos a sessão com timeout
    const sessionPromise = client.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Session error:', error);
          return false;
        }
        
        if (session?.user?.email) {
          try {
            // Importação dinâmica para evitar problemas cíclicos
            import('../utils/authUtils').then(({ saveLoginState }) => {
              saveLoginState(session.user.email!);
              window.location.hash = '';
            });
            return true;
          } catch (error) {
            console.error('Error saving login state:', error);
            return false;
          }
        }
        
        return false;
      })
      .catch(error => {
        console.error('Auth redirect error:', error);
        return false;
      });
    
    // Retornamos o primeiro resultado (seja o timeout ou a resposta da API)
    return Promise.race([sessionPromise, timeoutPromise]);
  } catch (error) {
    console.error('Auth redirect error:', error);
    return false;
  }
};