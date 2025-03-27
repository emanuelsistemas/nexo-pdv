import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, ChevronLeft, Loader2, Plus, Trash2, MoreVertical } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientX <= 50) {
        clearTimeout(hoverTimeout.current);
        setIsHovering(true);
      } else if (!isOpen) {
        hoverTimeout.current = setTimeout(() => {
          setIsHovering(false);
        }, 300);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hoverTimeout.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations, currentConversation]);

  const getCurrentMessages = () => {
    if (!currentConversation) return [];
    const conversation = conversations.find(c => c.id === currentConversation);
    return conversation?.messages || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    };

    if (!currentConversation) {
      // Create new conversation
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: message.trim().slice(0, 30) + (message.length > 30 ? '...' : ''),
        messages: [newMessage],
        createdAt: new Date()
      };
      setConversations(prev => [...prev, newConversation]);
      setCurrentConversation(newConversation.id);
    } else {
      // Add to existing conversation
      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversation) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage]
          };
        }
        return conv;
      }));
    }

    setMessage('');
    setIsLoading(true);

    // Simular resposta da IA após 1 segundo
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Esta é uma resposta simulada do assistente de IA. Em uma implementação real, este seria o local para integrar com um serviço de IA como GPT ou similar.',
        timestamp: new Date()
      };

      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversation) {
          return {
            ...conv,
            messages: [...conv.messages, response]
          };
        }
        return conv;
      }));
      
      setIsLoading(false);
    }, 1000);
  };

  const handleNewConversation = () => {
    setCurrentConversation(null);
    setMessage('');
    setShowConversations(false);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (currentConversation === id) {
      setCurrentConversation(null);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Trigger Area */}
      <div
        className={`fixed left-0 top-1/2 -translate-y-1/2 transition-transform duration-300 ${
          isHovering || isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div 
          className={`flex items-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-r-lg cursor-pointer ${
            isOpen ? 'hidden' : ''
          }`}
          onClick={() => setIsOpen(true)}
        >
          <Bot size={20} />
          <span className="text-sm font-medium">nexo pdv IA</span>
        </div>
      </div>

      {/* Chat Panel */}
      <div
        ref={chatRef}
        className={`fixed left-0 top-0 h-full w-full md:w-[400px] bg-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-700 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-blue-400" />
            <h2 className="brand-name text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 text-transparent bg-clip-text">
              nexo pdv IA
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConversations(!showConversations)}
              className="p-1 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <MoreVertical size={20} className="text-slate-400" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {showConversations ? (
          // Conversations List
          <div className="flex-1 overflow-y-auto p-4 h-[calc(100vh-120px)] space-y-2">
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors"
            >
              <Plus size={20} />
              <span>Nova Conversa</span>
            </button>
            
            {conversations.map(conv => (
              <div
                key={conv.id}
                className="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer group"
                onClick={() => {
                  setCurrentConversation(conv.id);
                  setShowConversations(false);
                }}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-200 font-medium truncate">{conv.title}</h3>
                  <p className="text-slate-400 text-sm">
                    {formatTime(conv.createdAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                  className="p-1 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          // Messages
          <div className="flex-1 overflow-y-auto p-4 h-[calc(100vh-120px)] space-y-4">
            {getCurrentMessages().map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <span className="text-xs opacity-75 mt-1 block">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 rounded-lg px-4 py-2">
                  <Loader2 size={20} className="animate-spin text-blue-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        {!showConversations && (
          <form
            onSubmit={handleSubmit}
            className="absolute bottom-0 left-0 right-0 p-4 bg-slate-700 border-t border-slate-600"
          >
            <div className="relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="w-full px-4 py-2 pr-10 bg-slate-800 text-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!message.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}