import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Trash2, Plus, Minus, Receipt, CreditCard, Wallet, QrCode, X, CreditCard as Credit, Smartphone as Debit, Ticket as Voucher, Loader2, ArrowLeft, Percent, DollarSign, Tag, FileText, MoreHorizontal, ClipboardList, RotateCcw, Save, Settings, DollarSign as Dollar, ArrowDownCircle, ArrowUpCircle, Bike, User, UserPlus, UserSearch } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';

interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  stock: number;
  unit_code: string;
  status: 'active' | 'inactive';
  barcode?: string;
}

interface CartItem {
  id: string;
  code: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  unit_code: string;
  discount?: {
    type: 'percentage' | 'value';
    amount: number;
  };
}

export default function PDV() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCardOptions, setShowCardOptions] = useState(false);
  const [showMoneyOptions, setShowMoneyOptions] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showDiscountPopup, setShowDiscountPopup] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'value'>('percentage');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [showExpandedMenu, setShowExpandedMenu] = useState(false);
  const [showSecondMenu, setShowSecondMenu] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [showPartialPaymentPopup, setShowPartialPaymentPopup] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const buttonsPerPage = 9;
  const [selectedClient, setSelectedClient] = useState<{id: string, name: string} | null>(null);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [filteredClients, setFilteredClients] = useState<{id: string, name: string, document: string}[]>([]);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState('');
  const [partialPaymentMethod, setPartialPaymentMethod] = useState<string | null>(null);
  const [partialPayments, setPartialPayments] = useState<{id: string, method: string, amount: number, methodType: string}[]>([]);
  const [showTotalDiscountPopup, setShowTotalDiscountPopup] = useState(false);
  const [totalDiscountType, setTotalDiscountType] = useState<'percentage' | 'value'>('percentage');
  const [totalDiscountAmount, setTotalDiscountAmount] = useState<string>('');
  const [appliedTotalDiscount, setAppliedTotalDiscount] = useState<{type: 'percentage' | 'value', amount: number} | null>(null);
  const [showItemNotFoundPopup, setShowItemNotFoundPopup] = useState(false);
  const [notFoundItemCode, setNotFoundItemCode] = useState('');
  const [showConfigPopup, setShowConfigPopup] = useState(false);
  const [pdvConfig, setPdvConfig] = useState({
    groupItems: false,
    controlCashier: false,
    requireSeller: false,
    fullScreen: false
  });

  // Carrega o estado do PDV do localStorage quando o componente é montado
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    try {
      // Recupera o estado salvo do PDV
      const savedPdvState = localStorage.getItem('pdvState');
      
      if (savedPdvState) {
        const parsedState = JSON.parse(savedPdvState);
        
        // Restaura os itens do carrinho
        if (parsedState.items && Array.isArray(parsedState.items)) {
          setItems(parsedState.items);
        }
        
        // Restaura os pagamentos parciais
        if (parsedState.partialPayments && Array.isArray(parsedState.partialPayments)) {
          setPartialPayments(parsedState.partialPayments);
        }
        
        // Restaura o desconto total aplicado
        if (parsedState.appliedTotalDiscount) {
          setAppliedTotalDiscount(parsedState.appliedTotalDiscount);
        }
        
        // Restaura o cliente selecionado
        if (parsedState.selectedClient) {
          setSelectedClient(parsedState.selectedClient);
        }
        
        // Toast informativo apenas se houver itens
        if (parsedState.items && parsedState.items.length > 0) {
          toast.info('Estado anterior do PDV restaurado', {
            autoClose: 3000
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar estado do PDV:', error);
      // Em caso de erro, limpa o localStorage para evitar problemas futuros
      localStorage.removeItem('pdvState');
    }
  }, []);

  useEffect(() => {
    // Inicializa e atualiza a data/hora
    const updateDateTime = () => {
      const now = new Date();
      const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const day = days[now.getDay()];
      const date = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear().toString().slice(2);
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');

      const seconds = now.getSeconds().toString().padStart(2, '0');

      setCurrentDateTime(`${day}, ${date}/${month}/${year} ${hours}:${minutes}:${seconds}`);
    };

    // Atualiza imediatamente e depois a cada segundo
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  // Função para verificar se pode rolar para esquerda ou direita
  const checkScrollability = () => {
    const container = document.getElementById('menu-container');
    const menuButtons = container?.querySelectorAll('button');

    if (container && menuButtons) {
      // Verifica se pode rolar para a esquerda (se não está na primeira página)
      setCanScrollLeft(currentPage > 0);

      // Verifica se pode rolar para a direita (se não está na última página)
      const totalPages = Math.ceil(menuButtons.length / buttonsPerPage);
      setCanScrollRight(currentPage < totalPages - 1);
    }
  };

  // Efeito para verificar a scrollabilidade quando a página atual mudar
  useEffect(() => {
    // Verificação inicial com atraso para garantir que o DOM foi carregado
    setTimeout(checkScrollability, 500);
  }, [currentPage]);

  // Função para navegar para a página anterior
  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Função para navegar para a próxima página
  const goToNextPage = () => {
    const container = document.getElementById('menu-container');
    const menuButtons = container?.querySelectorAll('button');

    if (menuButtons) {
      const totalPages = Math.ceil(menuButtons.length / buttonsPerPage);
      if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
      }
    }
  };

  // Efeito para aplicar a paginação quando a página atual mudar
  useEffect(() => {
    const container = document.getElementById('menu-container');
    const menuButtons = container?.querySelectorAll('button');

    if (container && menuButtons) {
      // Oculta todos os botões
      menuButtons.forEach((button, index) => {
        const start = currentPage * buttonsPerPage;
        const end = start + buttonsPerPage;

        if (index >= start && index < end) {
          button.style.display = 'flex';
        } else {
          button.style.display = 'none';
        }
      });

      // Verifica a scrollabilidade após a mudança
      checkScrollability();
    }
  }, [currentPage]);

  useEffect(() => {
    // Carregar configurações do localStorage
    const savedConfig = localStorage.getItem('pdvConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setPdvConfig(parsedConfig);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }
  }, []);

  // Salva o estado do PDV no localStorage sempre que houver mudanças relevantes
  useEffect(() => {
    // Só salva se houver itens no carrinho (evita salvar um carrinho vazio)
    if (items.length > 0 || partialPayments.length > 0) {
      try {
        const pdvState = {
          items,
          partialPayments,
          appliedTotalDiscount,
          selectedClient
        };
        
        localStorage.setItem('pdvState', JSON.stringify(pdvState));
      } catch (error) {
        console.error('Erro ao salvar estado do PDV:', error);
      }
    } else {
      // Se não há itens nem pagamentos, limpa o estado salvo
      localStorage.removeItem('pdvState');
    }
  }, [items, partialPayments, appliedTotalDiscount, selectedClient]);
  
  // Efeito para controlar o modo de tela cheia
  useEffect(() => {
    const toggleFullScreen = async () => {
      try {
        if (pdvConfig.fullScreen) {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } else {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          }
        }
      } catch (error) {
        console.error('Erro ao alternar modo de tela cheia:', error);
        toast.error('Não foi possível alternar o modo de tela cheia');
      }
    };

    toggleFullScreen();
  }, [pdvConfig.fullScreen]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = products.filter(product =>
        (product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
        product.status === 'active' &&
        product.stock > 0
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [searchQuery, products]);

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();

      // If it's a number (product code or barcode), try to find exact match
      if (/^\d+$/.test(searchQuery)) {
        const product = products.find(p =>
          p.code === searchQuery ||
          (p.barcode && p.barcode === searchQuery)
        );

        if (product) {
          if (product.status === 'inactive') {
            toast.error('Este produto está inativo');
            return;
          }

          if (product.stock <= 0) {
            toast.error('Este produto está sem estoque');
            return;
          }

          handleProductSelect(product);
          return;
        }

        setNotFoundItemCode(searchQuery);
        setShowItemNotFoundPopup(true);
        return;
      }

      // If it's text, show filtered products for selection
      const filtered = products.filter(product =>
        (product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
        product.status === 'active' &&
        product.stock > 0
      );

      if (filtered.length === 0) {
        setNotFoundItemCode(searchQuery);
        setShowItemNotFoundPopup(true);
      }

      setFilteredProducts(filtered);
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

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          code,
          name,
          selling_price,
          stock,
          status,
          unit_id,
          product_units(code)
        `)
        .eq('company_id', profile.company_id);

      if (productsError) {
        throw productsError;
      }

      const formattedProducts = productsData.map(product => ({
        id: product.id,
        code: product.code,
        name: product.name,
        selling_price: product.selling_price,
        stock: product.stock,
        status: product.status,
        unit_code: product.product_units?.code || 'UN'
      }));

      setProducts(formattedProducts);
    } catch (error: any) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    const existingItem = items.find(item => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.warn('Quantidade excede o estoque disponível');
        return;
      }

      handleQuantityChange(product.id, 1);
    } else {
      const newItem: CartItem = {
        id: product.id,
        code: product.code,
        name: product.name,
        price: product.selling_price,
        quantity: 1,
        stock: product.stock,
        unit_code: product.unit_code
      };

      setItems(prev => [...prev, newItem]);
    }

    setSearchQuery('');
    setFilteredProducts([]);

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const calculateTotalDiscount = () => {
    if (items.length === 0) return 0;

    return items.reduce((acc, item) => {
      const itemTotal = item.price * item.quantity;
      if (item.discount) {
        if (item.discount.type === 'percentage') {
          return acc + (itemTotal * item.discount.amount / 100);
        } else {
          return acc + item.discount.amount;
        }
      }
      return acc;
    }, 0);
  };

  const itemsDiscount = calculateTotalDiscount();

  const subtotal = items.length === 0 ? 0 : items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItems = items.length === 0 ? 0 : items.reduce((total, item) => total + item.quantity, 0);

  // Calcular o desconto total aplicado à venda
  const calculateTotalDiscountValue = () => {
    if (!appliedTotalDiscount || subtotal === 0) return 0;

    if (appliedTotalDiscount.type === 'percentage') {
      return subtotal * appliedTotalDiscount.amount / 100;
    } else {
      return appliedTotalDiscount.amount;
    }
  };

  const totalDiscountValue = calculateTotalDiscountValue();
  const totalDiscount = itemsDiscount + totalDiscountValue;

  const total = subtotal - totalDiscount;

  const handleQuantityChange = (id: string, change: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + change);
        if (newQuantity > item.stock) {
          toast.warn('Quantidade excede o estoque disponível');
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);

    // Se o carrinho ficar vazio, resetar os pagamentos parciais, métodos de pagamento e descontos
    if (newItems.length === 0) {
      setPartialPayments([]);
      setSelectedPaymentMethod(null);
      setShowCardOptions(false);
      setShowMoneyOptions(false);
      setAppliedTotalDiscount(null);
    }

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleDiscountClick = (id: string) => {
    setSelectedItemId(id);
    setDiscountType('percentage');
    setDiscountAmount('');
    setShowDiscountPopup(true);
  };

  const handleApplyDiscount = () => {
    if (!selectedItemId || !discountAmount) {
      setShowDiscountPopup(false);
      return;
    }

    const amount = parseFloat(discountAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor de desconto inválido');
      return;
    }

    setItems(items.map(item => {
      if (item.id === selectedItemId) {
        // Verificar se o desconto em valor não é maior que o valor total do item
        if (discountType === 'value' && amount >= item.price * item.quantity) {
          toast.error('Desconto não pode ser maior que o valor do item');
          return item;
        }

        // Verificar se o desconto em porcentagem não é maior que 100%
        if (discountType === 'percentage' && amount > 100) {
          toast.error('Desconto não pode ser maior que 100%');
          return item;
        }

        return {
          ...item,
          discount: {
            type: discountType,
            amount: amount
          }
        };
      }
      return item;
    }));

    setShowDiscountPopup(false);
    toast.success('Desconto aplicado com sucesso');
  };

const handleRemoveDiscount = (id: string) => {
  setItems(items.map(item => {
    if (item.id === id) {
      const { discount, ...rest } = item;
      return rest as CartItem;
    }
    return item;
  }));
  toast.info('Desconto removido');
};

const handleTotalDiscountClick = () => {
  setTotalDiscountType('percentage');
  setTotalDiscountAmount('');
  setShowTotalDiscountPopup(true);
  console.log('Abrindo popup de desconto total');
};

const handleApplyTotalDiscount = () => {
  if (!totalDiscountAmount) {
    setShowTotalDiscountPopup(false);
    return;
  }

  const amount = parseFloat(totalDiscountAmount);
  if (isNaN(amount) || amount <= 0) {
    toast.error('Valor de desconto inválido');
    return;
  }

  // Verificar se o desconto em valor não é maior que o subtotal
  if (totalDiscountType === 'value' && amount >= subtotal) {
    toast.error('Desconto não pode ser maior ou igual ao valor total da venda');
    return;
  }

  // Verificar se o desconto em porcentagem não é maior que 100%
  if (totalDiscountType === 'percentage' && amount >= 100) {
    toast.error('Desconto não pode ser maior ou igual a 100%');
    return;
  }

  setAppliedTotalDiscount({
    type: totalDiscountType,
    amount: amount
  });

  setShowTotalDiscountPopup(false);
  toast.success(`Desconto total de ${totalDiscountType === 'percentage' ? amount + '%' : 'R$ ' + amount.toFixed(2)} aplicado`);
};

  const handleRemoveTotalDiscount = () => {
    setAppliedTotalDiscount(null);
    toast.info('Desconto total removido');
  };

  const handleCloseItemNotFoundPopup = () => {
    setShowItemNotFoundPopup(false);
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleConfigChange = (configKey: keyof typeof pdvConfig) => {
    setPdvConfig(prev => ({
      ...prev,
      [configKey]: !prev[configKey]
    }));
  };

  const handleSaveConfig = () => {
    // Aqui você poderia salvar as configurações no localStorage ou em uma API
    localStorage.setItem('pdvConfig', JSON.stringify(pdvConfig));
    toast.success('Configurações salvas com sucesso');
    setShowConfigPopup(false);
  };

  const getItemDiscountValue = (item: CartItem) => {
    if (!item.discount) return 0;

    const itemTotal = item.price * item.quantity;
    if (item.discount.type === 'percentage') {
      return itemTotal * item.discount.amount / 100;
    } else {
      return item.discount.amount;
    }
  };

  const getItemFinalPrice = (item: CartItem) => {
    const itemTotal = item.price * item.quantity;
    const discountValue = getItemDiscountValue(item);
    return itemTotal - discountValue;
  };

  // Verifica se já existe algum pagamento que zerou o total
  const isFullPaymentApplied = () => {
    // Verifica se o valor restante está zerado ou negativo (com tolerância de 0.01 para arredondamentos)
    return remainingTotal <= 0.01 && partialPayments.length > 0;
  };

  const handlePaymentMethodClick = (method: string) => {
    // Se já existe um pagamento à vista que zerou o total, não permite selecionar outro
    // A menos que seja um método parcial
    if (isFullPaymentApplied() && !method.includes('_partial') && 
        !['card', 'money'].includes(method)) {
      toast.info('Remova o pagamento atual antes de adicionar um novo método de pagamento');
      return;
    }

    if (method === 'card') {
      setShowCardOptions(true);
      setShowMoneyOptions(false);
      setSelectedPaymentMethod(null);
    } else if (method === 'money') {
      setShowMoneyOptions(true);
      setShowCardOptions(false);
      setSelectedPaymentMethod(null);
    } else if (method.includes('_partial')) {
      // Para métodos de pagamento parcial
      setPartialPaymentMethod(method);
      setPartialPaymentAmount('');
      setShowPartialPaymentPopup(true);
    } else {
      setShowCardOptions(false);
      setShowMoneyOptions(false);
      setSelectedPaymentMethod(method);

      // Para métodos à vista (não parciais), automaticamente aplica o valor total restante
      if (method === 'pix') {
        const remainingAmount = total - totalPaid;
        if (remainingAmount > 0) {
          // Adiciona o pagamento PIX à vista com o valor total restante
          setPartialPayments([...partialPayments, {
            id: `pix_${Date.now()}`,
            method: 'PIX',
            methodType: 'pix',
            amount: remainingAmount
          }]);
          toast.success(`Pagamento de R$ ${remainingAmount.toFixed(2)} aplicado`);
        }
      }
    }
  };

  const handleCardPaymentSelect = (method: string) => {
    // Se já existe um pagamento à vista que zerou o total, não permite selecionar outro
    // A menos que seja um método parcial
    if (isFullPaymentApplied() && !method.includes('_partial')) {
      toast.info('Remova o pagamento atual antes de adicionar um novo método de pagamento');
      return;
    }
    
    if (method.includes('_partial')) {
      setPartialPaymentMethod(method);
      setPartialPaymentAmount('');
      setShowPartialPaymentPopup(true);
    } else {
      setSelectedPaymentMethod(method);

      // Para métodos de cartão à vista, automaticamente aplica o valor total restante
      const remainingAmount = total - totalPaid;
      if (remainingAmount > 0) {
        let methodName = '';
        
        if (method === 'debit') {
          methodName = 'Débito';
        } else if (method === 'credit') {
          methodName = 'Crédito';
        } else if (method === 'voucher') {
          methodName = 'Voucher';
        }

        if (methodName) {
          // Adiciona o pagamento com cartão à vista com o valor total restante
          setPartialPayments([...partialPayments, {
            id: `${method}_${Date.now()}`,
            method: methodName,
            methodType: method,
            amount: remainingAmount
          }]);
          toast.success(`Pagamento de R$ ${remainingAmount.toFixed(2)} aplicado`);
        }
      }
    }
  };

  const handleMoneyPaymentSelect = (method: string) => {
    // Se já existe um pagamento à vista que zerou o total, não permite selecionar outro
    // A menos que seja um método parcial
    if (isFullPaymentApplied() && !method.includes('_partial')) {
      toast.info('Remova o pagamento atual antes de adicionar um novo método de pagamento');
      return;
    }
    
    if (method.includes('_partial')) {
      setPartialPaymentMethod(method);
      setPartialPaymentAmount('');
      setShowPartialPaymentPopup(true);
    } else {
      setSelectedPaymentMethod(method);

      // Para método de dinheiro à vista (money_full), automaticamente aplica o valor total restante
      if (method === 'money_full') {
        const remainingAmount = total - totalPaid;
        if (remainingAmount > 0) {
          // Adiciona o pagamento em dinheiro à vista com o valor total restante
          setPartialPayments([...partialPayments, {
            id: `money_full_${Date.now()}`,
            method: 'Dinheiro',
            methodType: 'money_full',
            amount: remainingAmount
          }]);
          toast.success(`Pagamento de R$ ${remainingAmount.toFixed(2)} aplicado`);
        }
      }
    }
  };

  const handleApplyPartialPayment = () => {
    if (!partialPaymentMethod || !partialPaymentAmount) {
      setShowPartialPaymentPopup(false);
      return;
    }

    const amount = parseFloat(partialPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor de pagamento inválido');
      return;
    }

    // Verificar se o valor parcial não é maior que o total restante
    const totalPaid = partialPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingTotal = total - totalPaid;

    // Para métodos que não são dinheiro, não permitir valor maior que o restante
    if (amount > remainingTotal && !partialPaymentMethod.includes('money')) {
      toast.error('Valor parcial não pode ser maior que o valor restante a pagar');
      return;
    }

    // Obter o nome amigável do método de pagamento
    let methodName = '';
    if (partialPaymentMethod === 'money_partial' || partialPaymentMethod === 'money_full') {
      methodName = 'Dinheiro';
    } else if (partialPaymentMethod === 'pix_partial') {
      methodName = 'PIX Parcial';
    } else if (partialPaymentMethod === 'credit_partial') {
      methodName = 'Crédito Parcial';
    } else if (partialPaymentMethod === 'debit_partial') {
      methodName = 'Débito Parcial';
    } else if (partialPaymentMethod === 'voucher_partial') {
      methodName = 'Voucher Parcial';
    }

    // Adicionar o pagamento parcial à lista
    setPartialPayments([...partialPayments, {
      id: `${partialPaymentMethod}_${Date.now()}`,
      method: methodName,
      methodType: partialPaymentMethod,
      amount: amount
    }]);

    setShowPartialPaymentPopup(false);
    toast.success(`Pagamento de R$ ${amount.toFixed(2)} aplicado`);

    // Se o valor for maior ou igual ao valor restante, finalizar o pagamento
    // Se o valor for maior ou igual ao valor restante (com tolerância de 0.01 para arredondamentos)
    if (amount >= remainingTotal - 0.01) {
      setSelectedPaymentMethod('partial_complete');
    }
  };

  // Função para remover um pagamento específico
  const handleRemovePayment = (paymentId: string) => {
    // Encontra o pagamento a ser removido
    const paymentToRemove = partialPayments.find(payment => payment.id === paymentId);
    
    if (paymentToRemove) {
      // Remove o pagamento da lista
      const updatedPayments = partialPayments.filter(payment => payment.id !== paymentId);
      setPartialPayments(updatedPayments);
      
      // Se o método removido era o método selecionado, desmarque-o
      if (selectedPaymentMethod === paymentToRemove.methodType) {
        setSelectedPaymentMethod(null);
      }
      
      toast.success(`Pagamento de ${paymentToRemove.method} removido`);
    }
  };

  // Calcular o total pago com pagamentos parciais
  const totalPaid = partialPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingTotal = total - totalPaid;

  // Calcular o troco (apenas para pagamentos em dinheiro)
  const moneyPayments = partialPayments.filter(payment => payment.method === 'Dinheiro');
  const totalMoneyPaid = moneyPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const changeAmount = totalMoneyPaid > total ? totalMoneyPaid - total : 0;
  const hasChange = changeAmount > 0;

  // Função para finalizar a venda
  const handleFinalizeSale = async () => {
    try {
      setLoading(true);
      
      // Aqui seria implementada a lógica para salvar a venda no banco de dados
      // Por enquanto apenas simulamos a finalização
      
      toast.success('Venda finalizada com sucesso!', {
        position: 'top-center',
        autoClose: 3000
      });
      
      // Limpa o estado após finalizar a venda
      setItems([]);
      setSelectedPaymentMethod(null);
      setPartialPayments([]);
      setShowCardOptions(false);
      setShowMoneyOptions(false);
      setAppliedTotalDiscount(null);
      setSelectedClient(null);
      
      // Limpa o estado salvo no localStorage
      localStorage.removeItem('pdvState');
      
      // Restaura o foco no campo de busca para nova venda
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
      
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      toast.error(`Erro ao finalizar a venda: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para cancelar a venda atual
  const handleCancelSale = () => {
    if (items.length === 0 && partialPayments.length === 0) {
      toast.info('Não há venda em andamento para cancelar');
      return;
    }
    
    if (confirm('Deseja realmente cancelar esta venda?')) {
      // Limpa todos os estados
      setItems([]);
      setSelectedPaymentMethod(null);
      setPartialPayments([]);
      setShowCardOptions(false);
      setShowMoneyOptions(false);
      setAppliedTotalDiscount(null);
      setSelectedClient(null);
      
      // Limpa o localStorage
      localStorage.removeItem('pdvState');
      
      toast.success('Venda cancelada com sucesso!');
      
      // Restaura o foco no campo de busca
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

  // Pode finalizar se tiver um método de pagamento selecionado e itens no carrinho
  // ou se for um pagamento parcial e tiver pelo menos um pagamento registrado
  // Nunca pode finalizar se não houver itens no carrinho
  const canFinalize = items.length > 0 && (
    (selectedPaymentMethod) ||
    (partialPayments.length > 0 && Math.abs(remainingTotal) < 0.01)
  );

  // O container principal tem uma largura mínima de 1024px (624px da área principal + 400px da área de pagamento)
  // para garantir que todos os elementos sejam exibidos corretamente na resolução mínima de 1024x768
  return (
    <div className="min-h-screen bg-slate-900 flex overflow-hidden min-w-[1024px]">
      {/* Área principal com largura flexível, mas com mínimo de 624px para garantir que os botões do rodapé sejam exibidos */}
      <div className="min-w-[624px] flex-1 flex flex-col overflow-hidden">
        <div className="bg-slate-800 border-b border-slate-700 py-3.5 px-4">
          <div className="flex items-center justify-between">
            <Logo variant="dashboard" />
          </div>
        </div>

        <div className="bg-slate-800/50 border-b border-slate-700 h-[52px] flex items-center">
          <div className="relative px-4 w-full">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Pesquisar produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-12 pr-4 py-1.5 bg-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            {filteredProducts.length > 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 bg-slate-800 rounded-lg border border-slate-700 shadow-lg max-h-64 overflow-y-auto z-50">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="w-full px-4 py-2 text-left hover:bg-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-slate-200">{product.name}</span>
                      <span className="text-slate-400 text-sm block">
                        Código: {product.code}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-400 font-medium block">
                        R$ {product.selling_price.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-sm block">
                        Estoque: {product.stock} {product.unit_code}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" />
              <span>Carregando produtos...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <ShoppingCart size={48} className="mb-2 opacity-50" />
              <span>Nenhum item no carrinho</span>
              <span className="text-sm">Use a barra de pesquisa para adicionar produtos</span>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className="bg-slate-800 rounded-lg p-4 flex items-center justify-between border border-slate-700"
              >
                <div className="flex-1">
                  <h3 className="text-slate-200 font-medium">{item.name}</h3>
                  <p className="text-slate-400">R$ {item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(item.id, -1)}
                      className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-slate-200 w-8 text-center">
                      {item.quantity} {item.unit_code}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, 1)}
                      className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="text-right min-w-[100px]">
                    {item.discount ? (
                      <div>
                        <p className="text-slate-200 font-medium">
                          R$ {getItemFinalPrice(item).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-400 line-through">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-xs text-green-400">
                          {item.discount.type === 'percentage'
                            ? `${item.discount.amount}% off`
                            : `R$ ${item.discount.amount.toFixed(2)} off`}
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-200 font-medium">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => item.discount
                      ? handleRemoveDiscount(item.id)
                      : handleDiscountClick(item.id)}
                    className={`p-2 ${item.discount
                      ? 'text-green-400 hover:text-green-300'
                      : 'text-blue-400 hover:text-blue-300'} hover:bg-slate-700 rounded`}
                    title={item.discount ? 'Remover desconto' : 'Aplicar desconto'}
                  >
                    <Tag size={16} />
                  </button>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded"
                    title="Remover item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="bg-slate-800 border-t border-slate-700 w-full overflow-hidden">
          <div className="flex items-center justify-between h-16 pr-4 pl-0">
            <div className="flex-1 overflow-hidden relative">
              {/* Container de botões com distribuição igual de espaço */}
              <div id="menu-container" className="flex items-center overflow-x-hidden transition-transform duration-300 ease-in-out ml-0 w-full" style={{scrollBehavior: 'smooth'}}>
                {/* Menu modernizado com agrupamento visual e melhor organização - botões com largura mínima fixa que podem expandir */}
                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => toast.info('Função em desenvolvimento')}
                  title="Entrega para cliente"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Bike size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Delivery</span>
                </button>

                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => toast.info('Função em desenvolvimento')}
                  disabled={items.length === 0}
                  title={items.length === 0 ? 'Adicione itens ao carrinho primeiro' : 'Salvar venda atual'}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Save size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Salvar</span>
                </button>

                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => toast.info('Função em desenvolvimento')}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <ShoppingCart size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Vendas</span>
                </button>

                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => toast.info('Função em desenvolvimento')}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <FileText size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Orçamento</span>
                </button>

                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => toast.info('Função em desenvolvimento')}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <RotateCcw size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Troca</span>
                </button>

                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => toast.info('Função em desenvolvimento')}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Dollar size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Fiado</span>
                </button>

                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => {
                    console.log('Botão de desconto clicado');
                    if (items.length === 0) {
                      toast.warning('Para aplicar desconto é necessário ter pelo menos um item no carrinho');
                    } else {
                      setTotalDiscountType('percentage');
                      setTotalDiscountAmount('');
                      setShowTotalDiscountPopup(true);
                    }
                  }}
                  title={items.length === 0 ? 'Adicione itens ao carrinho primeiro' : 'Aplicar desconto ao total da venda'}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Percent size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Desconto</span>
                </button>



                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => toast.info('Função em desenvolvimento')}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <RotateCcw size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Devolução</span>
                </button>



                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => toast.info('Função em desenvolvimento')}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <ArrowDownCircle size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Suprimento</span>
                </button>

                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => toast.info('Função em desenvolvimento')}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <ArrowUpCircle size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Sangria</span>
                </button>

                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => setShowConfigPopup(true)}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Settings size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Config</span>
                </button>

                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => toast.info('Função em desenvolvimento')}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <FileText size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Relatórios</span>
                </button>

                <button
                  className="flex flex-col items-center justify-center min-w-16 w-full h-16 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors px-2 border-r border-slate-600 relative group"
                  onClick={() => toast.info('Função em desenvolvimento')}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Wallet size={18} className="mb-1 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-medium truncate w-full text-center">Financeiro</span>
                </button>

              </div>
            </div>

            {/* Botões de navegação */}
            <div className="flex items-center gap-2 ml-2">
              <button
                id="scroll-left"
                className={`flex items-center justify-center w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-blue-900/30 ${!canScrollLeft ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={goToPreviousPage}
                disabled={!canScrollLeft}
                title={canScrollLeft ? 'Página anterior' : 'Você está na primeira página'}
              >
                <ArrowLeft size={16} className="text-blue-400" />
              </button>
              <button
                id="scroll-right"
                className={`flex items-center justify-center w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-blue-900/30 ${!canScrollRight ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={goToNextPage}
                disabled={!canScrollRight}
                title={canScrollRight ? 'Próxima página' : 'Você está na última página'}
              >
                <ArrowLeft size={16} className="rotate-180 text-blue-400" />
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Área de pagamento à direita com largura fixa de 350px para se ajustar à resolução mínima */}
      <div className="w-[350px] min-w-[350px] flex-shrink-0 bg-slate-800 border-l border-slate-700 flex flex-col">
        <div className="px-6 pt-3 pb-2 border-b border-slate-700">
          {/* Primeira linha: Data e X */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex-1">
              <span className="text-white text-lg font-bold tracking-wide whitespace-nowrap">{currentDateTime}</span>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-red-400 hover:text-red-300 ml-3 flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Segunda linha: Caixa e Operador */}
          <div className="flex items-center justify-between text-sm mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Caixa:</span>
              <span className="text-green-400">Aberto</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Operador:</span>
              <span className="text-slate-200">João Silva</span>
            </div>
          </div>

          {/* Terceira linha: Cliente */}
          <div className="relative client-search-container mb-0.5">
            {selectedClient ? (
              <div className="flex items-center bg-slate-600 rounded-md px-2 py-1 w-fit">
                <User size={16} className="text-blue-400 mr-1" />
                <span className="text-slate-200 text-sm font-medium">{selectedClient.name}</span>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="ml-2 text-slate-400 hover:text-slate-300"
                  title="Remover cliente"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClientSearch(true)}
                className="flex items-center bg-blue-600 hover:bg-blue-500 text-white rounded-md px-2 py-1 text-sm transition-colors"
                title="Selecionar cliente"
              >
                <UserPlus size={16} className="mr-1" />
                <span>Cliente</span>
              </button>
            )}

            {/* Modal de busca de clientes */}
            {showClientSearch && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-slate-800 rounded-md shadow-lg z-50 border border-slate-700">
                <div className="p-2">
                  <div className="flex items-center bg-slate-700 rounded-md mb-2">
                    <input
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="bg-transparent text-white p-2 w-full outline-none text-sm"
                      autoFocus
                    />
                    <UserSearch size={18} className="text-slate-400 mr-2" />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {/* Lista de clientes fictícia - em produção seria carregada do banco */}
                    {[
                      { id: '1', name: 'Maria Silva', document: '123.456.789-00' },
                      { id: '2', name: 'João Oliveira', document: '987.654.321-00' },
                      { id: '3', name: 'Ana Santos', document: '456.789.123-00' },
                      { id: '4', name: 'Carlos Ferreira', document: '789.123.456-00' },
                      { id: '5', name: 'Juliana Costa', document: '321.654.987-00' }
                    ]
                      .filter(client =>
                        clientSearchQuery === '' ||
                        client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                        client.document.includes(clientSearchQuery)
                      )
                      .map(client => (
                        <div
                          key={client.id}
                          className="p-2 hover:bg-slate-700 rounded-md cursor-pointer flex justify-between items-center"
                          onClick={() => {
                            setSelectedClient({ id: client.id, name: client.name });
                            setShowClientSearch(false);
                            setClientSearchQuery('');
                            toast.success(`Cliente ${client.name} selecionado`);
                          }}
                        >
                          <div>
                            <div className="text-slate-200 text-sm">{client.name}</div>
                            <div className="text-slate-400 text-xs">{client.document}</div>
                          </div>
                          <User size={16} className="text-blue-400" />
                        </div>
                      ))
                    }
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => {
                        setShowClientSearch(false);
                        setClientSearchQuery('');
                      }}
                      className="text-sm text-slate-400 hover:text-slate-300 px-2 py-1"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-700 p-4 rounded-lg shadow-lg">
              <span className="text-xl font-medium text-slate-200">Total</span>
              <span className="text-3xl font-bold text-blue-400">
                R$ {remainingTotal > 0 ? remainingTotal.toFixed(2) : '0.00'}
              </span>
            </div>
            {partialPayments.map((payment) => (
              <div key={payment.id} className="flex justify-between items-center bg-slate-800 p-2 px-4 rounded-md">
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-medium">{payment.method}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-orange-400 font-medium">
                    R$ {payment.amount.toFixed(2)}
                  </span>
                  <button 
                    onClick={() => handleRemovePayment(payment.id)}
                    className="text-slate-400 hover:text-red-400 p-1 rounded-full hover:bg-slate-700"
                    title="Remover pagamento"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-slate-200">
                R$ {subtotal.toFixed(2)}
              </span>
            </div>
            {itemsDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Desconto em Itens</span>
                <span className="text-green-400 font-medium">
                  R$ {itemsDiscount.toFixed(2)}
                </span>
              </div>
            )}
            {totalDiscountValue > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">
                  Desconto Total {appliedTotalDiscount?.type === 'percentage' ? `(${appliedTotalDiscount.amount}%)` : ''}
                </span>
                <span className="text-green-400 font-medium">
                  R$ {totalDiscountValue.toFixed(2)}
                </span>
              </div>
            )}
            {(itemsDiscount > 0 || totalDiscountValue > 0) && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Desconto Total</span>
                <span className="text-green-400 font-bold">
                  R$ {totalDiscount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Totais de Itens</span>
              <span className="text-blue-400 font-medium">
                {totalItems} {totalItems === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {hasChange && (
              <div className="flex justify-between items-center bg-green-700/30 p-4 rounded-lg shadow-lg mt-2">
                <span className="text-xl font-medium text-slate-200">Troco</span>
                <span className="text-3xl font-bold text-green-400">
                  R$ {changeAmount.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <>
            <div className="p-6 border-t border-slate-700">
              {showCardOptions ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-slate-200 font-medium">Tipo de Cartão</h3>
                    <button
                      onClick={() => {
                        setShowCardOptions(false);
                        setSelectedPaymentMethod(null);
                      }}
                      className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <ArrowLeft size={16} />
                      <span>Voltar</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCardPaymentSelect('debit')}
                        disabled={isFullPaymentApplied() && !partialPayments.some(p => p.methodType === 'debit')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'debit' || partialPayments.some(p => p.methodType === 'debit')
                            ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300'
                            : isFullPaymentApplied()
                              ? 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        <Debit size={20} />
                        <span className="font-medium">Débito</span>
                        <span className="text-xs opacity-80">À vista</span>
                      </button>
                      <button
                        onClick={() => handleCardPaymentSelect('debit_partial')}
                        disabled={isFullPaymentApplied()}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'debit_partial'
                            ? 'bg-blue-500 text-white'
                            : isFullPaymentApplied()
                              ? 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        <Debit size={20} />
                        <span className="font-medium">Débito</span>
                        <span className="text-xs opacity-80">Parcial</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCardPaymentSelect('credit')}
                        disabled={isFullPaymentApplied() && !partialPayments.some(p => p.methodType === 'credit')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'credit' || partialPayments.some(p => p.methodType === 'credit')
                            ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300'
                            : isFullPaymentApplied()
                              ? 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        <Credit size={20} />
                        <span className="font-medium">Crédito</span>
                        <span className="text-xs opacity-80">À vista</span>
                      </button>
                      <button
                        onClick={() => handleCardPaymentSelect('credit_partial')}
                        disabled={isFullPaymentApplied()}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'credit_partial'
                            ? 'bg-blue-500 text-white'
                            : isFullPaymentApplied()
                              ? 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        <Credit size={20} />
                        <span className="font-medium">Crédito</span>
                        <span className="text-xs opacity-80">Parcial</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCardPaymentSelect('voucher')}
                        disabled={isFullPaymentApplied() && !partialPayments.some(p => p.methodType === 'voucher')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'voucher' || partialPayments.some(p => p.methodType === 'voucher')
                            ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300'
                            : isFullPaymentApplied()
                              ? 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        <Voucher size={20} />
                        <span className="font-medium">Voucher</span>
                        <span className="text-xs opacity-80">À vista</span>
                      </button>
                      <button
                        onClick={() => handleCardPaymentSelect('voucher_partial')}
                        disabled={isFullPaymentApplied()}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'voucher_partial'
                            ? 'bg-blue-500 text-white'
                            : isFullPaymentApplied()
                              ? 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        <Voucher size={20} />
                        <span className="font-medium">Voucher</span>
                        <span className="text-xs opacity-80">Parcial</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : showMoneyOptions ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-slate-200 font-medium">Dinheiro</h3>
                    <button
                      onClick={() => {
                        setShowMoneyOptions(false);
                        setSelectedPaymentMethod(null);
                      }}
                      className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <ArrowLeft size={16} />
                      <span>Voltar</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleMoneyPaymentSelect('money_full')}
                      disabled={isFullPaymentApplied() && !partialPayments.some(p => p.methodType === 'money_full')}
                      className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                        selectedPaymentMethod === 'money_full' || partialPayments.some(p => p.methodType === 'money_full')
                          ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300'
                          : isFullPaymentApplied()
                            ? 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                            : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }`}
                    >
                      <Wallet size={20} className="text-slate-200" />
                      <span className="font-medium text-slate-200">Dinheiro</span>
                      <span className="text-xs text-slate-400">À Vista</span>
                    </button>
                    <button
                      onClick={() => handleMoneyPaymentSelect('money_full')}
                      disabled={isFullPaymentApplied()}
                      className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${selectedPaymentMethod === 'money_full' ? 'ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'} ${isFullPaymentApplied() ? 'opacity-50 cursor-not-allowed bg-slate-800 hover:bg-slate-800' : ''}`}
                    >
                      <Wallet size={20} className="text-slate-200" />
                      <span className="font-medium text-slate-200">Dinheiro</span>
                      <span className="text-xs text-slate-400">Parcial</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-slate-200 font-medium mb-4">Forma de Pagamento</h3>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleMoneyPaymentSelect('money_full')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${selectedPaymentMethod === 'money_full' ? 'ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'} ${isFullPaymentApplied() ? 'opacity-50 cursor-not-allowed bg-slate-800 hover:bg-slate-800' : ''}`}
                      >
                        <Wallet size={20} className="text-slate-200" />
                        <span className="font-medium text-slate-200">Dinheiro</span>
                        <span className="text-xs text-slate-400">À Vista</span>
                      </button>
                      <button
                        onClick={() => handleMoneyPaymentSelect('money_partial')}
                        disabled={isFullPaymentApplied()}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${selectedPaymentMethod === 'money_partial' ? 'ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'} ${isFullPaymentApplied() ? 'opacity-50 cursor-not-allowed bg-slate-800 hover:bg-slate-800' : ''}`}
                      >
                        <Wallet size={20} className="text-slate-200" />
                        <span className="font-medium text-slate-200">Dinheiro</span>
                        <span className="text-xs text-slate-400">Parcial</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePaymentMethodClick('pix')}
                        disabled={isFullPaymentApplied() && !partialPayments.some(p => p.methodType === 'pix')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${selectedPaymentMethod === 'pix' ? 'ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'} ${isFullPaymentApplied() ? 'opacity-50 cursor-not-allowed bg-slate-800 hover:bg-slate-800' : ''}`}
                      >
                        <QrCode size={20} className="text-slate-200" />
                        <span className="font-medium text-slate-200">PIX</span>
                        <span className="text-xs text-slate-400">À Vista</span>
                      </button>
                      <button
                        onClick={() => handlePaymentMethodClick('pix_partial')}
                        disabled={isFullPaymentApplied()}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${selectedPaymentMethod === 'pix_partial' ? 'ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'} ${isFullPaymentApplied() ? 'opacity-50 cursor-not-allowed bg-slate-800 hover:bg-slate-800' : ''}`}
                      >
                        <QrCode size={20} className="text-slate-200" />
                        <span className="font-medium text-slate-200">PIX</span>
                        <span className="text-xs text-slate-400">Parcial</span>
                      </button>
                    </div>
                    <button
                      onClick={() => handlePaymentMethodClick('card')}
                      disabled={isFullPaymentApplied()}
                      className={`w-full bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${isFullPaymentApplied() ? 'opacity-50 cursor-not-allowed bg-slate-800 hover:bg-slate-800' : ''}`}
                    >
                      <CreditCard size={20} />
                      <span>Cartão</span>
                    </button>
                    <button
                      onClick={() => handlePaymentMethodClick('credit')}
                      disabled={isFullPaymentApplied()}
                      className={`w-full bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${isFullPaymentApplied() ? 'opacity-50 cursor-not-allowed bg-slate-800 hover:bg-slate-800' : ''}`}
                    >
                      <Receipt size={20} />
                      <span>Fiado</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-700" style={{paddingLeft: '24px', paddingRight: '24px', paddingTop: '8px', paddingBottom: '8px'}}>
              <button
                onClick={handleFinalizeSale}
                disabled={!canFinalize}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3 px-4 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Finalizar Venda
              </button>
            </div>
          </>
        )}
      </div>

      {/* Popup de Desconto */}
      {showDiscountPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-[350px] border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-200 text-lg font-medium">Aplicar Desconto</h3>
              <button
                onClick={() => setShowDiscountPopup(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setDiscountType('percentage')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg ${discountType === 'percentage' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                >
                  <Percent size={18} />
                  <span>Porcentagem</span>
                </button>
                <button
                  onClick={() => setDiscountType('value')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg ${discountType === 'value' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                >
                  <DollarSign size={18} />
                  <span>Valor</span>
                </button>
              </div>

              <div>
                <label htmlFor="discount-amount" className="block text-sm text-slate-400 mb-1">
                  {discountType === 'percentage' ? 'Porcentagem de desconto' : 'Valor do desconto'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {discountType === 'percentage' ? '%' : 'R$'}
                  </span>
                  <input
                    id="discount-amount"
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? '100' : undefined}
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder={discountType === 'percentage' ? '10' : '5.00'}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {discountType === 'percentage'
                    ? 'Digite a porcentagem de desconto (ex: 10 para 10%)'
                    : 'Digite o valor do desconto em reais'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleApplyDiscount}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Aplicar Desconto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup de Desconto Total */}
      {showTotalDiscountPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-slate-800 rounded-lg p-6 w-[350px] border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-200 text-lg font-medium">Desconto no Total da Venda</h3>
              <button
                onClick={() => setShowTotalDiscountPopup(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setTotalDiscountType('percentage')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg ${totalDiscountType === 'percentage' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                >
                  <Percent size={18} />
                  <span>Porcentagem</span>
                </button>
                <button
                  onClick={() => setTotalDiscountType('value')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg ${totalDiscountType === 'value' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                >
                  <DollarSign size={18} />
                  <span>Valor</span>
                </button>
              </div>

              <div>
                <label htmlFor="total-discount-amount" className="block text-sm text-slate-400 mb-1">
                  {totalDiscountType === 'percentage' ? 'Porcentagem de desconto' : 'Valor do desconto'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {totalDiscountType === 'percentage' ? '%' : 'R$'}
                  </span>
                  <input
                    id="total-discount-amount"
                    type="number"
                    min="0"
                    max={totalDiscountType === 'percentage' ? '99.99' : (subtotal - 0.01).toString()}
                    step="0.01"
                    value={totalDiscountAmount}
                    onChange={(e) => setTotalDiscountAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder={totalDiscountType === 'percentage' ? '10' : (subtotal / 10).toFixed(2)}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {totalDiscountType === 'percentage'
                    ? 'Digite a porcentagem de desconto (ex: 10 para 10%)'
                    : `Digite o valor do desconto em reais (máx: R$ ${(subtotal - 0.01).toFixed(2)})`}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleApplyTotalDiscount}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Aplicar Desconto ao Total
                </button>
              </div>

              {appliedTotalDiscount && (
                <div className="pt-2">
                  <button
                    onClick={handleRemoveTotalDiscount}
                    className="w-full bg-red-500 hover:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Remover Desconto Atual
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Popup de Configuração do PDV */}
      {showConfigPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-[400px] border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-200 text-lg font-medium">Configurações do PDV</h3>
              <button
                onClick={() => setShowConfigPopup(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <div>
                    <h4 className="text-slate-200 font-medium">Agrupamentos de Itens</h4>
                    <p className="text-sm text-slate-400">Agrupar itens iguais no carrinho</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={pdvConfig.groupItems}
                      onChange={() => handleConfigChange('groupItems')}
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <div>
                    <h4 className="text-slate-200 font-medium">Controla Caixa</h4>
                    <p className="text-sm text-slate-400">Controlar abertura e fechamento de caixa</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={pdvConfig.controlCashier}
                      onChange={() => handleConfigChange('controlCashier')}
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <div>
                    <h4 className="text-slate-200 font-medium">Solicita Vendedor na Venda</h4>
                    <p className="text-sm text-slate-400">Solicitar vendedor ao iniciar uma venda</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={pdvConfig.requireSeller}
                      onChange={() => handleConfigChange('requireSeller')}
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <div>
                    <h4 className="text-slate-200 font-medium">PDV em tela cheia</h4>
                    <p className="text-sm text-slate-400">Exibir PDV em modo de tela cheia</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={pdvConfig.fullScreen}
                      onChange={() => handleConfigChange('fullScreen')}
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setShowConfigPopup(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="flex-1 bg-blue-500 hover:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Salvar Configurações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup de Item Não Encontrado */}
      {showItemNotFoundPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-[350px] border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-red-400 text-lg font-medium">Item Não Encontrado</h3>
              <button
                onClick={handleCloseItemNotFoundPopup}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-700 p-4 rounded-lg">
                <p className="text-slate-300 mb-1">O item com o código:</p>
                <p className="text-white font-bold text-lg break-all">{notFoundItemCode}</p>
                <p className="text-slate-300 mt-2">não foi encontrado no sistema.</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCloseItemNotFoundPopup}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup de Pagamento Parcial */}
      {showPartialPaymentPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-[350px] border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-200 text-lg font-medium">Pagamento Parcial</h3>
              <button
                onClick={() => setShowPartialPaymentPopup(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="partial-payment-amount" className="block text-sm text-slate-400 mb-1">
                  Valor do pagamento parcial
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    R$
                  </span>
                  <input
                    id="partial-payment-amount"
                    type="number"
                    min="0"
                    max={partialPaymentMethod?.includes('money') ? undefined : remainingTotal}
                    step="0.01"
                    value={partialPaymentAmount}
                    onChange={(e) => setPartialPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder={remainingTotal.toFixed(2)}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {partialPaymentMethod?.includes('money')
                    ? 'Para pagamentos em dinheiro, você pode inserir um valor maior que o total para receber troco'
                    : `Valor máximo: R$ ${remainingTotal.toFixed(2)}`}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleApplyPartialPayment}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Aplicar Pagamento Parcial
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}