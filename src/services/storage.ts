import { ConversationStatus } from '../types/chat';

const CHAT_STATUS_PREFIX = 'nexochat_status_';
const CHAT_SCROLL_PREFIX = 'nexochat_scroll_';
const CHAT_UNREAD_PREFIX = 'nexochat_unread_';
const EVOLUTION_API_CONFIG = 'evolution_api_config';

// Salvar status da conversa no localStorage
export const saveStatusToLocalStorage = (
  conversationId: string, 
  status: ConversationStatus, 
  unreadCount?: number,
  scrollPosition?: number
): void => {
  try {
    // Salvar status
    localStorage.setItem(`${CHAT_STATUS_PREFIX}${conversationId}`, status);
    
    // Salvar contador não lidas se fornecido
    if (unreadCount !== undefined) {
      localStorage.setItem(`${CHAT_UNREAD_PREFIX}${conversationId}`, unreadCount.toString());
    }
    
    // Salvar posição de rolagem se fornecida
    if (scrollPosition !== undefined) {
      localStorage.setItem(`${CHAT_SCROLL_PREFIX}${conversationId}`, scrollPosition.toString());
    }
    
    console.log(`Status da conversa ${conversationId} salvo no localStorage: ${status}`);
  } catch (error) {
    console.error('Erro ao salvar status no localStorage:', error);
  }
};

// Carregar status da conversa do localStorage
export const loadStatusFromLocalStorage = (conversationId: string): {
  status?: ConversationStatus;
  unreadCount?: number;
  scrollPosition?: number;
} => {
  try {
    // Carregar status
    const status = localStorage.getItem(`${CHAT_STATUS_PREFIX}${conversationId}`) as ConversationStatus | null;
    
    // Carregar contador não lidas
    const unreadCountStr = localStorage.getItem(`${CHAT_UNREAD_PREFIX}${conversationId}`);
    const unreadCount = unreadCountStr ? parseInt(unreadCountStr, 10) : undefined;
    
    // Carregar posição de rolagem
    const scrollPositionStr = localStorage.getItem(`${CHAT_SCROLL_PREFIX}${conversationId}`);
    const scrollPosition = scrollPositionStr ? parseInt(scrollPositionStr, 10) : undefined;
    
    return {
      status: status || undefined,
      unreadCount,
      scrollPosition
    };
  } catch (error) {
    console.error('Erro ao carregar status do localStorage:', error);
    return {};
  }
};

// Salvar configuração da Evolution API
export const saveEvolutionApiConfig = (
  config: { baseUrl: string; apikey: string; instanceName: string; socketUrl?: string }
): void => {
  try {
    localStorage.setItem(EVOLUTION_API_CONFIG, JSON.stringify(config));
    console.log('Configuração da Evolution API salva no localStorage');
  } catch (error) {
    console.error('Erro ao salvar configuração da Evolution API:', error);
  }
};

// Carregar configuração da Evolution API
export const loadEvolutionApiConfig = () => {
  try {
    const configStr = localStorage.getItem(EVOLUTION_API_CONFIG);
    if (!configStr) return null;
    
    return JSON.parse(configStr);
  } catch (error) {
    console.error('Erro ao carregar configuração da Evolution API:', error);
    return null;
  }
};
