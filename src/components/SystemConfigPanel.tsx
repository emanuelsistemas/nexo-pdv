import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Settings, ShoppingBag, FileText, CreditCard, ShoppingCart } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { loadFiscalConfigs, saveFiscalConfigs, FiscalConfig } from '../utils/fiscalUtils';
import { NfeConfigPanel } from './NfeConfigPanel';
import { NfceConfigPanel } from './NfceConfigPanel';

interface SystemConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'sistema' | 'caixa' | 'produto' | 'nfe' | 'nfce';
}

interface AppConfig {
  // ID da configuração no banco de dados
  configId: string | null;
  nfeConfigId: string | null;

  // Configurações do módulo sistema
  system: {
    theme: string;
    language: string;
  };

  // Configurações do módulo caixa
  cashier: {
    groupItems: boolean;
    controlCashier: boolean;
    requireSeller: boolean;
  };

  // Configurações do módulo produto
  product: {
    showBarcode: boolean;
    showNcm: boolean;
    showCfop: boolean;
    showCst: boolean;
    showPis: boolean;
    showCofins: boolean;
  };

  // Configurações do módulo NF-e/NFC-e
  nfenfc: {
    // NF-e (Modelo 55)
    nfe: {
      ativo: boolean;
      ambiente: 'producao' | 'homologacao';
      versao: string;
      modelo: string;
      serie: string;
      numeroAtual: string;
      certificadoArquivo: string;
      certificadoSenha: string;
      certificadoValidade: string;
      logoUrl: string;
    };
    // NFC-e (Modelo 65)
    nfce: {
      ativo: boolean;
      ambiente: 'producao' | 'homologacao';
      versao: string;
      modelo: string;
      serie: string;
      numeroAtual: string;
      cscId: string;
      cscToken: string;
      certificadoArquivo: string;
      certificadoSenha: string;
      certificadoValidade: string;
      logoUrl: string;
    };
  };
}

