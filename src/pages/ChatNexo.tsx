import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Database, Users, LogOut, BarChart2, Store, ChevronLeft, ChevronRight, Settings as SettingsIcon, MessageCircle, Send, X, Search, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import axios from 'axios';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'contact';
  timestamp: Date;
}

interface Conversation {
  id: string;
  contactName: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  messages: Message[];
  avatarUrl?: string;
  status: 'pending' | 'attending' | 'finished';
  sector?: 'suporte' | 'comercial' | 'administrativo' | null;
}

export default function ChatNexo() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'attending' | 'finished'>('pending');
  const [selectedSector, setSelectedSector] = useState<'all' | 'suporte' | 'comercial' | 'administrativo'>('all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebar_collapsed');
    return savedState === null ? true : savedState === 'true';
  });
  const [error, setError] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [evolutionApiConfig, setEvolutionApiConfig] = useState({
    baseUrl: '',
    apikey: ''
  });
  
  // Estado para armazenar quais setores estão habilitados
  const [enabledSectors, setEnabledSectors] = useState({
    suporte: false,
    comercial: false,
    administrativo: false
  });
  
  // Estado para armazenar as instâncias de WhatsApp da revenda
  const [whatsappInstances, setWhatsappInstances] = useState<Array<{
    id: string;
    instance_name: string;
    name: string;
    phone: string;
    status: string;
  }>>([]);
  
  const [userInfo, setUserInfo] = useState({
    email: '',
    companyName: '',
    id: '',
    nome: '',
    dev: 'N',
    resellerId: ''
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Referência para o intervalo de polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Verificar sessão ao carregar
  useEffect(() => {
    // Check admin session
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) {
      navigate('/admin/login');
      return;
    }

    const session = JSON.parse(adminSession);
    const sessionAge = Date.now() - session.timestamp;
    
    // Se a sessão for mais antiga que 24 horas, redirecionar para login
    if (sessionAge > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('admin_session');
      navigate('/admin/login');
      return;
    }
    
    // Extrair informações do usuário da sessão
    setUserInfo({
      email: session.email || '',
      companyName: session.companyName || '',
      id: session.id || '',
      nome: session.nome || session.email || '',
      dev: session.dev || 'N',
      resellerId: session.reseller_id || ''
    });
    
    console.log('Informações da sessão:', session);
    
    // Inicializar conversas vazias
    initializeEmptyConversations();
  }, [navigate]);
  
  // Função para inicializar o estado de conversas vazio
  const initializeEmptyConversations = () => {
    // As conversas reais serão carregadas posteriormente
    setConversations([]);
  };
  
  // Rolar para o final da conversa quando receber novas mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation, conversations]);
  
  // Função para filtrar as conversas com base nos filtros aplicados
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Filtro por status (aba selecionada)
      const statusMatch = conv.status === activeTab;
      
      // Filtro por setor
      const sectorMatch = selectedSector === 'all' || conv.sector === selectedSector;
      
      // Filtro por pesquisa
      const searchMatch = conv.contactName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return statusMatch && sectorMatch && searchMatch;
    });
  }, [conversations, activeTab, selectedSector, searchQuery]);
  
  // Obter a conversa atual selecionada
  const currentConversation = conversations.find(conv => conv.id === selectedConversation);
  
  // Formatar data para exibição
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const date = new Date(timestamp);
    
    const diff = now.getTime() - date.getTime();
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) { // Menos de 7 dias
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return days[date.getDay()];
    } else {
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  };

  // Função para enviar mensagem
  const sendMessage = async () => {
    if (!selectedConversation || !inputMessage.trim()) return;
    
    try {
      const conversation = conversations.find(c => c.id === selectedConversation);
      if (!conversation) return;
      
      // Adicionando mensagem otimisticamente à UI
      const newMessage: Message = {
        id: Date.now().toString(),
        content: inputMessage.trim(),
        sender: 'user',
        timestamp: new Date()
      };
      
      // Atualizar a conversa localmente
      setConversations(prevConversations => prevConversations.map(conv => {
        if (conv.id === selectedConversation) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessage: inputMessage.trim(),
            timestamp: new Date(),
            unreadCount: 0,
            // Se a conversa estava pendente, agora está em atendimento
            status: conv.status === 'pending' ? 'attending' : conv.status
          };
        }
        return conv;
      }));
      
      // Limpar o input
      setInputMessage('');
      
      // Enviar para a Evolution API se configurada
      if (evolutionApiConfig.baseUrl && evolutionApiConfig.apikey) {
        // Formatando o número do destinatário (removendo @c.us se presente)
        const recipient = conversation.id.replace('@c.us', '');
        
        await axios.post(`${evolutionApiConfig.baseUrl}/message/sendText/${recipient}`, {
          value: inputMessage.trim()
        }, {
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiConfig.apikey
          }
        });
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError('Falha ao enviar mensagem. Tente novamente.');
    }
  };

  // Buscar configurações da Evolution API
  useEffect(() => {
    // Somente buscar as configurações quando tivermos o ID da revenda
    if (!userInfo.resellerId) {
      console.log('Aguardando o ID da revenda ser carregado...');
      return;
    }
    
    const fetchEvolutionApiConfig = async () => {
      try {
        setIsLoading(true);
        
        console.log('Buscando configurações para a revenda ID:', userInfo.resellerId);
        
        // Buscar diretamente as configurações da revenda
        const { data, error: configError } = await supabase
          .from('nexochat_config')
          .select('*')
          .eq('reseller_id', userInfo.resellerId)
          .single();
          
        // Configuração específica da revenda
        const config = data;
          
        if (configError) {
          console.error('Erro ao buscar configurações da API:', configError);
          console.log('Detalhes da configuração tentada:', {
            tabela: 'nexochat_config',
            erro: configError,
            mensagem: configError.message,
            detalhes: configError.details
          });
          setError(`Erro ao carregar configurações do chat: ${configError.message}`);
          return;
        }
        
        console.log('Configuração retornada:', config);

        if (config) {
          // Atualizar quais setores estão habilitados
          setEnabledSectors({
            suporte: config.setor_suporte === true,
            comercial: config.setor_comercial === true,
            administrativo: config.setor_administrativo === true
          });
          
          // Aqui assumimos que a tabela de configuração tem campos para a URL base e apikey
          const baseUrl = typeof config.evolution_api_url === 'string' ? config.evolution_api_url : '';
          const apikey = typeof config.evolution_api_key === 'string' ? config.evolution_api_key : '';
          
          setEvolutionApiConfig({
            baseUrl,
            apikey
          });
          
          // Já carrega as conversas quando temos a configuração
          if (baseUrl && apikey) {
            fetchConversations(baseUrl, apikey);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar configurações:', err);
        setError('Erro ao buscar configurações do sistema.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvolutionApiConfig();
  }, [userInfo.resellerId]);

  // Implementar polling para atualização de novas mensagens a cada 30 segundos
  useEffect(() => {
    // Se não temos configurações ou instâncias, não faz polling
    if (!evolutionApiConfig.baseUrl || !evolutionApiConfig.apikey || whatsappInstances.length === 0) {
      console.log('Configuração incompleta para polling');
      return;
    }
    
    console.log('Configurando polling para novas mensagens...');
    
    // Limpar intervalo existente se houver
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Configurar intervalo para buscar novas mensagens a cada 30 segundos
    pollingIntervalRef.current = setInterval(() => {
      console.log('Buscando novas mensagens via polling...');
      fetchConversations(evolutionApiConfig.baseUrl, evolutionApiConfig.apikey);
    }, 30000); // 30 segundos
    
    // Limpar intervalo quando o componente for desmontado ou as configurações mudarem
    return () => {
      if (pollingIntervalRef.current) {
        console.log('Limpando intervalo de polling...');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [evolutionApiConfig.baseUrl, evolutionApiConfig.apikey, whatsappInstances]);

  // Buscar instâncias de WhatsApp associadas à revenda
  useEffect(() => {
    if (!userInfo.resellerId) return;
    
    const fetchWhatsappInstances = async () => {
      try {
        const { data, error } = await supabase
          .from('whatsapp_connections')
          .select('*')
          .eq('reseller_id', userInfo.resellerId);
          
        if (error) {
          console.error('Erro ao buscar instâncias de WhatsApp:', error);
          setError(`Erro ao obter instâncias de WhatsApp: ${error.message}`);
          return;
        }
        
        if (data && data.length > 0) {
          console.log('Instâncias de WhatsApp encontradas:', data);
          // Converter e garantir o tipo correto
          const typedInstances = data.map(instance => ({
            id: instance.id as string,
            instance_name: instance.instance_name as string,
            name: instance.name as string,
            phone: instance.phone as string,
            status: instance.status as string
          }));
          
          setWhatsappInstances(typedInstances);
          
          // Se temos instâncias e configurações, podemos buscar as conversas
          if (evolutionApiConfig.baseUrl && evolutionApiConfig.apikey) {
            console.log('Buscando conversas para as instâncias...');
            // Descomentar para buscar as conversas
            fetchConversations(evolutionApiConfig.baseUrl, evolutionApiConfig.apikey);
          }
        } else {
          console.log('Nenhuma instância de WhatsApp encontrada para esta revenda');
        }
      } catch (err) {
        console.error('Erro ao buscar instâncias de WhatsApp:', err);
      }
    };
    
    fetchWhatsappInstances();
  }, [userInfo.resellerId, evolutionApiConfig]);

  // Função para buscar todas as conversas
  const fetchConversations = async (baseUrl: string, apikey: string) => {
    try {
      setIsLoading(true);
      // Se não temos instâncias, usamos o endpoint padrão
      if (whatsappInstances.length === 0) {
        const response = await axios.get(`${baseUrl}/chat/fetchAllChats`, {
          headers: {
            'Content-Type': 'application/json',
            'apikey': apikey
          }
        });
        processConversationsResponse(response);
      } else {
        // Se temos instâncias, buscamos para cada uma delas
        for (const instance of whatsappInstances) {
          try {
            await fetchConversationsForInstance(baseUrl, apikey, instance.instance_name);
          } catch (err) {
            console.error(`Erro ao buscar conversas para instância ${instance.instance_name}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar todas as conversas:', err);
      setError('Falha ao carregar conversas. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para buscar conversas da Evolution API para uma instância específica
  const fetchConversationsForInstance = async (baseUrl: string, apikey: string, instanceName: string) => {
    try {
      console.log(`Buscando conversas para instância: ${instanceName}`);
      // Documentação: https://doc.evolution-api.com/v2/api-reference/get-information
      const response = await axios.get(`${baseUrl}/instance/fetchAllChats/${instanceName}`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': apikey
        }
      });

      processConversationsResponse(response);
    } catch (err) {
      console.error(`Erro ao buscar conversas para instância ${instanceName}:`, err);
    }
  };
  
  // Função para processar a resposta da API e converter para o formato do componente
  const processConversationsResponse = (response: any) => {
    if (response.data && response.data.chats) {
      // Convertendo os dados da API para o formato usado no componente
      const mappedConversations: Conversation[] = response.data.chats.map((chat: any) => {
        // Convertendo mensagens se disponíveis
        const messages: Message[] = chat.messages?.map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          content: msg.body || msg.content || '',
          sender: msg.fromMe ? 'user' : 'contact',
          timestamp: new Date(msg.timestamp * 1000 || Date.now())
        })) || [];

        // Status padrão é 'pending' a menos que já esteja sendo tratado
        const status: 'pending' | 'attending' | 'finished' = 'pending';

        return {
          id: chat.id || '',
          contactName: chat.name || chat.pushName || chat.number || 'Desconhecido',
          lastMessage: chat.lastMessage?.body || 'Sem mensagens',
          timestamp: new Date(chat.lastMessage?.timestamp * 1000 || Date.now()),
          unreadCount: chat.unreadCount || 0,
          messages: messages,
          avatarUrl: chat.profilePicUrl || undefined,
          status: status,
          sector: null // A definir com base em regras de negócio
        };
      });

      // Adicionar as novas conversas às existentes (evitando duplicatas pelo ID)
      setConversations(prevConversations => {
        const existingIds = new Set(prevConversations.map(c => c.id));
        const newConversations = mappedConversations.filter(c => !existingIds.has(c.id));
        return [...prevConversations, ...newConversations];
      });
    }
  };


  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className={`bg-[#2A2A2A] transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-16' : 'w-64'} h-screen flex flex-col border-r border-gray-800 relative z-10`}>
        {/* Toggle button */}
        <button 
          onClick={() => {
            const newState = !isSidebarCollapsed;
            setIsSidebarCollapsed(newState);
            localStorage.setItem('sidebar_collapsed', String(newState));
          }}
          className="absolute -right-3 top-[4.5rem] bg-emerald-500 text-white rounded-full p-1 shadow-md hover:bg-emerald-600 transition-colors z-10"
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        
        <div className="p-6 border-b border-gray-800 flex items-center justify-center">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <Database className="w-8 h-8 text-emerald-500 flex-shrink-0" />
            {!isSidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-white font-['MuseoModerno']">nexo</h1>
                <p className="text-sm text-gray-400">Painel de Controle</p>
              </div>
            )}
          </div>
        </div>

        <div className={`${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <ul className="px-2 py-4 space-y-1">
            <li>
              <button
                onClick={() => {}} // Placeholder para a função de abrir chat IA
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors group relative w-full`}
              >
                <MessageCircle size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
                {!isSidebarCollapsed && <span>Assistente IA</span>}
                
                {/* Tooltip quando o menu está retraído */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                    Assistente IA
                  </div>
                )}
              </button>
            </li>
            <li>
              <Link
                to="/admin/dashboard"
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors group relative`}
              >
                <BarChart2 size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
                {!isSidebarCollapsed && <span>Dashboard</span>}
                
                {/* Tooltip quando o menu está retraído */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                    Dashboard
                  </div>
                )}
              </Link>
            </li>
            
            {/* Novo item de menu para o Chat */}
            <li>
              <Link
                to="/admin/chat"
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white bg-[#3A3A3A] bg-opacity-70 transition-colors group relative`}
              >
                <MessageSquare size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
                {!isSidebarCollapsed && <span>Chat nexo</span>}
                
                {/* Tooltip quando o menu está retraído */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                    Chat nexo
                  </div>
                )}
              </Link>
            </li>
            
            <li>
              <Link
                to="/admin/dashboard"
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors group relative`}
              >
                <Store size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
                {!isSidebarCollapsed && <span>Users nexo</span>}
                
                {/* Tooltip quando o menu está retraído */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                    Users nexo
                  </div>
                )}
              </Link>
            </li>

            <li>
              <Link
                to="/admin/settings"
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors group relative`}
              >
                <SettingsIcon size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
                {!isSidebarCollapsed && <span>Configurações</span>}
                
                {/* Tooltip quando o menu está retraído */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                    Configurações
                  </div>
                )}
              </Link>
            </li>

            {userInfo.dev === 'S' && (
              <div className="mt-4">
                <Link
                  to="/admin/resellers"
                  className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-[#3A3A3A] hover:bg-opacity-70 transition-colors group relative`}
                >
                  <Users size={isSidebarCollapsed ? 22 : 18} className="text-emerald-500" />
                  {!isSidebarCollapsed && <span>Revendas</span>}
                  
                  {/* Tooltip quando o menu está retraído */}
                  {isSidebarCollapsed && (
                    <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                      Revendas
                    </div>
                  )}
                </Link>
              </div>
            )}
          </ul>

          <div className="mt-auto">
            <button
              onClick={() => {
                localStorage.removeItem('admin_session');
                navigate('/admin/login');
              }}
              className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-white hover:bg-red-500 hover:bg-opacity-10 text-red-500 w-full group relative`}
            >
              <LogOut size={isSidebarCollapsed ? 22 : 18} />
              {!isSidebarCollapsed && <span>Sair</span>}
              
              {/* Tooltip quando o menu está retraído */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-2 bg-[#3A3A3A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                  Sair
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Usuario logado */}
        <div className="mt-auto border-t border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            {isSidebarCollapsed ? (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-xs text-white">{userInfo.email.substring(0, 1).toUpperCase()}</span>
              </div>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="text-xs text-white">{userInfo.email.substring(0, 1).toUpperCase()}</span>
                </div>
                <div className="truncate">
                  <p className="truncate w-40">{userInfo.email}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Chat Interface */}
      <div className="flex-1 bg-[#1C1C1C] flex flex-col">
        {/* Chat Interface */}
        <div className="flex flex-1 overflow-hidden">
          {/* Lista de Conversas (WhatsApp Style) */}
          <div className="w-80 h-full border-r border-gray-800 flex flex-col">
            {/* Abas e Filtros */}
            <div className="border-b border-gray-800">
              {/* Abas Pendentes/Atendendo */}
              <div className="flex border-b border-gray-700">
                <button
                  className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${activeTab === 'pending' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => setActiveTab('pending')}
                >
                  Pendentes
                  {filteredConversations.filter(conv => conv.status === 'pending').length > 0 && (
                    <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      {filteredConversations.filter(conv => conv.status === 'pending').length}
                    </span>
                  )}
                </button>
                <button
                  className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${activeTab === 'attending' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => setActiveTab('attending')}
                >
                  Atendendo
                  {filteredConversations.filter(conv => conv.status === 'attending').length > 0 && (
                    <span className="bg-yellow-500 text-gray-900 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {filteredConversations.filter(conv => conv.status === 'attending').length}
                    </span>
                  )}
                </button>
                <button
                  className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${activeTab === 'finished' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => setActiveTab('finished')}
                >
                  Finalizados
                </button>
              </div>
              
              {/* Filtro de Setor */}
              <div className="px-4 pt-4">
                <label htmlFor="sector" className="block text-sm font-medium text-gray-400 mb-1">Setor</label>
                <select
                  id="sector"
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value as any)}
                  className="w-full p-2 bg-[#2A2A2A] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Todos os setores</option>
                  {enabledSectors.suporte && <option value="suporte">Suporte Técnico</option>}
                  {enabledSectors.comercial && <option value="comercial">Comercial</option>}
                  {enabledSectors.administrativo && <option value="administrativo">Administrativo</option>}
                </select>
              </div>
            </div>
            
            {/* Campo de Pesquisa */}
            <div className="p-3 border-b border-gray-800" data-component-name="ChatNexo">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Pesquisar conversas..."
                  className="w-full pl-10 pr-4 py-2 bg-[#2A2A2A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* Lista de Conversas */}
            <div className="flex-1 overflow-y-auto" data-component-name="ChatNexo">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conversa encontrada</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`cursor-pointer p-3 border-b border-gray-800 hover:bg-[#2A2A2A] transition-colors ${selectedConversation === conv.id ? 'bg-[#2A2A2A]' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium">{conv.contactName.substring(0, 2).toUpperCase()}</span>
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-white truncate">{conv.contactName}</h3>
                          <span className="text-xs text-gray-400">{formatTimestamp(conv.timestamp)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-sm text-gray-400 truncate">{conv.lastMessage}</p>
                          {conv.unreadCount > 0 && (
                            <div className="ml-2 bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                              {conv.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Área de Chat */}
          <div className="flex-1 flex flex-col">
            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                  <p>Carregando conversas...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-600 text-white p-2 text-center">
                {error}
                <button 
                  className="ml-2 underline" 
                  onClick={() => setError(null)}
                >
                  Fechar
                </button>
              </div>
            )}
            
            {currentConversation ? (
              <>
                {/* Cabeçalho da Conversa */}
                <div className="p-4 border-b border-gray-800 bg-[#2A2A2A] flex items-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center mr-3">
                    <span className="text-white">{currentConversation.contactName.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{currentConversation.contactName}</h3>
                    <p className="text-xs text-gray-400">Online</p>
                  </div>
                </div>
                
                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto p-4 bg-[#1A1A1A]">
                  {currentConversation.messages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`mb-4 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender === 'user' 
                            ? 'bg-emerald-600 text-white rounded-tr-none' 
                            : 'bg-[#2A2A2A] text-white rounded-tl-none'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1 text-right">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input de Mensagem */}
                <div className="p-4 border-t border-gray-800 bg-[#2A2A2A]">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Digite uma mensagem..."
                      className="flex-1 py-3 px-4 bg-[#1A1A1A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim()}
                      className={`p-3 rounded-full ${
                        !inputMessage.trim() 
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-[#1A1A1A] text-gray-400">
                <MessageSquare size={64} className="mb-4 opacity-50" />
                <h2 className="text-xl font-medium mb-2">Nenhuma conversa selecionada</h2>
                <p>Selecione uma conversa para começar a trocar mensagens</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
