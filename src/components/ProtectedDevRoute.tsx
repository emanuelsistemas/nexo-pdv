import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedDevRouteProps {
  children: React.ReactNode;
}

// O componente foi simplificado porque a verificação agora é feita
// diretamente no modal da página de login AdminLogin.tsx
export const ProtectedDevRoute: React.FC<ProtectedDevRouteProps> = ({ children }) => {
  // Verificar se há uma sessão válida (criada após verificação dev no modal)
  const adminSessionStr = localStorage.getItem('admin_session');
  
  // Se não houver sessão, enviar para o login
  if (!adminSessionStr) {
    return <Navigate to="/admin/login" replace />;
  }
  
  try {
    // Verificar se a sessão é válida
    const adminSession = JSON.parse(adminSessionStr);
    
    if (!adminSession.id || !adminSession.isAdmin) {
      localStorage.removeItem('admin_session');
      return <Navigate to="/admin/login" replace />;
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
