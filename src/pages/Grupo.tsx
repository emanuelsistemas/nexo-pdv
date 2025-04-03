import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Grid2X2, Filter, X, ChevronLeft, ChevronRight, Edit, Trash2, Lock } from 'lucide-react';
import { Logo } from '../components/Logo';
import { GroupSlidePanel } from '../components/GroupSlidePanel';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function Grupo() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      const { data: groups, error: groupsError } = await supabase
        .from('product_groups')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (groupsError) {
        throw groupsError;
      }

      setGroups(groups || []);
    } catch (error: any) {
      console.error('Erro ao carregar grupos:', error);
      toast.error('Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar se é um grupo do sistema
  const isSystemGroup = (name: string) => {
    return name === 'Diversos';
  };

  const handleEditGroup = (group: Group) => {
    // Não permitir edição de grupos do sistema
    if (isSystemGroup(group.name)) {
      toast.warn('Grupos do sistema não podem ser editados');
      return;
    }
    
    setGroupToEdit(group);
    setShowGroupPanel(true);
  };

  const handleDeleteClick = (group: Group) => {
    // Não permitir exclusão de grupos do sistema
    if (isSystemGroup(group.name)) {
      toast.warn('Grupos do sistema não podem ser excluídos');
      return;
    }

    setGroupToDelete(group);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;

    try {
      const { error } = await supabase
        .from('product_groups')
        .delete()
        .eq('id', groupToDelete.id);

      if (error) throw error;

      toast.success('Grupo excluído com sucesso!');
      loadGroups();
    } catch (error: any) {
      console.error('Erro ao excluir grupo:', error);
      toast.error('Erro ao excluir grupo');
    } finally {
      setShowDeleteConfirm(false);
      setGroupToDelete(null);
    }
  };

  const handleClose = () => {
    // Verifica se há um estado de navegação e redireciona de acordo
    if (location.state && location.state.from === 'produtos-folder') {
      // Navega de volta para o Dashboard com a pasta de produtos aberta
      navigate('/dashboard', { state: { openFolder: 'produtos' } });
    } else {
      // Caso contrário, volta para o dashboard normal
      navigate('/dashboard');
    }
  };

  const filteredGroups = groups.filter(group => {
    const searchLower = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(searchLower) ||
      (group.description && group.description.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-6">
            <Logo variant="dashboard" />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-slate-800/50 border-b border-slate-700">
        <div className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar grupos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg text-slate-200 hover:bg-slate-600 transition-colors"
              >
                <Filter size={20} />
                <span>Filtros</span>
              </button>
              <button
                onClick={() => setShowGroupPanel(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 rounded-lg text-white hover:bg-blue-400 transition-colors"
              >
                <Plus size={20} />
                <span>Novo Grupo</span>
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Ordenação
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="name_asc">Nome (A-Z)</option>
                    <option value="name_desc">Nome (Z-A)</option>
                    <option value="created_asc">Data Criação (Antiga-Nova)</option>
                    <option value="created_desc">Data Criação (Nova-Antiga)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-4 text-slate-400 font-medium">Nome</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Descrição</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Data Criação</th>
                  <th className="p-4 text-slate-400 font-medium w-[100px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((group) => (
                  <tr key={group.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="p-4 text-slate-200">{group.name}</td>
                    <td className="p-4 text-slate-200">{group.description}</td>
                    <td className="p-4 text-slate-200">
                      {new Date(group.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {isSystemGroup(group.name) ? (
                          // Grupos do sistema têm ícone de cadeado
                          <div className="p-1 text-slate-500 flex items-center gap-1" title="Grupo do sistema (não pode ser alterado)">
                            <Lock size={14} />
                            <span className="text-xs">Sistema</span>
                          </div>
                        ) : (
                          // Grupos criados pelo usuário podem ser editados/excluídos
                          <>
                            <button
                              onClick={() => handleEditGroup(group)}
                              className="p-1 text-slate-400 hover:text-slate-200"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(group)}
                              className="p-1 text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredGroups.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">
                      Nenhum grupo encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Mostrando {filteredGroups.length} grupo(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled
                  className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  disabled
                  className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-50"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Group Form Panel */}
      <GroupSlidePanel
        isOpen={showGroupPanel}
        onClose={() => {
          setShowGroupPanel(false);
          setGroupToEdit(null);
          loadGroups();
        }}
        groupToEdit={groupToEdit}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6 w-full max-w-[400px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-200">
                  Confirmar Exclusão
                </h3>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-slate-300 mb-6">
                Tem certeza que deseja excluir este grupo?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
