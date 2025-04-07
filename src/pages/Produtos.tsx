import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Package, Calendar, Filter, X, ChevronLeft, ChevronRight, Edit, Trash2, ArrowUpDown, Tag, Loader2, ArrowDownAZ, ArrowUpAZ, Copy } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ProductSlidePanel } from '../components/ProductSlidePanel';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

interface Product {
  id: string;
  code: string;
  name: string;
  barcode: string | null;
  unit_id: string;
  group_id: string | null;
  cost_price: number;
  profit_margin: number;
  selling_price: number;
  stock: number;
  cst: string;
  pis: string;
  cofins: string;
  ncm: string;
  cfop: string;
  status: 'active' | 'inactive';
  created_at: string;
  // Joined fields
  unit_name?: string;
  unit_code?: string;
  group_name?: string;
}

export default function Produtos() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [showProductPanel, setShowProductPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [initialTabState, setInitialTabState] = useState<'produto' | 'estoque' | 'impostos'>('produto');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [sortField, setSortField] = useState<string | null>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadProducts();
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      const { data: groups, error } = await supabase
        .from('product_groups')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .order('name');

      if (error) throw error;

      setGroups(groups || []);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      toast.error('Erro ao carregar grupos');
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      // First get all products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('code', { ascending: true });

      if (productsError) throw productsError;

      // Get all unique unit IDs (excluding null values)
      const unitIds = [...new Set(productsData.map(p => p.unit_id).filter(Boolean))];
      
      let unitMap = new Map();
      if (unitIds.length > 0) {
        // Get unit data for all products
        const { data: unitsData, error: unitsError } = await supabase
          .from('product_units')
          .select('id, name, code')
          .in('id', unitIds);

        if (unitsError) throw unitsError;

        // Create a map of unit IDs to unit data
        unitMap = new Map(unitsData.map(u => [u.id, { name: u.name, code: u.code }]));
      }

      // Get all unique group IDs (excluding null values)
      const groupIds = [...new Set(productsData.map(p => p.group_id).filter(Boolean))];
      let groupMap = new Map();
      
      if (groupIds.length > 0) {
        const { data: groupsData, error: groupsError } = await supabase
          .from('product_groups')
          .select('id, name')
          .in('id', groupIds);

        if (groupsError) throw groupsError;

        // Create a map of group IDs to names
        groupMap = new Map(groupsData.map(g => [g.id, g.name]));
      }

      // Transform the data to include unit and group information
      const transformedData = productsData.map(product => {
        const unit = unitMap.get(product.unit_id);
        return {
          ...product,
          unit_name: unit?.name || '-',
          unit_code: unit?.code || '-',
          group_name: product.group_id ? groupMap.get(product.group_id) : '-'
        };
      });

      setProducts(transformedData);
    } catch (error: any) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setInitialTabState('produto');
    setShowProductPanel(true);
  };

  const handleStockMovementClick = (product: Product) => {
    setProductToEdit(product);
    setInitialTabState('estoque');
    setShowProductPanel(true);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      // Primeiro excluir todos os movimentos de estoque deste produto
      const { error: movementsError } = await supabase
        .from('product_stock_movements')
        .delete()
        .eq('product_id', productToDelete.id);

      if (movementsError) throw movementsError;

      // Depois excluir o produto
      const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (productError) throw productError;

      toast.success('Produto excluído com sucesso!');
      loadProducts();
    } catch (error: any) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    } finally {
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    }
  };

  const handleCloneProduct = async (productToClone: Product) => {
    try {
      setLoading(true);
      
      // Obter o usuário e a empresa atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      // Buscar todos os códigos de produtos existentes para gerar um novo código único
      const { data: existingProducts, error: productsError } = await supabase
        .from('products')
        .select('code')
        .eq('company_id', profile.company_id);

      if (productsError) throw productsError;

      // Extrair todos os códigos numéricos para encontrar o próximo disponível
      const numericCodes = existingProducts
        .map(p => parseInt(p.code))
        .filter(code => !isNaN(code));

      // Organizar os códigos em ordem crescente
      numericCodes.sort((a, b) => a - b);

      // Encontrar o maior código
      const maxCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 0;
      
      // Gerar o próximo código disponível
      const newCode = (maxCode + 1).toString();

      // Criar o produto clonado sem o código de barras
      const clonedProduct = {
        // Campos a serem mantidos do produto original
        name: `${productToClone.name} CLONADO`,
        unit_id: productToClone.unit_id,
        group_id: productToClone.group_id,
        cost_price: productToClone.cost_price,
        profit_margin: productToClone.profit_margin,
        selling_price: productToClone.selling_price,
        stock: productToClone.stock,
        cst: productToClone.cst,
        pis: productToClone.pis,
        cofins: productToClone.cofins,
        ncm: productToClone.ncm,
        cfop: productToClone.cfop,
        status: productToClone.status,
        // Campos a serem alterados
        code: newCode,
        barcode: null, // Removendo o código de barras conforme solicitado
        company_id: profile.company_id
      };

      // Inserir o produto clonado no banco de dados
      const { error: insertError } = await supabase
        .from('products')
        .insert([clonedProduct]);

      if (insertError) throw insertError;

      toast.success('Produto clonado com sucesso!');
      
      // Buscar o produto recém-clonado para abrir na tela de edição
      const { data: newProducts, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('code', newCode)
        .eq('name', `${productToClone.name} CLONADO`);
        
      if (fetchError) throw fetchError;
      
      if (newProducts && newProducts.length > 0) {
        // Abrir o produto clonado para edição
        setProductToEdit(newProducts[0]);
        setShowProductPanel(true);
        setInitialTabState('produto');
      }
      
      loadProducts(); // Recarregar a lista de produtos
    } catch (error) {
      console.error('Erro ao clonar produto:', error);
      toast.error('Erro ao clonar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (location.state?.from === 'produtos-folder') {
      navigate('/dashboard', { state: { openFolder: 'produtos' } });
    } else {
      navigate('/dashboard');
    }
  };

  const handleSort = (field: string) => {
    // Se já estiver ordenando por este campo, inverte a direção
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Caso contrário, começa a ordenar por este campo em ordem ascendente
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Primeiro filtra os produtos
  let filteredProducts = products.filter(product => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      product.code.toLowerCase().includes(searchLower) ||
      product.name.toLowerCase().includes(searchLower) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchLower));

    const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
    const matchesGroup = selectedGroup === 'all' || product.group_id === selectedGroup;

    return matchesSearch && matchesStatus && matchesGroup;
  });

  // Sempre ordena os produtos filtrados, usando 'code' como padrão se nenhum campo for especificado
  filteredProducts = [...filteredProducts].sort((a, b) => {
      let valueA, valueB;

      // Determinar quais valores comparar com base no campo de ordenação
      switch (sortField) {
        case 'code':
          valueA = parseInt(a.code) || 0;
          valueB = parseInt(b.code) || 0;
          break;
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'group':
          valueA = (a.group_name || '').toLowerCase();
          valueB = (b.group_name || '').toLowerCase();
          break;
        case 'cost_price':
          valueA = a.cost_price;
          valueB = b.cost_price;
          break;
        case 'selling_price':
          valueA = a.selling_price;
          valueB = b.selling_price;
          break;
        case 'stock':
          valueA = a.stock;
          valueB = b.stock;
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        default:
          return 0;
      }

      // Compara os valores na direção apropriada
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
                onClick={() => {
                  setProductToEdit(null);
                  setShowProductPanel(true);
                }}
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
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
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
                  <th className="text-left p-4 text-slate-400 font-medium">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('code')}>
                      Código
                      {sortField === 'code' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUpDown size={14} className="text-blue-400" />
                        ) : (
                          <ArrowUpDown size={14} className="text-blue-400 rotate-180" />
                        )
                      ) : (
                        <ArrowUpDown size={14} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 text-slate-400 font-medium">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('name')}>
                      Nome
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? (
                          <ArrowDownAZ size={16} className="text-blue-400" />
                        ) : (
                          <ArrowUpAZ size={16} className="text-blue-400" />
                        )
                      ) : (
                        <ArrowDownAZ size={16} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 text-slate-400 font-medium">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('group')}>
                      Grupo
                      {sortField === 'group' ? (
                        sortDirection === 'asc' ? (
                          <ArrowDownAZ size={16} className="text-blue-400" />
                        ) : (
                          <ArrowUpAZ size={16} className="text-blue-400" />
                        )
                      ) : (
                        <ArrowDownAZ size={16} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 text-slate-400 font-medium">Un.</th>
                  <th className="text-right p-4 text-slate-400 font-medium">
                    <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort('cost_price')}>
                      Preço Custo
                      {sortField === 'cost_price' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUpDown size={14} className="text-blue-400" />
                        ) : (
                          <ArrowUpDown size={14} className="text-blue-400 rotate-180" />
                        )
                      ) : (
                        <ArrowUpDown size={14} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="text-right p-4 text-slate-400 font-medium">
                    <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort('selling_price')}>
                      Preço Venda
                      {sortField === 'selling_price' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUpDown size={14} className="text-blue-400" />
                        ) : (
                          <ArrowUpDown size={14} className="text-blue-400 rotate-180" />
                        )
                      ) : (
                        <ArrowUpDown size={14} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="text-right p-4 text-slate-400 font-medium">
                    <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort('stock')}>
                      Estoque
                      {sortField === 'stock' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUpDown size={14} className="text-blue-400" />
                        ) : (
                          <ArrowUpDown size={14} className="text-blue-400 rotate-180" />
                        )
                      ) : (
                        <ArrowUpDown size={14} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 text-slate-400 font-medium">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('status')}>
                      Status
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? (
                          <ArrowDownAZ size={16} className="text-blue-400" />
                        ) : (
                          <ArrowUpAZ size={16} className="text-blue-400" />
                        )
                      ) : (
                        <ArrowDownAZ size={16} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-slate-400 font-medium w-[100px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center">
                      <div className="flex items-center justify-center text-slate-400">
                        <Loader2 size={24} className="animate-spin mr-2" />
                        <span>Carregando produtos...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-slate-400">
                      Nenhum produto encontrado
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="p-4 text-slate-200">{product.code}</td>
                      <td className="p-4 text-slate-200">{product.name}</td>
                      <td className="p-4 text-slate-200">{product.group_name}</td>
                      <td className="p-4 text-slate-200">{product.unit_code}</td>
                      <td className="p-4 text-slate-200 text-right">{formatCurrency(product.cost_price)}</td>
                      <td className="p-4 text-slate-200 text-right">{formatCurrency(product.selling_price)}</td>
                      <td className="p-4 text-slate-200 text-right">
                        {product.unit_code === 'KG' ? product.stock.toFixed(3) : product.stock.toFixed(0)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.status === 'active'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {product.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                          onClick={() => handleStockMovementClick(product)}
                          className="p-1 text-slate-400 hover:text-slate-200"
                          title="Movimentar estoque"
                        >
                          <ArrowUpDown size={16} />
                          </button>
                          <button
                            onClick={() => handleCloneProduct(product)}
                            className="p-1 text-slate-400 hover:text-slate-200"
                            title="Clonar produto"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-1 text-slate-400 hover:text-slate-200"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(product)}
                            className="p-1 text-red-400 hover:text-red-300"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
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
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Mostrando {filteredProducts.length} produto(s)
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
        onClose={() => {
          setShowProductPanel(false);
          setProductToEdit(null);
          loadProducts();
        }}
        initialTab={initialTabState}
        productToEdit={productToEdit}
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
                Tem certeza que deseja excluir este produto?
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
