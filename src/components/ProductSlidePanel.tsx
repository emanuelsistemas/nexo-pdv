import React, { useState, useEffect } from 'react';
import { X, Loader2, Package, Archive, Calculator, Shuffle } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

interface ProductSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: {
    id: string;
    code: string;
    barcode: string | null;
    name: string;
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
  cst: string;
  pis: string;
  cofins: string;
  ncm: string;
  status: 'active' | 'inactive';
}

type MovimentacaoEstoque = {
  tipo: 'entrada' | 'saida';
  quantidade: number;
  data: string;
  observacao: string;
};

export function ProductSlidePanel({ isOpen, onClose, productToEdit }: ProductSlidePanelProps) {
  const [currentTab, setCurrentTab] = useState<'produto' | 'estoque' | 'impostos'>('produto');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingNextCode, setLoadingNextCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    code: '',
    barcode: '',
    name: '',
    unit_id: '',
    group_id: '',
    cost_price: '',
    profit_margin: '',
    selling_price: '',
    cst: 'Tributado',
    pis: '49- Outras operacoes de saida',
    cofins: '49- Outras operacoes de saida',
    ncm: '',
    status: 'active'
  });

  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [novaMovimentacao, setNovaMovimentacao] = useState<MovimentacaoEstoque>({
    tipo: 'entrada',
    quantidade: 0,
    data: new Date().toISOString().split('T')[0],
    observacao: ''
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
          cost_price: productToEdit.cost_price.toString(),
          profit_margin: productToEdit.profit_margin.toString(),
          selling_price: productToEdit.selling_price.toString(),
          cst: productToEdit.cst,
          pis: productToEdit.pis,
          cofins: productToEdit.cofins,
          ncm: productToEdit.ncm,
          status: productToEdit.status
        });
      }
    }
  }, [isOpen, productToEdit]);

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

      // Load system units
      const { data: systemUnits, error: systemUnitsError } = await supabase
        .from('system_units')
        .select('*')
        .order('name');

      if (systemUnitsError) throw systemUnitsError;

      // Load company units
      const { data: companyUnits, error: companyUnitsError } = await supabase
        .from('product_units')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      if (companyUnitsError) throw companyUnitsError;

      // Combine and mark system units
      const allUnits = [
        ...systemUnits.map(unit => ({ ...unit, is_system: true })),
        ...companyUnits.map(unit => ({ ...unit, is_system: false }))
      ];

      setUnits(allUnits);

      // Load groups
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Limpar erros quando o usuário edita os campos
    if (name === 'code') {
      setCodeError(null);
    }
    
    if (name === 'barcode') {
      setBarcodeError(null);
    }
    
    if (name === 'cost_price') {
      // Aceitar vírgulas e pontos como separador decimal
      const numericValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
      
      setFormData(prev => {
        const newData = { ...prev, [name]: numericValue };
        
        // Calcular o preço de venda quando o preço de custo muda
        if (newData.cost_price && newData.profit_margin) {
          const custo = parseFloat(newData.cost_price);
          const margem = parseFloat(newData.profit_margin);
          if (!isNaN(custo) && !isNaN(margem)) {
            const precoVenda = custo * (1 + margem / 100);
            newData.selling_price = precoVenda.toFixed(2);
          }
        }
        
        return newData;
      });
    } else if (name === 'profit_margin') {
      // Aceitar vírgulas e pontos como separador decimal
      const numericValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
      
      setFormData(prev => {
        const newData = { ...prev, [name]: numericValue };
        
        // Calcular o preço de venda quando a margem muda
        if (newData.cost_price && newData.profit_margin) {
          const custo = parseFloat(newData.cost_price);
          const margem = parseFloat(newData.profit_margin);
          if (!isNaN(custo) && !isNaN(margem)) {
            const precoVenda = custo * (1 + margem / 100);
            newData.selling_price = precoVenda.toFixed(2);
          }
        }
        
        return newData;
      });
    } else if (name === 'selling_price') {
      // Aceitar vírgulas e pontos como separador decimal
      const numericValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
      
      setFormData(prev => {
        const newData = { ...prev, [name]: numericValue };
        
        // Calcular a margem quando o preço de venda muda
        if (newData.cost_price && newData.selling_price) {
          const custo = parseFloat(newData.cost_price);
          const venda = parseFloat(newData.selling_price);
          
          if (!isNaN(custo) && !isNaN(venda) && custo > 0) {
            const margem = ((venda / custo) - 1) * 100;
            newData.profit_margin = margem.toFixed(2);
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
    
    // Verificar se há erros antes de enviar
    if (codeError || barcodeError) {
      toast.error('Por favor, corrija os erros antes de salvar');
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

      const productData = {
        company_id: profile.company_id,
        code: formData.code,
        barcode: formData.barcode || null,
        name: formData.name,
        unit_id: formData.unit_id,
        group_id: formData.group_id || null,
        cost_price: parseFloat(formData.cost_price),
        profit_margin: parseFloat(formData.profit_margin),
        selling_price: parseFloat(formData.selling_price),
        cst: formData.cst,
        pis: formData.pis,
        cofins: formData.cofins,
        ncm: formData.ncm,
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
        const { error: insertError } = await supabase
          .from('products')
          .insert([productData]);

        if (insertError) throw insertError;

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

  const getNextAvailableCode = async () => {
    try {
      setLoadingNextCode(true);
      
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      // Obter o ID da empresa do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      // Buscar todos os códigos de produtos existentes
      const { data, error } = await supabase
        .from('products')
        .select('code')
        .eq('company_id', profile.company_id)
        .order('code', { ascending: true });

      if (error) throw error;

      // Se não houver produtos, começar com 1
      if (!data || data.length === 0) {
        setFormData(prev => ({ ...prev, code: '1' }));
        toast.success('Código gerado com sucesso!');
        return;
      }

      // Extrair e converter todos os códigos para números
      const existingCodes = data
        .map(item => parseInt(item.code.replace(/\D/g, '')))
        .filter(code => !isNaN(code))
        .sort((a, b) => a - b);

      // Encontrar o primeiro "buraco" na sequência
      let nextCode = 1;
      for (const code of existingCodes) {
        if (code > nextCode) {
          // Encontramos um buraco na sequência
          break;
        }
        nextCode = code + 1;
      }

      // Atualizar o formulário com o novo código
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
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      // Obter o ID da empresa do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      // Verificar se o código já existe
      const { data, error } = await supabase
        .from('products')
        .select('id, code')
        .eq('company_id', profile.company_id)
        .eq('code', code);

      if (error) throw error;

      // Se estiver editando um produto, ignorar o próprio produto na validação
      if (data && data.length > 0) {
        if (productToEdit && data.some(item => item.id === productToEdit.id)) {
          // É o mesmo produto, então não há problema
          setCodeError(null);
        } else {
          // Código já existe em outro produto
          setCodeError('Este código já está em uso por outro produto');
        }
      } else {
        // Código não existe, está disponível
        setCodeError(null);
      }
    } catch (error: any) {
      console.error('Erro ao validar código:', error);
    }
  };

  const validateBarcode = async (barcode: string) => {
    if (!barcode.trim()) return; // Código de barras vazio é permitido
    
    try {
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      // Obter o ID da empresa do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      // Verificar se o código de barras já existe
      const { data, error } = await supabase
        .from('products')
        .select('id, barcode')
        .eq('company_id', profile.company_id)
        .eq('barcode', barcode)
        .not('barcode', 'is', null); // Ignorar produtos sem código de barras

      if (error) throw error;

      // Se estiver editando um produto, ignorar o próprio produto na validação
      if (data && data.length > 0) {
        if (productToEdit && data.some(item => item.id === productToEdit.id)) {
          // É o mesmo produto, então não há problema
          setBarcodeError(null);
        } else {
          // Código de barras já existe em outro produto
          setBarcodeError('Este código de barras já está em uso por outro produto');
        }
      } else {
        // Código de barras não existe, está disponível
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
      // Converter para número e formatar com 2 casas decimais
      const numericValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
      const formattedValue = parseFloat(numericValue).toFixed(2);
      
      if (!isNaN(parseFloat(formattedValue))) {
        setFormData(prev => ({ ...prev, [name]: formattedValue }));
      }
    }
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
                      Nome do Produto *
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Unidade *
                      </label>
                      <select
                        name="unit_id"
                        value={formData.unit_id}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione</option>
                        {units.length > 0 && (
                          <>
                            <optgroup label="Unidades do Sistema">
                              {units
                                .filter(unit => unit.is_system)
                                .map(unit => (
                                  <option key={unit.id} value={unit.id}>
                                    {unit.code} - {unit.name}
                                  </option>
                                ))
                              }
                            </optgroup>
                            <optgroup label="Unidades da Empresa">
                              {units
                                .filter(unit => !unit.is_system)
                                .map(unit => (
                                  <option key={unit.id} value={unit.id}>
                                    {unit.code} - {unit.name}
                                  </option>
                                ))
                              }
                            </optgroup>
                          </>
                        )}
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
                      >
                        <option value="">Selecione</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Preço de Custo (R$) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          R$
                        </span>
                        <input
                          type="text"
                          name="cost_price"
                          value={formData.cost_price.replace('.', ',')}
                          onChange={handleChange}
                          onBlur={handlePriceBlur}
                          className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Margem de Lucro (%) *
                      </label>
                      <input
                        type="text"
                        name="profit_margin"
                        value={formData.profit_margin.replace('.', ',')}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Preço de Venda (R$) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          R$
                        </span>
                        <input
                          type="text"
                          name="selling_price"
                          value={formData.selling_price.replace('.', ',')}
                          onChange={handleChange}
                          onBlur={handlePriceBlur}
                          className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
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