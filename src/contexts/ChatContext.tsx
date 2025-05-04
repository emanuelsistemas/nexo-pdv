import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Conversation, ConversationStatus, ChatMessage } from '../types/chat';
import { loadStatusFromLocalStorage, saveStatusToLocalStorage } from '../services/storage';

interface ChatContextProps {
  // Estado
  conversations: Conversation[];
  selectedConversationId: string | null;
  activeTab: ConversationStatus | 'all';
  searchQuery: string;
  loading: boolean;
  socketConnected: boolean;
  
  // Ações
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setSelectedConversationId: (id: string | null) => void;
  setActiveTab: (tab: ConversationStatus | 'all') => void;
  setSearchQuery: (query: string) => void;
  
  // Funções utilitárias
  getCurrentConversation: () => Conversation | null;
  sendMessage: (content: string) => void;
  updateConversationStatus: (conversationId: string, newStatus: ConversationStatus) => void;
  filterConversations: () => Conversation[];
}

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ConversationStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Função para obter a conversa atual selecionada
  const getCurrentConversation = (): Conversation | null => {
    if (!selectedConversationId) return null;
    return conversations.find(c => c.id === selectedConversationId) || null;
  };
  
  // Enviar mensagem (implementação inicial básica)
  const sendMessage = (content: string) => {
    if (!selectedConversationId || !content.trim()) return;
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date()
    };
    
    // Atualizar a conversa com a nova mensagem
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === selectedConversationId 
          ? { 
              ...conv, 
              messages: [...conv.messages, newMessage],
              lastMessage: content.trim(),
              timestamp: new Date()
            } 
          : conv
      )
    );
    
    // Aqui irá a lógica para enviar a mensagem via API ou Socket
    // será implementada nos services
  };
  
  // Atualizar status de uma conversa
  const updateConversationStatus = (conversationId: string, newStatus: ConversationStatus) => {
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === conversationId 
          ? { ...conv, status: newStatus } 
          : conv
      )
    );
    
    // Salvar status no localStorage e eventualmente no banco de dados
    saveStatusToLocalStorage(conversationId, newStatus);
    
    // Implementação parcial - a conexão com DB será adicionada depois
  };
  
  // Filtrar conversas com base na aba e na pesquisa
  const filterConversations = (): Conversation[] => {
    return conversations.filter(conv => {
      // Filtrar por status
      const statusMatch = activeTab === 'all' || conv.status === activeTab;
      
      // Filtrar por pesquisa
      const searchMatch = !searchQuery || 
        conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      
      return statusMatch && searchMatch;
    });
  };
  
  useEffect(() => {
    // Aqui irá a lógica para carregar as conversas iniciais
    // e configurar os listeners de Socket.io
    
    // Por enquanto, apenas simular o fim do carregamento
    setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    // Função de cleanup
    return () => {
      // Limpeza de listeners e conexões
    };
  }, []);
  
  const contextValue: ChatContextProps = {
    conversations,
    selectedConversationId,
    activeTab,
    searchQuery,
    loading,
    socketConnected,
    setConversations,
    setSelectedConversationId,
    setActiveTab,
    setSearchQuery,
    getCurrentConversation,
    sendMessage,
    updateConversationStatus,
    filterConversations,
  };
  
  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

// Hook personalizado para usar o contexto
export const useChat = () => {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChat deve ser usado dentro de um ChatProvider');
  }
  
  return context;
};
