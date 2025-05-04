import React from 'react';
import { ChatMessage } from '../../types/chat';

interface MessageItemProps {
  message: ChatMessage;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const { sender, content, timestamp } = message;
  const isUser = sender === 'user';
  
  // Função para formatar o timestamp
  const formatTimestamp = (timestamp: Date | string): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg p-3 ${
          isUser
            ? 'bg-emerald-600 text-white rounded-tr-none'
            : 'bg-[#2A2A2A] text-white rounded-tl-none'
        }`}
      >
        <p>{content}</p>
        <p className="text-xs opacity-70 mt-1 text-right">
          {formatTimestamp(timestamp)}
        </p>
      </div>
    </div>
  );
};

export default MessageItem;
