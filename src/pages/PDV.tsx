import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Trash2, Plus, Minus, Receipt, CreditCard, Wallet, QrCode, X, CreditCard as Credit, Smartphone as Debit, Ticket as Voucher, Loader2, ArrowLeft, Percent, DollarSign, Tag, FileText, RefreshCw, MoreHorizontal, ClipboardList, RotateCcw, Save, Settings, DollarSign as Dollar, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
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
  const [partialPaymentAmount, setPartialPaymentAmount] = useState('');
  const [partialPaymentMethod, setPartialPaymentMethod] = useState<string | null>(null);
  const [partialPayments, setPartialPayments] = useState<{method: string, amount: number}[]>([]);
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
    requireSeller: false
  });

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
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

  const handlePaymentMethodClick = (method: string) => {
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
    }
  };

  const handleCardPaymentSelect = (method: string) => {
    if (method.includes('_partial')) {
      setPartialPaymentMethod(method);
      setPartialPaymentAmount('');
      setShowPartialPaymentPopup(true);
    } else {
      setSelectedPaymentMethod(method);
    }
  };

  const handleMoneyPaymentSelect = (method: string) => {
    if (method.includes('_partial')) {
      setPartialPaymentMethod(method);
      setPartialPaymentAmount('');
      setShowPartialPaymentPopup(true);
    } else {
      setSelectedPaymentMethod(method);
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
      method: methodName,
      amount: amount
    }]);

    setShowPartialPaymentPopup(false);
    toast.success(`Pagamento de R$ ${amount.toFixed(2)} aplicado`);

    // Se o valor for maior ou igual ao valor restante, finalizar o pagamento
    if (amount >= remainingTotal) {
      setSelectedPaymentMethod('partial_complete');
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

  // Pode finalizar se tiver um método de pagamento selecionado e itens no carrinho
  // OU se os pagamentos parciais cobrirem o valor total
  // Nunca pode finalizar se não houver itens no carrinho
  const canFinalize = items.length > 0 && (
    (selectedPaymentMethod) ||
    (partialPayments.length > 0 && Math.abs(remainingTotal) < 0.01)
  );

  return (
    <div className="min-h-screen bg-slate-900 flex overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
          <div className="flex items-center justify-between h-12 px-4">
            <div className="flex-1 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                {showSecondMenu && showExpandedMenu ? (
                  <>
                    <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors whitespace-nowrap"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <FileText size={16} />
                    <span>Relatórios</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors whitespace-nowrap"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <ShoppingCart size={16} />
                    <span>Produtos</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors whitespace-nowrap"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <Wallet size={16} />
                    <span>Financeiro</span>
                  </button>
                  </>
                ) : showExpandedMenu ? (
                  <>
                    <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors whitespace-nowrap"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <ClipboardList size={16} />
                    <span>Histórico</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors whitespace-nowrap"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <RotateCcw size={16} />
                    <span>Devolução</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <RefreshCw size={16} />
                    <span>Sincronizar</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <ClipboardList size={16} />
                    <span>Vend. Concluídas</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-700 hover:bg-green-600 text-white rounded-md transition-colors whitespace-nowrap"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <ArrowDownCircle size={16} />
                    <span>Suprimento</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors whitespace-nowrap"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <ArrowUpCircle size={16} />
                    <span>Sangria</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors whitespace-nowrap"
                    onClick={() => setShowConfigPopup(true)}
                  >
                    <Settings size={16} />
                    <span>Configuração do PDV</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors whitespace-nowrap"
                    onClick={() => toast.info('Função em desenvolvimento')}
                    disabled={items.length === 0}
                    title={items.length === 0 ? 'Adicione itens ao carrinho primeiro' : 'Salvar venda atual'}
                  >
                    <Save size={16} />
                    <span>Salvar Venda</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors whitespace-nowrap"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <ShoppingCart size={16} />
                    <span>Vendas Abertas</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors whitespace-nowrap"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <FileText size={16} />
                    <span>Import Orçamento</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors whitespace-nowrap"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <RotateCcw size={16} />
                    <span>Troca</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors whitespace-nowrap"
                    onClick={() => toast.info('Função em desenvolvimento')}
                  >
                    <Dollar size={16} />
                    <span>Rec. Fiado</span>
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors whitespace-nowrap"
                    onClick={handleTotalDiscountClick}
                    disabled={items.length === 0}
                    title={items.length === 0 ? 'Adicione itens ao carrinho primeiro' : 'Aplicar desconto ao total da venda'}
                  >
                    <Percent size={16} />
                    <span>Desc. Total</span>
                  </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2">
              <button
                className="flex items-center justify-center w-10 h-10 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
                onClick={() => {
                  setShowExpandedMenu(!showExpandedMenu);
                  if (!showExpandedMenu) setShowSecondMenu(false);
                }}
                title={showExpandedMenu ? "Menos opções" : "Mais opções"}
              >
                {showExpandedMenu ? <Minus size={20} /> : <Plus size={20} />}
              </button>

              {showExpandedMenu && (
                <button
                  className="flex items-center justify-center w-10 h-10 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
                  onClick={() => setShowSecondMenu(!showSecondMenu)}
                  title={showSecondMenu ? "Menos opções" : "Mais opções"}
                >
                  {showSecondMenu ? <Minus size={20} /> : <Plus size={20} />}
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>

      <div className="w-[400px] min-w-[400px] flex-shrink-0 bg-slate-800 border-l border-slate-700 flex flex-col">
        <div className="px-6 pt-6 pb-5 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-slate-400 text-sm">Venda #1234</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-lg font-bold tracking-wide">{currentDateTime}</span>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-red-400 hover:text-red-300 ml-4"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Caixa:</span>
              <span className="text-green-400">Aberto</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Operador:</span>
              <span className="text-slate-200">João Silva</span>
            </div>
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
            {partialPayments.map((payment, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-slate-400">{payment.method}</span>
                <span className="text-orange-400 font-medium">
                  R$ {payment.amount.toFixed(2)}
                </span>
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
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'debit'
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        <Debit size={20} />
                        <span className="font-medium">Débito</span>
                        <span className="text-xs opacity-80">À vista</span>
                      </button>
                      <button
                        onClick={() => handleCardPaymentSelect('debit_partial')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'debit_partial'
                            ? 'bg-blue-500 text-white'
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
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'credit'
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        <Credit size={20} />
                        <span className="font-medium">Crédito</span>
                        <span className="text-xs opacity-80">À vista</span>
                      </button>
                      <button
                        onClick={() => handleCardPaymentSelect('credit_partial')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'credit_partial'
                            ? 'bg-blue-500 text-white'
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
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'voucher'
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        <Voucher size={20} />
                        <span className="font-medium">Voucher</span>
                        <span className="text-xs opacity-80">À vista</span>
                      </button>
                      <button
                        onClick={() => handleCardPaymentSelect('voucher_partial')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'voucher_partial'
                            ? 'bg-blue-500 text-white'
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
                      className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                        selectedPaymentMethod === 'money_full' ? 'ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      <Wallet size={20} className="text-slate-200" />
                      <span className="font-medium text-slate-200">Dinheiro</span>
                      <span className="text-xs text-slate-400">À Vista</span>
                    </button>
                    <button
                      onClick={() => handleMoneyPaymentSelect('money_partial')}
                      className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                        selectedPaymentMethod === 'money_partial' ? 'ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'
                      }`}
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
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'money_full' ? 'ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        <Wallet size={20} className="text-slate-200" />
                        <span className="font-medium text-slate-200">Dinheiro</span>
                        <span className="text-xs text-slate-400">À Vista</span>
                      </button>
                      <button
                        onClick={() => handleMoneyPaymentSelect('money_partial')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'money_partial' ? 'ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        <Wallet size={20} className="text-slate-200" />
                        <span className="font-medium text-slate-200">Dinheiro</span>
                        <span className="text-xs text-slate-400">Parcial</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePaymentMethodClick('pix')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'pix' ? 'ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        <QrCode size={20} className="text-slate-200" />
                        <span className="font-medium text-slate-200">PIX</span>
                        <span className="text-xs text-slate-400">À Vista</span>
                      </button>
                      <button
                        onClick={() => handlePaymentMethodClick('pix_partial')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod === 'pix_partial' ? 'ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        <QrCode size={20} className="text-slate-200" />
                        <span className="font-medium text-slate-200">PIX</span>
                        <span className="text-xs text-slate-400">Parcial</span>
                      </button>
                    </div>
                    <button
                      onClick={() => handlePaymentMethodClick('card')}
                      className={`flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 px-4 rounded-lg transition-colors ${
                        selectedPaymentMethod === 'card' ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <CreditCard size={20} />
                      <span>Cartão</span>
                    </button>
                    <button
                      onClick={() => handlePaymentMethodClick('credit')}
                      className={`flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 px-4 rounded-lg transition-colors ${
                        selectedPaymentMethod === 'credit' ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <Receipt size={20} />
                      <span>Fiado</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-700">
              <button
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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