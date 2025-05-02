import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Database, Users, LogOut, BarChart2, Store, ChevronLeft, ChevronRight, Settings as SettingsIcon, MessageCircle, Send, X, Search, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'contact';
  timestamp: Date;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'contact';
  timestamp: Date;
}

type ConversationStatus = 'pending' | 'attending' | 'finished';

// Tipo para uma conversa
type Conversation = {
  id: string;
  contactName: string;
  lastMessage: string;
  timestamp: Date | string;
  status: ConversationStatus;
  messages: ChatMessage[];
  sector: string | null;
  unreadCount: number;
  avatarUrl?: string;
}

export default function ChatNexo() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ConversationStatus>('pending');
  const [selectedSector, setSelectedSector] = useState<'all' | 'suporte' | 'comercial' | 'administrativo'>('all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebar_collapsed');
    return savedState === null ? true : savedState === 'true';
  });
  const [error, setError] = useState<string | null>(null);
  
  // Estado para controlar a abertura do dropdown do menu
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  
  // Referência para o container do menu dropdown
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Fechar o menu dropdown quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
    }
    
    // Adicionar event listener quando o menu estiver aberto
    if (isActionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Limpar event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionMenuOpen]);
  
  const [isLoading, setIsLoading] = useState(false);
  // Flag para saber se os status já foram carregados do banco de dados
  const [statusLoaded, setStatusLoaded] = useState(false);
  // Configuração da Evolution API
  const [evolutionApiConfig, setEvolutionApiConfig] = useState({
    baseUrl: 'https://apiwhatsapp.nexopdv.com',
    apikey: '429683C4C977415CAAFCCE10F7D57E11'
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
  
  // Referência para a conexão Socket.io
  const socketRef = useRef<Socket | null>(null);
  
  const [userInfo, setUserInfo] = useState({
    email: '',
    companyName: '',
    id: '',
    nome: '',
    dev: 'N',
    resellerId: ''
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
    
    // Carregar status salvos quando o componente montar
    loadConversationStatuses();
    
    // Garantir que os status sejam respeitados após carregar as conversas também
    return () => {
      setStatusLoaded(false); // Reset para garantir carregamento na próxima montagem
    };
  }, [navigate]);
  
  // Função para inicializar o estado de conversas vazio
  const initializeEmptyConversations = () => {
    // As conversas reais serão carregadas posteriormente
    setConversations([]);
  };
  
  // Função para salvar o status e contador de não lidas da conversa no localStorage
  const saveStatusToLocalStorage = (conversationId: string, status: ConversationStatus, unreadCount?: number) => {
    try {
      // Obter dados atuais
      const savedStatuses = localStorage.getItem('nexochat_statuses');
      let statusMap = savedStatuses ? JSON.parse(savedStatuses) : {};
      
      // Adicionar/atualizar status da conversa
      const statusInfo: any = {
        status,
        updatedAt: new Date().toISOString(),
        resellerId: userInfo.resellerId,
        profileAdminId: userInfo.id
      };
      
      // Adicionar contador de não lidas se fornecido
      if (unreadCount !== undefined) {
        statusInfo.unreadCount = unreadCount;
      } else if (statusMap[conversationId]?.unreadCount !== undefined) {
        // Manter o valor anterior se existir e não for fornecido um novo
        statusInfo.unreadCount = statusMap[conversationId].unreadCount;
      }
      
      // Atualizar no mapa
      statusMap[conversationId] = statusInfo;
      
      // Salvar atualização
      localStorage.setItem('nexochat_statuses', JSON.stringify(statusMap));
      console.log(`Status da conversa ${conversationId} salvo no localStorage: ${status} (Não lidas: ${unreadCount !== undefined ? unreadCount : 'não alterado'})`);
    } catch (error) {
      console.error('Erro ao salvar status no localStorage:', error);
    }
  };
  
  // Função para salvar o status e contador de não lidas da conversa no banco de dados
  const saveStatusToDatabase = async (conversationId: string, status: ConversationStatus, unreadCount?: number) => {
    try {
      // Verificar se tem informações do usuário
      if (!userInfo.id || !userInfo.resellerId) {
        console.error('Informações do usuário não disponíveis');
        return;
      }
      
      // Dados para inserção/atualização
      const statusData: any = {
        conversation_id: conversationId,
        status,
        reseller_id: userInfo.resellerId,
        profile_admin_id: userInfo.id,
        profile_admin_user_id: userInfo.email,
        updated_at: new Date().toISOString()
      };
      
      // Adicionar contador de não lidas se fornecido
      if (unreadCount !== undefined) {
        statusData.unread_count = unreadCount;
      }
      
      // Usar upsert para inserir ou atualizar o registro
      const { error } = await supabase
        .from('nexochat_status')
        .upsert(statusData, { 
          onConflict: 'conversation_id,profile_admin_id'
        });
      
      if (error) {
        throw error;
      }
      
      console.log(`Status da conversa ${conversationId} salvo no banco de dados: ${status} (Não lidas: ${unreadCount !== undefined ? unreadCount : 'não alterado'})`);
    } catch (error) {
      console.error('Erro ao salvar status no banco de dados:', error);
      // Se falhar, salvar no localStorage como backup
      saveStatusToLocalStorage(conversationId, status, unreadCount);
    }
  };
  
  // Função para carregar os status das conversas
  const loadConversationStatuses = async () => {
    try {
      // Evitar carregar múltiplas vezes
      if (statusLoaded) return;
      
      // Verificar se tem informações do usuário
      if (!userInfo.id || !userInfo.resellerId) {
        console.error('Informações do usuário não disponíveis para carregar status');
        return;
      }
      
      console.log('Carregando status das conversas...');
      
      // Tentar carregar do banco de dados
      const { data, error } = await supabase
        .from('nexochat_status')
        .select('conversation_id, status, unread_count')
        .eq('profile_admin_id', userInfo.id)
        .eq('reseller_id', userInfo.resellerId);
      
      if (error) {
        throw error;
      }
      
      // Mapear para armazenar os status e contagens mais recentes primeiro do DB, depois do localStorage
      const statusMap: Record<string, {status: ConversationStatus, unreadCount?: number}> = {};
      
      // Se tiver dados no banco de dados
      if (data && data.length > 0) {
        console.log(`Carregados ${data.length} status de conversas do banco de dados`);
        
        data.forEach(item => {
          statusMap[item.conversation_id] = {
            status: item.status as ConversationStatus,
            unreadCount: item.unread_count
          };
        });
        console.log('Status e contagens carregados do DB:', statusMap);
      }
      
      // Tentar também carregar do localStorage (prioridade menor que o banco)
      try {
        const savedStatuses = localStorage.getItem('nexochat_statuses');
        if (savedStatuses) {
          const localStatusMap = JSON.parse(savedStatuses);
          
          // Verificar se há status salvos
          const savedConversations = Object.keys(localStatusMap);
          if (savedConversations.length > 0) {
            console.log(`Carregados ${savedConversations.length} status de conversas do localStorage`);
            
            // Adicionar ao mapa apenas se não existir no banco de dados
            savedConversations.forEach(convId => {
              if (!statusMap[convId]) {
                const statusInfo = localStatusMap[convId];
                if (statusInfo && statusInfo.resellerId === userInfo.resellerId) {
                  statusMap[convId] = {
                    status: statusInfo.status as ConversationStatus,
                    unreadCount: statusInfo.unreadCount // Incluir a contagem de não lidas
                  };
                }
              }
            });
          }
        }
      } catch (localStorageError) {
        console.error('Erro ao carregar status do localStorage:', localStorageError);
      }
      
      // Aplicar os status e contagens para as conversas
      if (Object.keys(statusMap).length > 0) {
        console.log('Aplicando status e contagens às conversas:', statusMap);
        
        setConversations(prevConversations => {
          return prevConversations.map(conv => {
            if (statusMap[conv.id]) {
              const conversationData = statusMap[conv.id];
              return {
                ...conv,
                status: conversationData.status,
                unreadCount: conversationData.unreadCount !== undefined ? conversationData.unreadCount : conv.unreadCount || 0
              };
            }
            return conv;
          });
        });
      }
      
      // Marcar como carregado
      setStatusLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar status das conversas:', error);
    }
  };
  
  // Função para atualizar o status de uma conversa
  const updateConversationStatus = (conversationId: string, newStatus: ConversationStatus) => {
    // Obter contagem de mensagens não lidas atual
    const conversation = conversations.find(c => c.id === conversationId);
    const currentUnreadCount = conversation?.unreadCount || 0;
    
    // Se mudar para 'pending' ou 'attending', a contagem não muda
    // Se mudar para 'finished', zeramos a contagem
    const updatedUnreadCount = newStatus === 'finished' ? 0 : currentUnreadCount;
    
    // Atualizar estado local
    setConversations(prevConversations => {
      return prevConversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            status: newStatus,
            unreadCount: updatedUnreadCount // Atualizar contagem se necessário
          };
        }
        return conv;
      });
    });
    
    // Salvar no banco de dados
    saveStatusToDatabase(conversationId, newStatus, updatedUnreadCount);
    
    // Salvar no localStorage como backup
    saveStatusToLocalStorage(conversationId, newStatus, updatedUnreadCount);
    
    console.log(`Status da conversa ${conversationId} atualizado para: ${newStatus} (Não lidas: ${updatedUnreadCount})`);
  };
  
  // Rolar para o final da conversa quando receber novas mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation, conversations]);
  
  // Função para filtrar as conversas com base nos filtros aplicados
  const filteredConversations = useMemo(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
    
    return conversations.filter(conv => {
      // Filtro por status (aba selecionada)
      const statusMatch = conv.status === activeTab;
      
      // Filtro por setor
      const sectorMatch = selectedSector === 'all' || conv.sector === selectedSector;
      
      // Filtro por pesquisa
      const searchMatch = conv.contactName.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Para conversas finalizadas, verificar se são do dia atual
      let dateMatch = true;
      if (activeTab === 'finished') {
        // Converter timestamp para objeto Date, lidar com string ou Date
        const convTimestamp = typeof conv.timestamp === 'string' 
          ? new Date(conv.timestamp).getTime() 
          : conv.timestamp.getTime();
          
        // Verificar se a data está dentro do dia atual
        dateMatch = convTimestamp >= startOfDay && convTimestamp <= endOfDay;
      }
      
      return statusMatch && sectorMatch && searchMatch && dateMatch;
    });
  }, [conversations, activeTab, selectedSector, searchQuery]);
  
  // Obter a conversa atual selecionada
  const currentConversation = conversations.find(conv => conv.id === selectedConversation);
  
  // Formatar data para exibição
  const formatTimestamp = (timestamp: Date | string) => {
    const now = new Date();
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
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
      const newMessage: ChatMessage = {
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

  // Verifique se já temos configuração no localStorage para acelerar a inicialização
  useEffect(() => {
    const savedConfig = localStorage.getItem('nexochat_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        console.log('Usando configuração salva no localStorage:', {
          baseUrl: config.baseUrl,
          apikey: config.apikey ? '*****' : 'não configurada',
          instanceName: config.instanceName
        });
        
        setEvolutionApiConfig({
          baseUrl: config.baseUrl,
          apikey: config.apikey
        });
        
        if (config.instanceName) {
          setWhatsappInstances([{
            id: config.instanceName,
            instance_name: config.instanceName,
            name: `WhatsApp ${config.instanceName}`,
            phone: config.instanceName,
            status: 'active'
          }]);
          
          // Verificar status imediatamente ao carregar
          setTimeout(() => {
            checkInstanceStatus(config.baseUrl, config.apikey, config.instanceName);
            // Buscar mensagens após verificar status
            fetchConversations(config.baseUrl, config.apikey);
            // Iniciar conexão Socket.io
            connectSocketIO(config.baseUrl, config.instanceName, config.apikey);
          }, 500);
        }
      } catch (e) {
        console.error('Erro ao carregar configuração do localStorage:', e);
        // Se falhar em carregar do localStorage, continuar com fluxo normal
      }
    }
  }, []);

  // Buscar configurações da Evolution API do banco de dados
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
          setError(`Erro ao carregar configurações da API: ${configError.message}`);
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
          
          // Verificar se há configurações da API e instância
          if (!config.evolution_api_url || !config.evolution_api_key || !config.instance_name) {
            setError('Configuração incompleta. Verifique a URL da API, API Key e nome da instância.');
            console.error('Configuração incompleta:', {
              url: config.evolution_api_url ? 'OK' : 'Faltando',
              apiKey: config.evolution_api_key ? 'OK' : 'Faltando',
              instancia: config.instance_name ? 'OK' : 'Faltando'
            });
            return;
          }
          
          // Usar configurações do banco
          const baseUrl = typeof config.evolution_api_url === 'string' ? config.evolution_api_url : '';
          const apikey = typeof config.evolution_api_key === 'string' ? config.evolution_api_key : '';
          const instanceName = typeof config.instance_name === 'string' ? config.instance_name : '';
          
          console.log('Configuração completa detectada:', { 
            baseUrl,
            apikey: apikey ? '*****' : 'não configurada',
            instanceName 
          });
          
          // Salvar no localStorage para carregamento rápido nas próximas vezes
          localStorage.setItem('nexochat_config', JSON.stringify({
            baseUrl,
            apikey,
            instanceName
          }));
          
          // Atualizar configuração
          setEvolutionApiConfig({
            baseUrl,
            apikey
          });
          
          // Definir instância associada à revenda diretamente
          setWhatsappInstances([{
            id: instanceName,
            instance_name: instanceName,
            name: `WhatsApp ${instanceName}`,
            phone: instanceName,
            status: 'active'
          }]);
          
          // Agora que temos a instância configurada, buscar mensagens automaticamente
          setTimeout(() => {
            fetchConversations(baseUrl, apikey);
          }, 1000);
          
          // Verificar status da instância em segundo plano e DEPOIS buscar mensagens
          setTimeout(async () => {
            await checkInstanceStatus(baseUrl, apikey, instanceName);
            // Após verificar o status, buscar mensagens
            fetchConversations(baseUrl, apikey);
            // Iniciar conexão Socket.io
            connectSocketIO(baseUrl, instanceName, apikey);
          }, 500);
        } else {
          setError('Configuração da API não encontrada para esta revenda.');
        }
      } catch (err) {
        console.error('Erro ao buscar configurações:', err);
        setError(`Erro ao buscar configurações do sistema: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvolutionApiConfig();
  }, [userInfo.resellerId]);
  
  // Função para verificar o status da instância no servidor
  const checkInstanceStatus = async (baseUrl: string, apikey: string, instanceName: string) => {
    console.log(`Verificando status para instância real: ${instanceName}`);
    try {
      setError(null);
      setIsLoading(true);
      console.log(`Verificando status da instância ${instanceName} em: ${baseUrl}`);
      
      // Verificar se a URL e instância são válidas
      if (!baseUrl || !instanceName) {
        throw new Error('URL da API ou nome da instância não definidos');
      }
      
      // Adiciona um console.log para ver os cabeçalhos que estão sendo enviados
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Só adiciona apikey se ela não estiver vazia
      if (apikey && apikey.trim() !== '') {
        headers['apikey'] = apikey;
      }
      
      console.log('Enviando requisição para verificar status com headers:', headers);
      
      // Tentar verificar o status da instância
      try {
        // Verificar status da instância específica
        const statusResponse = await axios.get(`${baseUrl}/instance/connectionState/${instanceName}`, {
          headers: headers
        });
        
        console.log(`Status da instância ${instanceName}:`, statusResponse.data);
        
        // Independente da resposta, vamos considerar a instância válida
        setWhatsappInstances([{
          id: instanceName,
          instance_name: instanceName,
          name: `WhatsApp ${instanceName}`,
          phone: instanceName,
          status: statusResponse.data?.state || 'active'
        }]);
        
        console.log(`Instância ${instanceName} configurada com sucesso`);
        setError(null);
        return true;
      } catch (err) {
        console.error(`Erro ao verificar status da instância ${instanceName}:`, err);
        
        // Mesmo com erro, vamos tentar usar a instância configurada
        setWhatsappInstances([{
          id: instanceName,
          instance_name: instanceName,
          name: `WhatsApp ${instanceName}`,
          phone: instanceName,
          status: 'unknown'
        }]);
        
        console.log(`Configurando instância ${instanceName} mesmo sem confirmação de status`);
        return true;
      }
    } catch (err) {
      console.error('Erro ao verificar status da instância:', err);
      setError(`Falha ao verificar status da instância: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Função para conectar ao Socket.io da Evolution API
  const connectSocketIO = (baseUrl: string, instanceName: string, apikey: string) => {
    // Fechar conexão existente se houver
    if (socketRef.current) {
      console.log('Fechando conexão Socket.io existente');
      socketRef.current.disconnect();
    }
    
    try {
      console.log(`Conectando Socket.io para instância ${instanceName} em ${baseUrl} com apikey: ${apikey.substring(0, 5)}...`);
      
      // Verificar se baseUrl tem o formato correto
      if (!baseUrl) {
        console.error('URL base inválida para conexão Socket.io');
        return;
      }
      
      if (!instanceName) {
        console.error('Nome da instância inválido para conexão Socket.io');
        return;
      }
      
      // Configurar opções do Socket.io com debug habilitado
      console.log('Socket.io configurando com opções:', {
        transports: ['websocket', 'polling'],
        query: { instance: instanceName },
        // Não logamos a apikey completa por segurança
      });
      
      const socket = io(baseUrl, {
        transports: ['websocket', 'polling'],
        query: {
          instance: instanceName
        },
        extraHeaders: {
          'apikey': apikey
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      // Monitorar todos os eventos do Socket
      socket.onAny((event, ...args) => {
        console.log(`Socket.io evento recebido: ${event}`, args);
      });
      
      // Evento de conexão
      socket.on('connect', () => {
        console.log(`Socket.io conectado! Socket ID: ${socket.id}`);
        
        // Enviar mensagem de inscrição em eventos
        const subscribeMessage = {
          action: 'subscribe',
          instance: instanceName
        };
        console.log('Enviando mensagem de inscrição:', subscribeMessage);
        socket.emit('subscribe', subscribeMessage);
        
        // Também tentar se inscrever com outros formatos que podem ser usados pela API
        console.log('Tentando inscrição alternativa');
        socket.emit('subscribe', instanceName);
      });
      
      // Confirmação de inscrição
      socket.on('subscribed', (data) => {
        console.log('Inscrição confirmada no Socket.io:', data);
      });
      
      // Desconexão
      socket.on('disconnect', (reason) => {
        console.log(`Socket.io desconectado. Razão: ${reason}`);
      });
      
      // Evento connect_error - importante para depurar problemas de conexão
      socket.on('connect_error', (error) => {
        console.error('Erro de conexão Socket.io:', error.message);
      });
      
      // Evento connect_timeout
      socket.on('connect_timeout', () => {
        console.error('Timeout na conexão Socket.io');
      });
      
      // Evento de erro
      socket.on('error', (error) => {
        console.error('Erro no Socket.io:', error);
      });
      
            // Função para verificar se a mensagem é recebida (de um contato)
      const isMessageFromContact = (data: any): boolean => {
        if (!data) return false;
        
        // Verificar formato direto da mensagem
        if (data.key && data.key.fromMe === false) {
          return true;
        }
        
        // Verificar se é um array de mensagens
        if (Array.isArray(data)) {
          return data.some((msg: any) => msg.key && msg.key.fromMe === false);
        }
        
        // Verificar dentro da estrutura aninhada
        if (data.data && Array.isArray(data.data)) {
          return data.data.some((msg: any) => msg.key && msg.key.fromMe === false);
        }
        
        // Verificar formato message.upsert comum
        if (data.type === 'notify' && data.messages && Array.isArray(data.messages)) {
          return data.messages.some((msg: any) => msg.key && msg.key.fromMe === false);
        }
        
        // Verificar no formato messages.records
        if (data.messages && data.messages.records && Array.isArray(data.messages.records)) {
          return data.messages.records.some((msg: any) => msg.key && msg.key.fromMe === false);
        }
        
        return false;
      };
      
      // Função para normalizar o ID do contato (remover sufixos e formatar consistentemente)
      const normalizeContactId = (contactId: string): string => {
        // Remover sufixos como @s.whatsapp.net, @c.us, etc.
        let normalizedId = contactId;
        
        // Remover o trecho após o : para IDs como 123456789:12@s.whatsapp.net
        if (normalizedId.includes(':')) {
          normalizedId = normalizedId.split(':')[0] + '@' + normalizedId.split('@')[1];
        }
        
        // Manter apenas a parte do número/identificador
        if (normalizedId.includes('@')) {
          normalizedId = normalizedId.split('@')[0];
        }
        
        console.log(`ID normalizado: ${contactId} -> ${normalizedId}`);
        return normalizedId;
      };
      
      // Função para extrair o ID do contato (remoteJid) da mensagem
      const extractContactId = (data: any): string | null => {
        if (!data) return null;
        
        // Logar estrutura para debug
        //console.log('Evento recebido:', JSON.stringify(data, null, 2));
        
        try {
          // CASO 1: messages.upsert (formato mais comum na Evolution API)
          if (data.type === 'notify' && data.messages && Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              if (msg.key && msg.key.remoteJid && msg.key.fromMe === false) {
                console.log(`ID encontrado no formato notify: ${msg.key.remoteJid}`);
                return normalizeContactId(msg.key.remoteJid);
              }
            }
          }
          
          // CASO 2: formato direto (key.remoteJid)
          if (data.key && data.key.remoteJid) {
            console.log(`ID encontrado direto: ${data.key.remoteJid}`);
            return normalizeContactId(data.key.remoteJid);
          }
          
          // CASO 3: array de mensagens
          if (Array.isArray(data)) {
            const msg = data.find((msg: any) => msg.key && msg.key.remoteJid && msg.key.fromMe === false);
            if (msg?.key?.remoteJid) {
              console.log(`ID encontrado em array: ${msg.key.remoteJid}`);
              return normalizeContactId(msg.key.remoteJid);
            }
          }
          
          // CASO 4: aninhado em data.data
          if (data.data && Array.isArray(data.data)) {
            const msg = data.data.find((msg: any) => msg.key && msg.key.remoteJid && msg.key.fromMe === false);
            if (msg?.key?.remoteJid) {
              console.log(`ID encontrado em data.data: ${msg.key.remoteJid}`);
              return normalizeContactId(msg.key.remoteJid);
            }
          }
          
          // CASO 5: aninhado em messages (sem ser notify)
          if (data.messages && Array.isArray(data.messages)) {
            const msg = data.messages.find((msg: any) => msg.key && msg.key.remoteJid && msg.key.fromMe === false);
            if (msg?.key?.remoteJid) {
              console.log(`ID encontrado em messages: ${msg.key.remoteJid}`);
              return normalizeContactId(msg.key.remoteJid);
            }
          }
          
          // CASO 6: aninhado em messages.records
          if (data.messages && data.messages.records && Array.isArray(data.messages.records)) {
            const msg = data.messages.records.find((msg: any) => msg.key && msg.key.remoteJid && msg.key.fromMe === false);
            if (msg?.key?.remoteJid) {
              console.log(`ID encontrado em records: ${msg.key.remoteJid}`);
              return normalizeContactId(msg.key.remoteJid);
            }
          }
        } catch (error) {
          console.error('Erro ao extrair ID do contato:', error);
        }
        
        console.log('Não foi possível encontrar o ID do contato no evento!');
        return null;
      };
      
      // Função para incrementar o contador de mensagens não lidas
      const incrementUnreadCount = (contactId: string): void => {
        console.log(`❌❌❌ INCREMENTANDO CONTADOR para: ${contactId} ❌❌❌`);
        
        // Primeiro normalizar o contactId para garantir correspondência
        const normalizedId = normalizeContactId(contactId);
        
        // Verificar se o ID normalizado está no formato esperado
        console.log(`ID normalizado para incremento: ${normalizedId}`);
        
        setConversations(prevConversations => {
          // Log dos IDs existentes para debug
          console.log('IDs das conversas existentes:', 
            prevConversations.map(c => `${c.id} (${c.contactName}) - normalizado: ${normalizeContactId(c.id)}`))
            
          // Primeiro tentar pela ID exata
          let matchFound = false;
          const updatedConversations = prevConversations.map(conv => {
            // Verificar pelo ID exato ou pelo ID normalizado
            const convNormalizedId = normalizeContactId(conv.id);
            
            if (conv.id === contactId || convNormalizedId === normalizedId) {
              matchFound = true;
              const newCount = (conv.unreadCount || 0) + 1;
              console.log(`✅ Contador atualizado: ${conv.contactName} - ${newCount} mensagens não lidas`);
              
              // Atualizar contador no banco de dados
              saveStatusToDatabase(conv.id, conv.status, newCount);
              
              return {
                ...conv,
                unreadCount: newCount
              };
            }
            return conv;
          });
          
          if (!matchFound) {
            console.warn(`⚠️ AVISO: Nenhuma conversa encontrada com ID ${contactId} ou normalizado ${normalizedId}`);
          }
          
          return updatedConversations;
        });
      };
      
      // Função para processar mensagens recebidas via Socket.io e atualizar o estado
      const processSocketMessages = (data: any): void => {
        console.log('Processando mensagens recebidas via Socket.io:', data);
        
        // Verificar e formatar os dados corretamente
        if (!data) return;
        
        let messagesArray: any[] = [];
        
        // Normalizar os dados para ter um formato consistente - a Evolution API pode enviar em diferentes formatos
        if (Array.isArray(data)) {
          messagesArray = data;
        } else if (data.data && Array.isArray(data.data)) {
          messagesArray = data.data;
        } else if (data.messages && Array.isArray(data.messages)) {
          messagesArray = data.messages;
        } else if (data.messages && data.messages.records && Array.isArray(data.messages.records)) {
          messagesArray = data.messages.records;
        } else {
          // Como último recurso, vamos tentar extrair mensagens de qualquer estrutura
          const possibleMessages = extractMessages(data);
          if (possibleMessages.length > 0) {
            messagesArray = possibleMessages;
          } else {
            console.warn('Formato de dados desconhecido recebido via Socket.io:', data);
            return;
          }
        }
        
        if (messagesArray.length === 0) {
          console.log('Nenhuma mensagem para processar');
          return;
        }
        
        console.log(`Processando ${messagesArray.length} mensagens recebidas via Socket.io`);
        
        // Construir o formato que a função processConversationsResponse espera
        const formattedData = {
          data: {
            messages: {
              records: messagesArray
            }
          }
        };
        
        // Usar a função já existente para processar as mensagens
        // Como ela já atualiza o estado interno via setConversations, não precisamos
        // retornar nada ou fazer mais nada aqui
        processConversationsResponse(formattedData);
      };
      
      // Função auxiliar para extrair mensagens de qualquer estrutura de dados
      const extractMessages = (obj: any): any[] => {
        if (!obj || typeof obj !== 'object') return [];
        
        // Se for um array, verificar se tem estrutura de mensagem WhatsApp
        if (Array.isArray(obj)) {
          // Verificar se parece uma mensagem WhatsApp (tem key ou remoteJid)
          if (obj.some(item => item.key || item.remoteJid)) {
            return obj;
          }
          
          // Senão, procurar recursivamente em cada item do array
          let result: any[] = [];
          for (const item of obj) {
            result = [...result, ...extractMessages(item)];
          }
          return result;
        }
        
        // Verificar se o objeto tem formato de mensagem WhatsApp
        if (obj.key || obj.remoteJid) {
          return [obj];
        }
        
        // Procurar mensagens em todas as propriedades do objeto
        let result: any[] = [];
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result = [...result, ...extractMessages(obj[key])];
          }
        }
        
        return result;
      };
      
      // Adicionar evento para qualquer mensagem (debug)
      socket.onAny((eventName, ...args) => {
        console.log(`Evento Socket.io recebido: ${eventName}`, args);
      });
      
      // Log para facilitar debug
      console.log('Contagem atual de não lidas:', conversations.map(c => `${c.contactName}: ${c.unreadCount}`));
      
      // Eventos específicos da Evolution API - usando registro direto para todos os formatos possíveis
      socket.on('MESSAGES_UPSERT', (data) => {
        console.log('⚫⚫⚫ Evento MESSAGES_UPSERT recebido ⚫⚫⚫');
        
        // Extrair o remoteJid (ID do contato) da mensagem e verificar se é mensagem recebida
        const contactId = extractContactId(data);
        
        // Se tiver um ID de contato, é porque é uma mensagem recebida válida
        if (contactId) {
          console.log(`Mensagem recebida de: ${contactId}`);
          
          // Normalizar o ID selecionado também para comparação
          const normalizedSelected = selectedConversation ? normalizeContactId(selectedConversation) : null;
          const normalizedContact = normalizeContactId(contactId);
          
          // Verificar se é o chat atual ou não
          if (normalizedContact !== normalizedSelected) {
            console.log(`💬 Nova mensagem para conversa não selecionada: ${contactId}`);
            console.log(`Chat atual: ${selectedConversation}, normalizado: ${normalizedSelected}`);
            incrementUnreadCount(contactId);
          } else {
            console.log(`Mensagem para o chat atual: ${contactId} == ${selectedConversation}. Não incrementando.`);
          }
        } else {
          console.log('Dados recebidos não contêm ID de contato válido ou não é mensagem recebida.');
        }
        
        // Processar as mensagens normalmente para atualizar a UI
        processSocketMessages(data);
      });
      
      socket.on('messages.upsert', (data) => {
        console.log('Evento messages.upsert recebido:', data);
        
        // Verificar se a mensagem é recebida (não enviada por nós)
        const isIncomingMessage = isMessageFromContact(data);
        
        // Se for mensagem recebida e não estiver com o chat aberto, incrementar contador
        if (isIncomingMessage) {
          // Extrair o remoteJid (ID do contato) da mensagem
          const contactId = extractContactId(data);
          
          if (contactId && contactId !== selectedConversation) {
            // Incrementar contagem de não lidas apenas se o chat não estiver selecionado
            incrementUnreadCount(contactId);
          }
        }
        
        processSocketMessages(data);
      });
      
      socket.on('message', (data) => {
        console.log('Evento message recebido:', data);
        
        // Verificar se a mensagem é recebida (não enviada por nós)
        const isIncomingMessage = isMessageFromContact(data);
        
        // Se for mensagem recebida e não estiver com o chat aberto, incrementar contador
        if (isIncomingMessage) {
          // Extrair o remoteJid (ID do contato) da mensagem
          const contactId = extractContactId(data);
          
          if (contactId && contactId !== selectedConversation) {
            // Incrementar contagem de não lidas apenas se o chat não estiver selecionado
            incrementUnreadCount(contactId);
          }
        }
        
        processSocketMessages(data);
      });
      
      socket.on('messages', (data) => {
        console.log('Evento messages recebido:', data);
        
        // Verificar se a mensagem é recebida (não enviada por nós)
        const isIncomingMessage = isMessageFromContact(data);
        
        // Se for mensagem recebida e não estiver com o chat aberto, incrementar contador
        if (isIncomingMessage) {
          // Extrair o remoteJid (ID do contato) da mensagem
          const contactId = extractContactId(data);
          
          if (contactId && contactId !== selectedConversation) {
            // Incrementar contagem de não lidas apenas se o chat não estiver selecionado
            incrementUnreadCount(contactId);
          }
        }
        
        processSocketMessages(data);
      });
      
      // Monitorar eventos de conexão
      ['CONNECTION_UPDATE', 'connection.update', 'status.instance'].forEach(eventName => {
        socket.on(eventName, (data) => {
          console.log(`Evento ${eventName} recebido:`, data);
          
          // Atualizar status da instância
          const state = data?.state || data?.status;
          if (state) {
            console.log(`Atualizando status da instância ${instanceName} para ${state}`);
            setWhatsappInstances(prev => {
              return prev.map(inst => {
                if (inst.instance_name === instanceName) {
                  return { ...inst, status: state };
                }
                return inst;
              });
            });
          }
        });
      });
      
      // Armazenar referência à conexão
      socketRef.current = socket;
      console.log('Referência Socket.io armazenada com sucesso');
      
    } catch (error) {
      console.error('Erro ao criar conexão Socket.io:', error);
    }
  };
  
  // Garantir que o Socket.io seja fechado ao desmontar o componente
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('Fechando conexão Socket.io ao desmontar componente');
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Buscar mensagens quando as configurações estiverem prontas
  useEffect(() => {
    // Se não temos configurações ou instâncias, não buscar mensagens
    if (!evolutionApiConfig.baseUrl || !evolutionApiConfig.apikey || whatsappInstances.length === 0) {
      console.log('Configuração incompleta para buscar mensagens');
      setError('Configuração incompleta. Verifique a URL da API, API Key e nome da instância.');
      return;
    }
    
    // Limpar erro anterior se existir
    setError(null);
    
    console.log('Configuração completa detectada, buscando mensagens...');
    
    const instanceName = whatsappInstances[0].instance_name;
    
    // Primeiro verificar o status da instância
    (async () => {
      const statusOk = await checkInstanceStatus(evolutionApiConfig.baseUrl, evolutionApiConfig.apikey, instanceName);
      
      if (statusOk) {
        // Só buscar mensagens e conectar WebSocket se o status for OK
        fetchConversations(evolutionApiConfig.baseUrl, evolutionApiConfig.apikey);
        
        // Iniciar a conexão Socket.io para a instância ativa
        connectSocketIO(evolutionApiConfig.baseUrl, instanceName, evolutionApiConfig.apikey);
      }
    })();
    
    // Limpeza do efeito
    return () => {
      // Código de limpeza se necessário
    };
  }, [evolutionApiConfig.baseUrl, evolutionApiConfig.apikey, whatsappInstances.length]);

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
    console.log('Iniciando fetchConversations...', { baseUrl, instancias: whatsappInstances });
    setIsLoading(true);
    setError(null);
    
    try {
      // Se não temos instâncias, mostrar erro
      if (!whatsappInstances || whatsappInstances.length === 0) {
        console.log('Nenhuma instância encontrada');
        setError('Nenhuma instância de WhatsApp configurada. Verifique as configurações da revenda.');
        return;
      }
      
      // Se temos instâncias, buscamos para cada uma delas
      console.log(`Buscando conversas para ${whatsappInstances.length} instâncias`);
      let totalMensagens = 0;
      
      for (const instance of whatsappInstances) {
        try {
          // Verificar se a instância tem um nome válido
          if (!instance || !instance.instance_name) {
            console.error('Instância inválida ou sem nome:', instance);
            continue; // Pular esta instância e seguir para a próxima
          }
          
          console.log(`Processando instância: ${instance.instance_name}`);
          const response = await fetchConversationsForInstance(baseUrl, apikey, instance.instance_name);
          if (response) totalMensagens += response?.data?.messages?.records?.length || 0;
        } catch (err) {
          const instanceName = instance?.instance_name || 'desconhecida';
          console.error(`Erro ao buscar conversas para instância ${instanceName}:`, err);
        }
      }
      
      console.log(`Total de ${totalMensagens} mensagens recuperadas de todas as instâncias`);
    } catch (err) {
      console.error('Erro ao buscar todas as conversas:', err);
      setError('Falha ao carregar conversas. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
      console.log('Finalizando fetchConversations.');
    }
  };

  // Função para buscar conversas da Evolution API para uma instância específica
  const fetchConversationsForInstance = async (baseUrl: string, apikey: string, instanceName: string) => {
    try {
      // Verificar se o nome da instância é válido
      if (!instanceName) {
        console.error('Nome da instância inválido ou undefined');
        throw new Error('Nome da instância é obrigatório');
      }
      
      console.log(`Buscando conversas para instância: ${instanceName}`);
      
      // Verificar a documentação da sua versão da Evolution API
      // Alguns endpoints podem ser diferentes. Testando algumas opções comuns:
      
      // Opção 1: findMessages com body vazio
      try {
        const response = await axios.post(`${baseUrl}/chat/findMessages/${instanceName}`, 
          // Adicionando parâmetros conforme documentação
          {
            where: {},
            count: 50  // Limitar para 50 mensagens para teste
          }, 
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': apikey
            }
          }
        );
        
        console.log('Resposta da API (/chat/findMessages) Opção 1:', response.data);
        processConversationsResponse(response);
        return response;
      } catch (err1) {
        console.log('Falha na Opção 1, tentando opção alternativa...');
        
        // Opção 2: fetchAllChats para a instância
        try {
          const response2 = await axios.get(`${baseUrl}/chat/fetchAllChats/${instanceName}`, {
            headers: {
              'Content-Type': 'application/json',
              'apikey': apikey
            }
          });
          
          console.log('Resposta da API (/chat/fetchAllChats) Opção 2:', response2.data);
          processConversationsResponse(response2);
          return response2;
        } catch (err2) {
          console.error('Falha na Opção 2:', err2);
          throw new Error(`Todas as tentativas de buscar mensagens para a instância ${instanceName} falharam`);
        }
      }
    } catch (err) {
      console.error(`Erro ao buscar conversas para instância ${instanceName}:`, err);
      throw err; // Propagar erro para tratamento adequado
    }
  };
  
  // Efeito para garantir carregamento de status quando mudar as conversas
  useEffect(() => {
    if (conversations.length > 0 && !statusLoaded) {
      console.log('Carregando status após atualização das conversas');
      loadConversationStatuses();
    }
  }, [conversations, statusLoaded]);
  
  // Função para processar a resposta da API e converter para o formato do componente
  const processConversationsResponse = (response: any) => {
    console.log('Iniciando processConversationsResponse com:', response); // Log da entrada da função
    if (response.data && response.data.messages && response.data.messages.records) {
      // Agrupar mensagens por contato (remoteJid)
      const messagesByContact = new Map<string, any[]>();
      
      // Filtrar mensagens de status e agrupar por contato
      const records = response.data.messages.records;
      console.log(`Total de ${records.length} mensagens recebidas da API`);
      
      // Filtrar apenas mensagens reais (não de status)
      const validMessages = records.filter((msg: any) => 
        msg.key && msg.key.remoteJid && 
        msg.key.remoteJid !== 'status@broadcast' && 
        !msg.key.remoteJid.includes('broadcast')
      );
      
      console.log(`${validMessages.length} mensagens válidas após filtrar status`);
      
      // Agrupar mensagens por contato
      validMessages.forEach((msg: any) => {
        const contactId = msg.key.remoteJid;
        if (!messagesByContact.has(contactId)) {
          messagesByContact.set(contactId, []);
        }
        messagesByContact.get(contactId)?.push(msg);
      });
      
      console.log(`Encontrados ${messagesByContact.size} contatos diferentes`);
      
      // Converter para o formato de conversas
      const mappedConversations: Conversation[] = [];
      
      messagesByContact.forEach((messages, contactId) => {
        // Ordenar mensagens por timestamp (mais antigas primeiro)
        messages.sort((a: any, b: any) => a.messageTimestamp - b.messageTimestamp);
        
        // Extrair nome do contato do pushName ou do ID
        const contactName = messages.find((m: any) => m.pushName)?.pushName || 
                           contactId.split('@')[0];
        
        // Converter mensagens para o formato do componente
        const formattedMessages: Message[] = messages.map((msg: any) => {
          // Extrair conteúdo da mensagem
          let content = '';
          
          if (msg.message?.conversation) {
            content = msg.message.conversation;
          } else if (msg.message?.extendedTextMessage?.text) {
            content = msg.message.extendedTextMessage.text;
          } else if (msg.message?.imageMessage) {
            content = '[Imagem]';
          } else if (msg.message?.videoMessage) {
            content = '[Vídeo]';
          } else if (msg.message?.audioMessage) {
            content = '[Áudio]';
          } else if (msg.message?.documentMessage) {
            content = '[Documento]';
          } else {
            content = '[Mídia não suportada]';
          }
          
          return {
            id: msg.key.id || `${Date.now()}-${Math.random()}`,
            content: content,
            sender: msg.key.fromMe ? 'user' : 'contact',
            timestamp: new Date(msg.messageTimestamp * 1000)
          };
        });
        
        // Extrair última mensagem para informações da conversa
        const lastMsg = messages[messages.length - 1];
        let lastMessageContent = '';
        
        if (lastMsg.message?.conversation) {
          lastMessageContent = lastMsg.message.conversation;
        } else if (lastMsg.message?.extendedTextMessage?.text) {
          lastMessageContent = lastMsg.message.extendedTextMessage.text;
        } else if (lastMsg.message?.imageMessage) {
          lastMessageContent = '[Imagem]';
        } else if (lastMsg.message?.videoMessage) {
          lastMessageContent = '[Vídeo]';
        } else if (lastMsg.message?.audioMessage) {
          lastMessageContent = '[Áudio]';
        } else {
          lastMessageContent = '[Mídia não suportada]';
        }
        
        mappedConversations.push({
          id: contactId,
          contactName: contactName,
          lastMessage: lastMessageContent,
          timestamp: new Date(lastMsg.messageTimestamp * 1000),
          unreadCount: 0, // Inicializar contador de não lidas
          messages: formattedMessages,
          status: 'pending', // Status padrão para novas conversas
          sector: null // A definir com base em regras de negócio
        });
      });
      
      console.log(`${mappedConversations.length} conversas mapeadas`);
      
      // Atualizar a lista de conversas, preservando status e setor de conversas existentes
      setConversations(prevConversations => {
        const conversationMap = new Map<string, Conversation>();
        
        // Adicionar conversas existentes ao mapa
        prevConversations.forEach(conv => conversationMap.set(conv.id, conv));
        
        // Adicionar ou atualizar com novas conversas
        mappedConversations.forEach(newConv => {
          const existingConv = conversationMap.get(newConv.id);
          if (existingConv) {
            // Se já existir, mantém o status, setor e mescla as mensagens
            // Primeiro, juntar todas as mensagens (novas e existentes)
            const allMessages = [...newConv.messages, ...existingConv.messages];
            
            // Remover mensagens duplicadas usando um Map com o ID como chave
            const uniqueMessages = Array.from(
              new Map(allMessages.map(msg => [msg.id, msg])).values()
            );
            
            // Ordenar mensagens por timestamp (mais antigas primeiro, mais recentes por último)
            const sortedMessages = uniqueMessages.sort((a, b) => 
              a.timestamp instanceof Date && b.timestamp instanceof Date
                ? a.timestamp.getTime() - b.timestamp.getTime() // Ordem crescente (antigas → recentes)
                : 0
            );
            
            // Verificar se a última mensagem mudou e é uma mensagem de contato (não do usuário)
            const lastMessageChanged = existingConv.lastMessage !== newConv.lastMessage;
            
            // Verificar se a mensagem veio do contato (não foi enviada pelo usuário)
            const isNewMessageFromContact = newConv.messages.length > 0 && 
                                           newConv.messages[newConv.messages.length - 1].sender === 'contact';
            
            // Calcular novo contador - se é mensagem nova, do contato, e conversa não está selecionada
            let newUnreadCount = existingConv.unreadCount || 0;
            if (lastMessageChanged && isNewMessageFromContact && newConv.id !== selectedConversation) {
              // Incrementar o contador de não lidas
              newUnreadCount += 1;
              console.log(`Nova mensagem detectada: ${newConv.lastMessage}`);
              console.log(`Incrementando contador para ${newConv.contactName}: ${newUnreadCount}`);
            }
            
            conversationMap.set(newConv.id, {
              ...newConv,
              status: existingConv.status,
              sector: existingConv.sector,
              messages: sortedMessages, // Usar as mensagens mescladas
              unreadCount: newUnreadCount // Usar contador atualizado
            });
          } else {
            // Nova conversa - garantir que tenha o contador de não lidas inicializado
            // Verificar se é uma nova conversa iniciada pelo contato
            const isContactInitiatedConversation = newConv.messages.some(msg => msg.sender === 'contact');
            
            // Se for uma nova conversa iniciada pelo contato e não estiver selecionada, iniciar com contador 1
            let initialUnreadCount = 0;
            if (isContactInitiatedConversation && newConv.id !== selectedConversation) {
              initialUnreadCount = 1;
              console.log(`Nova conversa recebida: ${newConv.contactName}`);
            }
            
            conversationMap.set(newConv.id, {
              ...newConv,
              unreadCount: initialUnreadCount
            });
          }
        });
        
        return Array.from(conversationMap.values());
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
          <div className="w-96 h-full border-r border-gray-800 flex flex-col">
            {/* Abas e Filtros */}
            <div className="border-b border-gray-800">
              {/* Indicador de status do Socket.io agora no topo */}
              <div className="flex justify-end p-2 bg-[#1E1E1E]">
                <div className="flex items-center text-xs text-gray-400">
                  <span className="mr-1">Status:</span>
                  <span className={socketRef.current ? "text-green-400" : "text-red-400"}>
                    {socketRef.current ? "Conectado" : "Desconectado"}
                  </span>
                  <div 
                    className={`ml-2 h-2 w-2 rounded-full ${socketRef.current ? "bg-green-500" : "bg-red-500"}`}
                    title={socketRef.current ? "Socket.io conectado" : "Socket.io desconectado"}
                  />
                </div>
              </div>

              {/* Abas Pendentes/Atendendo */}
              <div className="flex border-b border-gray-700 w-full">
                <button
                  className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
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
                  className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'attending' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
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
                  className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'finished' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => setActiveTab('finished')}
                >
                  Finalizados
                  {/* Contador para conversas finalizadas do dia atual */}
                  {(() => {
                    // Filtrar conversas finalizadas do dia atual
                    const today = new Date();
                    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
                    
                    const finishedTodayCount = conversations.filter(conv => {
                      // Verificar se é uma conversa finalizada
                      if (conv.status !== 'finished') return false;
                      
                      // Converter timestamp para número
                      const convTimestamp = typeof conv.timestamp === 'string' 
                        ? new Date(conv.timestamp).getTime() 
                        : conv.timestamp.getTime();
                      
                      // Verificar se é do dia atual
                      return convTimestamp >= startOfDay && convTimestamp <= endOfDay;
                    }).length;
                    
                    // Mostrar contador apenas se houver conversas finalizadas hoje
                    return finishedTodayCount > 0 && (
                      <span className="bg-gray-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        {finishedTodayCount}
                      </span>
                    );
                  })()} 
                </button>
              </div>
              
              {/* Filtro de Setor */}
              <div className="px-4 py-2">
                <select
                  id="sector"
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value as any)}
                  className="w-full p-2.5 bg-[#2A2A2A] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            
            {/* Mensagem de erro (se houver) */}
            {error && (
              <div className="px-4 py-2 bg-red-900/30 border-y border-red-800">
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}
            
            {/* Lista de Conversas */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conversa encontrada</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      console.log(`Selecionando conversa: ${conv.id} (${conv.contactName})`);
                      console.log(`Não lidas antes: ${conv.unreadCount || 0}`);
                      
                      // Ao selecionar a conversa, zera a contagem de não lidas
                      setConversations(prevConversations => {
                        return prevConversations.map(c => {
                          if (c.id === conv.id) {
                            return { ...c, unreadCount: 0 };
                          }
                          return c;
                        });
                      });
                      
                      // Atualizar o contador no banco de dados também
                      saveStatusToDatabase(conv.id, conv.status, 0);
                      
                      // Define a conversa selecionada
                      setSelectedConversation(conv.id);
                    }}
                    className={`cursor-pointer p-3 border-b border-gray-800 hover:bg-[#2A2A2A] transition-colors ${selectedConversation === conv.id ? 'bg-[#2A2A2A]' : ''}`}
                    data-component-name="ChatNexo"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium">{conv.contactName.substring(0, 2).toUpperCase()}</span>
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col" data-component-name="ChatNexo">
                          {/* Nome do usuário e hora na mesma linha */}
                          <div className="flex items-center w-full justify-between">
                            <h3 className="font-medium text-white truncate max-w-[70%]">{conv.contactName}</h3>
                            <span className="text-xs text-gray-400" data-component-name="ChatNexo">{formatTimestamp(conv.timestamp)}</span>
                          </div>
                          
                          {/* Última mensagem e contador em linha - contador abaixo da hora */}
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-sm text-gray-400 truncate max-w-[80%]">{conv.lastMessage}</p>
                            {(conv.unreadCount || 0) > 0 && (
                              <span 
                                className="bg-green-500 text-white text-xs rounded-full min-h-[20px] min-w-[20px] px-1 flex items-center justify-center flex-shrink-0"
                                title={`${conv.unreadCount} mensagens não lidas`}
                              >
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
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
              <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
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
                <div className="p-4 border-b border-gray-800 bg-[#2A2A2A] flex items-center justify-between">
                  {/* Informações do contato */}
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center mr-3">
                      <span className="text-white">{currentConversation.contactName.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{currentConversation.contactName}</h3>
                      <p className="text-xs text-gray-400">Online</p>
                    </div>
                  </div>
                  
                  {/* Botão/Menu de Ações contextual baseado no status da conversa */}
                  <div className="flex items-center relative" ref={menuRef}>
                    {/* Botão Aceitar apenas quando a conversa estiver pendente */}
                    {currentConversation.status === 'pending' && (
                      <button 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-l-md transition-colors"
                        onClick={() => {
                          if (currentConversation) {
                            // Atualizar status para atendendo
                            updateConversationStatus(currentConversation.id, 'attending');
                            
                            // Mudar para a aba de Atendendo automaticamente
                            setActiveTab('attending');
                            // Forçar carregamento do status do banco novamente no próximo ciclo
                            setStatusLoaded(false);
                            
                            // Fechar o menu dropdown caso esteja aberto
                            setIsActionMenuOpen(false);
                          }
                        }}
                      >
                        Aceitar
                      </button>
                    )}
                    
                    {/* Botão do menu - classe adaptada se não houver botão Aceitar */}
                    <button 
                      className={`bg-emerald-700 hover:bg-emerald-800 text-white py-2 px-2 
                        ${currentConversation.status === 'pending' ? 'rounded-r-md' : 'rounded-md'} 
                        transition-colors relative`}
                      onClick={(e) => {
                        e.stopPropagation(); // Evitar que o clique se propague
                        setIsActionMenuOpen(!isActionMenuOpen);
                      }}
                    >
                      <ChevronRight size={16} className={`transform transition-transform ${isActionMenuOpen ? 'rotate-90' : ''}`}/>
                    </button>
                    
                    {/* Menu de ações dropdown - opções diferentes dependendo do status */}
                    {isActionMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-[#2A2A2A] border border-gray-700 rounded-md shadow-lg overflow-hidden z-50 w-36">
                        {/* Opções para conversa em andamento */}
                        {currentConversation.status === 'attending' && (
                          <>
                            <button 
                              className="w-full text-left py-2 px-3 hover:bg-[#3A3A3A] text-white text-sm transition-colors"
                              onClick={() => {
                                if (currentConversation) {
                                  // Voltar para Pendente
                                  updateConversationStatus(currentConversation.id, 'pending');
                                  setActiveTab('pending');
                // Forçar carregamento do status do banco novamente no próximo ciclo
                setStatusLoaded(false);
                                  setIsActionMenuOpen(false);
                                }
                              }}
                            >
                              Voltar para Pendente
                            </button>
                            <button 
                              className="w-full text-left py-2 px-3 hover:bg-[#3A3A3A] text-white text-sm transition-colors"
                              onClick={() => {
                                if (currentConversation) {
                                  // Finalizar conversa
                                  updateConversationStatus(currentConversation.id, 'finished');
                                  setActiveTab('finished');
                                  // Forçar carregamento do status do banco novamente no próximo ciclo
                                  setStatusLoaded(false);
                                  setIsActionMenuOpen(false);
                                }
                              }}
                            >
                              Finalizar
                            </button>
                          </>
                        )}
                        
                        {/* Opções para conversa pendente */}
                        {currentConversation.status === 'pending' && (
                          <button 
                            className="w-full text-left py-2 px-3 hover:bg-[#3A3A3A] text-white text-sm transition-colors"
                            onClick={() => {
                              if (currentConversation) {
                                // Finalizar direto
                                updateConversationStatus(currentConversation.id, 'finished');
                                setActiveTab('finished');
                                // Forçar carregamento do status do banco novamente no próximo ciclo
                                setStatusLoaded(false);
                                setIsActionMenuOpen(false);
                              }
                            }}
                          >
                            Finalizar Direto
                          </button>
                        )}
                        
                        {/* Opções para conversa finalizada */}
                        {currentConversation.status === 'finished' && (
                          <>
                            <button 
                              className="w-full text-left py-2 px-3 hover:bg-[#3A3A3A] text-white text-sm transition-colors"
                              onClick={() => {
                                if (currentConversation) {
                                  // Voltar para Pendente
                                  updateConversationStatus(currentConversation.id, 'pending');
                                  setActiveTab('pending');
                // Forçar carregamento do status do banco novamente no próximo ciclo
                setStatusLoaded(false);
                                  setIsActionMenuOpen(false);
                                }
                              }}
                            >
                              Reabrir como Pendente
                            </button>
                            <button 
                              className="w-full text-left py-2 px-3 hover:bg-[#3A3A3A] text-white text-sm transition-colors"
                              onClick={() => {
                                if (currentConversation) {
                                  // Voltar para Atendendo
                                  updateConversationStatus(currentConversation.id, 'attending');
                                  setActiveTab('attending');
                                  // Forçar carregamento do status do banco novamente no próximo ciclo
                                  setStatusLoaded(false);
                                  setIsActionMenuOpen(false);
                                }
                              }}
                            >
                              Reabrir em Atendimento
                            </button>
                          </>
                        )}
                        
                        {/* Opção de transferir comum a todos os status */}
                        <button 
                          className="w-full text-left py-2 px-3 hover:bg-[#3A3A3A] text-white text-sm transition-colors"
                          onClick={() => {
                            // Lógica para transferir a conversa (implementar depois)
                            alert('Funcionalidade de transferência a ser implementada');
                            setIsActionMenuOpen(false);
                          }}
                        >
                          Transferir
                        </button>
                        
                        {/* Opção de deletar comum a todos os status */}
                        <button 
                          className="w-full text-left py-2 px-3 hover:bg-[#3A3A3A] text-red-400 text-sm transition-colors"
                          onClick={() => {
                            // Lógica para deletar a conversa
                            if (window.confirm('Tem certeza que deseja deletar esta conversa?')) {
                              setConversations(prevConversations => 
                                prevConversations.filter(conv => conv.id !== currentConversation.id)
                              );
                              setSelectedConversation(null);
                            }
                            setIsActionMenuOpen(false);
                          }}
                        >
                          Deletar
                        </button>
                      </div>
                    )}
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
