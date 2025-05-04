import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { EvolutionApiConfig } from '../types/chat';
import { loadEvolutionApiConfig, saveEvolutionApiConfig } from '../services/storage';

export interface WhatsAppConnection {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive' | 'connecting' | 'disconnected';
  created_at: string;
  instance_name: string;
  reseller_id?: string;
}

export interface WhatsAppInstanceHook {
  connection: WhatsAppConnection | null; // Instância principal (primeira ativa)
  connections: WhatsAppConnection[]; // Todas as instâncias ativas
  apiConfig: EvolutionApiConfig | null; // Configuração para instância principal
  apiConfigs: EvolutionApiConfig[]; // Configurações para todas as instâncias ativas
  loading: boolean;
  error: string | null;
  refreshConnection: () => Promise<void>;
}

/**
 * Hook para gerenciar a instância do WhatsApp da revenda logada
 */
export const useWhatsAppInstance = (): WhatsAppInstanceHook => {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [apiConfig, setApiConfig] = useState<EvolutionApiConfig | null>(loadEvolutionApiConfig());
  const [apiConfigs, setApiConfigs] = useState<EvolutionApiConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Função para carregar a conexão WhatsApp da revenda logada
  const loadConnection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar primeiro se temos configuração no localStorage (como faz o ChatNexo)
      const savedConfig = localStorage.getItem('nexochat_config');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          console.log('Configuração encontrada no localStorage:', config);
          
          if (config.baseUrl && config.apikey && config.instanceName) {
            // Criar uma conexão simples com os dados do localStorage
            const connection: WhatsAppConnection = {
              id: '1',
              name: 'WhatsApp Instance',
              phone: '',
              status: 'active',
              created_at: new Date().toISOString(),
              instance_name: config.instanceName,
              reseller_id: ''
            };
            
            // Atualizar os estados
            setConnections([connection]);
            setConnection(connection);
            
            // Criar configuração usando exatamente os mesmos valores do ChatNexo
            const apiConfig: EvolutionApiConfig = {
              baseUrl: config.baseUrl,
              apikey: config.apikey,
              instanceName: config.instanceName
            };
            
            setApiConfigs([apiConfig]);
            setApiConfig(apiConfig);
            
            console.log('Usando configuração do localStorage:', apiConfig);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Erro ao processar configuração do localStorage:', e);
        }
      }

      // Se não tiver no localStorage, buscar do banco
      
      // Obter admin_id do usuário logado
      const adminSession = localStorage.getItem('admin_session');
      
      if (!adminSession) {
        throw new Error('Sessão do administrador não encontrada');
      }
      
      const session = JSON.parse(adminSession);
      console.log('Estrutura da sessão:', session);
      
      // Verificar o formato da sessão - pode ter diferentes formatos dependendo de como foi salvo
      const adminId = session.id || (session.user && session.user.id) || session.admin_id;
      
      if (!adminId) {
        console.error('Estrutura da sessão:', session);
        throw new Error('ID do administrador não encontrado na sessão');
      }

      // Buscar dados do admin para obter reseller_id
      const { data: adminData, error: adminError } = await supabase
        .from('profile_admin')
        .select('reseller_id')
        .eq('id', adminId)
        .single();
        
      if (adminError) {
        throw new Error(`Erro ao obter dados do administrador: ${adminError.message}`);
      }
      
      const resellerId = adminData?.reseller_id;
      
      if (!resellerId) {
        throw new Error('ID da revenda não encontrado para este administrador');
      }
      
      // Buscar configuração do nexochat_config, igual ao ChatNexo
      const { data: configData, error: configError } = await supabase
        .from('nexochat_config')
        .select('*')
        .eq('reseller_id', resellerId)
        .single();
        
      if (!configError && configData) {
        console.log('Configuração encontrada no banco:', configData);
        
        // Usar configurações do banco
        const baseUrl = typeof configData.evolution_api_url === 'string' ? configData.evolution_api_url : '';
        const apikey = typeof configData.evolution_api_key === 'string' ? configData.evolution_api_key : '';
        const instanceName = typeof configData.instance_name === 'string' ? configData.instance_name : '';
        
        if (baseUrl && apikey && instanceName) {
          // Salvar no localStorage para carregamento rápido futuro
          localStorage.setItem('nexochat_config', JSON.stringify({
            baseUrl,
            apikey,
            instanceName
          }));
          
          // Criar conexão 
          const connection: WhatsAppConnection = {
            id: '1',
            name: `WhatsApp ${instanceName}`,
            phone: instanceName,
            status: 'active',
            created_at: new Date().toISOString(),
            instance_name: instanceName,
            reseller_id: String(resellerId)
          };
          
          // Atualizar os estados
          setConnections([connection]);
          setConnection(connection);
          
          // Criar configuração usando exatamente os mesmos valores do ChatNexo
          const apiConfig: EvolutionApiConfig = {
            baseUrl: baseUrl,
            apikey: apikey,
            instanceName: instanceName
          };
          
          setApiConfigs([apiConfig]);
          setApiConfig(apiConfig);
          
          console.log('Usando configuração do banco:', apiConfig);
          setLoading(false);
          return;
        }
      }

      // Se chegou aqui, tente o método original de buscar conexões WhatsApp
      const { data: activeConnections, error: connectionsError } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('reseller_id', resellerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
        
      if (connectionsError) {
        throw new Error(`Erro ao buscar conexões WhatsApp: ${connectionsError.message}`);
      }
      
      if (!activeConnections || activeConnections.length === 0) {
        console.log('Nenhuma conexão WhatsApp ativa encontrada para esta revenda');
        setConnection(null);
        setConnections([]);
        setApiConfigs([]);
        // Manter a configuração existente, se houver
        return;
      }
      
      // Mapear todas as conexões ativas para o formato esperado
      const mappedConnections: WhatsAppConnection[] = activeConnections.map(conn => ({
        id: String(conn.id),
        name: String(conn.name || ''),
        phone: String(conn.phone || ''),
        status: conn.status as WhatsAppConnection['status'],
        created_at: String(conn.created_at),
        instance_name: String(conn.instance_name || ''),
        reseller_id: String(conn.reseller_id || '')
      }));
      
      // Definir a conexão principal (primeira da lista)
      const primaryConnection = mappedConnections[0];
      
      // Atualizar os estados
      setConnections(mappedConnections);
      setConnection(primaryConnection);
      
      // Criar configurações para todas as instâncias ativas
      const configs: EvolutionApiConfig[] = mappedConnections.map(conn => ({
        // URL base para API REST - usar a mesma URL que o ChatNexo usa
        baseUrl: 'https://apiwhatsapp.nexopdv.com',
        apikey: '429683C4C977415CAAFCCE10F7D57E11',
        instanceName: conn.instance_name
      }));
      
      // Definir as configurações
      setApiConfigs(configs);
      
      // Definir a configuração principal (primeira da lista)
      if (configs.length > 0) {
        setApiConfig(configs[0]);
        saveEvolutionApiConfig(configs[0]);
      }
      
    } catch (err: any) {
      console.error('Erro ao carregar instância do WhatsApp:', err);
      setError(err.message || 'Erro ao carregar instância do WhatsApp');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar conexão ao inicializar o hook
  useEffect(() => {
    loadConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    connection,
    connections,
    apiConfig,
    apiConfigs,
    loading,
    error,
    refreshConnection: loadConnection
  };
};

export default useWhatsAppInstance;
