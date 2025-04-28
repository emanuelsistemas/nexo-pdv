import { useState, useEffect, useRef } from 'react';
import { PlusCircle, Send, X, Settings } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface AiChatProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

const AiChat = ({ isOpen, onClose, userName }: AiChatProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load conversations from localStorage on component mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('ai_conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        setConversations(parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        })));
        
        // Set the most recent conversation as current if it exists
        if (parsed.length > 0) {
          setCurrentConversationId(parsed[0].id);
        }
      } catch (e) {
        console.error('Error parsing saved conversations:', e);
      }
    }
  }, []);
  
  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('ai_conversations', JSON.stringify(conversations));
    }
  }, [conversations]);
  
  // Scroll to bottom of messages whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversationId, conversations]);
  
  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'Nova conversa',
      messages: [],
      createdAt: new Date()
    };
    
    setConversations([newConversation, ...conversations]);
    setCurrentConversationId(newConversation.id);
    setInputMessage('');
  };
  
  const getCurrentConversation = () => {
    return conversations.find(conv => conv.id === currentConversationId) || null;
  };
  
  // Funções para editar títulos e excluir conversas serão implementadas em uma versão futura
  // Exemplo de implementação para referência:
  /*
  function updateConversationTitle(id: string, newTitle: string) {
    setConversations(conversations.map(conv => 
      conv.id === id ? { ...conv, title: newTitle } : conv
    ));
  }
  
  function deleteConversation(id: string) {
    setConversations(conversations.filter(conv => conv.id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(conversations.length > 1 ? 
        conversations.find(conv => conv.id !== id)?.id || null : null);
    }
  }
  */
  
  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentConversationId) return;
    
    const currentConv = getCurrentConversation();
    if (!currentConv) return;
    
    // Create user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    
    // Update conversation with user message
    const updatedConversation = {
      ...currentConv,
      messages: [...currentConv.messages, userMessage]
    };
    
    // If this is the first message, update the conversation title
    const updatedConversations = conversations.map(conv => {
      if (conv.id === currentConversationId) {
        // If first message, use it as the title (truncated)
        if (conv.messages.length === 0) {
          const title = inputMessage.length > 30 
            ? `${inputMessage.substring(0, 30)}...` 
            : inputMessage;
          return { ...updatedConversation, title };
        }
        return updatedConversation;
      }
      return conv;
    });
    
    setConversations(updatedConversations);
    setInputMessage('');
    setIsLoading(true);
    
    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Obrigado pela sua mensagem! Este é um assistente de demonstração. Em uma implementação real, eu me conectaria a um modelo de IA como GPT, Claude ou a um modelo personalizado para processar sua consulta: "${inputMessage}"`,
        timestamp: new Date()
      };
      
      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: [...conv.messages, aiMessage]
          };
        }
        return conv;
      }));
      
      setIsLoading(false);
    }, 1500);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-[#1A1A1A] border-l border-gray-800 flex flex-col shadow-xl z-50">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Assistente IA</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>
      
      {/* Conversations sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full flex flex-col">
          {/* New chat button */}
          <div className="p-3">
            <button 
              onClick={createNewConversation}
              className="w-full py-2 px-3 bg-[#2A2A2A] hover:bg-[#333] text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <PlusCircle size={16} />
              <span>Nova conversa</span>
            </button>
          </div>
          
          {/* Conversation area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {currentConversationId && getCurrentConversation() ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {getCurrentConversation()?.messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-[#2A2A2A] text-white'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#2A2A2A] p-3 rounded-lg text-white">
                        <div className="flex space-x-2 items-center">
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-150"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-300"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input area */}
                <div className="p-3 border-t border-gray-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 py-2 px-3 bg-[#2A2A2A] rounded-lg border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className={`p-2 rounded-lg ${
                        !inputMessage.trim() || isLoading 
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Este assistente está em modo de demonstração
                  </p>
                </div>
              </>
            ) : (
              // No conversation selected
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="text-center space-y-3">
                  <div className="bg-[#2A2A2A] p-3 rounded-full inline-block">
                    <Settings size={24} className="text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white">
                    Assistente IA Nexo
                  </h3>
                  <p className="text-gray-400 max-w-xs">
                    Inicie uma nova conversa para obter ajuda com suas tarefas, responder perguntas ou resolver problemas.
                  </p>
                  <button
                    onClick={createNewConversation}
                    className="mt-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  >
                    Iniciar conversa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* User info footer */}
      <div className="p-3 border-t border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <span className="text-white text-sm">{userName}</span>
        </div>
        <button className="text-gray-400 hover:text-white">
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
};

export default AiChat;
