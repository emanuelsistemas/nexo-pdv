import React, { useState } from 'react';
import { X, Loader2, Package, Archive, Calculator } from 'lucide-react';

interface ProductSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProductFormData {
  codigo: string;
  codigoBarras: string;
  nome: string;
  unidade: string;
  grupo: string;
  precoCusto: string;
  margemLucro: string;
  precoVenda: string;
  cst: 'Tributado' | 'Substituicao Tributaria' | 'Outras';
  pis: '49- Outras operacoes de saida' | '99 - Outras saidas';
  cofins: '49- Outras operacoes de saida' | '99 - Outras saidas';
  ncm: string;
}

type MovimentacaoEstoque = {
  tipo: 'entrada' | 'saida';
  quantidade: number;
  data: string;
  observacao: string;
};

export function ProductSlidePanel({ isOpen, onClose }: ProductSlidePanelProps) {
  const [currentTab, setCurrentTab] = useState<'produto' | 'estoque' | 'impostos'>('produto');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    codigo: '',
    codigoBarras: '',
    nome: '',
    unidade: '',
    grupo: '',
    precoCusto: '',
    margemLucro: '',
    precoVenda: '',
    cst: 'Tributado',
    pis: '49- Outras operacoes de saida',
    cofins: '49- Outras operacoes de saida',
    ncm: ''
  });

  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [novaMovimentacao, setNovaMovimentacao] = useState<MovimentacaoEstoque>({
    tipo: 'entrada',
    quantidade: 0,
    data: new Date().toISOString().split('T')[0],
    observacao: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'precoCusto' || name === 'margemLucro') {
      const numericValue = value.replace(/[^0-9.]/g, '');
      
      setFormData(prev => {
        const newData = { ...prev, [name]: numericValue };
        
        // Calcula o preço de venda quando o preço de custo ou margem mudam
        if (newData.precoCusto && newData.margemLucro) {
          const custo = parseFloat(newData.precoCusto);
          const margem = parseFloat(newData.margemLucro);
          if (!isNaN(custo) && !isNaN(margem)) {
            const precoVenda = custo * (1 + margem / 100);
            newData.precoVenda = precoVenda.toFixed(2);
          }
        }
        
        return newData;
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMovimentacaoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNovaMovimentacao(prev => ({
      ...prev,
      [name]: name === 'quantidade' ? parseFloat(value) || 0 : value
    }));
  };

  const handleAddMovimentacao = () => {
    if (novaMovimentacao.quantidade <= 0) {
      return;
    }

    setMovimentacoes(prev => [...prev, novaMovimentacao]);
    setNovaMovimentacao({
      tipo: 'entrada',
      quantidade: 0,
      data: new Date().toISOString().split('T')[0],
      observacao: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Implementar lógica de salvamento
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulação
      onClose();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    } finally {
      setLoading(false);
    }
  };

  const panelClasses = `fixed right-0 top-0 h-full w-full md:w-[600px] bg-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  }`;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40"
          onClick={onClose}
        />
      )}

      <div className={`${panelClasses} z-50`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-200">
              Novo Produto
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <X size={24} />
            </button>
          </div>

          <div className="border-b border-slate-700">
            <div className="flex">
              <button
                onClick={() => setCurrentTab('produto')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  currentTab === 'produto'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Package size={20} />
                Produto
              </button>
              <button
                onClick={() => setCurrentTab('estoque')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  currentTab === 'estoque'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Archive size={20} />
                Estoque
              </button>
              <button
                onClick={() => setCurrentTab('impostos')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  currentTab === 'impostos'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calculator size={20} />
                Impostos
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {currentTab === 'produto' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Código *
                      </label>
                      <input
                        type="text"
                        name="codigo"
                        value={formData.codigo}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Código de Barras
                      </label>
                      <input
                        type="text"
                        name="codigoBarras"
                        value={formData.codigoBarras}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Unidade *
                      </label>
                      <select
                        name="unidade"
                        value={formData.unidade}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione</option>
                        <option value="UN">Unidade</option>
                        <option value="KG">Quilograma</option>
                        <option value="L">Litro</option>
                        <option value="CX">Caixa</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Grupo *
                      </label>
                      <select
                        name="grupo"
                        value={formData.grupo}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione</option>
                        <option value="bebidas">Bebidas</option>
                        <option value="alimentos">Alimentos</option>
                        <option value="limpeza">Limpeza</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Preço de Custo *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          R$
                        </span>
                        <input
                          type="text"
                          name="precoCusto"
                          value={formData.precoCusto}
                          onChange={handleChange}
                          className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Margem de Lucro (%) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="margemLucro"
                          value={formData.margemLucro}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Preço de Venda
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          R$
                        </span>
                        <input
                          type="text"
                          name="precoVenda"
                          value={formData.precoVenda}
                          readOnly
                          className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {currentTab === 'estoque' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                    <h3 className="text-lg font-medium text-slate-200 mb-4">
                      Nova Movimentação
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Tipo *
                        </label>
                        <select
                          name="tipo"
                          value={novaMovimentacao.tipo}
                          onChange={handleMovimentacaoChange}
                          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="entrada">Entrada</option>
                          <option value="saida">Saída</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Quantidade *
                        </label>
                        <input
                          type="number"
                          name="quantidade"
                          value={novaMovimentacao.quantidade}
                          onChange={handleMovimentacaoChange}
                          min="0"
                          step="1"
                          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Data *
                      </label>
                      <input
                        type="date"
                        name="data"
                        value={novaMovimentacao.data}
                        onChange={handleMovimentacaoChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Observação
                      </label>
                      <textarea
                        name="observacao"
                        value={novaMovimentacao.observacao}
                        onChange={handleMovimentacaoChange}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMovimentacao}
                      className="w-full bg-blue-500 hover:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      Adicionar Movimentação
                    </button>
                  </div>

                  <div className="bg-slate-900 rounded-lg border border-slate-700">
                    <div className="p-4 border-b border-slate-700">
                      <h3 className="text-lg font-medium text-slate-200">
                        Histórico de Movimentações
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left p-4 text-slate-400 font-medium">Data</th>
                            <th className="text-left p-4 text-slate-400 font-medium">Tipo</th>
                            <th className="text-right p-4 text-slate-400 font-medium">Quantidade</th>
                            <th className="text-left p-4 text-slate-400 font-medium">Observação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movimentacoes.map((mov, index) => (
                            <tr key={index} className="border-b border-slate-700">
                              <td className="p-4 text-slate-200">
                                {new Date(mov.data).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  mov.tipo === 'entrada'
                                    ? 'bg-green-500/10 text-green-500'
                                    : 'bg-red-500/10 text-red-400'
                                }`}>
                                  {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                </span>
                              </td>
                              <td className="p-4 text-right text-slate-200">{mov.quantidade}</td>
                              <td className="p-4 text-slate-200">{mov.observacao}</td>
                            </tr>
                          ))}
                          {movimentacoes.length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-slate-400">
                                Nenhuma movimentação registrada
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {currentTab === 'impostos' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      CST *
                    </label>
                    <select
                      name="cst"
                      value={formData.cst}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="Tributado">Tributado</option>
                      <option value="Substituicao Tributaria">Substituição Tributária</option>
                      <option value="Outras">Outras</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      PIS *
                    </label>
                    <select
                      name="pis"
                      value={formData.pis}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="49- Outras operacoes de saida">49- Outras operações de saída</option>
                      <option value="99 - Outras saidas">99 - Outras saídas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      COFINS *
                    </label>
                    <select
                      name="cofins"
                      value={formData.cofins}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="49- Outras operacoes de saida">49- Outras operações de saída</option>
                      <option value="99 - Outras saidas">99 - Outras saídas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      NCM *
                    </label>
                    <input
                      type="text"
                      name="ncm"
                      value={formData.ncm}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="p-6 border-t border-slate-700">
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2.5 px-4 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}