import React from 'react';
import { ChatMessage } from '../../types/chat';
import AudioPlayer from './AudioPlayer';

interface MessageItemProps {
  message: ChatMessage;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const { sender, content, timestamp, type, audioData } = message;
  const isMe = sender === 'me' || sender === 'user';
  
  // Função para formatar o timestamp
  const formatTimestamp = (timestamp: Date | string): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Renderização de conteúdo baseada no tipo de mensagem
  const renderContent = () => {
    // Mensagem de áudio
    if (type === 'audio' && audioData) {
      return <AudioPlayer audioData={audioData} dark={true} />;
    }
    
    // Mensagem de texto (padrão)
    return <p>{content}</p>;
  };

  return (
    <div className={`mb-4 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg p-3 ${
          isMe
            ? 'bg-emerald-600 text-white rounded-tr-none'
            : 'bg-[#2A2A2A] text-white rounded-tl-none'
        }`}
      >
        {renderContent()}
        <p className="text-xs opacity-70 mt-1 text-right">
          {formatTimestamp(timestamp)}
        </p>
      </div>
    </div>
  );
};

export default MessageItem;
