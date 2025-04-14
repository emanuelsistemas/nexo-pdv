import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

interface SystemConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'sistema' | 'caixa' | 'produto';
}

interface AppConfig {
  // ID da configuração no banco de dados
  configId: string | null;
  
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
}

export const SystemConfigPanel: React.FC<SystemConfigPanelProps> = ({ isOpen, onClose, initialTab = 'sistema' }) => {
  const [activeTab, setActiveTab] = useState<'sistema' | 'caixa' | 'produto'>(initialTab);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    configId: null,
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
    }
  });
  
  // Carregar configurações quando o painel for aberto
  useEffect(() => {
    if (isOpen) {
      loadAppConfig();
    }
  }, [isOpen]);

  // Carrega as configurações do aplicativo (de todas as tabelas)
  const loadAppConfig = async () => {
    try {
      // Verificar localStorage primeiro
      const savedConfig = localStorage.getItem('appConfig');
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig);
          setAppConfig(prev => ({
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

    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações do sistema.');
    }
  };

  // Carregar configurações de PDV/caixa da tabela pdv_configurations
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
  const isCashierOpen = async (): Promise<boolean> => {
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

      // Verificar se há algum caixa aberto (não fechado) para o usuário ou empresa
      const { data, error } = await supabase
        .from('pdv_cashiers')
        .select('*')
        .eq('company_id', profile.company_id)
        .is('closing_time', null) // Verifica se não possui horário de fechamento
        .limit(1);

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
      // Identificar qual aba está ativa e salvar apenas as configurações relacionadas a ela
      if (activeTab === 'caixa') {
        await savePdvConfig();
        toast.success('Configurações do caixa salvas com sucesso!');
      } else if (activeTab === 'produto') {
        await saveProductConfig();
        toast.success('Configurações de produto salvas com sucesso!');
      } else if (activeTab === 'sistema') {
        // Futuro método para salvar configurações do sistema em uma tabela específica
        toast.info('Configurações do sistema - funcionalidade futura');
        
        // Salvar no localStorage como backup de qualquer maneira
        localStorage.setItem('appConfig', JSON.stringify(appConfig));
      }
      
      // Disparar um evento personalizado para notificar outros componentes sobre a mudança
      const configChangeEvent = new CustomEvent('appConfigChanged', { 
        detail: { appConfig } 
      });
      window.dispatchEvent(configChangeEvent);
      
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações.');
    }
  };

  // Salva as configurações de PDV (caixa) na tabela pdv_configurations
  const savePdvConfig = async () => {
    try {
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

      // Preparar os dados para enviar ao Supabase (para a tabela pdv_configurations)
      const configData = {
        user_id: user.id,
        company_id: profile.company_id,
        group_items: appConfig.cashier.groupItems,
        control_cashier: appConfig.cashier.controlCashier,
        require_seller: appConfig.cashier.requireSeller
      };

      let result;
      
      // Atualizar ou inserir configurações na tabela pdv_configurations existente
      if (appConfig.configId) {
        result = await supabase
          .from('pdv_configurations')
          .update(configData)
          .eq('id', appConfig.configId)
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
      if (!appConfig.configId && result.data && result.data.length > 0) {
        setAppConfig(prev => ({
          ...prev,
          configId: result.data[0].id?.toString() || null
        }));
      }
      
      // Salvar no localStorage como backup
      localStorage.setItem('appConfig', JSON.stringify(appConfig));
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações de caixa:', error);
      throw error;
    }
  };

  // Salva as configurações de produto na tabela products_configurations
  const saveProductConfig = async () => {
    try {
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
      
      // Verificar se já existe uma configuração de produto para este usuário/empresa
      const { data: existingConfig } = await supabase
        .from('products_configurations')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', profile.company_id)
        .limit(1);
      
      // Preparar os dados de configuração de produto para enviar ao Supabase
      const productConfigData = {
        user_id: user.id,
        company_id: profile.company_id,
        show_barcode: appConfig.product.showBarcode,
        show_ncm: appConfig.product.showNcm,
        show_cfop: appConfig.product.showCfop,
        show_cst: appConfig.product.showCst,
        show_pis: appConfig.product.showPis,
        show_cofins: appConfig.product.showCofins,
        updated_at: new Date().toISOString()
      };
      
      // Atualizar ou inserir configurações na tabela products_configurations
      if (existingConfig && existingConfig.length > 0) {
        const { error } = await supabase
          .from('products_configurations')
          .update(productConfigData)
          .eq('id', existingConfig[0].id);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products_configurations')
          .insert([productConfigData]);
          
        if (error) throw error;
      }
      
      // Salvar no localStorage como backup
      localStorage.setItem('appConfig', JSON.stringify(appConfig));
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações de produto:', error);
      throw error;
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
              <h3 className="text-xl font-semibold text-white mb-4">Configurações de Produto</h3>
              
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white mt-2 mb-3">Mostrar na listagem:</h4>
                
                {/* Código de Barras */}
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">Código de Barras</h4>
                    <p className="text-slate-400 text-sm">Mostrar coluna de código de barras</p>
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
                
                {/* NCM */}
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">NCM</h4>
                    <p className="text-slate-400 text-sm">Mostrar coluna de NCM</p>
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
                
                {/* CFOP */}
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">CFOP</h4>
                    <p className="text-slate-400 text-sm">Mostrar coluna de CFOP</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={appConfig.product.showCfop}
                      onChange={() => handleConfigChange('product', 'showCfop')}
                    />
                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 
                      peer-focus:ring-blue-300 ${appConfig.product.showCfop ? 'bg-blue-500' : 'bg-gray-600'} 
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                      after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                      after:transition-all peer-checked:after:translate-x-full`}></div>
                  </label>
                </div>
                
                {/* CST */}
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">CST</h4>
                    <p className="text-slate-400 text-sm">Mostrar coluna de CST</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={appConfig.product.showCst}
                      onChange={() => handleConfigChange('product', 'showCst')}
                    />
                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 
                      peer-focus:ring-blue-300 ${appConfig.product.showCst ? 'bg-blue-500' : 'bg-gray-600'} 
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                      after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                      after:transition-all peer-checked:after:translate-x-full`}></div>
                  </label>
                </div>
                
                {/* PIS */}
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">PIS</h4>
                    <p className="text-slate-400 text-sm">Mostrar coluna de PIS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={appConfig.product.showPis}
                      onChange={() => handleConfigChange('product', 'showPis')}
                    />
                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 
                      peer-focus:ring-blue-300 ${appConfig.product.showPis ? 'bg-blue-500' : 'bg-gray-600'} 
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                      after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                      after:transition-all peer-checked:after:translate-x-full`}></div>
                  </label>
                </div>
                
                {/* COFINS */}
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-md">
                  <div>
                    <h4 className="text-white font-medium">COFINS</h4>
                    <p className="text-slate-400 text-sm">Mostrar coluna de COFINS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={appConfig.product.showCofins}
                      onChange={() => handleConfigChange('product', 'showCofins')}
                    />
                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 
                      peer-focus:ring-blue-300 ${appConfig.product.showCofins ? 'bg-blue-500' : 'bg-gray-600'} 
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
