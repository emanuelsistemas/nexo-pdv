import React from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface ProtectedDevRouteProps {
  children: React.ReactNode;
}

// O componente foi simplificado porque a verificação agora é feita
// diretamente no modal da página de login AdminLogin.tsx
export const ProtectedDevRoute: React.FC<ProtectedDevRouteProps> = ({ children }) => {
  // Verificar se há uma sessão válida 
  const adminSessionStr = localStorage.getItem('admin_session');
  
  // Se não houver sessão, enviar para o login
  if (!adminSessionStr) {
    return <Navigate to="/admin/login" replace />;
  }
  
  try {
    // Verificar se a sessão é válida
    const adminSession = JSON.parse(adminSessionStr);
    
    // Verificar permissões para cadastro de administradores
    // Apenas admins originais com dev='S' podem acessar tela de registro
    if (!adminSession.id || !adminSession.isAdmin) {
      localStorage.removeItem('admin_session');
      return <Navigate to="/admin/login" replace />;
    }
    
    // Verifica se é um admin original e tem permissão de desenvolvedor
    const userType = adminSession.userType || 'admin';
    const isDev = adminSession.dev === 'S';
    
    // Para a rota de registro, apenas admins originais com dev='S' podem acessar
    if (window.location.pathname === '/admin/register' && 
        (userType !== 'admin' || !isDev)) {
      toast.error('Você não tem permissão para acessar esta área');
      return <Navigate to="/admin/dashboard" replace />;
    }
    
    // Se estiver tudo ok, mostrar o conteúdo protegido
    return <>{children}</>;
  } catch (e) {
    // Se ocorrer erro ao processar a sessão
    localStorage.removeItem('admin_session');
    return <Navigate to="/admin/login" replace />;
  }
};

export default ProtectedDevRoute;
