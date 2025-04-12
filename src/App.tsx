import React, { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { Copy } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import { handleAuthRedirect, getSupabase } from './lib/supabase';

// Implementando lazy loading para as páginas
const Landing = lazy(() => import('./pages/Landing'));
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
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = theme === 'light' ? 'bg-white' : 'bg-gradient-to-br from-slate-900 to-slate-800';
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await getSupabase().auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirects to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await getSupabase().auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return <LoadingFallback />;
  }

  // Allow access to landing page even when authenticated
  if (location.pathname === '/') {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
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

const initSupabase = () => {
  setTimeout(() => {
    try {
      getSupabase();
    } catch (error) {
      console.error('Erro ao inicializar Supabase em background:', error);
    }
  }, 100);
};

function App() {
  useEffect(() => {
    initSupabase();
  }, []);
  
  useEffect(() => {
    const currentHost = window.location.hostname;
    const oldDomain = 'nexopdv.appbr.io';
    const newDomain = 'nexopdv.emasoftware.io';
    
    if (currentHost === oldDomain) {
      const newUrl = window.location.href.replace(oldDomain, newDomain);
      window.location.href = newUrl;
      return;
    }
    
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
    
    processUrlHash();
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/password-recovery" element={<PublicRoute><PasswordRecovery /></PublicRoute>} />
            <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
            <Route path="/resend-confirmation" element={<PublicRoute><ResendConfirmation /></PublicRoute>} />
            <Route path="/manual-confirmation" element={<PublicRoute><ManualConfirmation /></PublicRoute>} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/pdv" element={<ProtectedRoute><PDV /></ProtectedRoute>} />
            <Route path="/orcamento" element={<ProtectedRoute><Orcamento /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
            <Route path="/unidade" element={<ProtectedRoute><Unidade /></ProtectedRoute>} />
            <Route path="/grupo" element={<ProtectedRoute><Grupo /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
          </Routes>
          <AIChatWrapper />
        </Suspense>
        <AppToastContainer />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;