export const SystemConfigPanel: React.FC<SystemConfigPanelProps> = ({ isOpen, onClose, initialTab = 'sistema' }) => {
  const [activeTab, setActiveTab] = useState<'sistema' | 'caixa' | 'produto' | 'nfe' | 'nfce'>(initialTab);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    configId: null,
    nfeConfigId: null,
    system: {
      theme: 'dark',
      language: 'pt-BR'
    },
    cashier: {
      groupItems: false,
      controlCashier: false,
      requireSeller: false
    },
    product: {
      showBarcode: false,
      showNcm: false,
      showCfop: false,
      showCst: false,
      showPis: false,
      showCofins: false
    },
    nfenfc: {
      nfe: {
        ativo: false,
        ambiente: 'homologacao',
        versao: '4.00',
        modelo: '55',
        serie: '1',
        numeroAtual: '1',
        certificadoArquivo: '',
        certificadoSenha: '',
        certificadoValidade: '',
        logoUrl: ''
      },
      nfce: {
        ativo: false,
        ambiente: 'homologacao',
        versao: '4.00',
        modelo: '65',
        serie: '1',
        numeroAtual: '1',
        cscId: '',
        cscToken: '',
        certificadoArquivo: '',
        certificadoSenha: '',
        certificadoValidade: '',
        logoUrl: ''
      }
    }
  });

  // Carregar configurações fiscais (NF-e e NFC-e)
  const loadNfeFiscalConfig = useCallback(async () => {
    try {
      const fiscalConfig = await loadFiscalConfigs();

      if (fiscalConfig) {
        setAppConfig(prev => ({
          ...prev,
          nfenfc: {
            nfe: fiscalConfig.nfe,
            nfce: fiscalConfig.nfce
          }
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações fiscais:', error);
    }
  }, []);

  // Função para carregar configurações do PDV/caixa
  const loadPdvConfig = useCallback(async (userId: string, companyId: string) => {
    try {
      // Consultar a tabela pdv_configurations
      const { data, error } = await supabase
        .from('pdv_configurations')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .limit(1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const pdvConfig = data[0];

        // Atualizar o ID da configuração e a parte de cashier do appConfig
        setAppConfig(prev => ({
          ...prev,
          configId: pdvConfig.id?.toString() || null,
          cashier: {
            groupItems: Boolean(pdvConfig.group_items),
            controlCashier: Boolean(pdvConfig.control_cashier),
            requireSeller: Boolean(pdvConfig.require_seller)
          }
        }));
      }

    } catch (error) {
      console.error('Erro ao carregar configurações do PDV:', error);
    }
  }, []);

  // Carregar configurações de produtos da tabela products_configurations
  const loadProductConfig = useCallback(async (userId: string, companyId: string) => {
    try {
      // Consultar a tabela products_configurations
      const { data, error } = await supabase
        .from('products_configurations')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .limit(1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const productConfig = data[0];

        // Atualizar apenas a parte de produto do appConfig
        setAppConfig(prev => ({
          ...prev,
          product: {
            showBarcode: Boolean(productConfig.show_barcode),
            showNcm: Boolean(productConfig.show_ncm),
            showCfop: Boolean(productConfig.show_cfop),
            showCst: Boolean(productConfig.show_cst),
            showPis: Boolean(productConfig.show_pis),
            showCofins: Boolean(productConfig.show_cofins)
          }
        }));
      }

    } catch (error) {
      console.error('Erro ao carregar configurações de produto:', error);
    }
  }, []);

  // Carrega as configurações do aplicativo (de todas as tabelas)
  const loadAppConfig = useCallback(async () => {
    try {
      // Verificar localStorage primeiro
      const savedConfig = localStorage.getItem('appConfig');
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig);
          setAppConfig(prev => ({
            ...prev,
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

      // Carregar configurações de cada tabela separada
      await loadPdvConfig(user.id, profile.company_id);
      await loadProductConfig(user.id, profile.company_id);

      // Carregar configurações NFE/NFC-e
      await loadNfeFiscalConfig();
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações do sistema.');
    }
  }, [loadPdvConfig, loadProductConfig, loadNfeFiscalConfig]);
  
  // Carregar configurações quando o painel for aberto
  useEffect(() => {
    if (isOpen) {
      loadAppConfig();
    }
  }, [isOpen, loadAppConfig]);

  // Verificar se o caixa está aberto consultando a tabela pdv_cashiers
  const checkCashierOpen = useCallback(async (): Promise<boolean> => {
    try {
      // Obter o usuário logado
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return false;

      // Consultar a tabela pdv_cashiers
      const { data, error } = await supabase
        .from('pdv_cashiers')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data !== null;
    } catch (error) {
      console.error('Erro ao verificar estado do caixa:', error);
      return false;
    }
  }, []);

  // Função para salvar configurações do PDV/caixa
  const savePdvConfig = useCallback(async (): Promise<boolean> => {
    try {
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

      const pdvConfig = {
        user_id: user.id,
        company_id: profile.company_id,
        group_items: appConfig.cashier.groupItems,
        control_cashier: appConfig.cashier.controlCashier,
        require_seller: appConfig.cashier.requireSeller,
        updated_at: new Date()
      };

      // Verificar se já existe configuração para o usuário
      if (appConfig.configId) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from('pdv_configurations')
          .update(pdvConfig)
          .eq('id', appConfig.configId);

        if (error) throw error;
      } else {
        // Inserir nova configuração
        const { data, error } = await supabase
          .from('pdv_configurations')
          .insert(pdvConfig)
          .select('id')
          .single();

        if (error) throw error;

        // Atualizar o ID da configuração no estado
        if (data) {
          setAppConfig(prev => ({
            ...prev,
            configId: data.id?.toString() || null
          }));
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações do PDV:', error);
      return false;
    }
  }, [appConfig.cashier, appConfig.configId]);

  // Função para salvar configurações de produtos
  const saveProductConfig = async () => {
    try {
      // Implementação pendente
      console.log('Salvando configurações de produtos');
    } catch (error) {
      console.error('Erro ao salvar configurações de produtos:', error);
    }
  };

  // Alterna o estado de uma configuração de acordo com o módulo
  const handleConfigChange = useCallback((module: 'system' | 'cashier' | 'product', configKey: string) => {
    setAppConfig(prev => {
      const newConfig = { ...prev };

      if (module === 'system') {
        // Configurações do sistema
        const systemConfig = { ...newConfig.system };
        const key = configKey as keyof typeof systemConfig;
        if (typeof systemConfig[key] === 'boolean') {
          systemConfig[key] = !systemConfig[key];
        }
        newConfig.system = systemConfig;
      } else if (module === 'cashier') {
        // Configurações do caixa
        const cashierConfig = { ...newConfig.cashier };
        const key = configKey as keyof typeof cashierConfig;
        if (typeof cashierConfig[key] === 'boolean') {
          cashierConfig[key] = !cashierConfig[key];
        }
        newConfig.cashier = cashierConfig;
      } else if (module === 'product') {
        // Configurações do produto
        const productConfig = { ...newConfig.product };
        const key = configKey as keyof typeof productConfig;
        if (typeof productConfig[key] === 'boolean') {
          productConfig[key] = !productConfig[key];
        }
        newConfig.product = productConfig;
      }

      return newConfig;
    });
  }, []);

  // Salvar configurações fiscais (NF-e e NFC-e)
  const saveFiscalConfig = useCallback(async () => {
    try {
      const success = await saveFiscalConfigs({
        nfe: appConfig.nfenfc.nfe,
        nfce: appConfig.nfenfc.nfce
      });

      if (success) {
        toast.success('Configurações fiscais salvas com sucesso!');
      } else {
        toast.error('Erro ao salvar configurações fiscais.');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações fiscais:', error);
      toast.error('Erro ao salvar configurações fiscais.');
    }
  }, [appConfig.nfenfc]);

  // Função principal para salvar configurações com base na aba ativa
  const handleSaveConfig = async () => {
    try {
      if (activeTab === 'caixa') {
        await savePdvConfig();
      } else if (activeTab === 'produto') {
        await saveProductConfig();
      } else if (activeTab === 'nfe' || activeTab === 'nfce') {
        await saveFiscalConfig();
      }

      // Salvar no localStorage (todas configurações juntas)
      localStorage.setItem('appConfig', JSON.stringify(appConfig));

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações.');
    }
  };

  // Atualiza o estado quando um campo de NF-e for alterado
  const handleNfeChange = useCallback((key: string, value: any) => {
    setAppConfig(prev => ({
      ...prev,
      nfenfc: {
        ...prev.nfenfc,
        nfe: {
          ...prev.nfenfc.nfe,
          [key]: value
        }
      }
    }));
  }, []);

  // Atualiza o estado quando um campo de NFC-e for alterado
  const handleNfceChange = useCallback((key: string, value: any) => {
    setAppConfig(prev => ({
      ...prev,
      nfenfc: {
        ...prev.nfenfc,
        nfce: {
          ...prev.nfenfc.nfce,
          [key]: value
        }
      }
    }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      <div className="absolute inset-x-0 inset-y-0 sm:inset-y-[10%] sm:inset-x-[10%] md:inset-x-[15%] lg:inset-x-[20%] bg-slate-800 rounded-lg shadow-xl flex flex-col overflow-hidden z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-600">
          <h2 className="text-xl font-semibold text-white">Configurações do Sistema</h2>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors ml-4 z-50 relative"
            style={{ marginRight: '10px' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-700 border-b border-slate-600">
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'sistema'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-slate-300 hover:text-white'
              }`}
            onClick={() => setActiveTab('sistema')}
          >
            <Settings size={18} />
            Sistema
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'caixa'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-slate-300 hover:text-white'
              }`}
            onClick={() => setActiveTab('caixa')}
          >
            <ShoppingCart size={18} />
            Caixa
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'produto'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-slate-300 hover:text-white'
              }`}
            onClick={() => setActiveTab('produto')}
          >
            <ShoppingBag size={18} />
            Produto
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'nfe'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-slate-300 hover:text-white'
              }`}
            onClick={() => setActiveTab('nfe')}
          >
            <FileText size={18} />
            NFE
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'nfce'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-slate-300 hover:text-white'
              }`}
            onClick={() => setActiveTab('nfce')}
          >
            <CreditCard size={18} />
            NFC-e
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

          {activeTab === 'produto' && (
            <div className="bg-slate-700 p-6 rounded-lg shadow-inner">
              <h3 className="text-xl font-semibold text-white mb-4">Configurações de Produtos</h3>

              <div className="space-y-4">
                {/* Exibir Código de Barras */}
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">Exibir Código de Barras</h4>
                    <p className="text-slate-400 text-sm">Mostrar código de barras na listagem de produtos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={appConfig.product.showBarcode}
                      onChange={() => handleConfigChange('product', 'showBarcode')}
                    />
                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2
                      peer-focus:ring-blue-300 ${appConfig.product.showBarcode ? 'bg-blue-500' : 'bg-gray-600'}
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                      after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5
                      after:transition-all peer-checked:after:translate-x-full`}></div>
                  </label>
                </div>

                {/* Exibir NCM */}
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">Exibir NCM</h4>
                    <p className="text-slate-400 text-sm">Mostrar NCM na listagem de produtos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={appConfig.product.showNcm}
                      onChange={() => handleConfigChange('product', 'showNcm')}
                    />
                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2
                      peer-focus:ring-blue-300 ${appConfig.product.showNcm ? 'bg-blue-500' : 'bg-gray-600'}
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                      after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5
                      after:transition-all peer-checked:after:translate-x-full`}></div>
                  </label>
                </div>

                {/* Outros campos de configurações de produto */}
                {/* ... */}

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

          {/* Aba de configurações NFE */}
          {activeTab === 'nfe' && (
            <div className="bg-slate-700 p-6 rounded-lg shadow-inner">
              <NfeConfigPanel
                config={{
                  nfe: appConfig.nfenfc.nfe,
                  nfce: appConfig.nfenfc.nfce
                }}
                onChange={(newConfig) => {
                  setAppConfig(prev => ({
                    ...prev,
                    nfenfc: newConfig
                  }));
                }}
                onSave={handleSaveConfig}
              />
            </div>
          )}

          {/* Aba de configurações NFC-e */}
          {activeTab === 'nfce' && (
            <div className="bg-slate-700 p-6 rounded-lg shadow-inner">
              <NfceConfigPanel
                config={{
                  nfe: appConfig.nfenfc.nfe,
                  nfce: appConfig.nfenfc.nfce
                }}
                onChange={(newConfig) => {
                  setAppConfig(prev => ({
                    ...prev,
                    nfenfc: newConfig
                  }));
                }}
                onSave={handleSaveConfig}
              />
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
                    <p className="text-slate-400 text-sm">Agrupar itens iguais na lista de vendas</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={appConfig.cashier.groupItems}
                      onChange={() => handleConfigChange('cashier', 'groupItems')}
                    />
                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2
                      peer-focus:ring-blue-300 ${appConfig.cashier.groupItems ? 'bg-blue-500' : 'bg-gray-600'}
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                      after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5
                      after:transition-all peer-checked:after:translate-x-full`}></div>
                  </label>
                </div>

                {/* Controle de Caixa */}
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">Controle de Caixa</h4>
                    <p className="text-slate-400 text-sm">Ativar controle de abertura e fechamento de caixa <i className="text-slate-500">uso individual</i></p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={appConfig.cashier.controlCashier}
                      onChange={() => handleConfigChange('cashier', 'controlCashier')}
                    />
                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2
                      peer-focus:ring-blue-300 ${appConfig.cashier.controlCashier ? 'bg-blue-500' : 'bg-gray-600'}
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                      after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5
                      after:transition-all peer-checked:after:translate-x-full`}></div>
                  </label>
                </div>

                {/* Exigir Vendedor */}
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">Exigir Vendedor</h4>
                    <p className="text-slate-400 text-sm">Exigir seleção de vendedor para cada venda <i className="text-slate-500">uso individual</i></p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={appConfig.cashier.requireSeller}
                      onChange={() => handleConfigChange('cashier', 'requireSeller')}
                    />
                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2
                      peer-focus:ring-blue-300 ${appConfig.cashier.requireSeller ? 'bg-blue-500' : 'bg-gray-600'}
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                      after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5
                      after:transition-all peer-checked:after:translate-x-full`}></div>
                  </label>
                </div>

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
