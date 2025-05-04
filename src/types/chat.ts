export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'contact';
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'me' | 'them' | 'user' | 'contact';
  timestamp: Date;
  instanceName?: string; // Nome da instância que recebeu a mensagem
}

export type ConversationStatus = 'Aguardando' | 'Atendendo' | 'Pendentes' | 'Finalizados' | 'Contatos' | 'Status' | 'pendente' | 'deletado' | 'suporte' | 'comercial' | 'administrativo' | 'connection-status';

// Tipo para uma conversa
export interface EnabledSectors {
  suporte: boolean;
  comercial: boolean;
  administrativo: boolean;
}

export interface Conversation {
  id: string;
  name?: string; // Nome do contato (para novas conversas)
  phone?: string; // Número de telefone (para novas conversas)
  contactName: string;
  lastMessage?: string;
  last_message?: string; // Alternativa para compatibilidade
  timestamp?: Date | string;
  last_message_time?: Date | string; // Alternativa para compatibilidade
  status: ConversationStatus;
  messages: ChatMessage[];
  sector: string | null;
  unreadCount?: number;
  unread_count?: number; // Alternativa para compatibilidade
  avatarUrl?: string;
  instanceName?: string; // Nome da instância que recebeu esta conversa
}

export interface StatusTab {
  id: ConversationStatus | 'all';
  label: string;
  count: number;
  color?: string;
}

export interface ChatContextProps {
  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  activeTab: ConversationStatus | 'all';
  setActiveTab: (tab: ConversationStatus | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedSector: string;
  setSelectedSector: (sector: string) => void;
  enabledSectors: EnabledSectors;
  setEnabledSectors: (sectors: EnabledSectors) => void;
  getCurrentConversation: () => Conversation | null;
  sendMessage: (content: string) => void;
  updateConversationStatus: (conversationId: string, newStatus: ConversationStatus) => void;
  filterConversations: () => Conversation[];
}

export interface EvolutionApiConfig {
  baseUrl: string;
  socketUrl?: string; // URL específica para conexão Socket.io
  apikey: string;
  instanceName: string;
}

// Interface para instâncias WhatsApp adicionais (usada pelo hook useSocketIO)
export interface WhatsAppConnection {
  instance_name: string;
  id_reseller?: string;
  token?: string;
  status?: string;
}
