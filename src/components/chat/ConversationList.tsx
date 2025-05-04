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
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
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

  // Função para truncar o texto se for muito longo
  const truncateText = (text: string, maxLength: number = 30): string => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Função para determinar a cor do status
  const getStatusColor = (status: ConversationStatus): string => {
    switch (status) {
      case 'pending':
      case 'pendente':
        return 'bg-yellow-500';
      case 'attending':
        return 'bg-blue-500';
      case 'finished':
        return 'bg-green-500';
      case 'waiting':
        return 'bg-purple-500';
      case 'deletado':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {sortedConversations.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          Nenhuma conversa encontrada
        </div>
      ) : (
        <ul className="divide-y divide-gray-700">
          {sortedConversations.map((conversation) => (
            <li
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`p-3 hover:bg-gray-800 cursor-pointer ${
                selectedConversationId === conversation.id
                  ? 'bg-gray-800'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  {/* Avatar (placeholder ou imagem do contato) */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 text-white">
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
                  
                  {/* Indicador de status */}
                  <div
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${getStatusColor(
                      conversation.status
                    )}`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium truncate">
                      {truncateText(conversation.contactName, 20)}
                    </h3>
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(conversation.timestamp)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400 truncate">
                      {truncateText(conversation.lastMessage, 30)}
                    </p>
                    
                    {/* Contador de mensagens não lidas */}
                    {conversation.unreadCount > 0 && (
                      <span className="bg-emerald-600 text-white text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                        {conversation.unreadCount}
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
