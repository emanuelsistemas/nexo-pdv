import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';

interface Produto {
  id: string;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  valor_unitario: number;
  quantidade: number;
  valor_total: number;
}

interface NFEProdutosTabProps {
  produtos: any[];
  onChange: (produtos: any[]) => void;
  nfeId: string;
}

const NFEProdutosTab: React.FC<NFEProdutosTabProps> = ({ produtos, onChange, nfeId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Produto[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    codigo: '',
    descricao: '',
    ncm: '',
    cfop: '',
    unidade: '',
    quantidade: 1,
    valor_unitario: 0,
    valor_total: 0,
    produto_id: ''
  });

  // Calcular valor total quando quantidade ou valor unitário mudar
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      valor_total: prev.quantidade * prev.valor_unitario
    }));
  }, [formData.quantidade, formData.valor_unitario]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.warning('Digite o código ou nome do produto para buscar');
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      // Buscar produtos pelo código ou descrição
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`codigo.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%`)
        .limit(5);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao buscar produtos');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectProduct = (product: any) => {
    // Preencher formulário com dados do produto
    setFormData({
      id: '',
      codigo: product.codigo || '',
      descricao: product.descricao || '',
      ncm: product.ncm || '',
      cfop: '5102', // Valor padrão para venda de mercadoria
      unidade: product.unidade || '',
      quantidade: 1,
      valor_unitario: product.preco_venda || 0,
      valor_total: product.preco_venda || 0,
      produto_id: product.id
    });

    setShowResults(false);
    setShowForm(true);
    toast.success('Produto selecionado!');
  };

  const handleAddProduct = () => {
    // Validar campos obrigatórios
    if (!formData.descricao || !formData.quantidade || !formData.valor_unitario) {
      toast.error('Preencha descrição, quantidade e valor unitário');
      return;
    }

    // Verificar se é edição ou novo produto
    if (editingProduct) {
      // Atualizar produto existente
      const updatedProdutos = produtos.map(p => 
        p.id === editingProduct.id ? { ...formData, id: p.id } : p
      );
      onChange(updatedProdutos);
      toast.success('Produto atualizado!');
    } else {
      // Adicionar novo produto
      const newProduct = {
        ...formData,
        id: `temp_${Date.now()}`, // ID temporário, será substituído pelo backend
        valor_total: formData.quantidade * formData.valor_unitario
      };
      onChange([...produtos, newProduct]);
      toast.success('Produto adicionado!');
    }

    // Resetar formulário
    resetForm();
  };

  const handleEditProduct = (product: any) => {
    setFormData({
      id: product.id,
      codigo: product.codigo || '',
      descricao: product.descricao || '',
      ncm: product.ncm || '',
      cfop: product.cfop || '5102',
      unidade: product.unidade || '',
      quantidade: product.quantidade || 1,
      valor_unitario: product.valor_unitario || 0,
      valor_total: product.valor_total || 0,
      produto_id: product.produto_id || ''
    });

    setEditingProduct(product);
    setShowForm(true);
  };

  const handleRemoveProduct = (productId: string) => {
    const updatedProdutos = produtos.filter(p => p.id !== productId);
    onChange(updatedProdutos);
    toast.success('Produto removido!');
  };

  const resetForm = () => {
    setFormData({
      id: '',
      codigo: '',
      descricao: '',
      ncm: '',
      cfop: '5102',
      unidade: '',
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
      produto_id: ''
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const formatMoney = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  // Calcular o total da nota
  const totalNota = produtos.reduce((acc, curr) => acc + (curr.valor_total || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-700 p-4 rounded-lg">
        {/* Busca e Adição de Produtos */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Produtos da NF-e</h3>
            <button
              onClick={() => {
                resetForm();
                setShowForm(!showForm);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-colors text-sm"
            >
              <Plus size={16} />
              <span>{showForm ? 'Cancelar' : 'Adicionar Produto'}</span>
            </button>
          </div>

          {/* Formulário de busca */}
          {!showForm && (
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Digite código ou nome do produto para buscar"
                  className="w-full pl-10 pr-4 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-70"
              >
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          )}

          {/* Resultados da busca */}
          {showResults && !showForm && (
            <div className="mt-4 mb-6">
              {isSearching ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="bg-slate-600 rounded-md p-4 text-center">
                  <p className="text-slate-300">Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="bg-slate-600 rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Código</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Descrição</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Preço</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-slate-300">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {searchResults.map((product) => (
                        <tr key={product.id} className="hover:bg-slate-650">
                          <td className="px-4 py-3 text-sm text-slate-300">{product.codigo || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">{product.descricao}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {formatMoney(product.preco_venda || 0)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleSelectProduct(product)}
                              className="text-blue-400 hover:text-blue-300 p-1"
                              title="Selecionar produto"
                            >
                              <Plus size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Formulário de produto */}
          {showForm && (
            <div className="bg-slate-750 p-4 rounded-lg mb-6 border border-slate-600">
              <h4 className="text-white font-medium mb-4">
                {editingProduct ? 'Editar Produto' : 'Adicionar Produto'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Código */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">Código</label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Código do produto"
                  />
                </div>

                {/* Descrição */}
                <div className="md:col-span-2">
                  <label className="block text-white text-sm font-medium mb-1">Descrição *</label>
                  <input
                    type="text"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descrição do produto"
                    required
                  />
                </div>

                {/* NCM */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">NCM</label>
                  <input
                    type="text"
                    value={formData.ncm}
                    onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Código NCM"
                  />
                </div>

                {/* CFOP */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">CFOP</label>
                  <input
                    type="text"
                    value={formData.cfop}
                    onChange={(e) => setFormData({ ...formData, cfop: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CFOP"
                  />
                </div>

                {/* Unidade */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">Unidade</label>
                  <input
                    type="text"
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="UN, KG, etc."
                  />
                </div>

                {/* Quantidade */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">Quantidade *</label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Quantidade"
                    required
                  />
                </div>

                {/* Valor Unitário */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">Valor Unitário *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.valor_unitario}
                    onChange={(e) => setFormData({ ...formData, valor_unitario: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0,00"
                    required
                  />
                </div>

                {/* Valor Total */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">Valor Total</label>
                  <input
                    type="text"
                    value={formatMoney(formData.valor_total)}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none"
                    readOnly
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  {editingProduct ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </div>
          )}

          {/* Lista de produtos adicionados */}
          {produtos.length > 0 ? (
            <div>
              <h4 className="text-white font-medium mb-2">Produtos na Nota ({produtos.length})</h4>
              <div className="bg-slate-600 rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Código</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Descrição</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-slate-300">Qtd</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-slate-300">Valor Unit.</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-slate-300">Valor Total</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-slate-300">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {produtos.map((produto) => (
                      <tr key={produto.id} className="hover:bg-slate-650">
                        <td className="px-4 py-3 text-sm text-slate-300">{produto.codigo || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{produto.descricao}</td>
                        <td className="px-4 py-3 text-sm text-slate-300 text-right">
                          {produto.quantidade.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 text-right">
                          {formatMoney(produto.valor_unitario || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 text-right">
                          {formatMoney(produto.valor_total || 0)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditProduct(produto)}
                              className="text-blue-400 hover:text-blue-300 p-1"
                              title="Editar produto"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleRemoveProduct(produto.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Remover produto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-700">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-white">
                        Total da NF-e:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-white">
                        {formatMoney(totalNota)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-600 rounded-md p-6 text-center">
              <p className="text-slate-300">Nenhum produto adicionado à nota fiscal</p>
              <p className="text-slate-400 text-sm mt-1">
                Use o botão "Adicionar Produto" para incluir itens na NF-e
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NFEProdutosTab;
