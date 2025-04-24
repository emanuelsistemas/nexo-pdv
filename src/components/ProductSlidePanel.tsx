import React, { useState, useEffect } from 'react';
import { X, Loader2, PlusCircle, MinusCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { StockMovementModal } from './StockMovementModal';

interface ProductSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: {
    id: string;
    code: string;
    barcode: string | null;
    name: string;
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
    group_id: string | null;
    unit_id: string | null;
    brand_id: string | null;
  } | null;
  initialTab?: 'produto' | 'estoque' | 'impostos';
}

interface ProductFormData {
  code: string;
  barcode: string;
  name: string;
  cost_price: string;
  profit_margin: string;
  selling_price: string;
  stock: string;
  cst: string;
  pis: string;
  cofins: string;
  ncm: string;
  cfop: string;
  status: 'active' | 'inactive';
  group_id: string;
  unit_id: string;
  brand_id: string;
}

interface Group {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  code: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

export function ProductSlidePanel({ isOpen, onClose, productToEdit, initialTab = 'produto' }: ProductSlidePanelProps) {
  const [activeTab, setActiveTab] = useState<'produto' | 'estoque' | 'impostos'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    code: '',
    barcode: '',
    name: '',
    cost_price: '',
    profit_margin: '',
    selling_price: '',
    stock: '',
    cst: '',
    pis: '',
    cofins: '',
    ncm: '',
    cfop: '5405',
    status: 'active',
    group_id: '',
    unit_id: '',
    brand_id: ''
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showStockMovementModal, setShowStockMovementModal] = useState(false);
  const [stockMovementType, setStockMovementType] = useState<'entrada' | 'saida'>('entrada');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadGroups();
      loadUnits();
      loadBrands();
      
