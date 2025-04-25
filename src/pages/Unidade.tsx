import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Ruler, Filter, X, ChevronLeft, ChevronRight, Edit, Trash2, Lock } from 'lucide-react';
import { UnitSlidePanel } from '../components/UnitSlidePanel';
import { AppHeader } from '../components/AppHeader';
import { Breadcrumb } from '../components/Breadcrumb';
import { ContentContainer } from '../components/ContentContainer';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

interface Unit {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function Unidade() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showUnitPanel, setShowUnitPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [unitToEdit, setUnitToEdit] = useState<Unit | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    loadUserInfo();
    loadUnits();
  }, []);

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Usuário não autenticado');
        navigate('/login');
        return;
      }

      // Buscar perfil e detalhes da empresa
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, company_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile) {
        setUserName(profile.name as string);

        // Se o usuário já tem uma empresa vinculada
        if (profile.company_id) {
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('trade_name')
            .eq('id', profile.company_id)
            .single();

          if (companyError) throw companyError;

          if (company) {
            setCompanyName(company.trade_name as string);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar informações do usuário:', error);
    }
  };

  const loadUnits = async () => {
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

      const { data: unitsData, error: unitsError } = await supabase
        .from('product_units')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (unitsError) {
        throw unitsError;
      }

      // Conversão segura para o tipo Unit[]
      setUnits(unitsData ? (unitsData as unknown as Unit[]) : []);
    } catch (error: any) {
      console.error('Erro ao carregar unidades:', error);
      toast.error('Erro ao carregar unidades');
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar se é uma unidade do sistema
  const isSystemUnit = (code: string) => {
    return ['UN', 'KG'].includes(code);
  };

  const handleEditUnit = (unit: Unit) => {
    // Não permitir edição de unidades do sistema
    if (isSystemUnit(unit.code)) {
      toast.warn('Unidades do sistema não podem ser editadas');
      return;
    }
    
    setUnitToEdit(unit);
    setShowUnitPanel(true);
  };

  const handleDeleteClick = (unit: Unit) => {
    // Não permitir exclusão de unidades do sistema
    if (isSystemUnit(unit.code)) {
      toast.warn('Unidades do sistema não podem ser excluídas');
      return;
    }

    setUnitToDelete(unit);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!unitToDelete) return;

    try {
      const { error } = await supabase
        .from('product_units')
        .delete()
        .eq('id', unitToDelete.id);

      if (error) throw error;

      toast.success('Unidade excluída com sucesso!');
      loadUnits();
    } catch (error: any) {
      console.error('Erro ao excluir unidade:', error);
      toast.error('Erro ao excluir unidade');
    } finally {
      setShowDeleteConfirm(false);
      setUnitToDelete(null);
    }
  };

  const filteredUnits = units.filter(unit => {
    const searchLower = searchQuery.toLowerCase();
    return (
      unit.code.toLowerCase().includes(searchLower) ||
      unit.name.toLowerCase().includes(searchLower) ||
      (unit.description && unit.description.toLowerCase().includes(searchLower))
    );
  });

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

  // Construir o caminho do breadcrumb com base no estado de navegação
  const getBreadcrumbPath = () => {
    const path = [];
    
    // Se veio da pasta produtos, adiciona "Produtos" ao caminho
    if (location.state && location.state.from === 'produtos-folder') {
      path.push({ id: 'produtos', title: 'Produtos' });
    }
    
    // Adiciona "Unidades" ao final do caminho
    path.push({ id: 'unidade-app', title: 'Unidades' });
    
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
          userName={userName}
          companyName={companyName}
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
                  placeholder="Pesquisar unidades..."
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
                onClick={() => setShowUnitPanel(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 rounded-lg text-white hover:bg-blue-400 transition-colors"
              >
                <Plus size={20} />
                <span>Nova Unidade</span>
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
                    <option value="code_asc">Código (A-Z)</option>
                    <option value="code_desc">Código (Z-A)</option>
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
                  <th className="text-left p-4 text-slate-400 font-medium">Código</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Nome</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Descrição</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Data Criação</th>
                  <th className="p-4 text-slate-400 font-medium w-[100px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => (
                  <tr key={unit.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="p-4 text-slate-200">{unit.code}</td>
                    <td className="p-4 text-slate-200">{unit.name}</td>
                    <td className="p-4 text-slate-200">{unit.description}</td>
                    <td className="p-4 text-slate-200">
                      {new Date(unit.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {isSystemUnit(unit.code) ? (
                          // Unidades do sistema têm ícone de cadeado
                          <div className="p-1 text-slate-500 flex items-center gap-1" title="Unidade do sistema (não pode ser alterada)">
                            <Lock size={14} />
                            <span className="text-xs">Sistema</span>
                          </div>
                        ) : (
                          // Unidades criadas pelo usuário podem ser editadas/excluídas
                          <>
                            <button
                              onClick={() => handleEditUnit(unit)}
                              className="p-1 text-slate-400 hover:text-slate-200"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(unit)}
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
                {filteredUnits.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">
                      Nenhuma unidade encontrada
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
                Mostrando {filteredUnits.length} unidade(s)
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

      {/* Unit Form Panel */}
      <UnitSlidePanel
        isOpen={showUnitPanel}
        onClose={() => {
          setShowUnitPanel(false);
          setUnitToEdit(null);
          loadUnits();
        }}
        unitToEdit={unitToEdit}
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
                Tem certeza que deseja excluir esta unidade?
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
