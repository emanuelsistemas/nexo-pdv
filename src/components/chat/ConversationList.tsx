import React from 'react';
import { Conversation, ConversationStatus } from '../../types/chat';

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
                  {/* Avatar (placeholder ou imagem do contato) */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2A2A2A] text-white">
                    {conversation.avatarUrl ? (
                      <img
                        src={conversation.avatarUrl}
                        alt={conversation.contactName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      conversation.contactName.charAt(0).toUpperCase()
                    )}
                  </div>
                  
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
                    <p className="text-sm text-gray-400 truncate">
                      {truncateText(conversation.lastMessage, 30)}
                    </p>
                    
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
