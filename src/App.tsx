import React, { useEffect, Suspense } from 'react';
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

// Override default toast error configuration
const toastErrorConfig = {
  autoClose: 8000, // 8 seconds
  closeButton: true,
  closeOnClick: false,
  draggable: false,
  icon: '❌',
  // Custom render function to add copy button
  render: (props: any) => (
    <div className="flex items-start gap-3">
      <div className="flex-1 break-all">{props.children}</div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(typeof props.children === 'string' ? props.children : props.children.toString());
          toast.info('Mensagem copiada!', { 
            autoClose: 2000,
            icon: '✓'
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

function App() {
  useEffect(() => {
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
    } else if (hash && hash.includes('type=signup')) {
      handleAuthRedirect().then((success) => {
        if (!success) {
          window.location.href = '/login';
        }
      });
    }
  }, []);

  return (
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
        theme="dark"
        limit={3}
      />
    </BrowserRouter>
  );
}

export default App;