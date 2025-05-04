import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { MessageCircle, BarChart2, Store, Settings as SettingsIcon, LogOut, Database, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Definindo a interface para as props do componente
interface AdminSidebarProps {
  // Propriedade opcional para destacar um item de menu específico
  activeMenuItem?: string;
  // Propriedade opcional para ações customizadas
  onLogout?: () => void;
  // Propriedade opcional para controlar externamente o estado do menu
  collapsed?: boolean;
  // Handler opcional para quando o estado do colapso muda
  onCollapseChange?: (collapsed: boolean) => void;
  // Handler opcional para o chat do assistente IA
  onAiChatClick?: () => void;
  // Estado opcional do chat IA para destacar o botão quando ativo
  isAiChatOpen?: boolean;
  // Informações do usuário
  userInfo?: {
    email: string;
    dev: string;
    [key: string]: any;
  };
}

export default function AdminSidebar({
  activeMenuItem,
  onLogout,
  collapsed: externalCollapsed,
  onCollapseChange,
  onAiChatClick,
  isAiChatOpen = false,
  userInfo
}: AdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determinar automaticamente o item ativo com base na URL se não for fornecido
  const currentPath = location.pathname;
  const autoActiveMenuItem = activeMenuItem || currentPath;
  
  // Usar localStorage para manter o estado do menu entre navegações
  // Permitir controle externo do estado se collapsed for fornecido
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (externalCollapsed !== undefined) return externalCollapsed;
    
    // Verificar se há uma preferência salva no localStorage
    const savedState = localStorage.getItem('sidebar_collapsed');
    // Se não houver preferência salva, começar retraído por padrão
    return savedState === null ? true : savedState === 'true';
  });
  
  // Atualizar estado interno quando externalCollapsed mudar
  useEffect(() => {
    if (externalCollapsed !== undefined) {
      setIsSidebarCollapsed(externalCollapsed);
    }
  }, [externalCollapsed]);
  
  // Informações do usuário logado - usando o valor passado como prop ou um fallback
  const [localUserInfo, setLocalUserInfo] = useState({
    email: '',
    companyName: 'Nexo Sistema',
    nome: '',
    dev: 'N'  // Valor padrão 'N'
  });
  
  // Usar as informações do usuário fornecidas como prop ou o estado local
  const effectiveUserInfo = userInfo || localUserInfo;

  useEffect(() => {
    // Check admin session
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) {
      navigate('/admin/login');
      return;
    }

    const session = JSON.parse(adminSession);
    const sessionAge = Date.now() - session.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxAge) {
      localStorage.removeItem('admin_session');
      navigate('/admin/login');
      return;
    }
    
    // Extrair informações do usuário da sessão
    let userNome = '';
    
    if (session.userType === 'admin') {
      // Para usuários da tabela profile_admin, o campo é nome_usuario
      userNome = session.nome || '';
    } else if (session.userType === 'admin_user') {
      // Para usuários da tabela profile_admin_user, o campo é nome
      userNome = session.nome || '';
    }
    
    setLocalUserInfo({
      email: session.email || '',
      companyName: session.companyName || 'Nexo Sistema',
      nome: userNome,
      dev: session.dev || 'N'
    });
  }, [navigate]);

  // Função para alternar o estado do menu
  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    
    // Salvar preferência no localStorage
    localStorage.setItem('sidebar_collapsed', String(newState));
    
    // Chamar o callback se fornecido
    if (onCollapseChange) {
      onCollapseChange(newState);
    }
  };

  // Função de logout - usar a passada por props ou a implementação padrão
  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await supabase.auth.signOut();
      localStorage.removeItem('admin_session');
      navigate('/admin/login');
    }
  };

  // Função auxiliar para verificar se um item está ativo
  const isActive = (path: string) => {
    if (path === '/admin/dashboard' && (autoActiveMenuItem === '/admin' || autoActiveMenuItem === '/admin/dashboard')) {
      return true;
    }
    return autoActiveMenuItem === path;
  };

  return (
    <div className={`bg-[#2A2A2A] transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-16' : 'w-64'} h-screen flex flex-col border-r border-gray-800 relative z-10`}>
      {/* Toggle button */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-[4.5rem] bg-emerald-500 text-white rounded-full p-1 shadow-md hover:bg-emerald-600 transition-colors z-10"
      >
        {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      
      <div className="p-6 border-b border-gray-800 flex items-center justify-center">
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <Database className="w-8 h-8 text-emerald-500 flex-shrink-0" />
          {!isSidebarCollapsed && (
            <div>
              <h2 className="text-white font-semibold">Nexo Sistema</h2>
              <p className="text-xs text-gray-400">Painel Administrativo</p>
            </div>
          )}
        </div>
      </div>
      
      <div className={`${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
        <ul className="space-y-1">
          <li>
            <button
              onClick={onAiChatClick}
              className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors ${isAiChatOpen ? 'bg-[#3A3A3A] bg-opacity-50' : ''} group relative w-full`}
            >
              <MessageCircle size={isSidebarCollapsed ? 22 : 18} className={isAiChatOpen ? 'text-blue-500' : 'text-emerald-500'} />
              {!isSidebarCollapsed && <span>Assistente IA</span>}
              
              {/* Tooltip quando o menu está retraído */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                  Assistente IA
                </div>
              )}
            </button>
          </li>
          <li>
            <Link
              to="/admin/dashboard"
              className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors ${isActive('/admin/dashboard') ? 'bg-[#3A3A3A] bg-opacity-50' : ''} group relative`}
            >
              <BarChart2 size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
              {!isSidebarCollapsed && <span>Dashboard</span>}
              
              {/* Tooltip quando o menu está retraído */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                  Dashboard
                </div>
              )}
            </Link>
          </li>
          <li>
            <Link
              to="/admin/chat"
              className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors ${isActive('/admin/chat') ? 'bg-[#3A3A3A] bg-opacity-50' : ''} group relative`}
            >
              <MessageCircle size={isSidebarCollapsed ? 22 : 18} className="text-blue-500" />
              {!isSidebarCollapsed && <span>Chat</span>}
              
              {/* Tooltip quando o menu está retraído */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                  Chat
                </div>
              )}
            </Link>
          </li>
          <li>
            <Link
              to="/admin/dashboard"
              className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors group relative`}
            >
              <Store size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
              {!isSidebarCollapsed && <span>Users nexo</span>}
              
              {/* Tooltip quando o menu está retraído */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                  Users nexo
                </div>
              )}
            </Link>
          </li>
          <li>
            <Link
              to="/admin/settings"
              className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors ${isActive('/admin/settings') ? 'bg-[#3A3A3A] bg-opacity-50' : ''} group relative`}
            >
              <SettingsIcon size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
              {!isSidebarCollapsed && <span>Configurações</span>}
              
              {/* Tooltip quando o menu está retraído */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                  Configurações
                </div>
              )}
            </Link>
          </li>
          <li>
            <button
              onClick={handleLogout}
              className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-red-400 hover:bg-red-400 hover:text-white hover:bg-opacity-20 transition-colors w-full text-left group relative`}
            >
              <LogOut size={isSidebarCollapsed ? 22 : 18} />
              {!isSidebarCollapsed && <span>Sair</span>}
              
              {/* Tooltip quando o menu está retraído */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                  Sair
                </div>
              )}
            </button>
          </li>
        </ul>
        
        {/* Info do usuário */}
        <div className="mt-auto pt-4 border-t border-gray-800 mt-6">
          {!isSidebarCollapsed && (
            <div className="text-sm text-gray-400">
              <p className="truncate">{effectiveUserInfo.email}</p>
              <p className="truncate">{effectiveUserInfo.nome}</p>
              {/* Menu Revendas abaixo do email - versão expandida (apenas se dev='S') */}
              {effectiveUserInfo.dev === 'S' && (
                <div className="mt-4">
                  <Link
                    to="/admin/resellers"
                    className={`flex items-center gap-2 p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors ${isActive('/admin/resellers') ? 'bg-[#3A3A3A] bg-opacity-50' : ''}`}
                  >
                    <Users size={18} className="text-emerald-500" />
                    Revendas
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
