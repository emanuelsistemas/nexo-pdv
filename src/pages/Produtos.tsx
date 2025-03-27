import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Package, Calendar, Filter, X, ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, ArrowUpDown, Tag } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ProductSlidePanel } from '../components/ProductSlidePanel';

export default function Produtos() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [showProductPanel, setShowProductPanel] = useState(false);

  // Mock data for demonstration
  const produtos = [
    {
      id: '1',
      codigo: 'P001',
      nome: 'Coca-Cola 2L',
      grupo: 'Bebidas',
      unidade: 'UN',
      preco_custo: 5.50,
      preco_venda: 8.99,
      estoque: 150,
      status: 'active'
    },
    {
      id: '2',
      codigo: 'P002',
      nome: 'Pão Francês',
      grupo: 'Padaria',
      unidade: 'KG',
      preco_custo: 0.45,
      preco_venda: 0.75,
      estoque: 50,
      status: 'active'
    },
    {
      id: '3',
      codigo: 'P003',
      nome: 'Cerveja Heineken 350ml',
      grupo: 'Bebidas',
      unidade: 'UN',
      preco_custo: 3.50,
      preco_venda: 6.99,
      estoque: 240,
      status: 'inactive'
    },
    {
      id: '4',
      codigo: 'P004',
      nome: 'Arroz 5kg',
      grupo: 'Mercearia',
      unidade: 'UN',
      preco_custo: 15.50,
      preco_venda: 22.90,
      estoque: 80,
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
                  placeholder="Pesquisar produtos..."
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
                onClick={() => setShowProductPanel(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 rounded-lg text-white hover:bg-blue-400 transition-colors"
              >
                <Plus size={20} />
                <span>Novo Produto</span>
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
                    Grupo
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="all">Todos</option>
                    <option value="bebidas">Bebidas</option>
                    <option value="padaria">Padaria</option>
                    <option value="mercearia">Mercearia</option>
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
                    <option value="price_asc">Preço (Menor-Maior)</option>
                    <option value="price_desc">Preço (Maior-Menor)</option>
                    <option value="stock_asc">Estoque (Menor-Maior)</option>
                    <option value="stock_desc">Estoque (Maior-Menor)</option>
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
                  <th className="text-left p-4 text-slate-400 font-medium">Grupo</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Un.</th>
                  <th className="text-right p-4 text-slate-400 font-medium">Preço Custo</th>
                  <th className="text-right p-4 text-slate-400 font-medium">Preço Venda</th>
                  <th className="text-right p-4 text-slate-400 font-medium">Estoque</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                  <th className="p-4 text-slate-400 font-medium w-[100px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((produto) => (
                  <tr key={produto.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="p-4 text-slate-200">{produto.codigo}</td>
                    <td className="p-4 text-slate-200">{produto.nome}</td>
                    <td className="p-4 text-slate-200">{produto.grupo}</td>
                    <td className="p-4 text-slate-200">{produto.unidade}</td>
                    <td className="p-4 text-slate-200 text-right">R$ {produto.preco_custo.toFixed(2)}</td>
                    <td className="p-4 text-slate-200 text-right">R$ {produto.preco_venda.toFixed(2)}</td>
                    <td className="p-4 text-slate-200 text-right">{produto.estoque}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(produto.status)}`}>
                        {getStatusText(produto.status)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1 text-slate-400 hover:text-slate-200">
                          <ArrowUpDown size={16} />
                        </button>
                        <button className="p-1 text-slate-400 hover:text-slate-200">
                          <Tag size={16} />
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
                Mostrando 1-4 de 4 resultados
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

      {/* Product Form Panel */}
      <ProductSlidePanel
        isOpen={showProductPanel}
        onClose={() => setShowProductPanel(false)}
      />
    </div>
  );
}