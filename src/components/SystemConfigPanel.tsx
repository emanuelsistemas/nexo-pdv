import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

interface SystemConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'sistema' | 'caixa' | 'produto' | 'nfe-nfce';
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
    },
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
    }
  };
}

export const SystemConfigPanel: React.FC<SystemConfigPanelProps> = ({ isOpen, onClose, initialTab = 'sistema' }) => {
  const [activeTab, setActiveTab] = useState<'sistema' | 'caixa' | 'produto' | 'nfe-nfce'>(initialTab);
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
  
  // Carregar configurações quando o painel for aberto
  useEffect(() => {
    if (isOpen) {
      loadAppConfig();
    }
  }, [isOpen, activeTab]);

  // Carrega as configurações do aplicativo (de todas as tabelas)
  const loadAppConfig = async () => {
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
      
      // Configurações NFE/NFC-e desabilitadas temporariamente
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações do sistema.');
    }
  };
  
  // Função para salvar configurações de produtos
  const saveProductConfig = async () => {
    try {
      // Implementação pendente
      console.log('Salvando configurações de produtos');
    } catch (error) {
      console.error('Erro ao salvar configurações de produtos:', error);
    }
  };

  // Função para carregar configurações do PDV/caixa
  const loadPdvConfig = async (userId: string, companyId: string) => {
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
            groupItems: pdvConfig.group_items || false,
            controlCashier: pdvConfig.control_cashier || false,
            requireSeller: pdvConfig.require_seller || false
          }
        }));
      }
      
    } catch (error) {
      console.error('Erro ao carregar configurações do PDV:', error);
    }
  };

  // Carregar configurações de produtos da tabela products_configurations
  const loadProductConfig = async (userId: string, companyId: string) => {
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
            showBarcode: productConfig.show_barcode || false,
            showNcm: productConfig.show_ncm || false,
            showCfop: productConfig.show_cfop || false,
            showCst: productConfig.show_cst || false,
            showPis: productConfig.show_pis || false,
            showCofins: productConfig.show_cofins || false
          }
        }));
      }
      
    } catch (error) {
      console.error('Erro ao carregar configurações de produto:', error);
    }
  };

  // Verificar se o caixa está aberto consultando a tabela pdv_cashiers
  const checkCashierOpen = async (): Promise<boolean> => {
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

      return data && data.length > 0;
    } catch (error) {
      console.error('Erro ao verificar estado do caixa:', error);
      return false;
    }
  };

  // Alterna o estado de uma configuração de acordo com o módulo
  const handleConfigChange = (module: 'system' | 'cashier' | 'product', configKey: string) => {
    setAppConfig(prev => {
      const newConfig = { ...prev };

      if (module === 'system') {
        // Configurações do sistema
        const systemConfig = { ...newConfig.system };
        systemConfig[configKey as keyof typeof systemConfig] = 
          !systemConfig[configKey as keyof typeof systemConfig];
        newConfig.system = systemConfig;
      } else if (module === 'cashier') {
        // Configurações do caixa
        const cashierConfig = { ...newConfig.cashier };
        cashierConfig[configKey as keyof typeof cashierConfig] = 
          !cashierConfig[configKey as keyof typeof cashierConfig];
        newConfig.cashier = cashierConfig;
      } else if (module === 'product') {
        // Configurações do produto
        const productConfig = { ...newConfig.product };
        productConfig[configKey as keyof typeof productConfig] = 
          !productConfig[configKey as keyof typeof productConfig];
        newConfig.product = productConfig;
      }

      return newConfig;
    });
  };

  // Função principal para salvar configurações com base na aba ativa
  const handleSaveConfig = async () => {
    try {
      if (activeTab === 'caixa') {
        await savePdvConfig();
      } else if (activeTab === 'produto') {
        await saveProductConfig();
      }
      // Configuração NFE-NFC-e removida temporariamente

      // Salvar no localStorage (todas configurações juntas)
      localStorage.setItem('appConfig', JSON.stringify(appConfig));
      
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações.');
    }
  };

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
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'sistema' 
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('sistema')}
          >
            Sistema
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'caixa' 
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('caixa')}
          >
            Caixa
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'produto' 
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('produto')}
          >
            Produto
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'nfe-nfce' 
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('nfe-nfce')}
          >
            NFE / NFC-e
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
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-white mb-4">Configurações de Produtos</h3>
              
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
          
          {/* Aba de configurações NFE/NFC-e */}
          {activeTab === 'nfe-nfce' && (
            <div className="bg-slate-700 p-6 rounded-lg shadow-inner">
              <h3 className="text-xl font-semibold text-white mb-4">Configurações NFE/NFC-e</h3>
              <p className="text-slate-300 mb-4">As configurações de documentos fiscais estão sendo implementadas. Em breve estarão disponíveis.</p>
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
