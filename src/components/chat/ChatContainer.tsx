import React from 'react';
import { Conversation } from '../../types/chat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';

interface ChatContainerProps {
  conversation: Conversation | null;
  onSendMessage: (content: string) => void;
  onChangeStatus: (status: any) => void;
  scrollPosition?: number;
  onScrollPositionChange?: (position: number) => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  conversation,
  onSendMessage,
  onChangeStatus,
  scrollPosition,
  onScrollPositionChange
}) => {
  // Caso não tenha uma conversa selecionada, mostra uma mensagem
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Selecione uma conversa para começar a interagir
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        contactName={conversation.contactName}
        status={conversation.status}
        avatarUrl={conversation.avatarUrl}
        onChangeStatus={(newStatus) => onChangeStatus(conversation.id, newStatus)}
      />
      
      <MessageList 
        messages={conversation.messages} 
        scrollPosition={scrollPosition}
        onScrollPositionChange={onScrollPositionChange}
      />
      
      <MessageInput 
        onSendMessage={onSendMessage}
        disabled={conversation.status === 'finished' || conversation.status === 'deletado'}
        placeholder={
          conversation.status === 'finished' || conversation.status === 'deletado'
            ? 'Esta conversa está finalizada'
            : 'Digite sua mensagem...'
        } 
      />
    </div>
  );
};

export default ChatContainer;
