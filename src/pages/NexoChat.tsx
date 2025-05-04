// Componente modular do Nexo Chat
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import { supabase } from '../lib/supabase';

export default function NexoChat() {
  const navigate = useNavigate();
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved !== null ? saved === 'true' : false;
  });
  const [userInfo, setUserInfo] = useState({
    email: '',
    dev: 'N',
  });

  // Verificar sessão do usuário
  useEffect(() => {
    // Check admin session com localStorage (mesmo método usado no AdminDashboard)
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) {
      navigate('/admin/login');
      return;
    }

    try {
      const session = JSON.parse(adminSession);
      // Usar as informações da sessão para popular os dados do usuário
      setUserInfo({
        email: session.email || '',
        dev: session.dev || 'N',
      });
      
      // Buscar também do Supabase para garantir dados atualizados
      const fetchProfileData = async () => {
        const { data: { session: supaSession } } = await supabase.auth.getSession();
        
        if (supaSession) {
          const { data: userData } = await supabase
            .from('profiles_admin')
            .select('*')
            .eq('user_id', supaSession.user.id)
            .single();

          if (userData) {
            setUserInfo({
              email: supaSession.user.email || '',
              dev: typeof userData.dev === 'string' ? userData.dev : 'N',
            });
          }
        }
      };

      fetchProfileData();
    } catch (error) {
      console.error('Erro ao processar sessão:', error);
      navigate('/admin/login');
    }
  }, [navigate]);

  // Função para fazer logout
  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    navigate('/admin/login');
  };

  return (
    <div className="flex h-screen bg-[#1A1A1A] text-white">
      {/* Sidebar modularizado */}
      <AdminSidebar
        activeMenuItem="/admin/nexochat"
        onLogout={handleLogout}
        collapsed={isSidebarCollapsed}
        onCollapseChange={setIsSidebarCollapsed}
        onAiChatClick={() => setIsAiChatOpen(!isAiChatOpen)}
        isAiChatOpen={isAiChatOpen}
        userInfo={userInfo}
      />
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col">
        <header className="bg-[#2A2A2A] p-4 border-b border-gray-800">
          <h1 className="text-xl font-semibold text-white">Nexo Chat (Modular)</h1>
          <p className="text-sm text-gray-400">Versão modular do chat com WhatsApp</p>
        </header>

        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-emerald-500 mb-4">Em desenvolvimento</h2>
            <p className="text-gray-400 max-w-md">
              O novo chat modular está sendo implementado gradualmente. 
              Em breve estará disponível com uma arquitetura mais eficiente e manutenível.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
