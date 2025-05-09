import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Users, Calendar, Filter, X, ChevronLeft, ChevronRight, Edit, Trash2, Mail, Phone, Inbox } from 'lucide-react';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';
import { Breadcrumb } from '../components/Breadcrumb';
import { ContentContainer } from '../components/ContentContainer';
import { supabase } from '../lib/supabase';

export default function Clientes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadUserInfo();
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

  // Mock data for demonstration
  const clientes = [
    {
      id: '1',
      codigo: 'C001',
      nome: 'João Silva',
      tipo: 'Pessoa Física',
      documento: '123.456.789-00',
      email: 'joao.silva@email.com',
      telefone: '(11) 98765-4321',
      cidade: 'São Paulo',
      estado: 'SP',
      status: 'active'
    },
    {
      id: '2',
      codigo: 'C002',
      nome: 'Mercado do Zé',
      tipo: 'Pessoa Jurídica',
      documento: '12.345.678/0001-90',
      email: 'contato@mercadodoze.com.br',
      telefone: '(11) 3456-7890',
      cidade: 'São Paulo',
      estado: 'SP',
      status: 'active'
    },
    {
      id: '3',
      codigo: 'C003',
      nome: 'Maria Santos',
      tipo: 'Pessoa Física',
      documento: '987.654.321-00',
      email: 'maria.santos@email.com',
      telefone: '(11) 98765-1234',
      cidade: 'Guarulhos',
      estado: 'SP',
      status: 'inactive'
    },
    {
      id: '4',
      codigo: 'C004',
      nome: 'Padaria Bom Pão',
      tipo: 'Pessoa Jurídica',
      documento: '98.765.432/0001-10',
      email: 'contato@padariabompao.com.br',
      telefone: '(11) 2345-6789',
      cidade: 'Osasco',
      estado: 'SP',
      status: 'active'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'inactive':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-slate-500/10 text-slate-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      default:
        return status;
    }
  };

  // Lidar com tela cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Erro ao tentar entrar em tela cheia: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleClose = () => {
    // Verifica se há um estado de navegação e redireciona de acordo
    if (location.state && location.state.from === 'clientes-folder') {
      // Navega de volta para o Dashboard com a pasta de clientes aberta
      navigate('/dashboard', { state: { openFolder: 'clientes' } });
    } else {
      // Caso contrário, volta para o dashboard normal
      navigate('/dashboard');
    }
  };

  // Construir o caminho do breadcrumb com base no estado de navegação
  const getBreadcrumbPath = () => {
    const path = [];
    
    // Se veio da pasta clientes, adiciona "Clientes" ao caminho
    if (location.state && location.state.from === 'clientes-folder') {
      path.push({ id: 'clientes', title: 'Clientes' });
    }
    
    // Adiciona "Clientes" ao final do caminho
    path.push({ id: 'clientes-app', title: 'Clientes' });
    
    return path;
  };

  // Função para lidar com a navegação do breadcrumb
  const handleBreadcrumbNavigate = (pathItem: { id: string, title: string } | null, index?: number) => {
    if (!pathItem) return;
    
    // Se clicou em "Clientes", volta para o Dashboard com a pasta clientes aberta
    if (pathItem.id === 'clientes') {
      navigate('/dashboard', { state: { openFolder: 'clientes' } });
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
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          onShowLogoutConfirm={handleClose}
          showBugIcon={true}
          showNotificationIcon={true}
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
                  placeholder="Pesquisar clientes..."
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
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 rounded-lg text-white hover:bg-blue-400 transition-colors"
              >
                <Plus size={20} />
                <span>Novo Cliente</span>
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Tipo
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="all">Todos</option>
                    <option value="pf">Pessoa Física</option>
                    <option value="pj">Pessoa Jurídica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Ordenação
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="name_asc">Nome (A-Z)</option>
                    <option value="name_desc">Nome (Z-A)</option>
                    <option value="code_asc">Código (Menor-Maior)</option>
                    <option value="code_desc">Código (Maior-Menor)</option>
                    <option value="created_asc">Data Cadastro (Antiga-Nova)</option>
                    <option value="created_desc">Data Cadastro (Nova-Antiga)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-800 rounded-lg border border-slate-700">
            <Inbox size={48} className="mb-4 opacity-50" />
            <span className="text-lg">Nenhum cliente cadastrado</span>
            <p className="text-sm text-slate-500 mt-1">Clique em "Novo Cliente" para adicionar o primeiro.</p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-4 text-slate-400 font-medium">Código</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Nome</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Tipo</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Documento</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Email</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Telefone</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Cidade/UF</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                    <th className="p-4 text-slate-400 font-medium w-[100px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="p-4 text-slate-200">{cliente.codigo}</td>
                      <td className="p-4 text-slate-200">{cliente.nome}</td>
                      <td className="p-4 text-slate-200">{cliente.tipo}</td>
                      <td className="p-4 text-slate-200">{cliente.documento}</td>
                      <td className="p-4 text-slate-200">{cliente.email}</td>
                      <td className="p-4 text-slate-200">{cliente.telefone}</td>
                      <td className="p-4 text-slate-200">{cliente.cidade}/{cliente.estado}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cliente.status)}`}>
                          {getStatusText(cliente.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1 text-slate-400 hover:text-slate-200">
                            <Mail size={16} />
                          </button>
                          <button className="p-1 text-slate-400 hover:text-slate-200">
                            <Phone size={16} />
                          </button>
                          <button className="p-1 text-slate-400 hover:text-slate-200">
                            <Edit size={16} />
                          </button>
                          <button className="p-1 text-red-400 hover:text-red-300">
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
                  Mostrando {clientes.length} cliente(s)
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
    </div>
  );
}
