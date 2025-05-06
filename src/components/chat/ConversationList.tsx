import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Conversation, ConversationStatus } from '../../types/chat';
import MessageCounter from './MessageCounter';
import useEvolutionApi from '../../hooks/useEvolutionApi';
import defaultAvatar from '../../assets/default-avatar.svg';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  statusFilter: ConversationStatus | 'all';
  isLoading?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations: initialConversations,
  selectedConversationId,
  onSelectConversation,
  statusFilter,
  isLoading = false
}) => {
  // Estado local para armazenar as conversas (permitindo atualizações em tempo real)
  const [conversations, setConversations] = useState(initialConversations);
  // Estado para armazenar URLs das fotos de perfil
  const [profilePicUrls, setProfilePicUrls] = useState<Record<string, string | null>>({});
  
  // Hook para acessar a API Evolution
  const { getProfilePicture } = useEvolutionApi();
  
  // Atualizar o estado local quando as props mudarem
  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);
  
  // Carregar fotos de perfil para todas as conversas
  useEffect(() => {
    const loadProfilePictures = async () => {
      // Cria um objeto para armazenar as URLs já carregadas
      const newProfilePics: Record<string, string | null> = {...profilePicUrls};
      let updated = false;
      
      // Para cada conversa
      for (const conversation of conversations) {
        // Se ainda não temos a foto deste contato, buscamos
        if (!newProfilePics[conversation.id]) {
          try {
            // Extrair o número de telefone sem o @c.us para usar como chave de cache
            const phoneNumber = String(conversation.id).split('@')[0];
            
            console.log(`Carregando foto de perfil para ${phoneNumber}`);
            const profilePicUrl = await getProfilePicture(phoneNumber);
            
            // Armazenar a URL (pode ser null se não houver foto)
            newProfilePics[conversation.id] = profilePicUrl;
            updated = true;
          } catch (err) {
            console.error(`Erro ao carregar foto para ${conversation.id}:`, err);
            // Em caso de erro, armazenar null para evitar tentar novamente
            newProfilePics[conversation.id] = null;
            updated = true;
          }
        }
      }
      
      // Só atualiza o estado se houve alguma mudança
      if (updated) {
        setProfilePicUrls(newProfilePics);
      }
    };
    
    // Carrega as fotos ao montar o componente e quando as conversas mudarem
    loadProfilePictures();
  }, [conversations, getProfilePicture]);
  
  // Configurar Realtime subscription para todas as conversas
  useEffect(() => {
    console.log('[ConversationList] Configurando subscription para nexochat_status');
    
    // Criar canal para mudanças na tabela nexochat_status
    const channel = supabase
      .channel('conversation_list_updates')
      .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public',
            table: 'nexochat_status'
          }, 
          (payload) => {
            console.log('[ConversationList] Atualização detectada:', payload);
            
            if (!payload.new || !payload.new.conversation_id) return;
            
            const updatedConversationId = payload.new.conversation_id;
            const updatedUnreadCount = payload.new.unread_count || 0;
            
            // Atualizar a conversa específica com o novo contador
            setConversations(currentConversations => {
              return currentConversations.map(conv => {
                if (conv.id === updatedConversationId) {
                  console.log(`[ConversationList] Atualizando contador para ${updatedConversationId}: ${updatedUnreadCount}`);
                  return {
                    ...conv,
                    unread_count: updatedUnreadCount
                  };
                }
                return conv;
              });
            });
          }
      )
      .subscribe((status) => {
        console.log('[ConversationList] Status da subscription:', status);
      });
    
    // Limpar a subscription quando o componente for desmontado
    return () => {
      console.log('[ConversationList] Limpando subscription');
      supabase.removeChannel(channel);
    };
  }, []);
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
                  {/* Avatar (imagem do contato da Evolution API ou placeholder) */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2A2A2A] text-white">
                    {profilePicUrls[conversation.id] ? (
                      <img
                        src={profilePicUrls[conversation.id] || ''}
                        alt={conversation.contactName}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          // Em caso de erro no carregamento da imagem, reverter para a letra inicial
                          console.log(`Erro ao carregar imagem para ${conversation.id}`);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          // Remover da lista de URLs para evitar tentar carregar novamente
                          setProfilePicUrls(prev => ({
                            ...prev,
                            [conversation.id]: null
                          }));
                        }}
                      />
                    ) : conversation.avatarUrl ? (
                      <img
                        src={conversation.avatarUrl}
                        alt={conversation.contactName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <img
                        src={defaultAvatar}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
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
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-400 truncate w-4/5">
                      {truncateText(conversation.last_message || conversation.lastMessage || 'Sem mensagens', 30)}
                    </p>
                    
                    {/* Contador de mensagens reposicionado */}
                    {selectedConversationId !== conversation.id && (
                      <MessageCounter 
                        conversationId={conversation.id} 
                        variant="small" 
                      />
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
