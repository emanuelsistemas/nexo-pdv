import React from 'react';
import { Conversation, ConversationStatus } from '../../types/chat';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  statusFilter: ConversationStatus | 'all';
  isLoading?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  statusFilter,
  isLoading = false
}) => {
  // Filtrar conversas com base no statusFilter
  const filteredConversations = conversations.filter(
    (conversation) => statusFilter === 'all' || conversation.status === statusFilter
  );

  // Ordenar conversas por timestamp (da mais recente para a mais antiga)
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    // Tratar casos onde timestamp pode ser undefined
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  // Formatar timestamp para exibição
  const formatTimestamp = (timestamp?: Date | string): string => {
    if (!timestamp) return '';  // Retornar string vazia se timestamp for undefined
    
    try {
      // Garantir conversão correta para Date
      const date = new Date(timestamp);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.log('Data inválida:', timestamp);
        return '';
      }
      
      const now = new Date();
      
      // Comparar ano, mês e dia para determinar se é hoje
      const isToday = date.getDate() === now.getDate() && 
                      date.getMonth() === now.getMonth() && 
                      date.getFullYear() === now.getFullYear();
      
      // Log para debug
      console.log(`Formatando data: ${date.toISOString()}, É hoje? ${isToday}`);
      
      if (isToday) {
        // Se for hoje, mostrar apenas hora e minuto
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        // Se for outro dia, mostrar data completa
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error('Erro ao formatar timestamp:', timestamp, error);
      return '';
    }
  };

  // Função para truncar texto longo
  const truncateText = (text: string | undefined, maxLength: number): string => {
    if (!text) return '';
    // Limpar texto de tags HTML e caracteres especiais
    const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
    return cleanText.length > maxLength ? `${cleanText.substring(0, maxLength)}...` : cleanText;
  };

  // Função getStatusColor removida pois não é mais usada após remover o indicador de status

  return (
    <div className="h-full overflow-y-auto" data-component-name="ConversationList">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-200">
          <div className="w-8 h-8 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin mb-2"></div>
          <div>Carregando Mensagens</div>
        </div>
      ) : sortedConversations.length === 0 ? (
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
                      {conversation.contactName}
                    </h3>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-400">
                        {formatTimestamp(conversation.timestamp)}
                      </span>
                      {/* Contador movido para a linha da prévia */}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-400 truncate w-4/5">
                      {truncateText(conversation.lastMessage || conversation.last_message, 30) ? 
                        truncateText(conversation.lastMessage || conversation.last_message, 30) : 
                        <span className="italic">Nova conversa</span>}
                    </p>
                    
                    {/* Contador de mensagens não lidas - estilo WhatsApp */}
                    {/* Priorizar o valor do banco de dados (unread_count) */}
                    {((conversation.unread_count || 0) > 0) && selectedConversationId !== conversation.id && (
                      <span className="bg-green-500 text-black text-xs font-medium rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                        {conversation.unread_count}
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
