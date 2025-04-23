import React from 'react';
import { Calendar } from 'lucide-react';

interface NFEIdentificacao {
  codigo: string;
  modelo: string;
  serie: string;
  numero: string;
  data_emissao: string;
  tipo_documento: string;
  finalidade_emissao: string;
  presenca: string;
  natureza_operacao: string;
  status: 'EM_DIGITACAO' | 'EMITIDA' | 'CANCELADA';
}

interface NFEIdentificacaoTabProps {
  identificacao: NFEIdentificacao;
  onChange: (identificacao: Partial<NFEIdentificacao>) => void;
}

const NFEIdentificacaoTab: React.FC<NFEIdentificacaoTabProps> = ({ identificacao, onChange }) => {
  // Manipulador de mudanças para inputs e selects
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };
  
  // Formatar a data no formato brasileiro
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR') + ', ' + date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    } catch (error) {
      return dateString;
    }
  };
  
  // Atualizar a data para a data/hora atual
  const updateDateToNow = () => {
    onChange({ data_emissao: new Date().toISOString() });
  };

  return (
    <div>
      <div className="bg-slate-700 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-4">Identificação da NFe</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Código */}
          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Código *
            </label>
            <input
              type="text"
              name="codigo"
              value={identificacao.codigo}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              readOnly
            />
          </div>

          {/* Modelo */}
          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Modelo *
            </label>
            <input
              type="text"
              name="modelo"
              value={identificacao.modelo}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              readOnly
            />
          </div>

          {/* Série */}
          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Série *
            </label>
            <input
              type="text"
              name="serie"
              value={identificacao.serie}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              readOnly
            />
          </div>

          {/* Número */}
          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Número *
            </label>
            <input
              type="text"
              name="numero"
              value={identificacao.numero}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              readOnly
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Data de Emissão */}
          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Emitida em *
            </label>
            <div 
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md flex items-center justify-between cursor-pointer select-none" 
              onClick={updateDateToNow}
            >
              <div>
                {formatDate(identificacao.data_emissao)}
              </div>
              <Calendar size={18} className="text-slate-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Tipo Documento */}
          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Tipo Documento
            </label>
            <select
              name="tipo_documento"
              value={identificacao.tipo_documento}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              <option value="1">1 - Saída</option>
              <option value="0">0 - Entrada</option>
            </select>
          </div>

          {/* Finalidade Emissão */}
          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Finalidade Emissão
            </label>
            <select
              name="finalidade_emissao"
              value={identificacao.finalidade_emissao}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              <option value="1">1 - NF-e normal</option>
              <option value="2">2 - NF-e complementar</option>
              <option value="3">3 - NF-e de ajuste</option>
              <option value="4">4 - Devolução/Retorno</option>
            </select>
          </div>

          {/* Presença */}
          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Presença
            </label>
            <select
              name="presenca"
              value={identificacao.presenca}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              <option value="0">0 - Não se aplica</option>
              <option value="1">1 - Operação presencial</option>
              <option value="2">2 - Operação não presencial, pela Internet</option>
              <option value="3">3 - Operação não presencial, Teleatendimento</option>
              <option value="4">4 - NFC-e em operação com entrega a domicílio</option>
              <option value="5">5 - Operação presencial, fora do estabelecimento</option>
              <option value="9">9 - Operação não presencial, outros</option>
            </select>
          </div>
        </div>

        {/* Natureza da Operação */}
        <div className="mb-6">
          <label className="block text-white text-sm font-medium mb-1">
            Natureza da Operação *
          </label>
          <input
            type="text"
            name="natureza_operacao"
            value={identificacao.natureza_operacao}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Informação Adicional */}
        <div className="mt-8">
          <button 
            type="button" 
            className="flex items-center text-blue-400 hover:text-blue-300 font-medium"
          >
            <span className="mr-2">🔍</span>
            PREENCHER INFORMAÇÃO ADICIONAL
          </button>
          
          <div className="mt-2 bg-slate-600 p-4 rounded-md">
            <p className="text-slate-400 text-sm">Informação Adicional</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFEIdentificacaoTab;
