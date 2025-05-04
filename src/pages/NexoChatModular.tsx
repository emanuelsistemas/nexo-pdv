import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import { ChatProvider } from '../contexts/ChatContext';
import Chat from '../components/chat/Chat';

const NexoChatModular: React.FC = () => {
  const navigate = useNavigate();
  // Estado para dados do usuário e controle da interface
  const [loading, setLoading] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [userData, setUserData] = useState<any>(null);

  // Verificar sessão do usuário
  useEffect(() => {
    // Verificar admin_session no localStorage (igual ao AdminDashboard)
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) {
      navigate('/admin/login');
      return;
    }

    const session = JSON.parse(adminSession);
    const sessionAge = Date.now() - session.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    if (sessionAge > maxAge) {
      localStorage.removeItem('admin_session');
      navigate('/admin/login');
      return;
    }
    
    // Extrair informações do usuário da sessão
    console.log('Session data para Chat Modular:', session);
    
    // Obter o nome do usuário dependendo do tipo de usuário
    let userNome = '';
    
    if (session.userType === 'admin') {
      // Para usuários da tabela profile_admin, o campo é nome_usuario
      userNome = session.nome || '';
    } else if (session.userType === 'admin_user') {
      // Para usuários da tabela profile_admin_user, o campo é nome
      userNome = session.nome || '';
    }
    
    setUserData({
      email: session.email || '',
      companyName: session.companyName || 'Nexo Sistema',
      nome: userNome,
      dev: session.dev || 'N'
    });

    // Autenticação bem-sucedida
    setLoading(false);
  }, [navigate]);

  // Função de logout
  const handleLogout = async () => {
    try {
      localStorage.removeItem('admin_session');
      navigate('/admin/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Não precisamos mais da função toggleSidebar, pois estamos usando onCollapseChange

  // Exibir tela de carregamento
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-pulse text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Barra lateral */}
      <AdminSidebar
        collapsed={!sidebarOpen}
        onCollapseChange={(collapsed) => setSidebarOpen(!collapsed)}
        onLogout={handleLogout}
        userInfo={userData}
      />

      {/* Conteúdo principal */}
      <div className="flex-1 bg-[#1C1C1C] flex flex-col overflow-hidden">
        {/* Área do chat */}
        <main className="flex-1 overflow-hidden">
          <ChatProvider>
            <Chat />
          </ChatProvider>
        </main>
      </div>
    </div>
  );
};

export default NexoChatModular;
