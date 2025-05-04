import { supabase } from '../lib/supabase';
import { ConversationStatus, Conversation, ChatMessage } from '../types/chat';

// Função para salvar o status da conversa no banco de dados
export const saveStatusToDatabase = async (
  conversationId: string,
  status: ConversationStatus,
  unreadCount?: number,
  scrollPosition?: number
): Promise<boolean> => {
  try {
    // Verificar se já existe um registro para essa conversa
    const { data: existingData } = await supabase
      .from('nexochat_status')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    // Pegar dados de sessão atual
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('Sessão não encontrada');
      return false;
    }

    const userData = await supabase
      .from('profiles_admin')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (!userData.data) {
      console.error('Dados do usuário não encontrados');
      return false;
    }

    const currentDate = new Date().toISOString();

    // Dados para inserção/atualização
    const statusData = {
      conversation_id: conversationId,
      status,
      reseller_id: userData.data.reseller_id,
      profile_admin_id: userData.data.id,
      profile_admin_user_id: session.user.id,
      updated_at: currentDate
    };

    // Se existir unreadCount, adicionar ao objeto
    if (unreadCount !== undefined) {
      Object.assign(statusData, { unread_count: unreadCount });
    }

    // Se existir scrollPosition, adicionar ao objeto
    if (scrollPosition !== undefined) {
      Object.assign(statusData, { scroll_position: scrollPosition });
    }

    let result;
    
    if (existingData) {
      // Atualizar o registro existente
      result = await supabase
        .from('nexochat_status')
        .update(statusData)
        .eq('conversation_id', conversationId);
    } else {
      // Inserir novo registro
      result = await supabase
        .from('nexochat_status')
        .insert([statusData]);
    }

    if (result.error) {
      console.error('Erro ao salvar status:', result.error);
      return false;
    }

    console.log(`Status da conversa ${conversationId} salvo no banco: ${status}`);
    return true;
  } catch (error) {
    console.error('Erro ao salvar status no banco:', error);
    return false;
  }
};

// Função para carregar os status das conversas do banco de dados
export const loadConversationStatuses = async (): Promise<{
  [key: string]: {
    status: ConversationStatus;
    unreadCount?: number;
    scrollPosition?: number;
  };
}> => {
  try {
    // Pegar a sessão atual
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('Sessão não encontrada');
      return {};
    }

    // Buscar todos os status de conversas do usuário logado
    const { data, error } = await supabase
      .from('nexochat_status')
      .select('*')
      .eq('profile_admin_user_id', session.user.id);

    if (error) {
      console.error('Erro ao carregar status das conversas:', error);
      return {};
    }

    // Mapear os resultados para o formato desejado
    const statusMap: {
      [key: string]: {
        status: ConversationStatus;
        unreadCount?: number;
        scrollPosition?: number;
      };
    } = {};

    data.forEach(item => {
      statusMap[item.conversation_id] = {
        status: item.status as ConversationStatus,
        unreadCount: item.unread_count,
        scrollPosition: item.scroll_position
      };
    });

    return statusMap;
  } catch (error) {
    console.error('Erro ao carregar status das conversas:', error);
    return {};
  }
};

// Função para buscar configurações da Evolution API
export const fetchEvolutionApiConfig = async (): Promise<{
  baseUrl: string;
  apikey: string;
  instanceName: string;
} | null> => {
  try {
    // Obter a sessão atual
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('Sessão não encontrada');
      return null;
    }

    // Buscar o perfil do usuário
    const { data: userData } = await supabase
      .from('profiles_admin')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (!userData) {
      console.error('Perfil do usuário não encontrado');
      return null;
    }

    // Buscar configuração da Evolution API associada à revenda do usuário
    const { data, error } = await supabase
      .from('nexochat_config')
      .select('*')
      .eq('reseller_id', userData.reseller_id)
      .single();

    if (error) {
      console.error('Erro ao buscar configuração da Evolution API:', error);
      return null;
    }

    if (!data) {
      console.error('Configuração da Evolution API não encontrada');
      return null;
    }

    return {
      baseUrl: data.evolution_api_url,
      apikey: data.evolution_api_key,
      instanceName: data.evolution_api_instance
    };
  } catch (error) {
    console.error('Erro ao buscar configuração da Evolution API:', error);
    return null;
  }
};
