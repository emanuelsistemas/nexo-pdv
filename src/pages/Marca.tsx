import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Tag, Filter, X, ChevronLeft, ChevronRight, Edit, Trash2, Inbox } from 'lucide-react';
import { MarcaSlidePanel } from '../components/MarcaSlidePanel';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';
import { Breadcrumb } from '../components/Breadcrumb';
import { ContentContainer } from '../components/ContentContainer';

interface Marca {
  id: string;
  name: string;
  created_at: string;
}

export default function Marca() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMarcaPanel, setShowMarcaPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [marcaToDelete, setMarcaToDelete] = useState<Marca | null>(null);
  const [marcaToEdit, setMarcaToEdit] = useState<Marca | null>(null);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarcas();
  }, []);

  const loadMarcas = async () => {
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

      const { data: marcasData, error: marcasError } = await supabase
        .from('product_marca')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (marcasError) {
        throw marcasError;
      }

      // Conversão segura para o tipo Marca[]
      setMarcas(marcasData ? (marcasData as unknown as Marca[]) : []);
    } catch (error: any) {
      console.error('Erro ao carregar marcas:', error);
      toast.error('Erro ao carregar marcas');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMarca = (marca: Marca) => {
    setMarcaToEdit(marca);
    setShowMarcaPanel(true);
  };

  const handleDeleteClick = (marca: Marca) => {
    setMarcaToDelete(marca);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!marcaToDelete) return;

    try {
      const { error } = await supabase
        .from('product_marca')
        .delete()
        .eq('id', marcaToDelete.id);

      if (error) throw error;

      toast.success('Marca excluída com sucesso!');
      loadMarcas();
    } catch (error: any) {
      console.error('Erro ao excluir marca:', error);
      toast.error('Erro ao excluir marca');
    } finally {
      setShowDeleteConfirm(false);
      setMarcaToDelete(null);
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

  const filteredMarcas = marcas.filter(marca => {
    const searchLower = searchQuery.toLowerCase();
    return marca.name.toLowerCase().includes(searchLower);
  });

  // Construir o caminho do breadcrumb com base no estado de navegação
  const getBreadcrumbPath = () => {
    const path = [];
    
    // Se veio da pasta produtos, adiciona "Produtos" ao caminho
    if (location.state && location.state.from === 'produtos-folder') {
      path.push({ id: 'produtos', title: 'Produtos' });
    }
    
    // Adiciona "Marcas" ao final do caminho
    path.push({ id: 'marca', title: 'Marcas' });
    
    return path;
  };

  // Função para lidar com a navegação do breadcrumb
  const handleBreadcrumbNavigate = (pathItem: { id: string, title: string } | null, index?: number) => {
    if (!pathItem) return;
    
    // Se clicou em "Produtos", volta para o Dashboard com a pasta produtos aberta
    if (pathItem.id === 'produtos') {
      navigate('/dashboard', { state: { openFolder: 'produtos' } });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header and Breadcrumb wrapper */}
      <div className="header-breadcrumb-wrapper">
        {/* Header */}
        <AppHeader 
          onShowLogoutConfirm={handleClose}
        />

        {/* Path Navigation */}
        <ContentContainer>
          <Breadcrumb 
            currentPath={getBreadcrumbPath()}
            onNavigate={handleBreadcrumbNavigate}
            onBack={handleClose}
            onHome={() => navigate('/dashboard')}
          />
        </ContentContainer>
      </div>

      {/* Toolbar */}
      <div className="border-b border-slate-700">
        <div className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar marcas..."
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
                onClick={() => {
                  setMarcaToEdit(null);
                  setShowMarcaPanel(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 rounded-lg text-white hover:bg-blue-400 transition-colors"
              >
                <Plus size={20} />
                <span>Nova Marca</span>
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
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            <span className="ml-2">Carregando marcas...</span>
          </div>
        ) : filteredMarcas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-800 rounded-lg border border-slate-700">
            <Inbox size={48} className="mb-4 opacity-50" />
            <span className="text-lg">Nenhuma marca cadastrada</span>
            <p className="text-sm text-slate-500 mt-1">Clique em "Nova Marca" para adicionar a primeira.</p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-4 text-slate-400 font-medium">Nome</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Data Criação</th>
                    <th className="p-4 text-slate-400 font-medium w-[100px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarcas.map((marca) => (
                    <tr key={marca.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="p-4 text-slate-200">{marca.name}</td>
                      <td className="p-4 text-slate-200">
                        {new Date(marca.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditMarca(marca)}
                            className="p-1 text-slate-400 hover:text-slate-200"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(marca)}
                            className="p-1 text-red-400 hover:text-red-300"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Mostrando {filteredMarcas.length} marca(s)
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
        )}
      </div>

      {/* Footer */}
      <AppFooter />

      {/* Marca Form Panel */}
      <MarcaSlidePanel
        isOpen={showMarcaPanel}
        onClose={() => {
          setShowMarcaPanel(false);
          setMarcaToEdit(null);
          loadMarcas();
        }}
        marcaToEdit={marcaToEdit}
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
                Tem certeza que deseja excluir esta marca?
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
