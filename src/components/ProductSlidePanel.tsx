import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, ArrowUpDown, PlusCircle, MinusCircle, Image as ImageIcon, Upload, Trash2, Star } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { StockMovementModal } from './StockMovementModal';

interface ProductSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: {
    id: string;
    code: string;
    name: string;
    barcode: string | null;
    unit_id: string;
    unit_code?: string;
    unit_name?: string;
    group_id: string | null;
    group_name?: string;
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
  initialTab?: 'produto' | 'estoque' | 'impostos' | 'galeria';
}

interface ProductFormData {
  code: string;
  name: string;
  barcode: string;
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

interface ProductUnit {
  id: string;
  code: string;
  name: string;
}

interface ProductGroup {
  id: string;
  name: string;
}

interface CFOPItem {
  id_cfop: number;
  codigo_cfop: string;
  desc_cfop: string;
  tipo: string;
}

interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  is_primary: boolean;
  created_at: string;
}

export function ProductSlidePanel({ isOpen, onClose, productToEdit, initialTab = 'produto' }: ProductSlidePanelProps) {
  const [activeTab, setActiveTab] = useState<'produto' | 'estoque' | 'impostos' | 'galeria'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    code: '',
    name: '',
    barcode: '',
    unit_id: '',
    group_id: '',
    cost_price: '',
    profit_margin: '',
    selling_price: '',
    stock: '0',
    cst: '',
    pis: '',
    cofins: '',
    ncm: '',
    cfop: '5405',
    status: 'active'
  });
  const [cfopOptions, setCfopOptions] = useState<CFOPItem[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [showStockMovementModal, setShowStockMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'entrada' | 'saida'>('entrada');
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reservedCode, setReservedCode] = useState<string | null>(null); // Para rastrear o código reservado
  const [reservedBarcode, setReservedBarcode] = useState<string | null>(null); // Para rastrear o código de barras reservado
  const [defaultsApplied, setDefaultsApplied] = useState(false); // Para rastrear se os valores padrão já foram aplicados

  // Função para definir os valores padrão (unidade UN e grupo Diversos)
  const setDefaultValues = () => {
    console.log('Definindo valores padrão...');
    console.log('Units disponíveis:', units);
    console.log('Groups disponíveis:', groups);
    
    // Encontrar a unidade UN
    const unitUN = units.find(unit => unit.code === 'UN');
    
    // Encontrar o grupo Diversos
    const groupDiversos = groups.find(group => group.name === 'Diversos');
    
    console.log('Unidade UN encontrada:', unitUN);
    console.log('Grupo Diversos encontrado:', groupDiversos);
    
    // Atualizar o formulário com os valores padrão se encontrados
    if (unitUN || groupDiversos) {
      const newFormData = {
        ...formData,
        unit_id: unitUN?.id || '',
        group_id: groupDiversos?.id || ''
      };
      
      console.log('Novos valores do formulário:', newFormData);
      setFormData(newFormData);
    }
    
    if (!unitUN) {
      console.warn('Unidade UN não encontrada para definir como padrão.');
    }
    
    if (!groupDiversos) {
      console.warn('Grupo Diversos não encontrado para definir como padrão.');
    }
  };
  
  // Função para liberar um código reservado
  const releaseProductCode = async (code: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
          
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
          
      if (profile?.company_id) {
        // Excluir diretamente a reserva no banco de dados
        await supabase
          .from('product_code_reservations')
          .delete()
          .eq('company_id', profile.company_id)
          .eq('product_code', code);
            
        console.log(`Código ${code} liberado`);
      }
    } catch (error) {
      console.error('Erro ao liberar código:', error);
      throw error; // Propagar o erro para tratamento externo
    }
  };
  
  // Função para liberar reserva de código de barras
  const releaseBarcodeReservation = async (barcode: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
          
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
          
      if (profile?.company_id) {
        // Excluir diretamente da tabela de reservas
        await supabase
          .from('product_barcode_reservations')
          .delete()
          .eq('company_id', profile.company_id)
          .eq('barcode', barcode);
            
        console.log(`Código de barras ${barcode} liberado diretamente`);
      }
    } catch (error) {
      console.error('Erro ao liberar código de barras:', error);
      throw error; // Propagar o erro para tratamento externo
    }
  };

  // Função para limpar reservas antigas do usuário atual
  const cleanUserReservations = async () => {
    try {
      // Obter usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Usuário não autenticado');
        return;
      }
      
      // Chamar a função RPC para limpar reservas antigas
      const { error } = await supabase.rpc('clean_user_product_code_reservations', {
        p_user_id: user.id
      });
      
      if (error) {
        console.error('Erro ao limpar reservas antigas:', error);
      } else {
        console.log('Reservas antigas limpas com sucesso');
      }
    } catch (error) {
      console.error('Erro ao limpar reservas antigas:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Primeiro limpamos reservas antigas e depois carregamos as unidades e grupos
      const loadInitialData = async () => {
        setLoading(true);
        setDefaultsApplied(false); // Resetar o estado de valores padrão aplicados
        try {
          // Limpar reservas antigas do usuário atual
          await cleanUserReservations();
          
          // Carregar unidades e grupos em paralelo
          await Promise.all([loadUnits(), loadGroups(), loadCFOPOptions()]);
          
          if (productToEdit) {
            setFormData({
              code: productToEdit.code,
              name: productToEdit.name,
              barcode: productToEdit.barcode || '',
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
            
            // Carregar imagens do produto se estiver editando
            if (productToEdit.id) {
              loadProductImages(productToEdit.id);
            }
          } else {
            // Para novo produto, resetamos o form, definimos valores padrão e reservamos um código
            resetForm();
            // Depois de carregar as unidades e grupos, definimos os valores padrão
            setDefaultValues();
            reserveProductCode();
          }
        } catch (error) {
          console.error("Erro ao carregar dados iniciais:", error);
        } finally {
          setLoading(false);
        }
      };
      
      loadInitialData();
    }
  }, [isOpen, productToEdit]);

  // Efeito adicional para garantir que os valores padrão sejam aplicados quando as unidades e grupos estiverem carregados
  useEffect(() => {
    if (isOpen && !productToEdit && units.length > 0 && groups.length > 0 && !defaultsApplied) {
      console.log('Aplicando valores padrão no useEffect secundário');
      setDefaultValues();
      setDefaultsApplied(true);
    }
  }, [isOpen, productToEdit, units, groups, defaultsApplied]);
  
  // Função para reservar automaticamente o código do produto
  const reserveProductCode = async () => {
    try {
      // Obter usuário e empresa atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Usuário não autenticado');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        console.error('Empresa não encontrada');
        return;
      }
      
      // Chamar diretamente a função do PostgreSQL usando Supabase RPC
      const { data: code, error: rpcError } = await supabase
        .rpc('reserve_product_code', {
          p_company_id: profile.company_id,
          p_user_id: user.id
        }) as { data: string | null, error: any };
      
      if (rpcError) {
        console.error('Erro ao reservar código de produto:', rpcError);
        return;
      }
      
      if (code) {
        // Atualizar o formulário com o código reservado
        const codeString = String(code);
        setFormData(prev => ({
          ...prev,
          code: codeString
        }));
        
        // Guardar o código reservado para liberação posterior se necessário
        setReservedCode(codeString);
        
        console.log(`Código ${codeString} reservado com sucesso!`);
      } else {
        console.error('Nenhum código retornado da função');
      }
    } catch (error) {
      console.error('Erro ao reservar código:', error);
    }
  };

  const loadProductImages = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, product_id, url, is_primary, created_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // Garantir o tipo correto dos dados
      const typedData = data as ProductImage[];
      setProductImages(typedData);
    } catch (error: any) {
      console.error('Erro ao carregar imagens do produto:', error.message);
      toast.error('Erro ao carregar imagens do produto');
    }
  };

  const loadUnits = async () => {
    try {
      setLoading(true);
      
      // Obter usuário e empresa atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Usuário não autenticado');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        console.error('Empresa não encontrada');
        return;
      }
      
      // Usar o company_id do perfil do usuário
      const { data, error } = await supabase
        .from('product_units')
        .select('id, code, name')
        .eq('company_id', profile.company_id)
        .order('name', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      // Garantir o tipo correto dos dados
      const typedData = data as ProductUnit[];
      setUnits(typedData);
      console.log('Unidades carregadas:', typedData);
    } catch (error: any) {
      console.error('Erro ao carregar unidades:', error.message);
      toast.error(`Erro ao carregar unidades: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
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

      const { data: groupsData, error: groupsError } = await supabase
        .from('product_groups')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .order('name', { ascending: true });
        
      if (groupsError) {
        throw groupsError;
      }
      
      // Garantir o tipo correto dos dados
      const typedGroups = (groupsData || []) as ProductGroup[];
      setGroups(typedGroups);
      console.log('Grupos carregados:', typedGroups);
    } catch (error: any) {
      console.error('Erro ao carregar grupos:', error.message);
      toast.error(`Erro ao carregar grupos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCFOPOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('cfop')
        .select('id_cfop, codigo_cfop, desc_cfop, tipo')
        .order('codigo_cfop', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      // Garantir o tipo correto dos dados
      const typedData = data as CFOPItem[];
      setCfopOptions(typedData);
    } catch (error: any) {
      console.error('Erro ao carregar códigos CFOP:', error.message);
      toast.error(`Erro ao carregar códigos CFOP: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      barcode: '',
      unit_id: '',
      group_id: '',
      cost_price: '',
      profit_margin: '',
      selling_price: '',
      stock: '0',
      cst: '',
      pis: '',
      cofins: '',
      ncm: '',
      cfop: '5405',
      status: 'active'
    });
    setProductImages([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Atualizar o estado do formulário
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
  
  // Verifica se o código já existe para a empresa atual quando o campo perde o foco
  const handleCodeBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const code = e.target.value.trim();
    
    // Se o código estiver vazio ou estiver editando um produto existente, não verificar
    if (!code || productToEdit) return;
    
    // Se o código for igual ao reservado, não verificar duplicidade
    if (reservedCode && code === reservedCode) return;
    
    try {
      // Obter usuário e empresa atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Usuário não autenticado');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        console.error('Empresa não encontrada');
        return;
      }
      
      // Verificar se o código já existe para esta empresa
      const { data: existingProduct, error: productError } = await supabase
        .from('products')
        .select('id, code')
        .eq('company_id', profile.company_id)
        .eq('code', code)
        .single();
      
      if (productError && productError.code !== 'PGRST116') {
        // PGRST116 é o código para 'não encontrado', qualquer outro é um erro real
        console.error('Erro ao verificar código:', productError);
        return;
      }
      
      // Se encontrou um produto com este código
      if (existingProduct) {
        toast.error(`O código ${code} já está sendo utilizado. Escolha outro código válido.`);
        
        // Se temos um código reservado, voltar para ele
        if (reservedCode) {
          setFormData(prev => ({
            ...prev,
            code: reservedCode
          }));
        }
      }
      
      // Se formData.barcode está preenchido, verificar se o novo código não conflita com ele
      if (formData.barcode) {
        if (code === formData.barcode) {
          toast.error(`O código do produto não pode ser igual ao código de barras!`);
          
          // Se temos um código reservado, voltar para ele
          if (reservedCode) {
            setFormData(prev => ({
              ...prev,
              code: reservedCode
            }));
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar código:', error);
    }
  };
  
  // Verifica se o código de barras já existe ou conflita com algum código quando o campo perde o foco
  const handleBarcodeBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const barcode = e.target.value.trim();
    
    // Se o código de barras estiver vazio, ignorar a verificação
    if (!barcode) {
      // Se temos um código de barras reservado, liberar ele
      if (reservedBarcode) {
        try {
          await releaseBarcodeReservation(reservedBarcode);
          setReservedBarcode(null);
        } catch (error) {
          console.error('Erro ao liberar código de barras:', error);
        }
      }
      return;
    }
    
    // Se estamos editando e o código de barras não mudou, não verificar
    if (productToEdit && productToEdit.barcode === barcode) return;
    
    // Verificar se o código de barras conflita com o código do produto
    if (formData.code && formData.code === barcode) {
      toast.error(`O código de barras não pode ser igual ao código do produto!`);
      setFormData(prev => ({
        ...prev,
        barcode: ''
      }));
      return;
    }
    
    // Verificar se o código de barras já existe ou conflita com algum código
    try {
      // Obter usuário e empresa atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Usuário não autenticado');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        console.error('Empresa não encontrada');
        return;
      }
      
      // Verificar se o código de barras já existe como código de barras de outro produto
      const { data: existingBarcode, error: barcodeError } = await supabase
        .from('products')
        .select('id, barcode')
        .eq('company_id', profile.company_id)
        .eq('barcode', barcode)
        .single();
      
      // Verificar se o código de barras conflita com algum código de produto
      const { data: existingProductCode, error: productCodeError } = await supabase
        .from('products')
        .select('id, code')
        .eq('company_id', profile.company_id)
        .eq('code', barcode)
        .single();
      
      // Se já existe um produto com este código de barras
      if (!barcodeError) {
        toast.error(`O código de barras ${barcode} já está sendo utilizado por outro produto. Escolha outro código de barras.`);
        setFormData(prev => ({
          ...prev,
          barcode: ''
        }));
        return;
      }
      
      // Se conflita com um código de produto existente
      if (!productCodeError) {
        toast.error(`O código de barras ${barcode} conflita com o código de um produto existente. Escolha outro código de barras.`);
        setFormData(prev => ({
          ...prev,
          barcode: ''
        }));
        return;
      }
      
      // Se chegou até aqui, o código de barras está disponível
      // Vamos reservá-lo usando a função no banco de dados
      if (!reservedBarcode || reservedBarcode !== barcode) {
        // Se já temos um código de barras reservado, liberar o anterior
        if (reservedBarcode) {
          try {
            await releaseBarcodeReservation(reservedBarcode);
            console.log(`Código de barras anterior ${reservedBarcode} liberado`);
          } catch (error) {
            console.error('Erro ao liberar código de barras anterior:', error);
          }
        }
        
        // Reservar o novo código de barras
        const { data: reserved, error: reserveError } = await supabase
          .rpc('reserve_barcode', {
            p_company_id: profile.company_id,
            p_user_id: user.id,
            p_barcode: barcode
          }) as { data: boolean, error: any };
        
        if (reserveError) {
          console.error('Erro ao reservar código de barras:', reserveError);
          return;
        }
        
        if (!reserved) {
          toast.error(`Não foi possível reservar o código de barras ${barcode}. Ele pode estar em uso por outro usuário.`);
          setFormData(prev => ({
            ...prev,
            barcode: ''
          }));
          return;
        }
        
        // Marcar o código de barras como reservado
        setReservedBarcode(barcode);
        console.log(`Código de barras ${barcode} reservado com sucesso.`);
      }
    } catch (error) {
      console.error('Erro ao verificar código de barras:', error);
    }
  };

  const handlePriceBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Formatar valores monetários no padrão brasileiro
    if (['cost_price', 'profit_margin', 'selling_price', 'stock'].includes(name)) {
      // Remove caracteres não numéricos e converte vírgula para ponto para cálculos internos
      const numericValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
      
      // Formata o valor com 2 casas decimais e converte de volta para o formato brasileiro
      const formattedValue = isNaN(parseFloat(numericValue)) 
        ? '' 
        : parseFloat(numericValue).toFixed(2).replace('.', ',');
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    }
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
        unit_id: formData.unit_id,
        group_id: formData.group_id || null,
        cost_price: parseFloat(cost_price),
        profit_margin: parseFloat(profit_margin),
        selling_price: parseFloat(selling_price),
        stock: parseFloat(stock),
        cst: formData.cst,
        pis: formData.pis,
        cofins: formData.cofins,
        ncm: formData.ncm,
        cfop: formData.cfop,
        status: formData.status
      };

      if (productToEdit) {
        // Atualizar produto existente
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productToEdit.id);

        if (updateError) {
          throw updateError;
        }

        toast.success('Produto atualizado com sucesso!');
      } else {
        // Verificar se o código já existe para esta empresa
        const { data: existingProduct, error: checkError } = await supabase
          .from('products')
          .select('id')
          .eq('company_id', profile.company_id)
          .eq('code', formData.code)
          .maybeSingle();

        if (checkError) {
          throw checkError;
        }

        if (existingProduct) {
          throw new Error('Já existe um produto com este código');
        }

        // Criar novo produto
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        toast.success('Produto cadastrado com sucesso!');
      }

      resetForm();
      setReservedCode(null); // Limpar o código reservado, pois foi utilizado com sucesso
      setReservedBarcode(null); // Limpar o código de barras reservado
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast.error(error.message || 'Erro ao salvar produto');
      
      // Se falhou ao salvar um novo produto, liberar o código reservado e código de barras
      if (!productToEdit) {
        // Liberar código do produto
        if (reservedCode) {
          try {
            await releaseProductCode(reservedCode);
            setReservedCode(null); // Limpar referência local ao código
          } catch (releaseError) {
            console.error('Erro ao liberar código após falha:', releaseError);
          }
        }
        
        // Liberar código de barras
        if (reservedBarcode) {
          try {
            await releaseBarcodeReservation(reservedBarcode);
            setReservedBarcode(null); // Limpar referência local ao código de barras
          } catch (releaseError) {
            console.error('Erro ao liberar código de barras após falha:', releaseError);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = (newStock: number) => {
    setFormData(prev => ({
      ...prev,
      stock: newStock.toString().replace('.', ',')
    }));
  };

  const handleImageUpload = async () => {
    if (!productToEdit?.id) {
      toast.error('Salve o produto antes de adicionar imagens');
      return;
    }
    
    if (productImages.length >= 6) {
      toast.error('Limite máximo de 6 imagens atingido');
      return;
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !productToEdit?.id) return;
    
    try {
      setUploadingImage(true);
      
      const file = files[0];
      
      // Verificar tamanho do arquivo (limite de 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB');
        return;
      }
      
      // Verificar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('O arquivo deve ser uma imagem');
        return;
      }
      
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${productToEdit.id}_${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;
      
      // Fazer upload para o storage do Supabase
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Obter URL pública da imagem
      const { data: urlData } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);
        
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Erro ao obter URL da imagem');
      }
      
      // Determinar se esta é a primeira imagem (será a principal)
      const isPrimary = productImages.length === 0;
      
      // Salvar referência no banco de dados
      const { error: dbError } = await supabase
        .from('product_images')
        .insert({
          product_id: productToEdit.id,
          url: urlData.publicUrl,
          is_primary: isPrimary
        });
        
      if (dbError) throw dbError;
      
      // Recarregar imagens
      loadProductImages(productToEdit.id);
      
      toast.success('Imagem adicionada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error('Erro ao enviar imagem: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setUploadingImage(false);
      // Limpar input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleDeleteImage = async (imageId: string) => {
    if (!productToEdit?.id) return;
    
    try {
      // Verificar se é a imagem principal
      const imageToDelete = productImages.find(img => img.id === imageId);
      
      // Excluir a imagem do banco de dados
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);
        
      if (error) throw error;
      
      // Se era a imagem principal, definir outra como principal
      if (imageToDelete?.is_primary && productImages.length > 1) {
        // Encontrar a próxima imagem que não é a que estamos excluindo
        const nextImage = productImages.find(img => img.id !== imageId);
        
        if (nextImage) {
          const { error: updateError } = await supabase
            .from('product_images')
            .update({ is_primary: true })
            .eq('id', nextImage.id);
            
          if (updateError) throw updateError;
        }
      }
      
      // Recarregar imagens
      loadProductImages(productToEdit.id);
      
      toast.success('Imagem excluída com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir imagem:', error);
      toast.error('Erro ao excluir imagem: ' + (error.message || 'Erro desconhecido'));
    }
  };
  
  const handleSetPrimaryImage = async (imageId: string) => {
    if (!productToEdit?.id) return;
    
    try {
      // Primeiro, remover status de principal de todas as imagens
      const { error: resetError } = await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productToEdit.id);
        
      if (resetError) throw resetError;
      
      // Depois, definir a imagem selecionada como principal
      const { error } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);
        
      if (error) throw error;
      
      // Recarregar imagens
      loadProductImages(productToEdit.id);
      
      toast.success('Imagem principal definida com sucesso!');
    } catch (error: any) {
      console.error('Erro ao definir imagem principal:', error);
      toast.error('Erro ao definir imagem principal: ' + (error.message || 'Erro desconhecido'));
    }
  };
  
  // Modificar a função onClose para liberar o código se necessário
  const handleClose = async () => {
    // Se estamos fechando um novo produto (não edição) e temos um código reservado
    if (!productToEdit) {
      // Liberar código do produto se existir
      if (reservedCode) {
        try {
          await releaseProductCode(reservedCode);
          console.log(`Código ${reservedCode} liberado ao fechar painel`);
        } catch (error) {
          console.error('Erro ao liberar código ao fechar:', error);
        } finally {
          setReservedCode(null); // Limpar código reservado independente de sucesso ou erro
        }
      }
      
      // Liberar código de barras se existir
      if (reservedBarcode) {
        try {
          await releaseBarcodeReservation(reservedBarcode);
          console.log(`Código de barras ${reservedBarcode} liberado ao fechar painel`);
        } catch (error) {
          console.error('Erro ao liberar código de barras ao fechar:', error);
        } finally {
          setReservedBarcode(null); // Limpar código de barras reservado
        }
      }
    }
    
    // Resetar o formulário e chamar a função onClose original
    resetForm();
    onClose();
  };

  const panelClasses = `fixed top-0 right-0 w-full md:w-[700px] h-full bg-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-hidden ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  }`;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40"
          onClick={handleClose}
        />
      )}

      <div className={`${panelClasses} z-50`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-200">
              {productToEdit ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <X size={24} />
            </button>
          </div>

          {/* Barra de identificação do produto - sempre visível */}
          <div className="bg-slate-700 border-b border-slate-600 py-3 px-6 flex items-center">
            <h2 className="text-xl font-semibold truncate">
              {formData.name ? (
                <span className="text-white">{formData.name}</span>
              ) : (
                <span className="text-slate-400">[ Nome do Produto ]</span>
              )}
            </h2>
          </div>

          <div className="flex border-b border-slate-700">
            <button
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'produto' 
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('produto')}
            >
              Produto
            </button>
            {/* Aba de estoque só aparece quando estiver editando um produto existente */}
            {productToEdit && (
              <button
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'estoque' 
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setActiveTab('estoque')}
              >
                Estoque
              </button>
            )}
            <button
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'impostos' 
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('impostos')}
            >
              Impostos
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'galeria' 
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('galeria')}
            >
              Galeria
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form id="productForm" onSubmit={handleSubmit}>
              {activeTab === 'produto' && (
                <div className="space-y-6">
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
                        onBlur={handleCodeBlur}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={!!productToEdit}
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
                        onBlur={handleBarcodeBlur}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <option value="">Selecione uma unidade</option>
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
                      >
                        <option value="">Selecione um grupo</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </div>
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
                  
                  {/* Campo de estoque inicial - só aparece em novos produtos */}
                  {!productToEdit && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Estoque Inicial
                      </label>
                      <input
                        type="text"
                        name="stock"
                        value={formData.stock}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'estoque' && (
                <div className="space-y-6">
                  <div className="bg-slate-700 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-white">Estoque Atual</h3>
                      <div className="text-2xl font-bold text-white">
                        {formData.stock} {units.find(u => u.id === formData.unit_id)?.code || ''}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setMovementType('entrada');
                          setShowStockMovementModal(true);
                        }}
                        className="flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                      >
                        <PlusCircle size={20} />
                        <span>Entrada de Estoque</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMovementType('saida');
                          setShowStockMovementModal(true);
                        }}
                        className="flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
                      >
                        <MinusCircle size={20} />
                        <span>Saída de Estoque</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-700 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-white mb-4">Histórico de Movimentações</h3>
                    
                    <div className="text-center text-slate-400 py-4">
                      <ArrowUpDown size={24} className="mx-auto mb-2 opacity-50" />
                      <p>Salve o produto para visualizar o histórico de movimentações</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'impostos' && (
                <div className="space-y-6">
                  {/* CFOP e CST na primeira posição, na mesma linha */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        CFOP *
                      </label>
                      <div className="relative">
                        <select
                          name="cfop"
                          value={formData.cfop}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          style={{ 
                            textOverflow: 'ellipsis',
                            maxWidth: '100%'
                          }}
                        >
                        {cfopOptions.length > 0 ? (
                          cfopOptions.map((cfop) => (
                            <option 
                              key={cfop.id_cfop} 
                              value={cfop.codigo_cfop}
                              title={`${cfop.codigo_cfop} - ${cfop.desc_cfop}`}
                              className="text-wrap"
                            >
                              {cfop.codigo_cfop} - {cfop.desc_cfop}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="5405">5405 - Venda de mercadoria adquirida</option>
                            <option value="5102">5102 - Venda de mercadoria</option>
                          </>
                        )}
                        </select>
                        {/* Estilos aplicados diretamente nos elementos */}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        CST *
                      </label>
                      <input
                        type="text"
                        name="cst"
                        value={formData.cst}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* PIS e COFINS na segunda linha */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        PIS *
                      </label>
                      <input
                        type="text"
                        name="pis"
                        value={formData.pis}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* NCM sozinho na última posição */}
                  <div className="grid grid-cols-1 gap-6">
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
                </div>
              )}

              {activeTab === 'galeria' && (
                <div className="space-y-6">
                  {!productToEdit?.id ? (
                    <div className="bg-slate-700 p-6 rounded-lg text-center">
                      <ImageIcon size={48} className="mx-auto mb-4 text-slate-500" />
                      <h3 className="text-lg font-medium text-white mb-2">Salve o produto primeiro</h3>
                      <p className="text-slate-400">
                        Para adicionar imagens, você precisa primeiro salvar o produto.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-white">Imagens do Produto</h3>
                        <div className="text-sm text-slate-400">
                          {productImages.length}/6 imagens
                        </div>
                      </div>
                      
                      {productImages.length === 0 ? (
                        <div className="bg-slate-700 p-8 rounded-lg text-center">
                          <ImageIcon size={48} className="mx-auto mb-4 text-slate-500" />
                          <h3 className="text-lg font-medium text-white mb-2">Nenhuma imagem adicionada</h3>
                          <p className="text-slate-400 mb-4">
                            Adicione até 6 imagens para o seu produto.
                          </p>
                          <button
                            type="button"
                            onClick={handleImageUpload}
                            disabled={uploadingImage}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {uploadingImage ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Upload size={18} />
                            )}
                            <span>Adicionar Imagem</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {productImages.map(image => (
                              <div 
                                key={image.id} 
                                className={`relative group rounded-lg overflow-hidden border-2 ${
                                  image.is_primary ? 'border-blue-500' : 'border-transparent'
                                }`}
                              >
                                <img 
                                  src={image.url} 
                                  alt={`Imagem do produto ${formData.name}`}
                                  className="w-full h-48 object-cover"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <div className="flex gap-2">
                                    {!image.is_primary && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetPrimaryImage(image.id)}
                                        className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full"
                                        title="Definir como principal"
                                      >
                                        <Star size={16} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteImage(image.id)}
                                      className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-full"
                                      title="Excluir imagem"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                                {image.is_primary && (
                                  <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                    Principal
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            {productImages.length < 6 && (
                              <button
                                type="button"
                                onClick={handleImageUpload}
                                disabled={uploadingImage}
                                className="flex flex-col items-center justify-center gap-2 h-48 border-2 border-dashed border-slate-600 rounded-lg hover:border-blue-500 transition-colors"
                              >
                                {uploadingImage ? (
                                  <Loader2 size={24} className="animate-spin text-slate-400" />
                                ) : (
                                  <Upload size={24} className="text-slate-400" />
                                )}
                                <span className="text-slate-400 text-sm">Adicionar Imagem</span>
                              </button>
                            )}
                          </div>
                          
                          <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                            <h4 className="text-sm font-medium text-white mb-2">Dicas:</h4>
                            <ul className="text-sm text-slate-400 space-y-1 list-disc pl-5">
                              <li>Imagens devem ter no máximo 2MB</li>
                              <li>Formatos aceitos: JPG, PNG, GIF</li>
                              <li>A imagem principal será exibida primeiro no PDV</li>
                              <li>Recomendamos imagens com fundo branco</li>
                            </ul>
                          </div>
                        </>
                      )}
                      
                      {/* Input de arquivo oculto */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </>
                  )}
                </div>
              )}
            </form>
          </div>

          <div className="p-6 border-t border-slate-700">
            <button
              type="submit"
              form="productForm"
              disabled={loading}
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

      {/* Stock Movement Modal */}
      {showStockMovementModal && productToEdit && (
        <StockMovementModal
          isOpen={showStockMovementModal}
          onClose={() => setShowStockMovementModal(false)}
          productId={productToEdit.id}
          productName={productToEdit.name}
          currentStock={parseFloat(formData.stock.replace(',', '.'))}
          unitCode={units.find(u => u.id === formData.unit_id)?.code || ''}
          movementType={movementType}
          onStockUpdated={handleStockUpdate}
        />
      )}
    </>
  );
}
