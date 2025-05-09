import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { Conversation, ConversationStatus, ChatMessage, EnabledSectors } from '../types/chat';
import { loadStatusFromLocalStorage, saveStatusToLocalStorage } from '../services/storage';

interface ChatContextProps {
  // Estado
  conversations: Conversation[];
  selectedConversationId: string | null;
  activeTab: ConversationStatus | 'all';
  searchQuery: string;
  selectedSector: string;
  enabledSectors: EnabledSectors;
  loading: boolean;
  socketConnected: boolean;
  
  // Ações
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setSelectedConversationId: (id: string | null) => void;
  setActiveTab: (tab: ConversationStatus | 'all') => void;
  setSearchQuery: (query: string) => void;
  setSelectedSector: (sector: string) => void;
  setEnabledSectors: (sectors: EnabledSectors) => void;
  
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
  const [activeTab, setActiveTab] = useState<ConversationStatus | 'all'>('Aguardando');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [enabledSectors, setEnabledSectors] = useState<EnabledSectors>({
    suporte: true,
    comercial: true,
    administrativo: true
  });
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Função para obter a conversa atual selecionada
  const getCurrentConversation = useCallback(() => {
    if (!selectedConversationId) return null;
    return conversations.find(c => c.id === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);
  
  // Enviar mensagem (implementação inicial básica)
  const sendMessage = useCallback((content: string) => {
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
  }, [selectedConversationId]);
  
  // Atualizar status de uma conversa
  const updateConversationStatus = useCallback((conversationId: string, newStatus: ConversationStatus) => {
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
  }, []);
  
  // Filtrar conversas com base na aba e na pesquisa
  const filterConversations = useCallback(() => {
    // Caso especial para a aba "Status", que não precisa exibir conversas
    if (activeTab === 'Status') {
      return [];
    }
    
    let filteredConvs = [...conversations];
    
    // Filtrar por status (aba ativa)
    if (activeTab !== 'Contatos' && activeTab !== 'all') {
      // Mapper para compatibilidade com dados antigos no banco/localStorage
      const statusMap: Record<string, string> = {
        'Aguardando': 'waiting',
        'Em Atendimento': 'attending',
        'Pendentes': 'pending',
        'Finalizados': 'finished'
      };

      // Usar o mapeador ou o valor direto se não houver mapeamento
      const statusToFilter = statusMap[activeTab] || activeTab;
      filteredConvs = filteredConvs.filter(conv => {
        // Verificar tanto o novo valor quanto o valor legado para compatibilidade
        return conv.status === activeTab || conv.status === statusToFilter;
      });
    }
    
    // Filtrar por setor
    if (selectedSector !== 'all') {
      filteredConvs = filteredConvs.filter(conv => conv.sector === selectedSector);
    }
    
    // Filtrar por pesquisa - CORRIGIDO: usar filter em vez de find para exibir todas as correspondências
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredConvs = filteredConvs.filter(conv => 
        conv.contactName.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query)
      );
    }
    
    return filteredConvs;
  }, [conversations, activeTab, selectedSector, searchQuery]);
  

  
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
    selectedSector,
    enabledSectors,
    loading,
    socketConnected,
    setConversations,
    setSelectedConversationId,
    setActiveTab,
    setSearchQuery,
    setSelectedSector,
    setEnabledSectors,
    getCurrentConversation,
    sendMessage,
    updateConversationStatus,
    filterConversations
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
