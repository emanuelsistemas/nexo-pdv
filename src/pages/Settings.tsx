import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Database, Users, LogOut, BarChart2, Box, Search, ChevronLeft, ChevronRight, Trash2, X, Plus, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

// Interface para conexões WhatsApp
interface WhatsAppConnection {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive' | 'connecting';
  created_at: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(false);
  // Usar localStorage para manter o estado do menu entre navegações
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Verificar se há uma preferência salva no localStorage
    const savedState = localStorage.getItem('sidebar_collapsed');
    // Se não houver preferência salva, começar retraído por padrão
    return savedState === null ? true : savedState === 'true';
  });

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    navigate('/admin/login');
  };

  const handleAddWhatsAppConnection = () => {
    // Implementar modal para adicionar nova conexão WhatsApp
    toast.info('Funcionalidade em desenvolvimento');
  };

  return (
    <div className="min-h-screen bg-[#1C1C1C] flex">
      {/* Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-14' : 'w-64'} bg-[#2A2A2A] border-r border-gray-800 transition-all duration-300 relative`}>
        {/* Toggle button */}
        <button 
          onClick={() => {
            const newState = !isSidebarCollapsed;
            setIsSidebarCollapsed(newState);
            // Salvar preferência no localStorage
            localStorage.setItem('sidebar_collapsed', String(newState));
          }}
          className="absolute -right-3 top-[4.5rem] bg-emerald-500 text-white rounded-full p-1 shadow-md hover:bg-emerald-600 transition-colors z-10"
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        
        <div className="p-6 border-b border-gray-800 flex items-center justify-center">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <Database className="w-8 h-8 text-emerald-500 flex-shrink-0" />
            {!isSidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-white font-['MuseoModerno']">nexo</h1>
                <p className="text-sm text-gray-400">Painel de Controle</p>
              </div>
            )}
          </div>
        </div>

        <div className={`${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <ul className="space-y-2">
            <li>
              <Link
                to="/admin/dashboard"
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors group relative`}
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
                to="/admin/dashboard"
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors group relative`}
              >
                <Box size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
                {!isSidebarCollapsed && <span>Empresas</span>}
                
                {/* Tooltip quando o menu está retraído */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                    Empresas
                  </div>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/admin/resellers"
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors group relative`}
              >
                <Users size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
                {!isSidebarCollapsed && <span>Revendedores</span>}
                
                {/* Tooltip quando o menu está retraído */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                    Revendedores
                  </div>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/admin/settings"
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors bg-[#3A3A3A] bg-opacity-50 group relative`}
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-[#2A2A2A] border-b border-gray-800 p-6">
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-gray-400">Gerencie as configurações do sistema</p>
        </header>

        <div className="p-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-800 mb-6">
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'whatsapp'
                  ? 'text-emerald-500 border-b-2 border-emerald-500'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('whatsapp')}
            >
              WhatsApp
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'permissions'
                  ? 'text-emerald-500 border-b-2 border-emerald-500'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('permissions')}
            >
              Permissões de Acesso
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'whatsapp' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Conexões WhatsApp</h2>
                <button
                  onClick={handleAddWhatsAppConnection}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  <span>Adicionar Conexão</span>
                </button>
              </div>

              <div className="bg-[#2A2A2A] rounded-lg border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#353535] text-left">
                        <th className="p-4 text-gray-300 font-medium">Nome</th>
                        <th className="p-4 text-gray-300 font-medium">Número</th>
                        <th className="p-4 text-gray-300 font-medium">Status</th>
                        <th className="p-4 text-gray-300 font-medium">Criado em</th>
                        <th className="p-4 text-gray-300 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-400">
                            Carregando conexões...
                          </td>
                        </tr>
                      ) : whatsappConnections.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-400">
                            Nenhuma conexão WhatsApp configurada. Clique em "Adicionar Conexão" para começar.
                          </td>
                        </tr>
                      ) : (
                        whatsappConnections.map((connection) => (
                          <tr key={connection.id} className="hover:bg-[#333]">
                            <td className="p-4 text-white">{connection.name}</td>
                            <td className="p-4 text-white">{connection.phone}</td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  connection.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : connection.status === 'connecting'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {connection.status === 'active'
                                  ? 'Ativo'
                                  : connection.status === 'connecting'
                                  ? 'Conectando'
                                  : 'Inativo'}
                              </span>
                            </td>
                            <td className="p-4 text-gray-300">
                              {new Date(connection.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button
                                  className="p-1 text-blue-400 hover:text-blue-300 rounded-lg"
                                  title="Editar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  className="p-1 text-red-400 hover:text-red-300 rounded-lg"
                                  title="Excluir"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Permissões de Acesso</h2>
              <div className="bg-[#2A2A2A] rounded-lg border border-gray-800 p-6">
                <p className="text-gray-300 mb-4">
                  Configure as permissões de acesso para os usuários do sistema.
                </p>
                <div className="grid gap-6">
                  <div className="p-4 bg-[#353535] rounded-lg border border-gray-700">
                    <h3 className="text-lg font-medium text-white mb-3">Configurações em desenvolvimento</h3>
                    <p className="text-gray-400">
                      Esta seção está em desenvolvimento. Em breve você poderá configurar permissões detalhadas para cada tipo de usuário do sistema.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
