import React, { useState } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, Receipt, CreditCard, Wallet, QrCode, X, CreditCard as Credit, Smartphone as Debit, Ticket as Voucher } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';

export default function PDV() {
  const navigate = useNavigate();
  const [searchProduct, setSearchProduct] = useState('');
  const [showCardOptions, setShowCardOptions] = useState(false);
  const [items, setItems] = useState<Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>>([
    {
      id: '1',
      name: 'Coca-Cola 2L',
      price: 8.99,
      quantity: 2
    },
    {
      id: '2',
      name: 'Pão Francês',
      price: 0.75,
      quantity: 10
    }
  ]);

  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleQuantityChange = (id: string, change: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handlePaymentMethodClick = (method: string) => {
    if (method === 'card') {
      setShowCardOptions(true);
    } else {
      setShowCardOptions(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Lista de Produtos */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 py-3.5 px-4">
          <div className="flex items-center justify-between">
            <Logo variant="dashboard" />
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Operador:</span>
              <span className="text-slate-200">João Silva</span>
            </div>
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <div className="bg-slate-800/50 border-b border-slate-700 h-[52px] flex items-center">
          <div className="relative px-4 w-full">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Pesquisar produto..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 bg-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.map(item => (
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
                  <span className="text-slate-200 w-8 text-center">{item.quantity}</span>
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
          ))}
        </div>

        {/* Footer */}
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
              <div className="w-px h-3 bg-slate-600" />
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Vendas do dia:</span>
                <span className="text-slate-200">R$ 1.234,56</span>
              </div>
              <div className="w-px h-3 bg-slate-600" />
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Última venda:</span>
                <span className="text-slate-200">14:30</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Painel Lateral */}
      <div className="w-[400px] bg-slate-800 border-l border-slate-700 flex flex-col">
        {/* Cabeçalho */}
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

        {/* Resumo */}
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
            <div className="flex justify-between text-lg font-medium">
              <span className="text-slate-200">Total</span>
              <span className="text-blue-400">R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Formas de Pagamento */}
        <div className="p-6 border-t border-slate-700">
          <h3 className="text-slate-200 font-medium mb-4">Forma de Pagamento</h3>
          {!showCardOptions ? (
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handlePaymentMethodClick('card')}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 px-4 rounded-lg transition-colors"
              >
                <CreditCard size={20} />
                <span>Cartão</span>
              </button>
              <button 
                onClick={() => handlePaymentMethodClick('money')}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 px-4 rounded-lg transition-colors"
              >
                <Wallet size={20} />
                <span>Dinheiro</span>
              </button>
              <button 
                onClick={() => handlePaymentMethodClick('pix')}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 px-4 rounded-lg transition-colors"
              >
                <QrCode size={20} />
                <span>PIX</span>
              </button>
              <button 
                onClick={() => handlePaymentMethodClick('credit')}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 px-4 rounded-lg transition-colors"
              >
                <Receipt size={20} />
                <span>Fiado</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button 
                onClick={() => handlePaymentMethodClick('debit')}
                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 px-4 rounded-lg transition-colors"
              >
                <Debit size={20} />
                <span>Débito</span>
              </button>
              <button 
                onClick={() => handlePaymentMethodClick('credit')}
                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 px-4 rounded-lg transition-colors"
              >
                <Credit size={20} />
                <span>Crédito</span>
              </button>
              <button 
                onClick={() => handlePaymentMethodClick('voucher')}
                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 px-4 rounded-lg transition-colors"
              >
                <Voucher size={20} />
                <span>Voucher</span>
              </button>
              <button 
                onClick={() => setShowCardOptions(false)}
                className="w-full flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 text-slate-200 py-3 px-4 rounded-lg transition-colors mt-4"
              >
                <X size={20} />
                <span>Voltar</span>
              </button>
            </div>
          )}
        </div>

        {/* Botão Finalizar */}
        <div className="p-6 border-t border-slate-700">
          <button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3 px-4 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/25">
            Finalizar Venda
          </button>
        </div>
      </div>
    </div>
  );
}