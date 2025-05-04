import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Database, Users, LogOut, BarChart2, Store, Search, ChevronLeft, ChevronRight, Trash2, X, Settings as SettingsIcon, MessageCircle, MessageSquare } from 'lucide-react';
import AIChat from '../components/AIChat';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

// Interface para empresas
interface Company {
  id: string;
  name: string;
  document: string;
  segment: string;
  regime_tributario_id: number;
  regime_tributario_descricao?: string; // Descrição do regime obtida por JOIN
  legal_name: string;
  created_at: string;
  status: string;
  user_pai: string; // Email do usuário pai/administrador da empresa
  reseller_id?: string;
  reseller_display?: string;
  [key: string]: any; // Para acesso dinâmico a outros campos
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  // Usar localStorage para manter o estado do menu entre navegações
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Verificar se há uma preferência salva no localStorage
    const savedState = localStorage.getItem('sidebar_collapsed');
    // Se não houver preferência salva, começar retraído por padrão
    return savedState === null ? true : savedState === 'true';
  });
  
  // Estado para controlar a visibilidade do chat com IA
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  
  // Informações do usuário logado
  const [userInfo, setUserInfo] = useState({
    email: '',
    companyName: 'Nexo Sistema',
    nome: '',
    dev: 'N'  // Valor padrão 'N'
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
    console.log('Session data:', session); // Para debug
    
    // Obter o nome do usuário dependendo do tipo de usuário
    let userNome = '';
    
    if (session.userType === 'admin') {
      // Para usuários da tabela profile_admin, o campo é nome_usuario
      userNome = session.nome || '';
    } else if (session.userType === 'admin_user') {
      // Para usuários da tabela profile_admin_user, o campo é nome
      userNome = session.nome || '';
    }
    
    setUserInfo({
      email: session.email || '',
      companyName: session.companyName || 'Nexo Sistema',
      nome: userNome,
      dev: session.dev || 'N'  // Obter o valor do campo dev da sessão
    });

    fetchCompanies();
  }, [navigate]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      
      // Obter a sessão para verificar o reseller_id e dev
      const adminSession = localStorage.getItem('admin_session');
      if (!adminSession) {
        navigate('/admin/login');
        return;
      }
      
      const session = JSON.parse(adminSession);
      const resellerId = session.reseller_id || null;
      const isDev = session.dev === 'S';
      
      // Query para carregar empresas
      let query = supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Se não for dev e tiver reseller_id, aplicar filtro
      if (!isDev && resellerId) {
        query = query.eq('reseller_id', resellerId);
      }
      
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Processar os dados e adicionar as informações de revenda
      const processedCompanies = await Promise.all((data || []).map(async (company) => {
        // Formatar usuário pai
        let userPai = company.user_pai || 'Não definido';
        let resellerInfo = 'Sem revenda';
        
        // Se a empresa tem revenda associada, buscar os dados da revenda
        if (company.reseller_id) {
          const { data: resellerData } = await supabase
            .from('resellers')
            .select('trade_name, code')
            .eq('id', company.reseller_id)
            .maybeSingle();
            
          if (resellerData) {
            resellerInfo = `${resellerData.trade_name} (${resellerData.code})`;
          }
        }

        // Buscar a descrição do regime tributário se o ID estiver definido
        let regimeTributarioDescricao = '';
        if (company.regime_tributario_id) {
          const { data: regimeData } = await supabase
            .from('nfe_regime_tributario')
            .select('descricao')
            .eq('id', company.regime_tributario_id)
            .maybeSingle();
            
          if (regimeData && typeof regimeData.descricao === 'string') {
            regimeTributarioDescricao = regimeData.descricao;
          }
        }

        return {
          ...company,
          user_pai: userPai,
          reseller_display: resellerInfo,
          regime_tributario_descricao: regimeTributarioDescricao
        };
      }));

      // Atualizar o estado com os dados processados
      setCompanies(processedCompanies as Company[]);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      toast.error('Erro ao buscar empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    navigate('/admin/login');
  };

  const handleEditCompany = (companyId: string) => {
    navigate(`/admin/company/${companyId}`);
  };

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;

    try {
      // Call the RPC function with the correct parameter name
      const { error } = await supabase
        .rpc('delete_company_and_related_data', {
          target_company_id: companyToDelete.id
        });

      if (error) throw error;

      toast.success('Empresa e todos os dados relacionados foram excluídos com sucesso!');
      fetchCompanies();
    } catch (error: any) {
      console.error('Erro ao excluir empresa:', error);
      toast.error('Erro ao excluir empresa e dados relacionados');
    } finally {
      setShowDeleteConfirm(false);
      setCompanyToDelete(null);
    }
  };

  const filteredCompanies = companies.filter(company => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      company.trade_name.toLowerCase().includes(searchLower) ||
      company.document_number.includes(searchLower);

    const matchesStatus = selectedStatus === 'all' || company.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className={`bg-[#2A2A2A] transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-16' : 'w-64'} h-screen flex flex-col border-r border-gray-800 relative z-10`}>
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
          <ul className="px-2 py-4 space-y-1">
            {/* Botão de Chat IA na barra lateral */}
            <li>
              <button
                onClick={() => setIsAiChatOpen(!isAiChatOpen)}
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors group relative w-full`}
              >
                <MessageCircle size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
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
                to="/admin/chat"
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors group relative`}
              >
                <MessageSquare size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
                {!isSidebarCollapsed && <span>Chat nexo</span>}
                
                {/* Tooltip quando o menu está retraído */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                    Chat nexo
                  </div>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/admin/dashboard"
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors bg-[#3A3A3A] bg-opacity-50 group relative`}
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
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors group relative`}
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
          <div className={`mt-auto pt-4`}>
            {/* Versão expandida */}
            {!isSidebarCollapsed && (
              <div className="border-t border-gray-800 pt-4 px-2">
                <div className="text-sm font-medium text-white truncate">{userInfo.email}</div>
                
                {/* Menu Revendas abaixo do email - versão expandida (apenas se dev='S') */}
                {userInfo.dev === 'S' && (
                  <div className="mt-4">
                    <Link
                      to="/admin/resellers"
                      className={`flex items-center gap-2 p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors`}
                    >
                      <Users size={18} className="text-emerald-500" />
                      Revendas
                    </Link>
                  </div>
                )}
              </div>
            )}
            
            {/* Versão retraída */}
            {isSidebarCollapsed && (
              <div className="border-t border-gray-800 pt-4 flex justify-center">
                <div className="group relative">
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-medium">
                    {userInfo.email.substring(0, 1).toUpperCase()}
                  </div>
                  
                  {/* Tooltip com o email */}
                  <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                    {userInfo.email}
                  </div>
                  
                  {/* Menu Revendas abaixo do email - versão retraída (apenas se dev='S') */}
                  {userInfo.dev === 'S' && (
                    <div className="mt-4">
                      <Link
                        to="/admin/resellers"
                        className="group relative flex justify-center p-2 rounded-lg hover:bg-[#3A3A3A] transition-colors"
                      >
                        <Store size={18} className="text-emerald-500" />
                        <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                          Revendas
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-[#1C1C1C]">
        <header className="bg-[#2A2A2A] border-b border-gray-800 p-6">
          <h1 className="text-2xl font-bold text-white">Empresas</h1>
          <p className="text-gray-400">Gerencie as empresas cadastradas no sistema</p>
        </header>

        <div className="p-6">
          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Pesquisar empresas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#2A2A2A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-[#2A2A2A] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>

          {/* Companies Table */}
          <div className="bg-[#2A2A2A] rounded-lg border border-gray-800">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-4 text-gray-400 font-medium">Empresa</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Documento</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Usuário PAI</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Data Cadastro</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Revenda</th>
                    <th className="p-4 text-gray-400 font-medium w-[120px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <Store size={20} className="animate-spin" />
                          <span>Carregando usuários nexo...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-400">
                        Nenhuma empresa encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((company) => (
                      <tr key={company.id} className="border-b border-gray-800 hover:bg-[#353535]">
                        <td className="p-4 text-white">{company.trade_name}</td>
                        <td className="p-4 text-white">{company.document_number}</td>
                        <td className="p-4 text-white">{company.user_pai}</td>
                        <td className="p-4 text-white">
                          {new Date(company.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            company.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' :
                            company.status === 'blocked' ? 'bg-red-500/20 text-red-500' :
                            company.status === 'canceled' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {company.status === 'active' ? 'Ativo' :
                             company.status === 'blocked' ? 'Bloqueado' :
                             company.status === 'canceled' ? 'Cancelado' :
                             company.status === 'inactive' ? 'Inativo' : company.status}
                          </span>
                        </td>
                        <td className="p-4 text-white">{company.reseller_display}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditCompany(company.id)}
                              className="p-1 text-blue-400 hover:text-blue-300 rounded-lg"
                              title="Editar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(company)}
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

            {/* Pagination */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  Mostrando {filteredCompanies.length} empresa(s)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    disabled
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && companyToDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#2A2A2A] rounded-lg shadow-lg border border-gray-800 p-6 w-full max-w-[400px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Confirmar Exclusão
                </h3>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-300 mb-6">
                Tem certeza que deseja excluir a empresa "{companyToDelete.trade_name}"? Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#353535] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      


      {/* Componente do Chat com IA */}
      <AIChat 
        isOpen={isAiChatOpen} 
        onClose={() => setIsAiChatOpen(false)} 
        userName={userInfo.nome || userInfo.email}
      />
    </div>
  );
}