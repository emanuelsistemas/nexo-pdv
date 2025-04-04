import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, Receipt, CreditCard, Wallet, QrCode, X, CreditCard as Credit, Smartphone as Debit, Ticket as Voucher, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
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

        toast.error('Produto não encontrado');
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
        toast.error('Nenhum produto encontrado');
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

  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

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
    setItems(items.filter(item => item.id !== id));
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
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
    } else {
      setShowCardOptions(false);
      setShowMoneyOptions(false);
      setSelectedPaymentMethod(method);
    }
  };

  const handleCardPaymentSelect = (method: string) => {
    setSelectedPaymentMethod(method);
  };

  const handleMoneyPaymentSelect = (method: string) => {
    setSelectedPaymentMethod(method);
  };

  const canFinalize = selectedPaymentMethod && items.length > 0;

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <div className="flex-1 flex flex-col">
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

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                    <p className="text-slate-200 font-medium">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="bg-slate-800 border-t border-slate-700">
          <div className="flex items-center justify-between h-12 px-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Caixa:</span>
                <span className="text-green-400">Aberto</span>
              </div>
              <div className="w-px h-3 bg-slate-600" />
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Operador:</span>
                <span className="text-slate-200">João Silva</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <div className="w-[400px] bg-slate-800 border-l border-slate-700 flex flex-col">
        <div className="px-6 pt-6 pb-5 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart size={24} className="text-blue-400" />
              <h2 className="text-xl font-semibold text-slate-200">Carrinho</h2>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-red-400 hover:text-red-300"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Venda #1234</span>
            <span className="text-slate-400">25/03/2025 14:30</span>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-slate-200">R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Desconto</span>
              <span className="text-slate-200">R$ 0,00</span>
            </div>
            <div className="flex justify-between items-center bg-slate-700 p-4 rounded-lg shadow-lg">
              <span className="text-xl font-medium text-slate-200">Total</span>
              <span className="text-3xl font-bold text-blue-400">
                R$ {total.toFixed(2)}
              </span>
            </div>
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
                        onClick={() => handlePaymentMethodClick('money')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          selectedPaymentMethod?.startsWith('money') ? 'ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'
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
                    <button 
                      onClick={() => handlePaymentMethodClick('card')}
                      className={`flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 px-4 rounded-lg transition-colors ${
                        selectedPaymentMethod?.includes('card') || selectedPaymentMethod?.includes('debit') || selectedPaymentMethod?.includes('credit') ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <CreditCard size={20} />
                      <span>Cartão</span>
                    </button>
                    <button 
                      onClick={() => handlePaymentMethodClick('pix')}
                      className={`flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 px-4 rounded-lg transition-colors ${
                        selectedPaymentMethod === 'pix' ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <QrCode size={20} />
                      <span>PIX</span>
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
    </div>
  );
}