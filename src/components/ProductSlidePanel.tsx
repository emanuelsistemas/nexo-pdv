import React, { useState, useEffect, useRef } from 'react';
import { X as XMarkIcon, Loader2, Package, Archive, Calculator, Shuffle } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { StockMovementModal } from './StockMovementModal';

interface ProductSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'produto' | 'estoque' | 'impostos';
  productToEdit?: {
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
  } | null;
}

interface Unit {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system?: boolean;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface ProductFormData {
  code: string;
  barcode: string;
  name: string;
  unit_id: string;
  group_id: string;
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
}

export function ProductSlidePanel({ isOpen, onClose, initialTab = 'produto', productToEdit }: ProductSlidePanelProps) {
  const [currentTab, setCurrentTab] = useState<'produto' | 'estoque' | 'impostos'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingNextCode, setLoadingNextCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    code: '',
    barcode: '',
    name: '',
    unit_id: '',
    group_id: '',
    cost_price: '',
    profit_margin: '',
    selling_price: '',
    stock: '0',
    cst: 'Substituicao Tributaria',
    pis: '49- Outras operacoes de saida',
    cofins: '49- Outras operacoes de saida',
    ncm: '',
    cfop: '5405',
    status: 'active'
  });

  useEffect(() => {
    if (isOpen) {
      loadUnitsAndGroups();
      if (productToEdit) {
        setFormData({
          code: productToEdit.code,
          barcode: productToEdit.barcode || '',
          name: productToEdit.name,
          unit_id: productToEdit.unit_id,
          group_id: productToEdit.group_id || '',
          cost_price: productToEdit.cost_price.toString().replace('.', ','),
          profit_margin: productToEdit.profit_margin.toString().replace('.', ','),
          selling_price: productToEdit.selling_price.toString().replace('.', ','),
          stock: productToEdit.stock.toString().replace('.', ','),
          cst: productToEdit.cst,
          pis: productToEdit.pis,
          cofins: productToEdit.cofins,
          ncm: productToEdit.ncm,
          cfop: productToEdit.cfop,
          status: productToEdit.status
        });
      } else {
        // Configuração padrão para novo produto
        setFormData({
          code: '',  // Será preenchido pela função loadDefaultValues
          barcode: '',
          name: '',
          unit_id: '',  // Será preenchido pela função loadDefaultValues
          group_id: '',  // Será preenchido pela função loadDefaultValues
          cost_price: '',
          profit_margin: '',
          selling_price: '',
          stock: '0',
          cst: 'Substituicao Tributaria',
          pis: '49- Outras operacoes de saida',
          cofins: '49- Outras operacoes de saida',
          ncm: '22021000',  // Valor padrão conforme solicitado
          cfop: '5405',
          status: 'active'
        });
        
        // Carregar valores padrão para novo produto
        if (!productToEdit) {
          loadDefaultValues();
        }
      }
    }
  }, [isOpen, productToEdit]);

  useEffect(() => {
    const unit = units.find(u => u.id === formData.unit_id);
    setSelectedUnit(unit || null);
  }, [formData.unit_id, units]);

  // Função para carregar valores padrão para um novo produto
  const loadDefaultValues = async () => {
    try {
      // Obter o próximo código disponível
      getNextAvailableCode();
    } catch (error) {
      console.error('Erro ao carregar valores padrão:', error);
    }
  };
  
  // Atualiza o estoque após movimentações
  const handleStockUpdated = (newStock: number) => {
    setFormData(prev => ({
      ...prev,
      stock: newStock.toString().replace('.', ',')
    }));
  };

  // Efeito para definir valores padrão quando as unidades e grupos forem carregados
  useEffect(() => {
    // Se não estiver em modo de edição e tiver dados carregados
    if (!productToEdit && !loadingData && units.length > 0 && groups.length > 0) {
      // Configurar unidade padrão (UN)
      const defaultUnit = units.find(unit => unit.code === 'UN');
      if (defaultUnit) {
        setFormData(prev => ({ ...prev, unit_id: defaultUnit.id }));
      } else if (units.length > 0) {
        // Se não encontrar UN, use a primeira unidade disponível
        setFormData(prev => ({ ...prev, unit_id: units[0].id }));
      }
      
      // Configurar grupo padrão (Diversos)
      const defaultGroup = groups.find(group => group.name === 'Diversos');
      if (defaultGroup) {
        setFormData(prev => ({ ...prev, group_id: defaultGroup.id }));
      } else if (groups.length > 0) {
        // Se não encontrar Diversos, use o primeiro grupo disponível
        setFormData(prev => ({ ...prev, group_id: groups[0].id }));
      }
    }
  }, [productToEdit, loadingData, units, groups]);

  const loadUnitsAndGroups = async () => {
    try {
      setLoadingData(true);

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

      // Buscar apenas as unidades da empresa (product_units)
      const { data: companyUnits, error: companyUnitsError } = await supabase
        .from('product_units')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      if (companyUnitsError) throw companyUnitsError;

      // Configurar as unidades da empresa
      setUnits(companyUnits || []);

      // Get groups
      const { data: groups, error: groupsError } = await supabase
        .from('product_groups')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      if (groupsError) throw groupsError;

      setGroups(groups || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar unidades e grupos');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (codeError || barcodeError) {
      toast.error('Por favor, corrija os erros antes de salvar');
      return;
    }

    // Validate unit_id
    if (!formData.unit_id) {
      toast.error('Selecione uma unidade de medida');
      return;
    }

    const selectedUnit = units.find(u => u.id === formData.unit_id);
    if (!selectedUnit) {
      toast.error('Unidade de medida inválida');
      return;
    }
    
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

      // Converte valores com vírgula para ponto antes de salvar
      const cost_price = formData.cost_price.replace(',', '.');
      const profit_margin = formData.profit_margin.replace(',', '.');
      const selling_price = formData.selling_price.replace(',', '.');
      const stock = formData.stock.replace(',', '.');

      const productData = {
        company_id: profile.company_id,
        code: formData.code,
        barcode: formData.barcode || null,
        name: formData.name,
        unit_id: formData.unit_id,
        group_id: formData.group_id || null,
        cost_price: parseFloat(cost_price),
        profit_margin: parseFloat(profit_margin),
        selling_price: parseFloat(selling_price),
        stock: 0,
        cst: formData.cst,
        pis: formData.pis,
        cofins: formData.cofins,
        ncm: formData.ncm,
        cfop: formData.cfop,
        status: formData.status
      };

      if (productToEdit) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productToEdit.id);

        if (updateError) throw updateError;

        toast.success('Produto atualizado com sucesso!');
      } else {
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (insertError) throw insertError;

        const initialStock = parseFloat(stock);
        if (initialStock > 0) {
          const { error: movementError } = await supabase
            .from('product_stock_movements')
            .insert({
              product_id: newProduct.id,
              company_id: profile.company_id,
              type: 'entrada',
              quantity: initialStock,
              date: new Date().toISOString(),
              observation: 'Estoque inicial',
              created_by: user.id
            });

          if (movementError) throw movementError;

          const { error: updateError } = await supabase
            .from('products')
            .update({ stock: initialStock })
            .eq('id', newProduct.id);

          if (updateError) throw updateError;
        }

        toast.success('Produto cadastrado com sucesso!');
      }

      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast.error('Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  // Função para formatar valores monetários no padrão brasileiro (usando vírgula)
  const formatCurrency = (value: string): string => {
    // Remove caracteres não numéricos e converte vírgula para ponto para cálculos internos
    const numericValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    
    // Formata o valor com 2 casas decimais e converte de volta para o formato brasileiro
    return isNaN(parseFloat(numericValue)) 
      ? ''  // Retorna vazio se não for um número válido
      : parseFloat(numericValue).toFixed(2).replace('.', ',');  // Usa vírgula como separador decimal
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'code') {
      setCodeError(null);
    }
    
    if (name === 'barcode') {
      setBarcodeError(null);
    }

    if (name === 'cfop') {
      const cstValue = value === '5405' ? 'Substituicao Tributaria' : 'Tributado';
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        cst: cstValue 
      }));
      return;
    }
    
    if (name === 'cost_price') {
      // Remove a formatação para manter apenas o valor numérico, mas mantém a vírgula como separador
      const numericValue = value.replace(/[^0-9.,]/g, '');
      
      setFormData(prev => {
        const newData = { ...prev, [name]: numericValue };
        
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
        
        return newData;
      });
    } else if (name === 'profit_margin') {
      const numericValue = value.replace(/[^0-9.,]/g, '');
      
      setFormData(prev => {
        const newData = { ...prev, [name]: numericValue };
        
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
        
        return newData;
      });
    } else if (name === 'selling_price') {
      const numericValue = value.replace(/[^0-9.,]/g, '');
      
      setFormData(prev => {
        const newData = { ...prev, [name]: numericValue };
        
        if (newData.cost_price && newData.selling_price) {
          // Para cálculos, converte vírgula para ponto
          const custoStr = newData.cost_price.replace(',', '.');
          const vendaStr = newData.selling_price.replace(',', '.');
          
          const custo = parseFloat(custoStr);
          const venda = parseFloat(vendaStr);
          
          if (!isNaN(custo) && !isNaN(venda) && custo > 0) {
            const margem = ((venda / custo) - 1) * 100;
            // Formata no padrão brasileiro com vírgula
            newData.profit_margin = margem.toFixed(2).replace('.', ',');
          }
        }
        
        return newData;
      });
    } else if (name === 'ncm') {
      const validValue = value.replace(/[^0-9.]/g, '');
      setFormData(prev => ({ ...prev, [name]: validValue }));
    } else if (name === 'stock' && !productToEdit) {
      let numericValue = value.replace(/[^0-9.,]/g, '');
      
      // Only force integer values for non-KG units
      if (selectedUnit && selectedUnit.code !== 'KG') {
        numericValue = String(Math.floor(parseFloat(numericValue.replace(',', '.')) || 0));
      }
      
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const getNextAvailableCode = async () => {
    try {
      setLoadingNextCode(true);
      
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

      const { data, error } = await supabase
        .from('products')
        .select('code')
        .eq('company_id', profile.company_id)
        .order('code', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setFormData(prev => ({ ...prev, code: '1' }));
        toast.success('Código gerado com sucesso!');
        return;
      }

      const existingCodes = data
        .map(item => parseInt(item.code.replace(/\D/g, '')))
        .filter(code => !isNaN(code))
        .sort((a, b) => a - b);

      let nextCode = 1;
      for (const code of existingCodes) {
        if (code > nextCode) {
          break;
        }
        nextCode = code + 1;
      }

      setFormData(prev => ({ ...prev, code: nextCode.toString() }));
      toast.success('Código gerado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar código:', error);
      toast.error('Erro ao gerar código automático');
    } finally {
      setLoadingNextCode(false);
    }
  };

  const validateCode = async (code: string) => {
    if (!code.trim()) return;
    
    try {
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

      const { data, error } = await supabase
        .from('products')
        .select('id, code')
        .eq('company_id', profile.company_id)
        .eq('code', code);

      if (error) throw error;

      if (data && data.length > 0) {
        if (productToEdit && data.some(item => item.id === productToEdit.id)) {
          setCodeError(null);
        } else {
          setCodeError('Este código já está em uso por outro produto');
        }
      } else {
        setCodeError(null);
      }
    } catch (error: any) {
      console.error('Erro ao validar código:', error);
    }
  };

  const validateBarcode = async (barcode: string) => {
    if (!barcode.trim()) return;
    
    try {
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

      const { data, error } = await supabase
        .from('products')
        .select('id, barcode')
        .eq('company_id', profile.company_id)
        .eq('barcode', barcode)
        .not('barcode', 'is', null);

      if (error) throw error;

      if (data && data.length > 0) {
        if (productToEdit && data.some(item => item.id === productToEdit.id)) {
          setBarcodeError(null);
        } else {
          setBarcodeError('Este código de barras já está em uso por outro produto');
        }
      } else {
        setBarcodeError(null);
      }
    } catch (error: any) {
      console.error('Erro ao validar código de barras:', error);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'code') {
      validateCode(value);
    } else if (name === 'barcode') {
      validateBarcode(value);
    }
  };

  const handlePriceBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (value) {
      // Formata com o padrão brasileiro (vírgula como separador decimal)
      const formatted = formatCurrency(value);
      if (formatted) {
        setFormData(prev => ({ ...prev, [name]: formatted }));
      }
    }
  };

  const handleSetDefaultNCM = () => {
    setFormData(prev => ({
      ...prev,
      ncm: '22021000'
    }));
  };

  const panelClasses = `fixed right-0 top-0 h-full w-full md:w-[600px] bg-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  }`;

  if (loadingData) {
    return (
      <>
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40"
            onClick={onClose}
          />
        )}
        <div className={`${panelClasses} z-50`}>
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-slate-400">
              <Loader2 size={40} className="animate-spin" />
              <span>Carregando...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

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
            <h2 className="text-2xl font-bold text-slate-200">
              {productToEdit ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          {formData.name && (
            <div className="py-0 border-b border-slate-700">
              <div className="px-4 py-2 bg-slate-900 text-slate-200 font-semibold text-3xl w-full">
                {formData.name}
              </div>
            </div>
          )}

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
              {productToEdit && (
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
              )}
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
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Status *
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Código *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="code"
                          value={formData.code}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`w-full px-4 py-2 rounded-lg bg-slate-900 border ${
                            codeError ? 'border-red-500' : 'border-slate-700'
                          } text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10`}
                          required
                        />
                        <button
                          type="button"
                          onClick={getNextAvailableCode}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors"
                          title="Gerar próximo código disponível"
                          disabled={loadingNextCode}
                        >
                          {loadingNextCode ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Shuffle size={18} />
                          )}
                        </button>
                      </div>
                      {codeError && (
                        <p className="mt-1 text-sm text-red-500">{codeError}</p>
                      )}
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
                        onBlur={handleBlur}
                        className={`w-full px-4 py-2 rounded-lg bg-slate-900 border ${
                          barcodeError ? 'border-red-500' : 'border-slate-700'
                        } text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                      {barcodeError && (
                        <p className="mt-1 text-sm text-red-500">{barcodeError}</p>
                      )}
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
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Unidade de Medida *
                    </label>
                    <select
                      name="unit_id"
                      value={formData.unit_id}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {units.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.code} - {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Grupo
                    </label>
                    <select
                      name="group_id"
                      value={formData.group_id}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
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
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {!productToEdit && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Estoque Inicial
                      </label>
                      <input
                        type="number"
                        name="stock"
                        value={formData.stock}
                        onChange={handleChange}
                        disabled={!formData.unit_id}
                        min="0"
                        step={selectedUnit?.code === 'KG' ? '0.001' : '1'}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {!formData.unit_id && (
                        <p className="mt-1 text-sm text-slate-400">
                          Selecione uma unidade de medida para informar o estoque inicial
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {currentTab === 'estoque' && productToEdit && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Estoque Atual
                    </label>
                    <input
                      type="text"
                      value={formData.stock}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled
                    />
                    <p className="mt-1 text-sm text-slate-400">
                      O estoque é atualizado através dos movimentos de entrada e saída
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Unidade de Medida
                    </label>
                    <input
                      type="text"
                      value={selectedUnit ? `${selectedUnit.code} - ${selectedUnit.name}` : ''}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled
                    />
                  </div>
                  
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-slate-200 mb-3">Movimentações de Estoque</h3>
                    <p className="text-slate-400 mb-4">
                      Utilize as opções abaixo para gerenciar as movimentações de estoque deste produto.
                      As movimentações afetam diretamente o estoque disponível para vendas.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-3 px-4 rounded-lg transition-colors font-medium"
                        onClick={() => setShowEntryModal(true)}
                      >
                        <span>Nova Entrada</span>
                      </button>
                      
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-3 px-4 rounded-lg transition-colors font-medium"
                        onClick={() => setShowExitModal(true)}
                      >
                        <span>Nova Saída</span>
                      </button>
                    </div>
                    
                    <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
                      <p className="text-slate-300 italic text-center">
                        O histórico completo de movimentações pode ser acessado 
                        através do módulo de Estoque no menu principal.
                      </p>
                    </div>
                  </div>
                  
                  {/* Modal de Entrada de Estoque */}
                  {productToEdit && showEntryModal && (
                    <StockMovementModal
                      isOpen={showEntryModal}
                      onClose={() => setShowEntryModal(false)}
                      productId={productToEdit.id}
                      productName={formData.name}
                      currentStock={parseFloat(formData.stock.replace(',', '.'))}
                      unitCode={selectedUnit?.code || ''}
                      movementType="entrada"
                      onStockUpdated={handleStockUpdated}
                    />
                  )}
                  
                  {/* Modal de Saída de Estoque */}
                  {productToEdit && showExitModal && (
                    <StockMovementModal
                      isOpen={showExitModal}
                      onClose={() => setShowExitModal(false)}
                      productId={productToEdit.id}
                      productName={formData.name}
                      currentStock={parseFloat(formData.stock.replace(',', '.'))}
                      unitCode={selectedUnit?.code || ''}
                      movementType="saida"
                      onStockUpdated={handleStockUpdated}
                    />
                  )}
                </>
              )}

              {currentTab === 'impostos' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      CFOP *
                    </label>
                    <select
                      name="cfop"
                      value={formData.cfop}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="5405">5405 - Venda de mercadoria adquirida ou recebida de terceiros</option>
                      <option value="5102">5102 - Venda de mercadoria adquirida ou recebida de terceiros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      CST *
                    </label>
                    <input
                      type="text"
                      name="cst"
                      value={formData.cst}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled
                    />
                    <p className="mt-1 text-sm text-slate-400">
                      O CST é definido automaticamente com base no CFOP selecionado
                    </p>
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
                      <option value="49- Outras operacoes de saida">49- Outras operacoes de saida</option>
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
                      <option value="49- Outras operacoes de saida">49- Outras operacoes de saida</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      NCM *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="ncm"
                        value={formData.ncm}
                        onChange={handleChange}
                        maxLength={8}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleSetDefaultNCM}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors"
                        title="Usar NCM padrão"
                      >
                        <Shuffle size={18} />
                      </button>
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
    </>
  );
}
