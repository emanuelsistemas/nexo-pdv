import { useState, useEffect } from 'react';
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

// Interface para usuários
interface Usuario {
  id: string;
  admin_id: string;
  nome: string;
  email: string;
  tipo: string;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para o modal de adicionar usuário
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    tipo: 'Administrativo',
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });
  const [errors, setErrors] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });
  // Usar localStorage para manter o estado do menu entre navegações
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Verificar se há uma preferência salva no localStorage
    const savedState = localStorage.getItem('sidebar_collapsed');
    // Se não houver preferência salva, começar retraído por padrão
    return savedState === null ? true : savedState === 'true';
  });
  
  // Informações do usuário logado
  const [userInfo, setUserInfo] = useState({
    email: '',
    companyName: 'Nexo Sistema'
  });
  
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
    setUserInfo({
      email: session.email || '',
      companyName: session.companyName || 'Nexo Sistema'
    });
    
    // Carregar usuários vinculados ao administrador logado
    loadUsers(session.id);
  }, [navigate]);
  
  // Função para carregar os usuários vinculados ao admin_id
  const loadUsers = async (adminId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profile_admin_user')
        .select('*')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      if (data) {
        setUsuarios(data);
      }
      
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    navigate('/admin/login');
  };

  const handleAddWhatsAppConnection = () => {
    // Implementar modal para adicionar nova conexão WhatsApp
    toast.info('Funcionalidade em desenvolvimento');
  };

  const handleAddUsuario = () => {
    // Limpar os dados do formulário e abrir o modal
    setNewUser({
      tipo: 'Administrativo',
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: ''
    });
    setErrors({
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: ''
    });
    setShowAddUserModal(true);
  };
  
  const closeAddUserModal = () => {
    setShowAddUserModal(false);
  };
  
  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
    
    // Limpar erro ao digitar
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Validar senha em tempo real
    if (name === 'senha' || name === 'confirmarSenha') {
      const senha = name === 'senha' ? value : newUser.senha;
      const confirmarSenha = name === 'confirmarSenha' ? value : newUser.confirmarSenha;
      
      if (senha && confirmarSenha && senha !== confirmarSenha) {
        setErrors(prev => ({ ...prev, confirmarSenha: 'As senhas não coincidem' }));
      } else {
        setErrors(prev => ({ ...prev, confirmarSenha: '' }));
      }
    }
  };
  
  const validateForm = () => {
    let valid = true;
    const newErrors = {
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: ''
    };
    
    if (!newUser.nome) {
      newErrors.nome = 'Nome é obrigatório';
      valid = false;
    }
    
    if (!newUser.email) {
      newErrors.email = 'Email é obrigatório';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      newErrors.email = 'Email inválido';
      valid = false;
    }
    
    if (!newUser.senha) {
      newErrors.senha = 'Senha é obrigatória';
      valid = false;
    } else if (newUser.senha.length < 6) {
      newErrors.senha = 'Senha deve ter no mínimo 6 caracteres';
      valid = false;
    }
    
    if (!newUser.confirmarSenha) {
      newErrors.confirmarSenha = 'Confirme sua senha';
      valid = false;
    } else if (newUser.senha !== newUser.confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem';
      valid = false;
    }
    
    setErrors(newErrors);
    return valid;
  };
  
  const handleCreateUser = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      // Obter o ID do administrador da sessão
      const adminSession = localStorage.getItem('admin_session');
      if (!adminSession) {
        toast.error('Sessão expirada. Faça login novamente.');
        navigate('/admin/login');
        return;
      }
      
      const session = JSON.parse(adminSession);
      const adminId = session.id;
      
      // Criar o usuário no Supabase, vinculado ao admin_id
      const { data, error } = await supabase
        .from('profile_admin_user')
        .insert([
          {
            admin_id: adminId,
            nome: newUser.nome,
            email: newUser.email,
            senha: newUser.senha, // Em produção, esta senha deveria ser hashed
            tipo: newUser.tipo,
            status: 'active'
          }
        ])
        .select();
        
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        toast.success('Usuário criado com sucesso!');
        closeAddUserModal();
        
        // Adicionar o novo usuário à lista
        setUsuarios(prev => [data[0], ...prev]);
      }
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error('Erro ao criar usuário: ' + error.message);
    }
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
          
          {/* Footer com informações do usuário */}
          <div className={`mt-auto pt-4 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
            <div className="border-t border-gray-800 pt-4 px-2">
              <div className="text-sm font-medium text-white truncate">{userInfo.companyName}</div>
              <div className="text-xs text-gray-400 truncate">{userInfo.email}</div>
            </div>
          </div>
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
                activeTab === 'usuarios'
                  ? 'text-emerald-500 border-b-2 border-emerald-500'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('usuarios')}
            >
              Usuários
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

          {activeTab === 'usuarios' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Usuários do Sistema</h2>
                <button
                  onClick={handleAddUsuario}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  <span>Adicionar Usuário</span>
                </button>
              </div>

              <div className="bg-[#2A2A2A] rounded-lg border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#353535] text-left">
                        <th className="p-4 text-gray-300 font-medium">Nome</th>
                        <th className="p-4 text-gray-300 font-medium">Email</th>
                        <th className="p-4 text-gray-300 font-medium">Cargo</th>
                        <th className="p-4 text-gray-300 font-medium">Status</th>
                        <th className="p-4 text-gray-300 font-medium">Criado em</th>
                        <th className="p-4 text-gray-300 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-gray-400">
                            Carregando usuários...
                          </td>
                        </tr>
                      ) : usuarios.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-gray-400">
                            Nenhum usuário cadastrado. Clique em "Adicionar Usuário" para começar.
                          </td>
                        </tr>
                      ) : (
                        usuarios.map((usuario) => (
                          <tr key={usuario.id} className="hover:bg-[#333]">
                            <td className="p-4 text-white">{usuario.nome}</td>
                            <td className="p-4 text-white">{usuario.email}</td>
                            <td className="p-4 text-white">{usuario.tipo}</td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  usuario.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : usuario.status === 'inactive'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {usuario.status === 'active'
                                  ? 'Ativo'
                                  : usuario.status === 'inactive'
                                  ? 'Inativo'
                                  : 'Bloqueado'}
                              </span>
                            </td>
                            <td className="p-4 text-gray-300">
                              {new Date(usuario.created_at).toLocaleDateString()}
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
        </div>
      </div>
      
      {/* Modal para adicionar usuário */}
      {showAddUserModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={closeAddUserModal} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div 
              className="bg-[#2A2A2A] rounded-lg shadow-lg border border-gray-800 p-6 w-full max-w-md" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Adicionar Novo Usuário
                </h3>
                <button
                  onClick={closeAddUserModal}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Usuário</label>
                  <select
                    name="tipo"
                    value={newUser.tipo}
                    onChange={handleUserInputChange}
                    className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="Proprietario">Proprietário</option>
                    <option value="Tecnico">Técnico</option>
                    <option value="Administrativo">Administrativo</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                  <input
                    type="text"
                    name="nome"
                    value={newUser.nome}
                    onChange={handleUserInputChange}
                    className={`w-full px-4 py-2 bg-[#1C1C1C] border ${errors.nome ? 'border-red-500' : 'border-gray-800'} rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    placeholder="Nome completo"
                  />
                  {errors.nome && <p className="mt-1 text-sm text-red-500">{errors.nome}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleUserInputChange}
                    className={`w-full px-4 py-2 bg-[#1C1C1C] border ${errors.email ? 'border-red-500' : 'border-gray-800'} rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    placeholder="exemplo@email.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
                  <input
                    type="password"
                    name="senha"
                    value={newUser.senha}
                    onChange={handleUserInputChange}
                    className={`w-full px-4 py-2 bg-[#1C1C1C] border ${errors.senha ? 'border-red-500' : 'border-gray-800'} rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    placeholder="••••••••"
                  />
                  {errors.senha && <p className="mt-1 text-sm text-red-500">{errors.senha}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    name="confirmarSenha"
                    value={newUser.confirmarSenha}
                    onChange={handleUserInputChange}
                    className={`w-full px-4 py-2 bg-[#1C1C1C] border ${errors.confirmarSenha ? 'border-red-500' : 'border-gray-800'} rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    placeholder="••••••••"
                  />
                  {errors.confirmarSenha && <p className="mt-1 text-sm text-red-500">{errors.confirmarSenha}</p>}
                </div>
                
                <button
                  onClick={handleCreateUser}
                  className="w-full mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  Criar Usuário
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
