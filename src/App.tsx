import React, { useEffect, createContext, useState, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { Copy } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PDV from './pages/PDV';
import Orcamento from './pages/Orcamento';
import Produtos from './pages/Produtos';
import Unidade from './pages/Unidade';
import Grupo from './pages/Grupo';
import Clientes from './pages/Clientes';
import PasswordRecovery from './pages/PasswordRecovery';
import ResetPassword from './pages/ResetPassword';
import ResendConfirmation from './pages/ResendConfirmation';
import ManualConfirmation from './pages/ManualConfirmation';
import { handleAuthRedirect } from './lib/supabase';
import { AIChat } from './components/AIChat';

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
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as Theme) || 'dark';
  });

  // Atualiza o atributo data-theme no HTML quando o tema mudar
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = theme === 'light' ? 'bg-white' : 'bg-gradient-to-br from-slate-900 to-slate-800';
    localStorage.setItem('theme', theme);
    console.log('Tema alterado para:', theme);
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
  autoClose: 8000, // 8 seconds
  closeButton: true,
  closeOnClick: false,
  draggable: false,
  icon: () => <span>❌</span>, // Usando função para criar um elemento React em vez de string
  // Custom render function to add copy button
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

function App() {
  useEffect(() => {
    // REDIRECIONAMENTO DE DOMÍNIO - detectar redirecionamentos do domínio antigo
    const currentHost = window.location.hostname;
    const oldDomain = 'nexopdv.appbr.io';
    const newDomain = 'nexopdv.emasoftware.io';
    
    // Se o domínio atual é o antigo, redirecionar para o novo com todos os parâmetros
    if (currentHost === oldDomain) {
      const newUrl = window.location.href.replace(oldDomain, newDomain);
      window.location.href = newUrl;
      return; // Para evitar o processamento dos outros códigos enquanto redireciona
    }
    
    // Verifica se há parâmetros de autenticação na URL
    const hash = window.location.hash;
    
    // Se for um link de recuperação de senha
    if (hash && hash.includes('type=recovery')) {
      // Extrair o token de acesso do hash
      const accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
      if (accessToken) {
        // Armazenar o token no localStorage
        localStorage.setItem('recovery_token', accessToken);
        
        // Limpar o hash e redirecionar para a página de reset de senha
        window.location.replace('/reset-password');
      }
    } else if (hash && hash.includes('type=signup') || hash.includes('type=email_change')) {
      handleAuthRedirect().then((success) => {
        if (!success) {
          window.location.href = '/login';
        }
      });
    }
    
    // Outra solução: Verificar se estamos em uma URL de confirmação e guardar o token
    if (hash && hash.includes('access_token=')) {
      const accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
      const tokenType = new URLSearchParams(hash.substring(1)).get('type');
      
      if (accessToken) {
        console.log('Token detectado:', tokenType);
        if (tokenType === 'recovery') {
          localStorage.setItem('recovery_token', accessToken);
          window.location.replace('/reset-password');
        } else if (tokenType === 'signup') {
          // Tentar lidar com confirmação de email
          localStorage.setItem('access_token', accessToken);
          handleAuthRedirect().then((success) => {
            if (!success) {
              window.location.href = '/login';
            }
          });
        }
      }
    }
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
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
      <AppToastContainer />
      
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
