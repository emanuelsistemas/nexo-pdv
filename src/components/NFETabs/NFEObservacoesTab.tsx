import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface Observacao {
  id?: string;
  tipo: 'FISCO' | 'CONTRIBUINTE';
  campo?: string;
  texto: string;
}

interface NFEObservacoesTabProps {
  observacoes: Observacao[];
  onChange: (observacoes: Observacao[]) => void;
}

const NFEObservacoesTab: React.FC<NFEObservacoesTabProps> = ({ observacoes, onChange }) => {
  const [formData, setFormData] = useState<Observacao>({
    tipo: 'CONTRIBUINTE',
    campo: '',
    texto: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddObservacao = () => {
    // Validação básica
    if (!formData.texto.trim()) {
      toast.error('O texto da observação não pode estar vazio');
      return;
    }

    // Adicionar nova observação
    const newObservacao = {
      ...formData,
      id: `temp_${Date.now()}` // ID temporário
    };

    onChange([...observacoes, newObservacao]);
    
    // Manter o mesmo tipo e campo, limpar apenas o texto
    setFormData(prev => ({
      ...prev,
      texto: ''
    }));
    
    toast.success('Observação adicionada!');
  };

  const handleRemoveObservacao = (observacaoId: string | undefined) => {
    if (!observacaoId) return;
    
    const updatedObservacoes = observacoes.filter(o => o.id !== observacaoId);
    onChange(updatedObservacoes);
    toast.success('Observação removida!');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Observações da NF-e</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Tipo de Observação */}
          <div>
            <label className="block text-white font-medium mb-1">Tipo de Observação</label>
            <select
              name="tipo"
              value={formData.tipo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CONTRIBUINTE">Para o Contribuinte</option>
              <option value="FISCO">Para o Fisco</option>
            </select>
          </div>

          {/* Campo de Interesse */}
          <div>
            <label className="block text-white font-medium mb-1">
              Campo de Interesse {formData.tipo === 'FISCO' && '*'}
            </label>
            <input
              type="text"
              name="campo"
              value={formData.campo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={formData.tipo === 'FISCO' ? 'Campo obrigatório para Fisco' : 'Opcional para Contribuinte'}
              required={formData.tipo === 'FISCO'}
            />
            {formData.tipo === 'FISCO' && (
              <p className="text-slate-400 text-xs mt-1">
                Para observações ao Fisco, o campo de interesse é obrigatório
              </p>
            )}
          </div>

          {/* Botão Adicionar (espaço vazio no grid) */}
          <div className="flex items-end">
            <button
              onClick={handleAddObservacao}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors w-full"
              disabled={formData.tipo === 'FISCO' && !formData.campo}
            >
              <Plus size={16} />
              <span>Adicionar Observação</span>
            </button>
          </div>
        </div>

        {/* Texto da Observação */}
        <div className="mb-4">
          <label className="block text-white font-medium mb-1">Texto da Observação *</label>
          <textarea
            name="texto"
            value={formData.texto}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-y"
            placeholder="Digite a observação..."
            required
          />
        </div>

        {/* Lista de observações */}
        {observacoes.length > 0 ? (
          <div className="bg-slate-600 rounded-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Tipo</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Campo</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Texto</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-300">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {observacoes.map((observacao) => (
                  <tr key={observacao.id} className="hover:bg-slate-650">
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {observacao.tipo === 'CONTRIBUINTE' ? 'Contribuinte' : 'Fisco'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {observacao.campo || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      <div className="max-w-xs truncate">{observacao.texto}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemoveObservacao(observacao.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Remover observação"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-slate-600 rounded-md p-4 text-center">
            <p className="text-slate-300">Nenhuma observação adicionada</p>
          </div>
        )}
      </div>

      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-2">Dicas para Observações</h3>
        <div className="space-y-2 text-slate-300 text-sm">
          <p>
            <strong>Observações para o Contribuinte:</strong> São impressas no DANFE e visíveis ao destinatário.
            Use para informações adicionais sobre a operação, condições comerciais, etc.
          </p>
          <p>
            <strong>Observações para o Fisco:</strong> São destinadas às autoridades fiscais e exigem um "campo de interesse"
            específico. Use para informações de interesse fiscal, como justificativas, regimes especiais, etc.
          </p>
          <p>
            <strong>Campo de Interesse:</strong> Para observações ao Fisco, identifica a qual campo da NF-e
            a observação se refere. Ex: "ICMS90", "COFINS", etc.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NFEObservacoesTab;
