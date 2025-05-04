import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/chat';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
  scrollPosition?: number;
  onScrollPositionChange?: (position: number) => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  scrollPosition,
  onScrollPositionChange 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Efeito para restaurar a posição de rolagem ou rolar para o final
  useEffect(() => {
    if (containerRef.current) {
      if (scrollPosition !== undefined) {
        // Se temos uma posição de rolagem salva, restauramos ela
        containerRef.current.scrollTop = scrollPosition;
      } else {
        // Caso contrário, rolamos para a mensagem mais recente
        scrollToBottom();
      }
    }
  }, [messages.length, scrollPosition]);
  
  // Função para rolar para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };
  
  // Função para salvar a posição de rolagem atual
  const handleScroll = () => {
    if (containerRef.current && onScrollPositionChange) {
      onScrollPositionChange(containerRef.current.scrollTop);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 p-4 overflow-y-auto"
      onScroll={handleScroll}
    >
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-400">
          Nenhuma mensagem ainda. Inicie uma conversa!
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default MessageList;
