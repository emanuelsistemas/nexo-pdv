import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, X, PauseCircle, PlayCircle, Store } from 'lucide-react';
import AIChat from '../components/AIChat';
import AdminSidebar from '../components/admin/AdminSidebar';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

interface Reseller {
  id: string;
  trade_name: string;
  document_number: string;
  legal_name: string;
  created_at: string;
  status: string;
  code?: string; // Código único de 5 dígitos
}

export default function Resellers() {
  const navigate = useNavigate();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resellerToDelete, setResellerToDelete] = useState<Reseller | null>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  
  // Usar localStorage para manter o estado do menu entre navegações
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Verificar se há uma preferência salva no localStorage
    const savedState = localStorage.getItem('sidebar_collapsed');
    // Se não houver preferência salva, começar retraído por padrão
    return savedState === null ? true : savedState === 'true';
  });
  
  // Estado para controlar a visibilidade do chat de IA
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  
  // Informações do usuário logado
  const [userInfo, setUserInfo] = useState({
    email: '',
    companyName: 'Nexo Sistema',
    dev: 'N',  // Valor padrão 'N'
    nome: '' // Adicionado para compatibilidade com o componente AIChat
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
      companyName: session.companyName || 'Nexo Sistema',
      dev: session.dev || 'N',  // Obter o valor do campo dev da sessão
      nome: session.nome || session.email || ''
    });

    loadResellers();
  }, [navigate]);

  const loadResellers = async () => {
    try {
      setLoading(true);
      console.log('Carregando revendedores...');
      
      // Buscar todos os revendedores
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar revendedores:', error);
        throw error;
      }

      console.log('Dados recebidos:', data);

      if (!data || data.length === 0) {
        console.log('Nenhum revendedor encontrado no banco de dados');
        setResellers([]);
        setLoading(false);
        return;
      }

      // Formatar os dados recebidos
      const formattedData: Reseller[] = data.map(item => ({
        id: item.id as string,
        trade_name: item.trade_name as string,
        legal_name: item.legal_name as string,
        document_number: item.document_number as string,
        created_at: item.created_at as string,
        status: item.status as string || 'active',
        code: item.code as string
      }));

      console.log('Dados formatados:', formattedData);
      setResellers(formattedData);
    } catch (error: any) {
      console.error('Erro ao carregar revendas:', error);
      toast.error('Erro ao carregar revendas: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    navigate('/admin/login');
  };

  const handleEditReseller = (resellerId: string) => {
    navigate(`/admin/reseller/${resellerId}`);
  };

  const handleCreateReseller = () => {
    navigate('/admin/reseller/new');
  };

  const handleDeleteClick = (reseller: Reseller) => {
    // Verificar se é a revenda padrão "Sem Revenda"
    if (reseller.code === '58105' || reseller.id === '83bd0d82-5e88-4ef4-bbd5-3822b3c62906') {
      toast.error('A revenda "Sem Revenda" não pode ser excluída pois é vital para o sistema.');
      return;
    }
    
    setResellerToDelete(reseller);
    setShowDeleteConfirm(true);
  };
  
  const handleToggleStatus = async (reseller: Reseller) => {
    // Verificar se é a revenda padrão "Sem Revenda"
    if (reseller.code === '58105' || reseller.id === '83bd0d82-5e88-4ef4-bbd5-3822b3c62906') {
      toast.error('A revenda "Sem Revenda" não pode ser alterada pois é vital para o sistema.');
      return;
    }
    
    try {
      setStatusUpdateLoading(true);
      
      // Determinar o novo status (se for active, mudar para inactive e vice-versa)
      const newStatus = reseller.status === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('resellers')
        .update({ status: newStatus })
        .eq('id', reseller.id);
      
      if (error) {
        throw error;
      }
      
      // Atualizar a lista de revendas com o novo status
      setResellers(prevResellers => 
        prevResellers.map(r => 
          r.id === reseller.id ? { ...r, status: newStatus } : r
        )
      );
      
      toast.success(`Revenda ${newStatus === 'active' ? 'ativada' : 'inativada'} com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao atualizar status da revenda:', error);
      toast.error('Erro ao atualizar status: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!resellerToDelete) return;
    
    // Verificação adicional para garantir que a revenda padrão não seja excluída
    if (resellerToDelete.code === '58105' || resellerToDelete.id === '83bd0d82-5e88-4ef4-bbd5-3822b3c62906') {
      toast.error('A revenda "Sem Revenda" não pode ser excluída pois é vital para o sistema.');
      setShowDeleteConfirm(false);
      setResellerToDelete(null);
      return;
    }

    try {
      // Notificar o usuário do início do processo
      toast.info('Excluindo usuários relacionados...');
      
      // Passo 1: Excluir usuários na tabela profile_admin_user associados à revenda
      const { error: errorAdminUsers } = await supabase
        .from('profile_admin_user')
        .delete()
        .eq('reseller_id', resellerToDelete.id);
      
      if (errorAdminUsers) {
        console.error('Erro ao excluir usuários admin_user:', errorAdminUsers);
        throw new Error(`Erro ao excluir usuários relacionados: ${errorAdminUsers.message}`);
      }
      
      // Passo 2: Excluir usuários na tabela profile_admin associados à revenda
      const { error: errorAdmins } = await supabase
        .from('profile_admin')
        .delete()
        .eq('reseller_id', resellerToDelete.id);
      
      if (errorAdmins) {
        console.error('Erro ao excluir administradores:', errorAdmins);
        throw new Error(`Erro ao excluir administradores relacionados: ${errorAdmins.message}`);
      }
      
      // Passo 3: Agora que os usuários foram removidos, podemos excluir a revenda
      const { error } = await supabase
        .from('resellers')
        .delete()
        .eq('id', resellerToDelete.id);

      if (error) {
        console.error('Erro ao excluir revenda:', error);
        throw new Error(`Erro ao excluir revenda: ${error.message}`);
      }
      
      // Sucesso!
      toast.success('Revenda e todos os usuários relacionados foram excluídos com sucesso!');
      loadResellers();
    } catch (error: any) {
      console.error('Erro no processo de exclusão:', error);
      toast.error(error.message || 'Erro desconhecido ao excluir revenda');
    } finally {
      setShowDeleteConfirm(false);
      setResellerToDelete(null);
    }
  };

  const filteredResellers = resellers.filter(reseller => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      reseller.trade_name.toLowerCase().includes(searchLower) ||
      (reseller.document_number && reseller.document_number.includes(searchLower)) ||
      (reseller.legal_name && reseller.legal_name.toLowerCase().includes(searchLower)) ||
      (reseller.code && reseller.code.includes(searchLower));

    const matchesStatus = selectedStatus === 'all' || reseller.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#1C1C1C] flex">
      {/* Sidebar modularizado */}
      <AdminSidebar
        activeMenuItem="/admin/resellers"
        onLogout={handleLogout}
        collapsed={isSidebarCollapsed}
        onCollapseChange={setIsSidebarCollapsed}
        onAiChatClick={() => setIsAiChatOpen(!isAiChatOpen)}
        isAiChatOpen={isAiChatOpen}
        userInfo={userInfo}
      />

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-[#2A2A2A] border-b border-gray-800 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Revendas</h1>
              <p className="text-gray-400">Gerencie as revendas cadastradas no sistema</p>
            </div>
            <button
              onClick={handleCreateReseller}
              className="px-4 py-2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <Plus size={18} />
              <span>Nova Revenda</span>
            </button>
          </div>
        </header>

        <div className="p-6">
          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Pesquisar revendas..."
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
              <option value="blocked">Bloqueado</option>
              <option value="canceled">Cancelado</option>
            </select>
          </div>

          {/* Resellers Table */}
          <div className="bg-[#2A2A2A] rounded-lg border border-gray-800">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-4 text-gray-400 font-medium">Código</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Revenda</th>
                    <th className="text-left p-4 text-gray-400 font-medium">CNPJ</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Razão Social</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Data Cadastro</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                    <th className="p-4 text-gray-400 font-medium w-[120px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <Store size={20} className="animate-spin" />
                          <span>Carregando revendas...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredResellers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-400">
                        Nenhuma revenda encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredResellers.map((reseller) => (
                      <tr key={reseller.id} className="border-b border-gray-800 hover:bg-[#353535]">
                        <td className="p-4 text-white font-mono">{reseller.code || 'N/A'}</td>
                        <td className="p-4 text-white">{reseller.trade_name}</td>
                        <td className="p-4 text-white">{reseller.document_number}</td>
                        <td className="p-4 text-white">{reseller.legal_name}</td>
                        <td className="p-4 text-white">
                          {new Date(reseller.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            reseller.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' :
                            reseller.status === 'blocked' ? 'bg-red-500/20 text-red-500' :
                            reseller.status === 'canceled' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {reseller.status === 'active' ? 'Ativo' :
                             reseller.status === 'blocked' ? 'Bloqueado' :
                             reseller.status === 'canceled' ? 'Cancelado' :
                             reseller.status === 'inactive' ? 'Inativo' : reseller.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditReseller(reseller.id)}
                              className="p-1 text-blue-400 hover:text-blue-300 rounded-lg"
                              title="Editar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            {reseller.code !== '58105' && reseller.id !== '83bd0d82-5e88-4ef4-bbd5-3822b3c62906' && (
                              <>
                                <button
                                  onClick={() => handleToggleStatus(reseller)}
                                  className={`p-1 ${reseller.status === 'active' ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'} rounded-lg`}
                                  title={reseller.status === 'active' ? 'Inativar Revenda' : 'Ativar Revenda'}
                                  disabled={statusUpdateLoading}
                                >
                                  {reseller.status === 'active' ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(reseller)}
                                  className="p-1 text-red-400 hover:text-red-300 rounded-lg"
                                  title="Excluir"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination can be added later if needed */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-gray-300 text-sm">
                <span className="font-bold">Atenção:</span> Esta ação não pode ser desfeita. A revenda e todos os usuários relacionados a ela serão permanentemente excluídos do sistema.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && resellerToDelete && (
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
                Tem certeza que deseja excluir a revenda "{resellerToDelete?.trade_name}"? Esta ação não pode ser desfeita.
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