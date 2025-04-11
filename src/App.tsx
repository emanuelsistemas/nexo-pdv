import React, { useEffect, createContext, useState, useContext, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { Copy } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import { handleAuthRedirect, getSupabase } from './lib/supabase';

// Implementando lazy loading para as páginas
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PDV = lazy(() => import('./pages/PDV'));
const Orcamento = lazy(() => import('./pages/Orcamento'));
const Produtos = lazy(() => import('./pages/Produtos'));
const Unidade = lazy(() => import('./pages/Unidade'));
const Grupo = lazy(() => import('./pages/Grupo'));
const Clientes = lazy(() => import('./pages/Clientes'));
const PasswordRecovery = lazy(() => import('./pages/PasswordRecovery'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ResendConfirmation = lazy(() => import('./pages/ResendConfirmation'));
const ManualConfirmation = lazy(() => import('./pages/ManualConfirmation'));
const AIChat = lazy(() => import('./components/AIChat').then(module => ({ default: module.AIChat })));

// Criando context para o tema
type Theme = 'dark' | 'light';
type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {}
});

// Hook para acessar o tema
export const useTheme = () => useContext(ThemeContext);

// Provider do tema
const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Inicializa com o tema salvo no localStorage ou dark como padrão
  const [theme, setTheme] = useState<Theme>('dark');

  // Carrega o tema salvo no localStorage apenas se existir
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }
  }, []);

  // Atualiza o atributo data-theme no HTML quando o tema mudar
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = theme === 'light' ? 'bg-white' : 'bg-gradient-to-br from-slate-900 to-slate-800';
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Função para alternar entre temas
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Override default toast error configuration
const toastErrorConfig: any = {
  autoClose: 8000,
  closeButton: true,
  closeOnClick: false,
  draggable: false,
  icon: () => <span>❌</span>,
  render: (props: any) => (
    <div className="flex items-start gap-3">
      <div className="flex-1 break-all">{props.children}</div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(typeof props.children === 'string' ? props.children : props.children.toString());
          toast.info('Mensagem copiada!', { 
            autoClose: 2000,
            icon: () => <span>✓</span>
          });
        }}
        className="shrink-0 flex items-center gap-1.5 px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors text-xs"
        title="Copiar mensagem"
      >
        <Copy size={14} />
        <span>Copiar</span>
      </button>
    </div>
  )
};

// Override the default toast.error function
const originalError = toast.error;
toast.error = (message, options = {}) => {
  return originalError(message, { ...toastErrorConfig, ...options });
};

function AIChatWrapper() {
  const location = useLocation();
  const publicRoutes = ['/', '/login', '/register', '/password-recovery', '/reset-password', '/resend-confirmation', '/manual-confirmation'];
  
  if (publicRoutes.includes(location.pathname)) {
    return null;
  }

  return <AIChat />;
}

// Componente para o ToastContainer que usa o hook useTheme
function AppToastContainer() {
  const { theme } = useTheme();
  
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss={false}
      draggable={false}
      pauseOnHover={false}
      theme={theme}
      limit={3}
    />
  );
}

// Componente de Loading para usar durante carregamento lazy
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Carregando...</p>
      </div>
    </div>
  );
}

// Inicializar o Supabase em segundo plano - evita bloquear a renderização
const initSupabase = () => {
  // Tentamos inicializar o Supabase depois de um pequeno atraso
  setTimeout(() => {
    try {
      // Inicializar o Supabase em background
      getSupabase();
    } catch (error) {
      console.error('Erro ao inicializar Supabase em background:', error);
    }
  }, 100);
};

function App() {
  // Inicializar Supabase em background sem bloquear a renderização
  useEffect(() => {
    initSupabase();
  }, []);
  
  // Usando useEffect com o segundo argumento [] para executar apenas uma vez
  useEffect(() => {
    // REDIRECIONAMENTO DE DOMÍNIO - detectar redirecionamentos do domínio antigo
    const currentHost = window.location.hostname;
    const oldDomain = 'nexopdv.appbr.io';
    const newDomain = 'nexopdv.emasoftware.io';
    
    // Se o domínio atual é o antigo, redirecionar para o novo com todos os parâmetros
    if (currentHost === oldDomain) {
      const newUrl = window.location.href.replace(oldDomain, newDomain);
      window.location.href = newUrl;
      return;
    }
    
    // Otimiza a lógica de processamento da URL
    const processUrlHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const tokenType = params.get('type');
      
      if (!accessToken) return;
      
      if (tokenType === 'recovery') {
        localStorage.setItem('recovery_token', accessToken);
        window.location.replace('/reset-password');
        return;
      }
      
      if (tokenType === 'signup' || tokenType === 'email_change') {
        localStorage.setItem('access_token', accessToken);
        handleAuthRedirect().then(success => {
          if (!success) window.location.href = '/login';
        });
      }
    };
    
    // Processamos a URL apenas uma vez na inicialização
    processUrlHash();
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pdv" element={<PDV />} />
            <Route path="/orcamento" element={<Orcamento />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/unidade" element={<Unidade />} />
            <Route path="/grupo" element={<Grupo />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/password-recovery" element={<PasswordRecovery />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/resend-confirmation" element={<ResendConfirmation />} />
            <Route path="/manual-confirmation" element={<ManualConfirmation />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
          <AIChatWrapper />
        </Suspense>
        <AppToastContainer />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;