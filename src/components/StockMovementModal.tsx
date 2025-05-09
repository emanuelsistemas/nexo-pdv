import React, { useState, useEffect } from 'react';
import { X as XMarkIcon, Loader2, PlusCircle, MinusCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  currentStock: number;
  unitCode: string;
  movementType: 'entrada' | 'saida';
  onStockUpdated: (newStock: number) => void;
}

export function StockMovementModal({
  isOpen,
  onClose,
  productId,
  productName,
  currentStock,
  unitCode,
  movementType,
  onStockUpdated
}: StockMovementModalProps) {
  const [quantity, setQuantity] = useState<string>('');
  const [observation, setObservation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setObservation('');
      getUserAndCompanyId();
    }
  }, [isOpen]);

  const getUserAndCompanyId = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      setCompanyId(profile.company_id);
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error);
      toast.error('Erro ao carregar dados do usuário');
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Validação para permitir números e vírgula para valores decimais
    const value = e.target.value;
    
    // Remove caracteres não numéricos e permite vírgula apenas para unidade KG
    if (unitCode === 'KG') {
      const numericValue = value.replace(/[^0-9,]/g, '');
      setQuantity(numericValue);
    } else {
      // Para outras unidades, aceita apenas números inteiros
      const numericValue = value.replace(/[^0-9]/g, '');
      setQuantity(numericValue);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('===== HANDLER DE SUBMIT INICIADO =====');
    console.log('Event target:', e.target);
    console.log('Event current target:', e.currentTarget);
    
    // Garantir que o preventDefault seja chamado se for um evento de formulário
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    if (!quantity) {
      toast.error('Informe a quantidade');
      return;
    }
    
    if (!userId || !companyId) {
      toast.error('Erro ao identificar usuário ou empresa');
      return;
    }
    
    try {
      setLoading(true);
      
      // Converter a quantidade para número (trocando vírgula por ponto)
      const numericQuantity = parseFloat(quantity.replace(',', '.'));
      
      if (isNaN(numericQuantity) || numericQuantity <= 0) {
        toast.error('Quantidade inválida');
        return;
      }
      
      // Calcular o novo estoque
      let newStock: number;
      
      if (movementType === 'entrada') {
        newStock = currentStock + numericQuantity;
        console.log(`Adicionando ${numericQuantity} ao estoque atual ${currentStock}. Novo estoque: ${newStock}`);
      } else {
        if (numericQuantity > currentStock) {
          toast.error('Quantidade de saída não pode ser maior que o estoque atual');
          return;
        }
        newStock = currentStock - numericQuantity;
        console.log(`Subtraindo ${numericQuantity} do estoque atual ${currentStock}. Novo estoque: ${newStock}`);
      }
      
      console.log(`Registrando movimento de ${movementType} para o produto ${productId}`);
      
      // NÓVA ABORDAGEM: Usamos uma função RPC para registrar o movimento de estoque
      // Isso faz a operação completa em uma única chamada, evitando problemas de concorrência
      // e garantindo que as duas operações (registro + atualização) ocorram juntas
      console.log('Chamando função de registro de movimentação de estoque');
      
      // Preparar os dados para a chamada da função
      const movementData = {
        product_id: productId,
        company_id: companyId,
        quantity: numericQuantity, 
        movement_type: movementType,
        observation: observation || '',
        user_id: userId
      };
      
      console.log('Dados para registro:', movementData);
      
      // Primeiro, tentar usar a função rpc se ela existir
      try {
        const { data, error } = await supabase
          .rpc('register_stock_movement', movementData);
          
        if (error) {
          throw error; // Vamos pegar no catch abaixo e usar a abordagem alternativa
        }
        
        console.log('Movimento registrado com sucesso via RPC:', data);
        
        // Recuperar o estoque atualizado
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', productId)
          .single();
          
        if (productError) {
          console.warn('Erro ao buscar estoque atualizado:', productError);
        } else {
          console.log(`Estoque verificado após atualização: ${productData.stock}`);
          newStock = productData.stock; // Usar o valor real do banco
        }
      } catch (rpcError) {
        console.warn('Função RPC não disponível, usando abordagem manual:', rpcError);
        
        // ABORDAGEM ALTERNATIVA: Fazer as operações manualmente
        // Verificar se o produto existe antes de inserir o movimento
        const { data: productCheck, error: productCheckError } = await supabase
          .from('products')
          .select('id, name, stock')
          .eq('id', productId)
          .single();
          
        if (productCheckError) {
          console.error('Erro ao verificar produto:', productCheckError);
          toast.error(`Erro ao verificar produto: ${productCheckError.message || 'Produto não encontrado'}`);
          return;
        }
        
        if (!productCheck) {
          toast.error('Produto não encontrado no banco de dados');
          return;
        }
        
        console.log(`Produto verificado: ${productCheck.name}, estoque atual: ${productCheck.stock}`);
        
        // NOVA ABORDAGEM: Primeiro atualizar o estoque, depois registrar o movimento
        console.log(`Atualizando estoque do produto ${productId} para ${newStock}`);
        
        // Atualizar estoque do produto
        const { data: updateData, error: productError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', productId);
          
        if (productError) {
          console.error('Erro ao atualizar estoque:', productError);
          toast.error(`Falha ao atualizar estoque: ${productError.message || 'Erro desconhecido'}`);
          return;
        }
        
        // Inserir movimento no histórico
        console.log('Enviando dados para inserir na tabela product_stock_movements');
        
        const { data: movementData, error: movementError } = await supabase
          .from('product_stock_movements')
          .insert({
            product_id: productId,
            company_id: companyId,
            type: movementType,
            quantity: numericQuantity,
            date: new Date().toISOString(),
            observation: observation || null,
            created_by: userId
          });
          
        if (movementError) {
          console.error('Erro ao inserir movimento:', movementError);
          toast.error(`Falha ao registrar movimento: ${movementError.message || 'Erro desconhecido'}`);
          // Mesmo com erro no registro do movimento, o estoque já foi atualizado
          // Idealmente deveríamos reverter a atualização do estoque aqui
        }
      }
      
      // Notificar o componente pai sobre a atualização do estoque
      onStockUpdated(newStock);
      
      toast.success(`${movementType === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
      onClose();
    } catch (error: any) {
      console.error('Erro ao registrar movimento:', error);
      toast.error(`Erro ao registrar ${movementType === 'entrada' ? 'entrada' : 'saída'}: ${error.message || 'Falha na operação'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalClasses = `fixed inset-0 z-50 flex items-center justify-center p-4`;
  const modalContentClasses = `bg-slate-800 w-full max-w-md rounded-lg shadow-xl overflow-hidden`;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40" onClick={onClose} />
      
      <div className={modalClasses}>
        <div className={modalContentClasses}>
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-200">
              {movementType === 'entrada' ? 'Nova Entrada' : 'Nova Saída'} de Estoque
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form className="p-6 space-y-4" id="stock-movement-form">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Produto
              </label>
              <input
                type="text"
                value={productName}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                disabled
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Estoque Atual
                </label>
                <input
                  type="text"
                  value={`${currentStock} ${unitCode}`}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                  disabled
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Quantidade *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={quantity}
                    onChange={handleQuantityChange}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={unitCode === 'KG' ? "Ex: 1,5" : "Ex: 5"}
                    required
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                    {unitCode}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Observação
              </label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Observação opcional sobre esta movimentação"
              />
            </div>
            
            <div className="pt-2">
              <button
                type="button" 
                disabled={loading}
                onClick={(e) => {
                  e.preventDefault();
                  console.log('===== BOTÃO CLICADO =====');
                  console.log('Botão de ' + (movementType === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída') + ' foi clicado');
                  console.log('Estado atual do formulário:');
                  console.log('Loading:', loading);
                  console.log('Quantidade:', quantity);
                  console.log('Chamando handler manualmente...');
                  
                  // Chamar o handler de submit diretamente, sem submeter o formulário
                  handleSubmit(e as unknown as React.FormEvent);
                }}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all duration-200 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  movementType === 'entrada'
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/25'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/25'
                }`}
                id={movementType === 'entrada' ? 'register-entry-button' : 'register-exit-button'}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    {movementType === 'entrada' ? (
                      <PlusCircle size={20} />
                    ) : (
                      <MinusCircle size={20} />
                    )}
                    <span>
                      {movementType === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
