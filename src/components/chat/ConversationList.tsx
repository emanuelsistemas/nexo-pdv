import React, { useState, useEffect } from 'react';
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

const Avatar: React.FC<AvatarProps> = ({ imageUrl, name, phone, size = 40 }) => {
  const [imageError, setImageError] = useState(false);
  const [directImageUrl, setDirectImageUrl] = useState<string | null>(imageUrl || null);
  const { apiConfig } = useWhatsAppInstance();
  
  // Removido log de depuração excessivo para evitar loop infinito
  
  // Função para salvar avatar no localStorage
  const saveAvatarToLocalStorage = (phoneNumber: string, url: string) => {
    try {
      // Obter o cache existente ou criar um novo objeto
      const avatarCache = JSON.parse(localStorage.getItem('whatsapp_avatar_cache') || '{}');
      
      // Verificar se já existe a mesma URL no cache para evitar operações desnecessárias
      if (avatarCache[phoneNumber]?.url === url) {
        return; // Evitar atualização desnecessária se a URL for a mesma
      }
      
      // Adicionar/atualizar a entrada para este telefone
      avatarCache[phoneNumber] = {
        url,
        timestamp: new Date().getTime()
      };
      
      // Salvar o cache atualizado
      localStorage.setItem('whatsapp_avatar_cache', JSON.stringify(avatarCache));
      // Logs desativados para evitar rerenderizações desnecessárias
      // console.log(`[Avatar] Salvou avatar no localStorage para ${phoneNumber}`);
    } catch (error) {
      console.error(`[Avatar] Erro ao salvar no localStorage:`, error);
    }
  };
  
  // Função para buscar avatar do localStorage
  const getAvatarFromLocalStorage = (phoneNumber: string): string | null => {
    try {
      const avatarCache = JSON.parse(localStorage.getItem('whatsapp_avatar_cache') || '{}');
      const cacheEntry = avatarCache[phoneNumber];
      
      // Se temos um cache e não está expirado (7 dias = 604800000 ms)
      if (cacheEntry && cacheEntry.url) {
        const cacheAge = new Date().getTime() - cacheEntry.timestamp;
        if (cacheAge < 604800000) {
          // Logs comentados para evitar loops de renderização
          // console.log(`[Avatar] Usando avatar do localStorage para ${phoneNumber}`);
          return cacheEntry.url;
        } else {
          // Silenciar logs desnecessários
          // console.log(`[Avatar] Cache expirado para ${phoneNumber}`);
          // Remover o cache expirado para liberar espaço
          delete avatarCache[phoneNumber];
          localStorage.setItem('whatsapp_avatar_cache', JSON.stringify(avatarCache));
          return null;
        }
      }
      return null;
    } catch (error) {
      // Manter apenas logs de erro crÃ­ticos
      console.error(`[Avatar] Erro ao ler do localStorage:`, error);
      return null;
    }
  };
  
  // useEffect com dependências controladas para evitar loops
  useEffect(() => {
    // Criar uma função assíncrona para lidar com o carregamento do avatar
    const loadAvatar = async () => {
      // Se já temos uma URL válida, usar ela
      if (imageUrl) {
        setDirectImageUrl(imageUrl);
        
        // Salvar no localStorage para uso futuro
        if (phone) {
          saveAvatarToLocalStorage(phone, imageUrl);
        }
        return;
      }
      
      // Tentar buscar do localStorage primeiro
      if (phone) {
        const cachedUrl = getAvatarFromLocalStorage(phone);
        if (cachedUrl) {
          setDirectImageUrl(cachedUrl);
          return;
        }
      }
      
      // Se não temos uma URL e temos um número de telefone e configuração da API, buscar direto da API
      if (phone && apiConfig && apiConfig.baseUrl && apiConfig.instanceName) {
        
        const formattedPhone = formatPhoneNumber(phone, false);
        
        try {
          const response = await axios.post(
            `${apiConfig.baseUrl}/chat/fetchProfilePictureUrl/${apiConfig.instanceName}`,
            { number: `${formattedPhone}@s.whatsapp.net` },
            {
              headers: {
                'Content-Type': 'application/json',
                'apikey': apiConfig.apikey
              }
            }
          );
          
          if (response.data && response.data.profilePictureUrl) {
            const avatarUrl = response.data.profilePictureUrl;
            
            // Atualizar o estado e salvar no localStorage
            setDirectImageUrl(avatarUrl);
            if (phone) {
              saveAvatarToLocalStorage(phone, avatarUrl);
            }
          } else {
            setDirectImageUrl(null);
          }
        } catch (error) {
          console.error(`[Avatar] Erro ao buscar avatar:`, error);
          setDirectImageUrl(null);
        }
      }
    };
    
    // Executar a função de carregamento
    loadAvatar();
    
    // Dependências cuidadosamente controladas para evitar loops
    // Usamos apenas o phone e imageUrl como dependências principais
    // Convertemos objetos complexos em strings para evitar rerenderizações desnecessárias
  }, [phone, imageUrl, apiConfig?.baseUrl, apiConfig?.instanceName, apiConfig?.apikey]);
  
  return (
    <div 
      className="rounded-full flex items-center justify-center bg-[#2A2A2A] text-white overflow-hidden"
      style={{ width: size, height: size }}
      title={directImageUrl || 'Sem avatar'}
    >
      {!imageError && directImageUrl ? (
        <img
          src={directImageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.log(`[Avatar] Erro ao carregar avatar para ${name}:`, e);
            console.log(`[Avatar] URL que falhou: ${directImageUrl}`);
            setImageError(true);
          }}
          onLoad={() => console.log(`[Avatar] Avatar carregado com sucesso para ${name}`)}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3/4 h-3/4" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M12 2.5a5.5 5.5 0 00-3.096 10.047 9.005 9.005 0 00-5.9 8.18.75.75 0 001.5.045 7.5 7.5 0 0114.993 0 .75.75 0 001.499-.044 9.005 9.005 0 00-5.9-8.181A5.5 5.5 0 0012 2.5zM8 8a4 4 0 118 0 4 4 0 01-8 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

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
  
  const MessagePreview: React.FC<MessagePreviewProps> = ({ conversationId, databasePreview }) => {
    // Inicializar o estado preview com o valor do banco de dados
    const [preview, setPreview] = useState<string | null>(databasePreview || null);
    
    // Usar useEffect apenas uma vez na montagem do componente para evitar loops
    useEffect(() => {
      // Tentar obter a prévia mais recente do localStorage
      const localPreview = getMessagePreviewFromLocalStorage(conversationId);
      
      if (localPreview && localPreview.content) {
        // Atualizar apenas se for diferente do estado atual para evitar loops
        if (localPreview.content !== preview) {
          // Remover logs excessivos para evitar poluir o console
          // console.log(`[MessagePreview] Usando prévia do localStorage para ${conversationId}`);
          setPreview(localPreview.content);
        }
      }
      // O array de dependências é apenas o conversationId; não incluímos preview para evitar loops
    }, [conversationId]);
    
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
