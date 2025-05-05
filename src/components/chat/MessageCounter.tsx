import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { subscribe, EVENTS } from '../../services/eventBus';

interface MessageCounterProps {
  conversationId: string;
  variant?: 'small' | 'medium' | 'large';
  showZero?: boolean;
  className?: string;
  onCountChange?: (count: number) => void;
}

/**
 * Componente reutilizável para exibir o contador de mensagens não lidas
 * Integrado com a tabela nexochat_status do Supabase
 */
const MessageCounter: React.FC<MessageCounterProps> = ({
  conversationId,
  variant = 'medium',
  showZero = false,
  className = '',
  onCountChange
}) => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Função para carregar o contador de mensagens não lidas
  const loadUnreadCount = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('nexochat_status')
        .select('unread_count')
        .eq('conversation_id', conversationId)
        .single();

      if (error) {
        console.error('Erro ao buscar contador de mensagens:', error);
        setError(error.message);
        return;
      }

      // Garantir que unread_count seja um número válido
      // Primeiro verificamos se data existe
      if (!data) {
        const defaultCount = 0;
        setCount(defaultCount);
        if (onCountChange) {
          onCountChange(defaultCount);
        }
        return;
      }
      
      // Converter explicitamente para número para evitar problemas de tipagem
      const unreadCount = typeof data.unread_count === 'number' ? data.unread_count : 0;
      setCount(unreadCount);
      
      // Notificar o componente pai sobre a mudança
      if (onCountChange) {
        onCountChange(unreadCount);
      }
    } catch (err) {
      console.error('Erro ao processar dados do contador:', err);
      setError('Erro ao buscar contador de mensagens');
    } finally {
      setLoading(false);
    }
  };

  // Carregar o contador quando o componente montar ou o conversationId mudar
  useEffect(() => {
    if (conversationId) {
      loadUnreadCount();
    }
  }, [conversationId]);
  
  // Escutar eventos de atualização do contador via EventBus
  useEffect(() => {
    if (!conversationId) return;
    
    console.log(`[MessageCounter] Configurando listener de eventos para ${conversationId}`);
    
    // Inscrever-se para receber atualizações diretas do contador
    const unsubscribe = subscribe(EVENTS.MESSAGE_COUNTER_UPDATE, (data) => {
      // Verificar se o evento é para esta conversa
      if (data && data.conversationId === conversationId) {
        console.log(`[MessageCounter:EventBus] Atualizando contador para ${conversationId}: ${data.count}`);
        
        // Atualizar o estado
        setCount(data.count);
        
        // Notificar o componente pai sobre a mudança
        if (onCountChange) {
          onCountChange(data.count);
        }
      }
    });
    
    // Limpar inscrição quando o componente for desmontado
    return () => {
      console.log(`[MessageCounter] Removendo listener de eventos para ${conversationId}`);
      unsubscribe();
    };
  }, [conversationId, onCountChange]);

  // Configurar um listener para mudanças na tabela nexochat_status
  useEffect(() => {
    if (!conversationId) return;
    
    console.log(`[MessageCounter] Configurando realtime para conversationId ${conversationId}`);

    // Criar um identificador único para o canal baseado no ID da conversa
    const channelId = `nexochat_status_changes_${conversationId}`;
    
    // Inscrever-se para receber atualizações da tabela nexochat_status
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*', // Escutar todos os eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'nexochat_status',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Quando houver uma mudança na tabela, atualizar diretamente o contador
          console.log(`[MessageCounter] Evento realtime recebido para ${conversationId}:`, payload);
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newCount = payload.new.unread_count || 0;
            console.log(`[MessageCounter] Atualizando contador para ${conversationId}: ${newCount}`);
            setCount(newCount);
            
            // Notificar o componente pai sobre a mudança
            if (onCountChange) {
              onCountChange(newCount);
            }
          } else {
            // Para outros tipos de eventos (INSERT, DELETE), recarregar o contador
            loadUnreadCount();
          }
        }
      )
      .subscribe((status) => {
        console.log(`[MessageCounter] Status da subscription para ${conversationId}:`, status);
      });
    
    // Limpar a subscription quando o componente for desmontado
    return () => {
      console.log(`[MessageCounter] Removendo canal para ${conversationId}`);
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Se estiver carregando, exibir um indicador de carregamento simples
  if (loading) {
    return <div className="animate-pulse w-5 h-5 bg-gray-400 opacity-50 rounded-full"></div>;
  }

  // Se houver um erro, não exibir nada (ou poderia exibir um ícone de erro)
  if (error) {
    return null;
  }

  // Se o contador for zero e não devemos exibir zeros, não mostrar nada
  if (count === 0 && !showZero) {
    return null;
  }

  // Determinar a classe com base na variante
  const sizeClass = {
    small: 'h-4 min-w-[16px] text-xs',
    medium: 'h-5 min-w-[20px] text-xs',
    large: 'h-6 min-w-[24px] text-sm'
  }[variant];

  return (
    <span 
      className={`bg-green-500 text-black font-medium rounded-full flex items-center justify-center px-1 ${sizeClass} ${className}`}
      title={`${count} mensagens não lidas`}
      data-testid="message-counter"
    >
      {count}
    </span>
  );
};

// Função auxiliar para atualizar o contador em tempo real
export const updateMessageCounter = async (
  conversationId: string, 
  count: number | ((prevCount: number) => number)
): Promise<boolean> => {
  try {
    // Primeiro verificamos se já existe um registro para esta conversa
    const { data: existingData, error: fetchError } = await supabase
      .from('nexochat_status')
      .select('unread_count')
      .eq('conversation_id', conversationId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 é o código para "não encontrado", que tratamos a seguir
      console.error('Erro ao buscar contador existente:', fetchError);
      return false;
    }

    // Determinar o novo valor do contador
    let newCount: number;
    
    if (typeof count === 'function') {
      // Se for uma função, passar o valor atual para ela calcular o novo valor
      // Converter explicitamente para número para evitar problemas de tipagem
      const currentCount = existingData && typeof existingData.unread_count === 'number' 
        ? existingData.unread_count 
        : 0;
      newCount = count(currentCount);
    } else {
      // Se for um número, usar diretamente
      newCount = count;
    }

    // Se o registro existir, atualizar
    if (existingData) {
      const { error: updateError } = await supabase
        .from('nexochat_status')
        .update({ unread_count: newCount })
        .eq('conversation_id', conversationId);

      if (updateError) {
        console.error('Erro ao atualizar contador:', updateError);
        return false;
      }
    } else {
      // Se o registro não existir, inserir novo (isso requer outros campos obrigatórios)
      // Na prática, o registro provavelmente já existirá, pois é criado ao iniciar uma conversa
      console.warn(`Registro não encontrado para a conversa ${conversationId}, é necessário criar um novo com todos os campos obrigatórios`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar contador de mensagens:', error);
    return false;
  }
};

// Função auxiliar para incrementar o contador
export const incrementMessageCounter = async (
  conversationId: string, 
  increment: number = 1
): Promise<boolean> => {
  return updateMessageCounter(conversationId, (prevCount) => prevCount + increment);
};

// Função auxiliar para zerar o contador
export const resetMessageCounter = async (
  conversationId: string
): Promise<boolean> => {
  return updateMessageCounter(conversationId, 0);
};

export default MessageCounter;
