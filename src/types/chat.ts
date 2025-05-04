export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'contact';
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'contact';
  timestamp: Date;
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
  contactName: string;
  lastMessage: string;
  timestamp: Date | string;
  status: ConversationStatus;
  messages: ChatMessage[];
  sector: string | null;
  unreadCount: number;
  avatarUrl?: string;
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
  apikey: string;
  instanceName: string;
}
