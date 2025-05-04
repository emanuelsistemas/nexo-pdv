import { useState, useEffect, useCallback } from 'react';
import { Conversation, ConversationStatus, ChatMessage } from '../types/chat';
import { loadStatusFromLocalStorage, saveStatusToLocalStorage } from '../services/storage';
import { supabase } from '../lib/supabase';

const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ConversationStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obter conversa atual
  const getCurrentConversation = useCallback(() => {
    if (!selectedConversationId) return null;
    return conversations.find(c => c.id === selectedConversationId) || null;
  }, [selectedConversationId, conversations]);

  // Adicionar nova conversa
  const addConversation = useCallback((conversation: Conversation) => {
    setConversations(prev => {
      // Verificar se a conversa já existe
      const exists = prev.some(c => c.id === conversation.id);
      if (exists) {
        // Atualizar conversa existente
        return prev.map(c => c.id === conversation.id ? { ...c, ...conversation } : c);
      } else {
        // Adicionar nova conversa
        return [...prev, conversation];
      }
    });
  }, []);

  // Atualizar status de uma conversa
  const updateConversationStatus = useCallback((conversationId: string, newStatus: ConversationStatus) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, status: newStatus } 
          : conv
      )
    );
    
    // Salvar status no localStorage
    saveStatusToLocalStorage(conversationId, newStatus);
    
    // Salvar no banco de dados
    saveToDatabaseAsync(conversationId, newStatus);
  }, []);

  // Função para salvar assincronamente no banco de dados
  const saveToDatabaseAsync = async (conversationId: string, status: ConversationStatus) => {
    try {
      // Obter a sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Sessão não encontrada');
        return;
      }

      // Obter dados do usuário
      const { data: userData } = await supabase
        .from('profiles_admin')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (!userData) {
        console.error('Dados do usuário não encontrados');
        return;
      }

      // Verificar se já existe um registro para essa conversa
      const { data: existingData } = await supabase
        .from('nexochat_status')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      const currentDate = new Date().toISOString();

      // Dados para inserção/atualização
      const statusData = {
        conversation_id: conversationId,
        status,
        reseller_id: userData.reseller_id,
        profile_admin_id: userData.id,
        profile_admin_user_id: session.user.id,
        updated_at: currentDate
      };

      if (existingData) {
        // Atualizar o registro existente
        await supabase
          .from('nexochat_status')
          .update(statusData)
          .eq('conversation_id', conversationId);
      } else {
        // Inserir novo registro
        await supabase
          .from('nexochat_status')
          .insert([statusData]);
      }
    } catch (error) {
      console.error('Erro ao salvar status no banco de dados:', error);
    }
  };

  // Adicionar mensagem a uma conversa
  const addMessageToConversation = useCallback((
    conversationId: string, 
    message: ChatMessage
  ) => {
    setConversations(prev => 
      prev.map(conv => {
        if (conv.id === conversationId) {
          // Verificar se a mensagem já existe
          const messageExists = conv.messages.some(m => m.id === message.id);
          
          if (messageExists) {
            return conv;
          }
          
          return {
            ...conv,
            messages: [...conv.messages, message],
            lastMessage: message.content,
            timestamp: message.timestamp,
            // Incrementar contador não lidas apenas se for do contato e não for a conversa selecionada
            unreadCount: 
              message.sender === 'contact' && conversationId !== selectedConversationId
                ? conv.unreadCount + 1
                : conv.unreadCount
          };
        }
        return conv;
      })
    );
  }, [selectedConversationId]);

  // Enviar mensagem
  const sendMessage = useCallback((content: string) => {
    if (!selectedConversationId || !content.trim()) return;
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date()
    };
    
    addMessageToConversation(selectedConversationId, newMessage);
  }, [selectedConversationId, addMessageToConversation]);

  // Limpar contadores de mensagens não lidas
  const clearUnreadCount = useCallback((conversationId: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  }, []);

  // Filtrar conversas baseado na aba ativa
  const filterConversationsByStatus = useCallback(() => {
    return conversations.filter(conv => 
      activeTab === 'all' || conv.status === activeTab
    );
  }, [conversations, activeTab]);

  // Buscar conversas pelo nome ou última mensagem
  const searchConversations = useCallback((query: string) => {
    if (!query.trim()) return filterConversationsByStatus();
    
    const lowerQuery = query.toLowerCase().trim();
    
    return filterConversationsByStatus().filter(conv => 
      conv.contactName.toLowerCase().includes(lowerQuery) ||
      conv.lastMessage.toLowerCase().includes(lowerQuery)
    );
  }, [filterConversationsByStatus]);

  // Processar mensagens da API
  const processApiMessages = useCallback((apiMessages: any[]) => {
    if (!Array.isArray(apiMessages) || apiMessages.length === 0) return;
    
    const updatedConversations = [...conversations];
    const processedIds = new Set<string>();
    
    apiMessages.forEach(msg => {
      if (!msg.key || !msg.key.remoteJid) return;
      
      const chatId = msg.key.remoteJid;
      const isFromMe = msg.key.fromMe;
      const contactName = msg.pushName || chatId.split('@')[0];
      const messageContent = msg.message?.conversation || 
                             msg.message?.extendedTextMessage?.text || 
                             'Mídia';
      const timestamp = new Date(msg.messageTimestamp * 1000);
      
      let conversation = updatedConversations.find(c => c.id === chatId);
      
      if (!conversation) {
        // Carregar status salvo se existir
        const savedStatus = loadStatusFromLocalStorage(chatId);
        
        // Criar nova conversa
        conversation = {
          id: chatId,
          contactName,
          lastMessage: messageContent,
          timestamp,
          status: savedStatus.status || 'pending',
          messages: [],
          sector: null,
          unreadCount: 0,
          avatarUrl: undefined
        };
        
        updatedConversations.push(conversation);
      }
      
      // Adicionar mensagem se não existir
      const messageExists = conversation.messages.some(m => m.id === msg.key.id);
      
      if (!messageExists) {
        const newMessage: ChatMessage = {
          id: msg.key.id,
          content: messageContent,
          sender: isFromMe ? 'user' : 'contact',
          timestamp
        };
        
        conversation.messages.push(newMessage);
        conversation.lastMessage = messageContent;
        conversation.timestamp = timestamp;
        
        // Incrementar não lidas se for mensagem do contato
        if (!isFromMe && chatId !== selectedConversationId) {
          conversation.unreadCount += 1;
          processedIds.add(chatId);
        }
      }
    });
    
    // Ordenar conversas por timestamp (mais recente primeiro)
    updatedConversations.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });
    
    setConversations(updatedConversations);
    
    // Tocar som para novas mensagens
    if (processedIds.size > 0) {
      playNotificationSound();
    }
  }, [conversations, selectedConversationId]);

  // Tocar som de notificação
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => console.error('Erro ao tocar som:', err));
    } catch (error) {
      console.error('Erro ao criar áudio:', error);
    }
  }, []);

  return {
    conversations,
    setConversations,
    selectedConversationId,
    setSelectedConversationId,
    activeTab,
    setActiveTab,
    loading,
    error,
    getCurrentConversation,
    addConversation,
    updateConversationStatus,
    addMessageToConversation,
    sendMessage,
    clearUnreadCount,
    filterConversationsByStatus,
    searchConversations,
    processApiMessages
  };
};

export default useConversations;
