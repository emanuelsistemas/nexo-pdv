import { useState, useEffect, useRef } from 'react';
import { PlusCircle, Send, X, Settings, Trash2, Edit } from 'lucide-react';
import axios from 'axios';

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

// Tipo para a mensagem da API Groq
interface GroqMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const AiChat = ({ isOpen, onClose, userName }: AiChatProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
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
    
    // Limitar o número de conversas salvas (manter apenas as 3 mais recentes)
    // A nova conversa é adicionada e as mais antigas são removidas se exceder o limite
    const maxConversations = 3;
    const updatedConversations = [newConversation, ...conversations].slice(0, maxConversations);
    
    setConversations(updatedConversations);
    setCurrentConversationId(newConversation.id);
    setInputMessage('');
  };
  
  const getCurrentConversation = () => {
    return conversations.find(conv => conv.id === currentConversationId) || null;
  };
  
  // Excluir uma conversa
  const deleteConversation = (id: string) => {
    setConversations(conversations.filter(conv => conv.id !== id));
    
    // Se a conversa atual foi excluída, selecione outra ou nenhuma
    if (currentConversationId === id) {
      // Tenta selecionar a conversa mais recente disponível
      const remainingConversations = conversations.filter(conv => conv.id !== id);
      setCurrentConversationId(remainingConversations.length > 0 ? remainingConversations[0].id : null);
    }
  };
  
  // Atualizar o título de uma conversa
  const updateConversationTitle = (id: string, newTitle: string) => {
    setConversations(conversations.map(conv => 
      conv.id === id ? { ...conv, title: newTitle } : conv
    ));
  };
  
  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentConversationId) return;
    
    const currentConv = getCurrentConversation();
    if (!currentConv) return;
    
    // Criar mensagem do usuário
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };
    
    // Atualizar conversa com a nova mensagem do usuário
    const updatedConversations = conversations.map(conv => {
      if (conv.id === currentConversationId) {
        return {
          ...conv,
          messages: [...conv.messages, newMessage],
          // Atualizar o título da conversa com as primeiras palavras da primeira mensagem se for a primeira mensagem
          title: conv.messages.length === 0 ? 
            inputMessage.trim().slice(0, 20) + (inputMessage.trim().length > 20 ? '...' : '') : 
            conv.title
        };
      }
      return conv;
    });
    
    setConversations(updatedConversations);
    setInputMessage('');
    
    try {
      // Obtém a conversa atualizada com a mensagem do usuário
      const currentConv = updatedConversations.find(conv => conv.id === currentConversationId);
      
      if (!currentConv) return;
      
      // Transformar o histórico de mensagens para o formato da API Groq
      const groqMessages: GroqMessage[] = [
        // Mensagem de sistema para definir o contexto do assistente
        {
          role: 'system',
          content: 'Você é um assistente virtual do Nexo PDV, um sistema de ponto de vendas. Seja prestativo, amigável e forneça respostas concisas.'
        },
        // Converter o histórico de mensagens para o formato da API Groq
        ...currentConv.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ];
      
      // Indicar que estamos esperando uma resposta
      const loadingMessage: Message = {
        id: 'loading-' + Date.now().toString(),
        role: 'assistant',
        content: '...',
        timestamp: new Date()
      };
      
      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: [...conv.messages, loadingMessage]
          };
        }
        return conv;
      }));
      
      // Chamada à API Groq
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-70b-8192',  // Usando o modelo LLaMA 3 70B
          messages: groqMessages,
          max_tokens: 1024,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      // Extrair a resposta da IA
      const aiResponseContent = response.data.choices[0].message.content;
      
      // Criar mensagem de resposta da IA
      const aiResponse: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: aiResponseContent,
        timestamp: new Date()
      };
      
      // Remove a mensagem de carregamento e adiciona a resposta real
      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            // Filtra a mensagem de carregamento e adiciona a resposta real
            messages: [...conv.messages.filter(m => !m.id.startsWith('loading-')), aiResponse]
          };
        }
        return conv;
      }));
      
    } catch (error) {
      console.error('Erro ao chamar a API Groq:', error);
      
      // Remover mensagem de carregamento
      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: conv.messages.filter(m => !m.id.startsWith('loading-'))
          };
        }
        return conv;
      }));
      
      // Adiciona mensagem de erro
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.',
        timestamp: new Date()
      };
      
      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: [...conv.messages, errorMessage]
          };
        }
        return conv;
      }));
    }
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
                {/* Conversation header with options */}
                <div className="px-4 py-2 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="text-sm font-medium text-white truncate">
                    {getCurrentConversation()?.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const newTitle = prompt('Renomear conversa:', getCurrentConversation()?.title);
                        if (newTitle && newTitle.trim() && currentConversationId) {
                          updateConversationTitle(currentConversationId, newTitle.trim());
                        }
                      }}
                      className="text-gray-400 hover:text-white p-1"
                      title="Renomear conversa"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja excluir esta conversa?') && currentConversationId) {
                          deleteConversation(currentConversationId);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Excluir conversa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
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
                      disabled={!inputMessage.trim()}
                      className={`p-2 rounded-lg ${
                        !inputMessage.trim()
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      <Send size={18} />
                    </button>
                  </div>
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
                  <p className="text-gray-400">
                    Como posso ajudar você hoje, {userName}?
                  </p>
                  <button 
                    onClick={createNewConversation}
                    className="mt-4 py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Iniciar nova conversa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Lista de conversas salvas */}
      {conversations.length > 0 && (
        <div className="p-3 border-t border-gray-800">
          <h3 className="text-sm font-medium text-white mb-2">Conversas recentes</h3>
          <div className="space-y-2">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={`w-full py-2 px-3 rounded-lg text-left truncate flex justify-between items-center ${
                  currentConversationId === conv.id 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-[#2A2A2A] text-white hover:bg-[#333]'
                }`}
              >
                <span className="truncate flex-1">{conv.title}</span>
                {currentConversationId !== conv.id && (
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const newTitle = prompt('Renomear conversa:', conv.title);
                        if (newTitle && newTitle.trim()) {
                          updateConversationTitle(conv.id, newTitle.trim());
                        }
                      }}
                      className="text-gray-400 hover:text-white p-1 text-xs"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Tem certeza que deseja excluir esta conversa?')) {
                          deleteConversation(conv.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 p-1 text-xs"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
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
