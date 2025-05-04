import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  disabled = false,
  placeholder = 'Digite sua mensagem...'
}) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Focar no input quando o componente for montado
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Função para redimensionar automaticamente a altura do textarea
  const autoResizeTextarea = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  };
  
  // Função para enviar mensagem
  const handleSendMessage = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      
      // Resetar a altura do textarea
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };
  
  // Função para lidar com a tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-4 border-t border-gray-700">
      <div className="flex items-end bg-dark-800 rounded-lg border border-gray-700 focus-within:border-emerald-500">
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            autoResizeTextarea();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent border-0 focus:ring-0 text-white p-3 max-h-[150px] min-h-[50px] resize-none"
          rows={1}
        />
        <button
          onClick={handleSendMessage}
          disabled={!message.trim() || disabled}
          className={`p-3 rounded-r-lg ${
            !message.trim() || disabled
              ? 'text-gray-500 cursor-not-allowed'
              : 'text-emerald-500 hover:text-emerald-400'
          }`}
          type="button"
        >
          <Send className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
