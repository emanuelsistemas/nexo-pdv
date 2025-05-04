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

export type ConversationStatus = 'pending' | 'pendente' | 'attending' | 'finished' | 'waiting' | 'contacts' | 'deletado';

// Tipo para uma conversa
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

export interface EvolutionApiConfig {
  baseUrl: string;
  apikey: string;
  instanceName: string;
}
