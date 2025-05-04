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
  connection: WhatsAppConnection | null;
  apiConfig: EvolutionApiConfig | null;
  loading: boolean;
  error: string | null;
  refreshConnection: () => Promise<void>;
}

/**
 * Hook para gerenciar a instância do WhatsApp da revenda logada
 */
export const useWhatsAppInstance = (): WhatsAppInstanceHook => {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [apiConfig, setApiConfig] = useState<EvolutionApiConfig | null>(loadEvolutionApiConfig());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Função para carregar a conexão WhatsApp da revenda logada
  const loadConnection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

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

      // Buscar conexão WhatsApp ativa para esta revenda
      const { data: connections, error: connectionsError } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('reseller_id', resellerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (connectionsError) {
        throw new Error(`Erro ao buscar conexões WhatsApp: ${connectionsError.message}`);
      }
      
      if (!connections || connections.length === 0) {
        console.log('Nenhuma conexão WhatsApp ativa encontrada para esta revenda');
        setConnection(null);
        // Manter a configuração existente, se houver
        return;
      }
      
      // Mapear a conexão para o formato esperado
      const activeConnection: WhatsAppConnection = {
        id: String(connections[0].id),
        name: String(connections[0].name || ''),
        phone: String(connections[0].phone || ''),
        status: connections[0].status as WhatsAppConnection['status'],
        created_at: String(connections[0].created_at),
        instance_name: String(connections[0].instance_name || ''),
        reseller_id: String(connections[0].reseller_id || '')
      };
      
      setConnection(activeConnection);
      
      // Atualizar apiConfig com os dados da instância
      const newConfig: EvolutionApiConfig = {
        baseUrl: 'https://apiwhatsapp.nexopdv.com',
        apikey: '429683C4C977415CAAFCCE10F7D57E11',
        instanceName: activeConnection.instance_name
      };
      
      setApiConfig(newConfig);
      saveEvolutionApiConfig(newConfig);
      
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
    apiConfig,
    loading,
    error,
    refreshConnection: loadConnection
  };
};

export default useWhatsAppInstance;
