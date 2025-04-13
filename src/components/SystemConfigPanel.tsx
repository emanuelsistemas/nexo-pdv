import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

interface SystemConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'sistema' | 'caixa';
}

interface PdvConfig {
  groupItems: boolean;
  controlCashier: boolean;
  requireSeller: boolean;
  configId: string | null;
}

export const SystemConfigPanel: React.FC<SystemConfigPanelProps> = ({ isOpen, onClose, initialTab = 'sistema' }) => {
  const [activeTab, setActiveTab] = useState<'sistema' | 'caixa'>(initialTab);
  const [pdvConfig, setPdvConfig] = useState<PdvConfig>({
    groupItems: false,
    controlCashier: false, 
    requireSeller: false,
    configId: null
  });
  
  // Carregar configurações quando o painel for aberto
  useEffect(() => {
    if (isOpen) {
      loadPdvConfig();
    }
  }, [isOpen]);

  // Carrega as configurações do PDV do Supabase ou localStorage
  const loadPdvConfig = async () => {
    try {
      // Verificar localStorage primeiro
      const savedConfig = localStorage.getItem('pdvConfig');
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig);
          setPdvConfig(prev => ({
            ...parsedConfig,
            configId: parsedConfig.configId || prev.configId
          }));
        } catch (e) {
          console.error('Erro ao analisar configurações do localStorage:', e);
        }
      }

      // Obter o usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Obter o ID da empresa
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      // Verificar se a tabela pdv_configurations existe e se há configurações
      // Filtra por usuário E empresa (tabela tem unique constraint nessa combinação)
      const { data, error } = await supabase
        .from('pdv_configurations')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', profile.company_id)
        .limit(1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const config = data[0];
        setPdvConfig({
          groupItems: Boolean(config.group_items),
          controlCashier: Boolean(config.control_cashier),
          requireSeller: Boolean(config.require_seller),
          configId: config.id?.toString() || null
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  // Verifica se o caixa está aberto consultando a tabela pdv_cashiers
  const isCashierOpen = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.company_id) return false;
      
      // Verificar status do caixa para o usuário atual
      const { data } = await supabase
        .from('pdv_cashiers')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', profile.company_id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1);
      
      // Se há dados e o status é 'open', o caixa está aberto
      return Boolean(data && data.length > 0);
    } catch (error) {
      console.error('Erro ao verificar status do caixa:', error);
      return false;
    }
  };

  // Alterna o estado de uma configuração
  const handleConfigChange = async (configKey: keyof Omit<PdvConfig, 'configId'>) => {
    // Verificação especial para impedir desativação do controle de caixa quando o caixa está aberto
    if (configKey === 'controlCashier' && pdvConfig.controlCashier) {
      // Verifica se o caixa está aberto antes de permitir desativar
      const cashierOpen = await isCashierOpen();
      if (cashierOpen) {
        toast.error('Não é possível desativar o Controle de Caixa enquanto o caixa estiver aberto. Feche o caixa primeiro.');
        return;
      }
    }
    
    // Procede com a mudança normalmente se não houver restrições
    setPdvConfig(prev => ({
      ...prev,
      [configKey]: !prev[configKey]
    }));
  };

  // Salva as configurações no Supabase e no localStorage como backup
  const handleSaveConfig = async () => {
    try {
      // Verificação adicional antes de salvar: impedir desativar controle de caixa quando o caixa está aberto
      // Busca o estado atual da configuração para comparar
      const savedConfig = localStorage.getItem('pdvConfig');
      let oldControlCashier = false;
      
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig);
          oldControlCashier = Boolean(parsedConfig.controlCashier);
        } catch (e) {
          console.error('Erro ao analisar configurações do localStorage:', e);
        }
      }
      
      // Se está tentando desativar o controle de caixa, verifica se o caixa está aberto
      if (oldControlCashier && !pdvConfig.controlCashier) {
        const cashierOpen = await isCashierOpen();
        if (cashierOpen) {
          toast.error('Não é possível desativar o Controle de Caixa enquanto o caixa estiver aberto. Feche o caixa primeiro.');
          // Reverte a mudança na interface
          setPdvConfig(prev => ({
            ...prev,
            controlCashier: true
          }));
          return;
        }
      }
      // Obter o usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Obter o ID da empresa do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      // Preparar os dados para enviar ao Supabase
      const configData = {
        user_id: user.id, // Incluir o ID do usuário (obrigatório pelo schema da tabela)
        company_id: profile.company_id,
        group_items: pdvConfig.groupItems,
        control_cashier: pdvConfig.controlCashier,
        require_seller: pdvConfig.requireSeller
      };

      let result;
      
      // Atualizar ou inserir configurações
      if (pdvConfig.configId) {
        result = await supabase
          .from('pdv_configurations')
          .update(configData)
          .eq('id', pdvConfig.configId)
          .select();
      } else {
        result = await supabase
          .from('pdv_configurations')
          .insert([configData])
          .select();
      }

      if (result.error) {
        throw result.error;
      }

      // Atualizar o ID da configuração se for uma nova inserção
      if (result.data && result.data.length > 0) {
        setPdvConfig(prev => ({
          ...prev,
          configId: result.data[0].id?.toString() || null
        }));
      }

      // Salvar no localStorage como backup
      localStorage.setItem('pdvConfig', JSON.stringify(pdvConfig));
      
      // Disparar um evento personalizado para notificar outros componentes sobre a mudança
      const configChangeEvent = new CustomEvent('pdvConfigChanged', { 
        detail: { pdvConfig } 
      });
      window.dispatchEvent(configChangeEvent);
      
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações. Tentando salvar localmente...');
      
      // Fallback para localStorage se falhar
      localStorage.setItem('pdvConfig', JSON.stringify(pdvConfig));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="absolute inset-x-0 inset-y-0 sm:inset-y-[10%] sm:inset-x-[10%] md:inset-x-[15%] lg:inset-x-[20%] bg-slate-800 rounded-lg shadow-xl flex flex-col overflow-hidden z-50">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-700 px-4 py-3 border-b border-slate-600">
          <h2 className="text-lg font-semibold text-white">Configurações do Sistema</h2>
          <button 
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-700 border-b border-slate-600">
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'sistema' 
                ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' 
                : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('sistema')}
          >
            Sistema
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'caixa' 
                ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' 
                : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('caixa')}
          >
            Caixa
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'sistema' && (
            <div className="bg-slate-700 p-6 rounded-lg shadow-inner">
              <h3 className="text-xl font-semibold text-white mb-4">Configurações do Sistema</h3>
              <p className="text-slate-300">Aqui serão adicionadas as configurações do sistema.</p>
            </div>
          )}
          
          {activeTab === 'caixa' && (
            <div className="bg-slate-700 p-6 rounded-lg shadow-inner">
              <h3 className="text-xl font-semibold text-white mb-4">Configurações do Caixa</h3>
              
              <div className="space-y-4">
                {/* Agrupamentos de Itens */}
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">Agrupamentos de Itens</h4>
                    <p className="text-slate-400 text-sm">Agrupar itens iguais no carrinho <i className="text-slate-500">uso individual</i></p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pdvConfig.groupItems}
                      onChange={() => handleConfigChange('groupItems')}
                    />
                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 
                      peer-focus:ring-blue-300 ${pdvConfig.groupItems ? 'bg-blue-500' : 'bg-gray-600'} 
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                      after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                      after:transition-all peer-checked:after:translate-x-full`}></div>
                  </label>
                </div>
                
                {/* Outras configurações do PDV podem ser adicionadas aqui */}
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">Controle de Caixa</h4>
                    <p className="text-slate-400 text-sm">Ativar controle de abertura e fechamento de caixa <i className="text-slate-500">uso individual</i></p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pdvConfig.controlCashier}
                      onChange={() => handleConfigChange('controlCashier')}
                    />
                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 
                      peer-focus:ring-blue-300 ${pdvConfig.controlCashier ? 'bg-blue-500' : 'bg-gray-600'} 
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                      after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                      after:transition-all peer-checked:after:translate-x-full`}></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">Exigir Vendedor</h4>
                    <p className="text-slate-400 text-sm">Exigir seleção de vendedor para cada venda <i className="text-slate-500">uso individual</i></p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pdvConfig.requireSeller}
                      onChange={() => handleConfigChange('requireSeller')}
                    />
                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 
                      peer-focus:ring-blue-300 ${pdvConfig.requireSeller ? 'bg-blue-500' : 'bg-gray-600'} 
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                      after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                      after:transition-all peer-checked:after:translate-x-full`}></div>
                  </label>
                </div>
                
                {/* Opção de Tela Cheia removida conforme solicitado */}
                
                {/* Botão de salvar */}
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleSaveConfig}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    <Save size={18} />
                    Salvar Configurações
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
