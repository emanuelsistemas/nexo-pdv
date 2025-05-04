import React, { useState, useEffect, useCallback } from 'react';
import { useChat } from '../../contexts/ChatContext';
import ConversationList from './ConversationList';
import ChatContainer from './ChatContainer';
import StatusTabs from './StatusTabs';
import SearchBar from './SearchBar';
import SectorFilter from './SectorFilter';
import WhatsAppStatus from './WhatsAppStatus';
import { ConversationStatus, StatusTab } from '../../types/chat';
import useSocketIO from '../../hooks/useSocketIO';
import useEvolutionApi from '../../hooks/useEvolutionApi';
import useWhatsAppInstance from '../../hooks/useWhatsAppInstance';
import { loadStatusFromLocalStorage, saveStatusToLocalStorage } from '../../services/storage';

const Chat: React.FC = () => {
  // Contexto global do chat
  const {
    conversations,
    setConversations,
    selectedConversationId,
    setSelectedConversationId,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedSector,
    setSelectedSector,
    enabledSectors,
    getCurrentConversation,
    sendMessage: contextSendMessage,
    updateConversationStatus,
    filterConversations
  } = useChat();

  // Estado local
  const [scrollPosition, setScrollPosition] = useState<number | undefined>(undefined);
  const [statusTabs, setStatusTabs] = useState<StatusTab[]>([
    { id: 'waiting', label: 'Aguardando', count: 0 },
    { id: 'attending', label: 'Em Atendimento', count: 0 },
    { id: 'finished', label: 'Finalizadas', count: 0 },
    { id: 'pending', label: 'Pendentes', count: 0 },
    { id: 'all', label: 'Contatos', count: 0 }
  ]);

  // Hooks personalizados para integração com WhatsApp e Socket.io
  const { apiConfig, connection, refreshConnection, loading: whatsAppLoading, error: whatsAppError } = useWhatsAppInstance();
  
  // Usar apiConfig do hook useWhatsAppInstance se estiver disponível
  const {
    fetchMessages,
    sendMessage: apiSendMessage
  } = useEvolutionApi(apiConfig);

  const {
    isConnected: socketConnected,
    connectionError: socketError
  } = useSocketIO({
    config: apiConfig,
    onNewMessage: (data) => {
      handleNewMessage(data);
    },
    onConnectionStatusChange: (isConnected) => {
      console.log('Socket connection status changed:', isConnected);
    },
    enabled: true
  });

  // Calcular contagens para as abas de status
  useEffect(() => {
    const newStatusTabs = statusTabs.map(tab => {
      if (tab.id === 'all') {
        return { ...tab, count: conversations.length };
      } else {
        const count = conversations.filter(c => c.status === tab.id).length;
        return { ...tab, count };
      }
    });

    setStatusTabs(newStatusTabs);
  }, [conversations]);

  // Carregar mensagens iniciais
  useEffect(() => {
    const loadInitialMessages = async () => {
      if (apiConfig) {
        try {
          const result = await fetchMessages();
          if (result.messages.length > 0) {
            processMessages(result.messages);
          }
        } catch (error) {
          console.error('Erro ao carregar mensagens iniciais:', error);
        }
      }
    };

    loadInitialMessages();
  }, [apiConfig, fetchMessages]);

  // Processar mensagens vindas da API
  const processMessages = useCallback((apiMessages: any[]) => {
    const newConversations = [...conversations];
    const processedConversations = new Set<string>();

    apiMessages.forEach(msg => {
      // Identificar a conversa
      const isFromMe = msg.key.fromMe;
      const chatId = msg.key.remoteJid;
      
      if (!chatId) return;
      
      // Formatar nome do contato
      const contactName = msg.pushName || chatId.split('@')[0];
      
      // Verificar se a conversa já existe
      let conversation = newConversations.find(c => c.id === chatId);
      
      if (!conversation) {
        // Criar nova conversa
        conversation = {
          id: chatId,
          contactName,
          lastMessage: msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'Mídia',
          timestamp: new Date(msg.messageTimestamp * 1000),
          status: 'pending',
          messages: [],
          sector: null,
          unreadCount: 0
        };
        
        // Verificar se existe status salvo
        const savedStatus = loadStatusFromLocalStorage(chatId);
        if (savedStatus.status) {
          conversation.status = savedStatus.status;
        }
        
        newConversations.push(conversation);
      }
      
      // Adicionar mensagem à conversa se ainda não existir
      const messageExists = conversation.messages.some(m => m.id === msg.key.id);
      
      if (!messageExists) {
        const newMessage = {
          id: msg.key.id,
          content: msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'Mídia',
          sender: isFromMe ? 'user' : 'contact',
          timestamp: new Date(msg.messageTimestamp * 1000)
        };
        
        conversation.messages.push(newMessage);
        
        // Atualizar última mensagem e timestamp da conversa
        conversation.lastMessage = newMessage.content;
        conversation.timestamp = newMessage.timestamp;
        
        // Incrementar contador de não lidas se for mensagem do contato
        if (!isFromMe && !processedConversations.has(chatId)) {
          conversation.unreadCount += 1;
        }
      }
      
      processedConversations.add(chatId);
    });

    // Ordenar conversas por timestamp
    newConversations.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });

    setConversations(newConversations);
  }, [conversations, setConversations]);

  // Função para salvar a posição de rolagem
  const handleScrollPositionChange = useCallback((position: number) => {
    setScrollPosition(position);
    
    if (selectedConversationId) {
      saveStatusToLocalStorage(
        selectedConversationId, 
        getCurrentConversation()?.status || 'pending',
        undefined,
        position
      );
      
      // Aqui também poderia salvar no banco de dados...
    }
  }, [selectedConversationId, getCurrentConversation]);

  // Quando seleciona uma conversa
  const handleSelectConversation = useCallback((conversationId: string) => {
    // Resetar posição de rolagem
    setScrollPosition(undefined);
    
    // Carregar posição salva para esta conversa
    const savedData = loadStatusFromLocalStorage(conversationId);
    if (savedData.scrollPosition !== undefined) {
      setScrollPosition(savedData.scrollPosition);
    }
    
    // Limpar contador de não lidas
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unreadCount: 0 } 
          : conv
      )
    );
    
    // Atualizar conversa selecionada
    setSelectedConversationId(conversationId);
  }, [setSelectedConversationId, setConversations]);

  // Função para enviar mensagem
  const handleSendMessage = useCallback(async (content: string) => {
    const currentConversation = getCurrentConversation();
    if (!currentConversation) return;
    
    // Adicionar mensagem localmente via contexto
    contextSendMessage(content);
    
    // Enviar mensagem via API Evolution
    try {
      const phoneNumber = currentConversation.id.split('@')[0];
      await apiSendMessage(phoneNumber, content);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Aqui poderia implementar lógica de retry ou notificar o usuário
    }
  }, [getCurrentConversation, contextSendMessage, apiSendMessage]);

  // Função para tratar novas mensagens recebidas via Socket.io
  const handleNewMessage = useCallback((data: any) => {
    if (data && data.messages) {
      processMessages(data.messages);
      
      // Tocar som de notificação
      const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3');
      audio.play().catch(e => console.error('Erro ao tocar som:', e));
    }
  }, [processMessages]);

  // Função para alternar o status de uma conversa
  const handleChangeStatus = useCallback((conversationId: string, newStatus: ConversationStatus) => {
    updateConversationStatus(conversationId, newStatus);
    
    // Aqui poderia salvar o status no banco de dados
    // Isso já deve estar implementado em updateConversationStatus no contexto
  }, [updateConversationStatus]);

  return (
    <div className="flex h-full">
      {/* Painel lateral - Lista de conversas */}
      <div className="w-96 h-full border-r border-gray-800 flex flex-col">
        <StatusTabs
          tabs={statusTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        {/* Status da Instância WhatsApp da Revenda */}
        <div className="px-4 pt-2">
          <WhatsAppStatus 
            connection={connection}
            loading={whatsAppLoading}
            error={whatsAppError}
            onRefresh={refreshConnection}
          />
        </div>
        
        {/* Filtro de Setor - Mostrado apenas quando não estiver na aba Contatos */}
        {activeTab !== 'all' && (
          <SectorFilter
            selectedSector={selectedSector}
            onSectorChange={setSelectedSector}
            enabledSectors={enabledSectors}
          />
        )}
        
        <div className="p-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar conversas..."
          />
        </div>
        
        <div className="flex-1 overflow-hidden">
          <ConversationList
            conversations={filterConversations()}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            statusFilter={activeTab}
          />
        </div>
        
        {/* Status do Socket.io */}
        <div className="flex justify-end p-2 bg-[#1E1E1E] border-t border-gray-800">
          <div className="flex items-center text-xs text-gray-400">
            <span className="mr-1">Status:</span>
            <span className={socketConnected ? "text-green-400" : "text-red-400"}>
              {socketConnected ? "Conectado" : "Desconectado"}
            </span>
            <div 
              className={`ml-2 h-2 w-2 rounded-full ${socketConnected ? "bg-green-500" : "bg-red-500"}`}
              title={socketConnected ? "Socket.io conectado" : "Socket.io desconectado"}
            />
          </div>
        </div>
      </div>
      
      {/* Área principal - Conversa */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <ChatContainer
            conversation={getCurrentConversation()}
            onSendMessage={handleSendMessage}
            onChangeStatus={handleChangeStatus}
            scrollPosition={scrollPosition}
            onScrollPositionChange={handleScrollPositionChange}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Selecione uma conversa para começar
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