      if (productToEdit) {
        setFormData({
          code: productToEdit.code,
          barcode: productToEdit.barcode || '',
          name: productToEdit.name,
          cost_price: productToEdit.cost_price.toString().replace('.', ','),
          profit_margin: productToEdit.profit_margin.toString().replace('.', ','),
          selling_price: productToEdit.selling_price.toString().replace('.', ','),
          stock: productToEdit.stock.toString().replace('.', ','),
          cst: productToEdit.cst,
          pis: productToEdit.pis,
          cofins: productToEdit.cofins,
          ncm: productToEdit.ncm,
          cfop: productToEdit.cfop,
          status: productToEdit.status,
          group_id: productToEdit.group_id || '',
          unit_id: productToEdit.unit_id || '',
          brand_id: productToEdit.brand_id || ''
        });
      } else {
        setFormData({
          code: '',
          barcode: '',
          name: '',
          cost_price: '',
          profit_margin: '',
          selling_price: '',
          stock: '0',
          cst: '',
          pis: '',
          cofins: '',
          ncm: '',
          cfop: '5405',
          status: 'active',
          group_id: '',
          unit_id: '',
          brand_id: ''
        });
        generateProductCode();
      }
    }
  }, [isOpen, productToEdit]);

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('Usuário não autenticado');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        console.warn('Empresa não encontrada');
        return;
      }

      const { data, error } = await supabase
        .from('product_groups')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .order('name');

      if (error) {
        throw error;
      }

      setGroups(data || []);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      toast.error('Erro ao carregar grupos');
    }
  };

  const loadUnits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('Usuário não autenticado');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        console.warn('Empresa não encontrada');
        return;
      }

      const { data, error } = await supabase
        .from('product_units')
        .select('id, code, name')
        .eq('company_id', profile.company_id)
        .order('name');

      if (error) {
        throw error;
      }

      setUnits(data || []);
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
      toast.error('Erro ao carregar unidades');
    }
  };

  const loadBrands = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('Usuário não autenticado');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        console.warn('Empresa não encontrada');
        return;
      }

      const { data, error } = await supabase
        .from('product_marca')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .order('name');

      if (error) {
        throw error;
      }

      setBrands(data || []);
    } catch (error) {
      console.error('Erro ao carregar marcas:', error);
      toast.error('Erro ao carregar marcas');
    }
  };

  const generateProductCode = async () => {
    try {
      setIsGeneratingCode(true);
      
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

      // Chamar a função RPC para reservar um código de produto
      const { data, error } = await supabase
        .rpc('reserve_product_code', {
          p_company_id: profile.company_id,
          p_user_id: user.id
        });

      if (error) {
        throw error;
      }

      if (data) {
        setFormData(prev => ({ ...prev, code: data }));
      }
    } catch (error) {
      console.error('Erro ao gerar código de produto:', error);
      toast.error('Erro ao gerar código de produto');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Calcular preço de venda automaticamente quando custo ou margem mudam
      if (name === 'cost_price' || name === 'profit_margin') {
        if (newData.cost_price && newData.profit_margin) {
          // Para cálculos, converte vírgula para ponto
          const custoStr = newData.cost_price.replace(',', '.');
          const margemStr = newData.profit_margin.replace(',', '.');
          
          const custo = parseFloat(custoStr);
          const margem = parseFloat(margemStr);
          
          if (!isNaN(custo) && !isNaN(margem)) {
            const precoVenda = custo * (1 + margem / 100);
            // Formata no padrão brasileiro com vírgula
            newData.selling_price = precoVenda.toFixed(2).replace('.', ',');
          }
        }
      }
      
      return newData;
    });
  };

  const handlePriceBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Formatar valores monetários no padrão brasileiro
    if (['cost_price', 'selling_price', 'profit_margin'].includes(name)) {
      const formattedValue = formatCurrency(value);
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    }
  };

  const formatCurrency = (value: string): string => {
    // Remove caracteres não numéricos e converte vírgula para ponto para cálculos internos
    const numericValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    
    // Formata o valor com 2 casas decimais e converte de volta para o formato brasileiro
    return isNaN(parseFloat(numericValue)) 
      ? ''  // Retorna vazio se não for um número válido
      : parseFloat(numericValue).toFixed(2).replace('.', ',');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      // Converter valores com vírgula para ponto antes de salvar
      const cost_price = formData.cost_price.replace(',', '.');
      const profit_margin = formData.profit_margin.replace(',', '.');
      const selling_price = formData.selling_price.replace(',', '.');
      const stock = formData.stock.replace(',', '.');

      const productData = {
        company_id: profile.company_id,
        code: formData.code,
        barcode: formData.barcode || null,
        name: formData.name,
        cost_price: parseFloat(cost_price),
        profit_margin: parseFloat(profit_margin),
        selling_price: parseFloat(selling_price),
        stock: parseFloat(stock),
        cst: formData.cst,
        pis: formData.pis,
        cofins: formData.cofins,
        ncm: formData.ncm,
        cfop: formData.cfop,
        status: formData.status,
        group_id: formData.group_id || null,
        unit_id: formData.unit_id || null,
        brand_id: formData.brand_id || null
      };

      if (productToEdit) {
        // Atualizar produto existente
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productToEdit.id);

        if (updateError) {
          if (updateError.code === '23505') {
            throw new Error('Já existe um produto com este código');
          }
          throw updateError;
        }

        toast.success('Produto atualizado com sucesso!');
      } else {
        // Criar novo produto
        const { error: insertError } = await supabase
          .from('products')
          .insert([productData]);

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error('Já existe um produto com este código');
          }
          throw insertError;
        }

        toast.success('Produto cadastrado com sucesso!');
      }

      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast.error(error.message || 'Erro ao processar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleStockMovement = (type: 'entrada' | 'saida') => {
    setStockMovementType(type);
    setShowStockMovementModal(true);
  };

  const handleStockUpdated = (newStock: number) => {
    setFormData(prev => ({
      ...prev,
      stock: newStock.toString().replace('.', ',')
    }));
  };

  const panelClasses = `fixed right-0 top-0 h-full w-full md:w-[800px] bg-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
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
              {productToEdit ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex border-b border-slate-700">
            <button
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'produto'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('produto')}
            >
              Produto
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'estoque'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('estoque')}
            >
              Estoque
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'impostos'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('impostos')}
            >
              Tributação
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'produto' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Código *
                      </label>
                      <input
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        required
                        readOnly={!!productToEdit}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Código de Barras
                      </label>
                      <input
                        type="text"
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Preço de Custo *
                      </label>
                      <input
                        type="text"
                        name="cost_price"
                        value={formData.cost_price}
                        onChange={handleChange}
                        onBlur={handlePriceBlur}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Margem de Lucro (%) *
                      </label>
                      <input
                        type="text"
                        name="profit_margin"
                        value={formData.profit_margin}
                        onChange={handleChange}
                        onBlur={handlePriceBlur}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Preço de Venda *
                      </label>
                      <input
                        type="text"
                        name="selling_price"
                        value={formData.selling_price}
                        onChange={handleChange}
                        onBlur={handlePriceBlur}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Grupo
                      </label>
                      <select
                        name="group_id"
                        value={formData.group_id}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      >
                        <option value="">Selecione um grupo</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Unidade *
                      </label>
                      <select
                        name="unit_id"
                        value={formData.unit_id}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        required
                      >
                        <option value="">Selecione uma unidade</option>
                        {units.map(unit => (
                          <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Marca
                      </label>
                      <select
                        name="brand_id"
                        value={formData.brand_id}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      >
                        <option value="">Selecione uma marca</option>
                        {brands.map(brand => (
                          <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Status
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="status"
                          value="active"
                          checked={formData.status === 'active'}
                          onChange={handleChange}
                          className="text-blue-500 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="text-slate-200">Ativo</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="status"
                          value="inactive"
                          checked={formData.status === 'inactive'}
                          onChange={handleChange}
                          className="text-blue-500 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="text-slate-200">Inativo</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'estoque' && (
                <>
                  <div className="bg-slate-700 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Controle de Estoque</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Estoque Atual
                        </label>
                        <input
                          type="text"
                          name="stock"
                          value={formData.stock}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          readOnly={!!productToEdit}
                        />
                      </div>
                      
                      {productToEdit && (
                        <div className="flex items-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleStockMovement('entrada')}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded-lg transition-colors"
                          >
                            <PlusCircle size={20} />
                            <span>Entrada</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStockMovement('saida')}
                            className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-2 px-4 rounded-lg transition-colors"
                          >
                            <MinusCircle size={20} />
                            <span>Saída</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'impostos' && (
                <>
                  <div className="bg-slate-700 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Informações Fiscais</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          NCM *
                        </label>
                        <input
                          type="text"
                          name="ncm"
                          value={formData.ncm}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          CFOP *
                        </label>
                        <select
                          name="cfop"
                          value={formData.cfop}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          required
                        >
                          <option value="5405">5405 - Venda de mercadoria adquirida/recebida de terceiros</option>
                          <option value="5102">5102 - Venda de mercadoria adquirida/recebida de terceiros</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          CST/CSOSN *
                        </label>
                        <input
                          type="text"
                          name="cst"
                          value={formData.cst}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          PIS *
                        </label>
                        <input
                          type="text"
                          name="pis"
                          value={formData.pis}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          COFINS *
                        </label>
                        <input
                          type="text"
                          name="cofins"
                          value={formData.cofins}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
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

      {productToEdit && (
        <StockMovementModal
          isOpen={showStockMovementModal}
          onClose={() => setShowStockMovementModal(false)}
          productId={productToEdit.id}
          productName={productToEdit.name}
          currentStock={parseFloat(formData.stock.replace(',', '.'))}
          unitCode={units.find(u => u.id === productToEdit.unit_id)?.code || 'UN'}
          movementType={stockMovementType}
          onStockUpdated={handleStockUpdated}
        />
      )}
    </>
  );
}