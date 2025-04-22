import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface Pagamento {
  id?: string;
  forma_pagamento: string;
  valor: number;
}

interface NFEPagamentosTabProps {
  pagamentos: Pagamento[];
  onChange: (pagamentos: Pagamento[]) => void;
}

const NFEPagamentosTab: React.FC<NFEPagamentosTabProps> = ({ pagamentos, onChange }) => {
  const [formData, setFormData] = useState<Pagamento>({
    forma_pagamento: '01', // Dinheiro como padrão
    valor: 0
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'valor') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAddPagamento = () => {
    // Validação básica
    if (formData.valor <= 0) {
      toast.error('O valor do pagamento deve ser maior que zero');
      return;
    }

    // Adicionar novo pagamento
    const newPagamento = {
      ...formData,
      id: `temp_${Date.now()}` // ID temporário
    };

    onChange([...pagamentos, newPagamento]);
    
    // Resetar formulário
    setFormData({
      forma_pagamento: '01',
      valor: 0
    });
    
    toast.success('Forma de pagamento adicionada!');
  };

  const handleRemovePagamento = (pagamentoId: string | undefined) => {
    if (!pagamentoId) return;
    
    const updatedPagamentos = pagamentos.filter(p => p.id !== pagamentoId);
    onChange(updatedPagamentos);
    toast.success('Forma de pagamento removida!');
  };

  // Calcular total de pagamentos
  const totalPagamentos = pagamentos.reduce((acc, curr) => acc + (curr.valor || 0), 0);

  const formatMoney = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const getFormaPagamentoLabel = (codigo: string) => {
    const formasPagamento: Record<string, string> = {
      '01': 'Dinheiro',
      '02': 'Cheque',
      '03': 'Cartão de Crédito',
      '04': 'Cartão de Débito',
      '05': 'Crédito Loja',
      '10': 'Vale Alimentação',
      '11': 'Vale Refeição',
      '12': 'Vale Presente',
      '13': 'Vale Combustível',
      '15': 'Boleto Bancário',
      '16': 'Depósito Bancário',
      '17': 'PIX',
      '18': 'Transferência bancária',
      '19': 'Programa de fidelidade',
      '90': 'Sem Pagamento',
      '99': 'Outros'
    };
    
    return formasPagamento[codigo] || codigo;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Formas de Pagamento</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Forma de Pagamento */}
          <div>
            <label className="block text-white font-medium mb-1">Forma de Pagamento</label>
            <select
              name="forma_pagamento"
              value={formData.forma_pagamento}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="01">01 - Dinheiro</option>
              <option value="02">02 - Cheque</option>
              <option value="03">03 - Cartão de Crédito</option>
              <option value="04">04 - Cartão de Débito</option>
              <option value="05">05 - Crédito Loja</option>
              <option value="10">10 - Vale Alimentação</option>
              <option value="11">11 - Vale Refeição</option>
              <option value="12">12 - Vale Presente</option>
              <option value="13">13 - Vale Combustível</option>
              <option value="15">15 - Boleto Bancário</option>
              <option value="16">16 - Depósito Bancário</option>
              <option value="17">17 - PIX</option>
              <option value="18">18 - Transferência bancária</option>
              <option value="19">19 - Programa de fidelidade</option>
              <option value="90">90 - Sem Pagamento</option>
              <option value="99">99 - Outros</option>
            </select>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-white font-medium mb-1">Valor</label>
            <div className="flex items-center">
              <input
                type="number"
                name="valor"
                min="0.01"
                step="0.01"
                value={formData.valor || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0,00"
              />
              <button
                onClick={handleAddPagamento}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md transition-colors"
              >
                <Plus size={16} />
                <span>Adicionar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lista de pagamentos */}
        {pagamentos.length > 0 ? (
          <div className="bg-slate-600 rounded-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Forma de Pagamento</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-300">Valor</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-300">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {pagamentos.map((pagamento) => (
                  <tr key={pagamento.id} className="hover:bg-slate-650">
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {getFormaPagamentoLabel(pagamento.forma_pagamento)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 text-right">
                      {formatMoney(pagamento.valor)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemovePagamento(pagamento.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Remover pagamento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-700">
                <tr>
                  <td className="px-4 py-3 text-right text-sm font-medium text-white">
                    Total:
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-white">
                    {formatMoney(totalPagamentos)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="bg-slate-600 rounded-md p-4 text-center">
            <p className="text-slate-300">Nenhuma forma de pagamento adicionada</p>
          </div>
        )}
      </div>

      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-2">Informação</h3>
        <p className="text-slate-300 text-sm">
          As formas de pagamento informadas na NF-e são para fins de informação fiscal, e não implicam 
          automaticamente no recebimento dos valores. Para registrar o recebimento efetivo, utilize o 
          módulo financeiro do sistema.
        </p>
      </div>
    </div>
  );
};

export default NFEPagamentosTab;
