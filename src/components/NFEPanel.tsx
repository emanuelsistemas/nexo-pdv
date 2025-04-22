import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Truck, 
  ShoppingCart, 
  CreditCard, 
  Info,
  User
} from 'lucide-react';
import { toast } from 'react-toastify';

interface NFE {
  id: string;
  numero: number;
  chave_acesso: string;
  data_emissao: string;
  valor_total: number;
  destinatario_nome: string;
  status: 'RASCUNHO' | 'ENVIADA' | 'AUTORIZADA' | 'REJEITADA' | 'CANCELADA';
}

interface NFEPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nfe: NFE | null;
  onSave: () => void;
}

export const NFEPanel: React.FC<NFEPanelProps> = ({ isOpen, onClose, nfe, onSave }) => {
  const [activeTab, setActiveTab] = useState<'destinatario' | 'produtos' | 'transporte' | 'pagamentos' | 'observacoes'>('destinatario');
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSaveNFE = () => {
    try {
      setIsSaving(true);
      
      // Simular o salvamento para a interface de frontend
      setTimeout(() => {
        toast.success(`NF-e ${nfe?.id ? 'atualizada' : 'criada'} com sucesso!`);
        onSave();
        onClose();
        setIsSaving(false);
      }, 800);
    } catch (error: any) {
      console.error('Erro ao salvar NF-e:', error);
      toast.error(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
      setIsSaving(false);
    }
  };

  // Painel simplificado - sem funções de atualização de dados

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? 'visible' : 'invisible'}`}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`bg-slate-800 w-full max-w-5xl h-[90vh] rounded-lg shadow-lg flex flex-col overflow-hidden transition-all duration-200 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={20} className="text-blue-400" />
            <h2 className="text-xl font-semibold text-white">
              {nfe ? `NF-e #${nfe.numero}` : 'Nova NF-e'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 overflow-x-auto">
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'destinatario'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('destinatario')}
          >
            <User size={18} />
            Destinatário
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'produtos'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('produtos')}
          >
            <ShoppingCart size={18} />
            Produtos
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'transporte'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('transporte')}
          >
            <Truck size={18} />
            Transporte
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pagamentos'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('pagamentos')}
          >
            <CreditCard size={18} />
            Pagamentos
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'observacoes'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('observacoes')}
          >
            <Info size={18} />
            Observações
          </button>
        </div>
        
        {/* Tab Content - Versão simplificada */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-slate-700 p-6 rounded-lg text-white">
            <h3 className="text-xl font-bold mb-4">
              {activeTab === 'destinatario' && 'Informações do Destinatário'}
              {activeTab === 'produtos' && 'Produtos da NF-e'}
              {activeTab === 'transporte' && 'Dados de Transporte'}
              {activeTab === 'pagamentos' && 'Formas de Pagamento'}
              {activeTab === 'observacoes' && 'Observações da NF-e'}
            </h3>
            
            <p className="text-slate-300 mb-4">
              Esta é uma implementação preliminar do componente de NF-e. Os conteúdos detalhados das abas estão nos componentes individuais da pasta NFETabs/.  
            </p>

            <div className="bg-slate-600 p-4 rounded-md flex items-center justify-center">
              <p className="text-white font-medium">Conteúdo da aba {activeTab} será exibido aqui</p>
            </div>
          </div>
        </div>
        
        {/* Footer com botões de ação */}
        <div className="border-t border-slate-600 p-4">
          <div className="flex justify-between">
            <div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveNFE}
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Salvar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
