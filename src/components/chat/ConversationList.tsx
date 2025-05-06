import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { Conversation, ConversationStatus } from '../../types/chat';

import axios from 'axios';
import { useWhatsAppInstance } from '../../hooks/useWhatsAppInstance';
import { formatPhoneNumber } from '../../services/avatarService';

// Componente específico para o avatar
interface AvatarProps {
  imageUrl?: string | null;
  name: string;
  phone?: string;
  size?: number;
}

// Componente Avatar otimizado para minimizar renderizações e uso de memória
const Avatar = React.memo(({ imageUrl, name, phone, size = 40 }: AvatarProps) => {
  // Referência para controlar se o componente está montado para evitar atualizações de estado em componente desmontado
  const isMounted = useRef(true);
  // Memoizar o apiConfig para evitar recriações desnecessárias
  const { apiConfig } = useWhatsAppInstance();
  
  // Usar useReducer em vez de múltiplos useState para gerenciar estado de forma mais eficiente
  const [state, dispatch] = useReducer(
    (prevState: { imageUrl: string | null; imageError: boolean }, action: { type: string; payload?: any }) => {
      switch (action.type) {
        case 'SET_IMAGE_URL':
          return { ...prevState, imageUrl: action.payload };
        case 'SET_IMAGE_ERROR':
          return { ...prevState, imageError: true };
        default:
          return prevState;
      }
    },
    { imageUrl: imageUrl || null, imageError: false }
  );
  
  // Função para salvar avatar no localStorage com verificação de duplicidade
  const saveAvatarToLocalStorage = useCallback((phoneNumber: string, url: string) => {
    try {
      const avatarCache = JSON.parse(localStorage.getItem('whatsapp_avatar_cache') || '{}');
      
      // Evitar operações desnecessárias
      if (avatarCache[phoneNumber]?.url === url) return;
      
      avatarCache[phoneNumber] = {
        url,
        timestamp: new Date().getTime()
      };
      
      localStorage.setItem('whatsapp_avatar_cache', JSON.stringify(avatarCache));
    } catch (error) {
      // Manter apenas logs críticos
      console.error(`[Avatar] Erro ao salvar no localStorage`);
    }
  }, []);
  
  // Função para buscar avatar do localStorage sem causar renderizações
  const getAvatarFromLocalStorage = useCallback((phoneNumber: string): string | null => {
    try {
      const avatarCache = JSON.parse(localStorage.getItem('whatsapp_avatar_cache') || '{}');
      const cacheEntry = avatarCache[phoneNumber];
      
      if (cacheEntry?.url) {
        const cacheAge = new Date().getTime() - (cacheEntry.timestamp || 0);
        if (cacheAge < 604800000) { // 7 dias
          return cacheEntry.url;
        } else {
          // Limpar cache expirado silenciosamente
          delete avatarCache[phoneNumber];
          localStorage.setItem('whatsapp_avatar_cache', JSON.stringify(avatarCache));
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }, []);
  
  // Carregar avatar uma única vez no mount ou quando dependências críticas mudarem
  useEffect(() => {
    // Função para carregar avatar de forma otimizada
    const loadAvatar = async () => {
      // Verificar se o componente ainda está montado
      if (!isMounted.current) return;
      
      // Prioridade 1: Usar URL já fornecida
      if (imageUrl) {
        dispatch({ type: 'SET_IMAGE_URL', payload: imageUrl });
        if (phone) saveAvatarToLocalStorage(phone, imageUrl);
        return;
      }
      
      // Prioridade 2: Buscar do localStorage
      if (phone) {
        const cachedUrl = getAvatarFromLocalStorage(phone);
        if (cachedUrl) {
          dispatch({ type: 'SET_IMAGE_URL', payload: cachedUrl });
          return;
        }
      }
      
      // Prioridade 3: Buscar da API apenas se necessário e possível
      if (phone && apiConfig?.baseUrl && apiConfig?.instanceName && apiConfig?.apikey) {
        try {
          const formattedPhone = formatPhoneNumber(phone, false);
          const response = await axios.post(
            `${apiConfig.baseUrl}/chat/fetchProfilePictureUrl/${apiConfig.instanceName}`,
            { number: `${formattedPhone}@s.whatsapp.net` },
            { headers: { 'Content-Type': 'application/json', 'apikey': apiConfig.apikey } }
          );
          
          // Verificar se componente ainda está montado antes de atualizar o estado
          if (!isMounted.current) return;
          
          if (response.data?.profilePictureUrl) {
            const avatarUrl = response.data.profilePictureUrl;
            dispatch({ type: 'SET_IMAGE_URL', payload: avatarUrl });
            if (phone) saveAvatarToLocalStorage(phone, avatarUrl);
          }
        } catch (error) {
          // Silenciar erros para evitar logs excessivos que causam re-renders
        }
      }
    };
    
    // Iniciar carregamento
    loadAvatar();
    
    // Cleanup function para evitar memory leaks
    return () => {
      isMounted.current = false;
    };
  }, [phone, imageUrl, apiConfig?.baseUrl, apiConfig?.instanceName, apiConfig?.apikey, getAvatarFromLocalStorage, saveAvatarToLocalStorage]);
  
  // Renderização otimizada com mínimas dependências de props
  return (
    <div 
      className="rounded-full flex items-center justify-center bg-[#2A2A2A] text-white overflow-hidden"
      style={{ width: size, height: size }}
    >
      {!state.imageError && state.imageUrl ? (
        <img
          src={state.imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => dispatch({ type: 'SET_IMAGE_ERROR' })}
          loading="lazy" // Usar lazy loading para melhor performance
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3/4 h-3/4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6.01 3.22z"/>
          </svg>
        </div>
      )}
    </div>
  );
});

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  statusFilter: ConversationStatus | 'all';
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  statusFilter
}) => {
  // Filtrar conversas com base no statusFilter
  const filteredConversations = conversations.filter(
    (conversation) => statusFilter === 'all' || conversation.status === statusFilter
  );

  // Ordenar conversas por timestamp (da mais recente para a mais antiga)
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    // Usar timestamp ou last_message_time, garantindo que tenham valores válidos
    const timeA = a.timestamp || a.last_message_time || new Date();
    const timeB = b.timestamp || b.last_message_time || new Date();
    const dateA = new Date(timeA);
    const dateB = new Date(timeB);
    return dateB.getTime() - dateA.getTime();
  });

  // Formatar timestamp para exibição
  const formatTimestamp = (timestamp: Date | string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  // Função para truncar o texto se for muito longo, com verificação de segurança
  const truncateText = (text: string | undefined | null, maxLength: number = 30): string => {
    // Verificar se o texto existe e não é null ou undefined
    if (!text) return '';
    
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };
  
  // Função para buscar a prévia da mensagem do localStorage
  const getMessagePreviewFromLocalStorage = (remoteJid: string): {content: string, timestamp: number} | null => {
    try {
      const messagePreviewCache = JSON.parse(localStorage.getItem('whatsapp_message_preview_cache') || '{}');
      const cacheEntry = messagePreviewCache[remoteJid];
      
      // Se temos um cache e ele contém conteúdo
      if (cacheEntry && cacheEntry.content) {
        return cacheEntry;
      }
      return null;
    } catch (error) {
      console.error(`[ConversationList] Erro ao ler prévia do localStorage:`, error);
      return null;
    }
  };
  
  // Componente para exibir a prévia da mensagem
  interface MessagePreviewProps {
    conversationId: string;
    databasePreview?: string | null;
  }
  
  /**
   * MessagePreview simplificado e sem atualizações dinâmicas para eliminar piscadas
   * Usa apenas o valor passado via props sem tentar atualizar do localStorage
   * Sem hooks, sem estados, sem useEffect - puramente funcional
   */
  const MessagePreview: React.FC<MessagePreviewProps> = ({ conversationId, databasePreview }) => {
    // Buscar a prévia uma única vez ao renderizar, sem atualizações
    const localPreview = getMessagePreviewFromLocalStorage(conversationId);
    
    // Usar a prévia do localStorage ou a do banco de dados, sem atualizações dinâmicas
    const preview = (localPreview && localPreview.content) || databasePreview || null;
    
    return (
      <p className="text-sm text-gray-400 truncate">
        {truncateText(preview, 30)}
      </p>
    );
  };

  // A função getStatusColor foi removida pois não está mais sendo usada

  return (
    <div className="h-full overflow-y-auto">
      {sortedConversations.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          Nenhuma conversa encontrada
        </div>
      ) : (
        <ul className="divide-y divide-gray-800">
          {sortedConversations.map((conversation) => (
            <li
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`p-3 hover:bg-[#2A2A2A] cursor-pointer ${
                selectedConversationId === conversation.id
                  ? 'bg-[#2A2A2A]'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  {/* Avatar usando o componente dedicado */}
                  <Avatar 
                    imageUrl={conversation.avatar_url || conversation.avatarUrl} 
                    name={conversation.contactName}
                    phone={conversation.phone || conversation.id?.replace('@s.whatsapp.net', '')}
                    size={40}
                  />
                  
                  {/* Indicador de status removido */}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium truncate">
                      {truncateText(conversation.contactName, 20)}
                    </h3>
                    <span 
                      className={`text-xs text-right ${(conversation.unreadCount || conversation.unread_count || 0) > 0 ? 'font-bold' : 'text-gray-500'}`}
                    >
                      {formatTimestamp(conversation.timestamp || conversation.last_message_time || new Date())}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <MessagePreview 
                      conversationId={conversation.id} 
                      databasePreview={conversation.lastMessage || conversation.last_message} 
                    />
                    
                    {/* Contador de mensagens não lidas - NUNCA exibir se for a conversa selecionada */}
                    {selectedConversationId !== conversation.id && (conversation.unread_count || 0) > 0 && (
                      <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {conversation.unread_count || 0}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ConversationList;
