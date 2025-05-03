import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Database, MessageSquare, Search, ChevronLeft, ChevronRight, Send, Store, Users, LogOut, BarChart2, Settings as SettingsIcon, MessageCircle, Plus, X } from 'lucide-react';
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

type ConversationStatus = 'pending' | 'attending' | 'finished' | 'contacts';

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

// Componente wrapper para garantir que o overlay de carregamento apareça imediatamente
// Estilos para barra de rolagem personalizada
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 5px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 20px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }

  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }
`;

export default function ChatNexoWrapper() {
  // Este estado controla se o componente principal deve ser renderizado
  const [ready, setReady] = useState(false);
  
  // Estado para controlar a visibilidade do overlay
  const [showOverlay, setShowOverlay] = useState(true);
  
  // Função para ser chamada pelo Content quando o carregamento terminar
  const handleLoadingComplete = () => {
    // Adiciona um delay de 2 segundos antes de esconder o overlay para suavizar a transição
    setTimeout(() => setShowOverlay(false), 2000);
  };
  
  // Renderizamos primeiro apenas o overlay de carregamento
  // depois de um pequeno atraso (para garantir que o overlay seja renderizado primeiro),
  // permitimos a renderização do componente principal
  useEffect(() => {
    // Garante que o wrapper ocupe toda a altura da tela
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden'; // Previne scroll enquanto carrega
    
    const timer = setTimeout(() => {
      setReady(true);
    }, 100); // pequeno delay para garantir que o overlay seja renderizado primeiro
    
    return () => {
      clearTimeout(timer);
      // Restaura estilos do body
      document.body.style.height = '';
      document.body.style.overflow = '';
    };
  }, []);
  
  // Sempre renderizar o overlay primeiro
  return (
    // Garante que o wrapper e o conteúdo ocupem toda a altura e define um fundo
    <div className="relative h-screen flex flex-col bg-gray-100">
      {/* Estilos CSS injetados para scrollbar personalizada */}
      <style>{scrollbarStyles}</style>
      {/* Overlay de carregamento visível baseado no estado showOverlay */}
      {showOverlay && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p>Carregando dados...</p> {/* Mensagem mais genérica */}
          </div>
        </div>
      )}
      
      {/* Renderizar o componente principal apenas quando ready for true, passando a função de callback */}
      {/* O conteúdo só será visível quando showOverlay for false, com transição */}
      <div className={`flex-1 flex flex-col ${showOverlay ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}>
        {ready && <ChatNexoContent onLoadingComplete={handleLoadingComplete} />}
      </div>
    </div>
  );
}

// Interface para as props do ChatNexoContent
interface ChatNexoContentProps {
  onLoadingComplete: () => void;
}

// Componente principal com toda a lógica original
function ChatNexoContent({ onLoadingComplete }: ChatNexoContentProps) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  // Contador de mensagens totais recebidas via Socket.io
  const [totalMessagesReceived, setTotalMessagesReceived] = useState<number>(0);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // Estado para o tipo de filtro de empresa (nome ou telefone)
  const [companyFilterType, setCompanyFilterType] = useState<'name' | 'phone'>('name');
  // Estado para o texto de pesquisa de empresas
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  // Estado para controlar o formulário de cadastro de empresas
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  // Estado para controlar o tipo de documento (CNPJ ou CPF)
  const [documentType, setDocumentType] = useState<'cnpj' | 'cpf'>('cnpj');
  // Estado para controlar qual aba do formulário está ativa
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'system' | 'contacts'>('general');
  // Estado para os campos do formulário
  const [companyForm, setCompanyForm] = useState({
    // Dados Gerais
    status: 'Ativo',
    document: '',
    companyName: '',
    tradeName: '',
    
    // Inf. Sistema
    systemCode: '',
    systemNotes: '',
    
    // Contatos
    email: '',
    address: '',
    contacts: [{ 
      id: Date.now().toString(),
      name: '', 
      phone: '', 
      position: 'Proprietário'
    }] // Array de contatos com nome, telefone e cargo
  });
  const [activeTab, setActiveTab] = useState<ConversationStatus>('pending');
  // Removido estado de subaba pois agora a aba Contatos já mostra diretamente a grid de empresas
  // Estado para armazenar a lista de empresas
  const [companies, setCompanies] = useState<Array<{
    id: string;
    status?: string;
    name: string;
    phone: string;
    whatsappPhone?: string;
    email?: string;
    address?: string;
    contacts?: Array<{
      id: string;
      name: string;
      phone: string;
      position: string;
    }>;
    createdAt: Date;
  }>>([    
    {
      id: '1',
      name: 'Nexo Sistemas Ltda',
      phone: '(12) 3456-7890',
      whatsappPhone: '(12) 98765-4321',
      email: 'contato@nexosistemas.com.br',
      address: 'Av. Principal, 1000',
      createdAt: new Date(2023, 5, 10)
    },
    {
      id: '2',
      name: 'Tech Solutions SA',
      phone: '(11) 98765-4321',
      email: 'atendimento@techsolutions.com.br',
      createdAt: new Date(2024, 0, 15)
    },
    {
      id: '3',
      name: 'Inovação Digital ME',
      phone: '(13) 3344-5566',
      email: 'contato@inovacaodigital.com.br',
      createdAt: new Date(2024, 1, 20)
    }
  ]);
  // Estado para armazenar a lista de contatos separada das conversas
  const [contacts, setContacts] = useState<Conversation[]>([]);
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
  
  // Referência para o container de mensagens para controlar o scroll
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Referência para o elemento de áudio usado para notificações
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Preencher a referência ao montar o componente
  useEffect(() => {
    // Carregar som de notificação em um elemento de áudio pré-carregado
    if (!audioRef.current) {
      audioRef.current = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=notification-sound-7062.mp3');
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 0.7;
      
      // Carregar o áudio antecipadamente
      audioRef.current.load();
      
      console.log(' Elemento de áudio para notificações inicializado');
    }
    
    // Detectar configurações do usuário para controle da flag de Contatos/Empresas
    supabase.auth.getUser().then(({ data: { user } }) => {
      // Verificar se o usuário tem configurações específicas
      if (user && user.app_metadata && user.app_metadata.settings) {
        const settings = user.app_metadata.settings;
        
        // Verificar se a flag de Contatos/Empresas está habilitada
        if (settings.contactsEnabled !== undefined) {
          setIsSidebarCollapsed(!settings.contactsEnabled);
        }
      }
    });
    
    // Limpar função para salvar a posição quando a conversa mudar
    return () => {
      saveCurrentScrollPosition();
    };
  }, []);
  
  // Definir isLoading como true por padrão para mostrar o overlay imediatamente
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  // Salvar contador de mensagens no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('nexochat_total_messages', totalMessagesReceived.toString());
    console.log(' Contador de mensagens atualizado e salvo:', totalMessagesReceived);
  }, [totalMessagesReceived]);
  
  // Efeito para carregar o contador do localStorage na inicialização
  useEffect(() => {
    const savedCount = localStorage.getItem('nexochat_total_messages');
    if (savedCount) {
      setTotalMessagesReceived(parseInt(savedCount, 10));
      console.log(' Contador carregado do localStorage:', savedCount);
    }
  }, []);
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
    // Garantir que o overlay de carregamento esteja visivel desde o início
    setIsLoading(true);
    
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
  const saveStatusToLocalStorage = (conversationId: string, status: ConversationStatus, unreadCount?: number, scrollPosition?: number) => {
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
      
      // Adicionar posição de rolagem se fornecida
      if (scrollPosition !== undefined) {
        statusInfo.scrollPosition = scrollPosition;
      } else if (statusMap[conversationId]?.scrollPosition !== undefined) {
        // Manter o valor anterior se existir e não for fornecido um novo
        statusInfo.scrollPosition = statusMap[conversationId].scrollPosition;
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
  const saveStatusToDatabase = async (conversationId: string, status: ConversationStatus, unreadCount?: number, scrollPosition?: number) => {
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
      
      // Adicionar posição de rolagem se fornecida
      if (scrollPosition !== undefined) {
        statusData.scroll_position = scrollPosition;
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
      saveStatusToLocalStorage(conversationId, status, unreadCount, scrollPosition);
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
        .select('conversation_id, status, unread_count, scroll_position')
        .eq('profile_admin_id', userInfo.id)
        .eq('reseller_id', userInfo.resellerId);
      
      if (error) {
        throw error;
      }
      
      // Mapear para armazenar os status e contagens mais recentes primeiro do DB, depois do localStorage
      const statusMap: Record<string, {status: ConversationStatus, unreadCount?: number, scrollPosition?: number}> = {};
      
      // Se tiver dados no banco de dados
      if (data && data.length > 0) {
        console.log(`Carregados ${data.length} status de conversas do banco de dados`);
        
        data.forEach(item => {
          statusMap[item.conversation_id] = {
            status: item.status as ConversationStatus,
            unreadCount: item.unread_count,
            scrollPosition: item.scroll_position
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
                    unreadCount: statusInfo.unreadCount, // Incluir a contagem de não lidas
                    scrollPosition: statusInfo.scrollPosition
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
                unreadCount: conversationData.unreadCount !== undefined ? conversationData.unreadCount : conv.unreadCount || 0,
                scrollPosition: conversationData.scrollPosition
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
  // Função para salvar a posição de rolagem da conversa atual
  const saveCurrentScrollPosition = () => {
    if (selectedConversation && messagesContainerRef.current) {
      const currentPosition = messagesContainerRef.current.scrollTop;
      console.log(`Salvando posição de rolagem para conversa ${selectedConversation}: ${currentPosition}`);
      
      // Obter o status atual da conversa
      const conversation = conversations.find(c => c.id === selectedConversation);
      if (conversation) {
        // Não alteramos o unreadCount, apenas mantemos o valor atual
        saveStatusToDatabase(selectedConversation, conversation.status, undefined, currentPosition);
        saveStatusToLocalStorage(selectedConversation, conversation.status, undefined, currentPosition);
      }
    }
  };
  
  useEffect(() => {
    // Função para rolar para o final da conversa (sem animação)
    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    };
    
    if (selectedConversation && messagesContainerRef.current) {
      // Primeiro obter do localStorage (mais rápido)
      const savedStatuses = localStorage.getItem('nexochat_statuses');
      let savedScrollPosition: number | undefined = undefined;
      
      if (savedStatuses) {
        try {
          const statusMap = JSON.parse(savedStatuses);
          savedScrollPosition = statusMap[selectedConversation]?.scrollPosition;
          console.log(`Posição salva encontrada para ${selectedConversation}:`, savedScrollPosition);
        } catch (error) {
          console.error('Erro ao analisar status salvos:', error);
        }
      }
      
      // Pequeno delay para garantir que as mensagens foram renderizadas
      // Executar imediatamente, sem delay
      // Verificar se o ref ainda é válido
      if (!messagesContainerRef.current) return;
      
      // Verificar se esta é a primeira vez que a conversa é aberta
      // Se não houver posição salva, ou se a posição salva for zero, rolar para o final
      if (savedScrollPosition === undefined || savedScrollPosition === 0) {
        console.log('Rolando para o final da conversa (primeira vez ou sem posição salva)');
        // Aplicar a rolagem imediatamente
        scrollToBottom();
      } else {
        // Usar a posição salva anteriormente
        console.log(`Restaurando posição salva: ${savedScrollPosition}`);
        messagesContainerRef.current.scrollTop = savedScrollPosition;
      }
    }
    
    // Limpar função para salvar a posição quando a conversa mudar
    return () => {
      saveCurrentScrollPosition();
    };
  }, [selectedConversation]);
  
  // Atualizar a posição salva quando as mensagens mudarem
  useEffect(() => {
    if (messagesContainerRef.current && selectedConversation) {
      // Se chegarem novas mensagens, rolar para o final automaticamente sem animação
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [conversations]);
  
  // Função para filtrar as empresas com base no tipo de filtro e texto de busca
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      if (!companySearchQuery) return true;
      
      const searchLower = companySearchQuery.toLowerCase();
      if (companyFilterType === 'name') {
        return company.name.toLowerCase().includes(searchLower);
      } else if (companyFilterType === 'phone') {
        return company.phone.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [companies, companySearchQuery, companyFilterType]);

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

  // Variável para armazenar o formato de URL que funciona
  const [workingUrlFormat, setWorkingUrlFormat] = useState<number | null>(() => {
    // Tentar recuperar do localStorage para evitar erros 404 desnecessários
    const savedFormat = localStorage.getItem('evolution_api_format');
    return savedFormat ? parseInt(savedFormat) : null;
  });
  
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
      
      // Resetar flag para cada nova mensagem
      (window as any).lastMessageSent = false;
      
      // Enviar para a Evolution API se configurada
      if (evolutionApiConfig.baseUrl && evolutionApiConfig.apikey) {
        try {
          // Verificar se temos instâncias disponíveis
          if (whatsappInstances.length === 0) {
            throw new Error('Nenhuma instância do WhatsApp disponível');
          }
          
          // Usar a primeira instância ativa
          const activeInstance = whatsappInstances.find(inst => inst.status === 'connected') || whatsappInstances[0];
          const instanceName = activeInstance.instance_name;
          
          // Formatando o número do destinatário (removendo qualquer sufixo)
          let recipient = conversation.id;
          if (recipient.includes('@')) {
            recipient = recipient.split('@')[0];
          }
          
          // Preparar headers comuns para todas as tentativas
          const headers = {
            'Content-Type': 'application/json',
            'apikey': evolutionApiConfig.apikey
          };

          // Só adiciona apikey se ela não estiver vazia
          if (evolutionApiConfig.apikey && evolutionApiConfig.apikey.trim() !== '') {
            headers['apikey'] = evolutionApiConfig.apikey;
          }
          
          console.log('Enviando requisição para verificar status com headers:', headers);
          
          // Tentar verificar o status da instância
          try {
            // Verificar status da instância específica
            const statusResponse = await axios.get(`${evolutionApiConfig.baseUrl}/instance/connectionState/${instanceName}`, {
              headers: headers
            });
            
            console.log(`Status da instância ${instanceName}:`, statusResponse.data);
            
            // Independente da resposta, vamos considerar a instância válida
            setWhatsappInstances(prev => {
              return prev.map(inst => {
                if (inst.instance_name === instanceName) {
                  return { ...inst, status: statusResponse.data?.state || 'active' };
                }
                return inst;
              });
            });
            
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
      }
    } catch (err: any) {
      let errorMessage = 'Falha ao enviar mensagem. Tente novamente.';
      
      // Definir mensagem genérica de erro sem detalhes para não poluir o console
      console.error('Erro ao enviar mensagem:', err.message || errorMessage);
      setError(errorMessage);
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
        'Content-Type': 'application/json',
        'apikey': apikey
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
        setWhatsappInstances(prev => {
          return prev.map(inst => {
            if (inst.instance_name === instanceName) {
              return { ...inst, status: statusResponse.data?.state || 'active' };
            }
            return inst;
          });
        });
        
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
    // Função simplificada para tocar som de notificação usando elemento de áudio HTML5
    const playNotificationSound = () => {
      try {
        // Verificar se temos um elemento de áudio
        if (audioRef.current) {
          // Reiniciar o som para garantir que toque novamente
          audioRef.current.currentTime = 0;
          
          // Tocar o som com volume apropriado
          audioRef.current.volume = 0.7;
          
          // Reproduzir o som com tratamento de erro
          const playPromise = audioRef.current.play();
          
          // Tratar a promise retornada pelos navegadores modernos
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('Som de notificação reproduzido com sucesso');
              })
              .catch(error => {
                console.error('Erro ao reproduzir áudio:', error);
                
                // Se falhou, tentar criar um novo elemento de áudio como fallback
                const fallbackAudio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=notification-sound-7062.mp3');
                fallbackAudio.play().catch(e => console.error('Erro no fallback:', e));
              });
          }
        } else {
          // Fallback: criar um novo elemento de áudio se a referência não estiver disponível
          const fallbackAudio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=notification-sound-7062.mp3');
          fallbackAudio.play().catch(e => console.error('Erro de fallback:', e));
          console.log('Usando fallback para som de notificação');
        }
      } catch (error) {
        console.error('Erro fatal ao reproduzir som:', error);
        
        // Última tentativa de fallback em caso de erro fatal
        try {
          const emergencyAudio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=notification-sound-7062.mp3');
          emergencyAudio.play();
        } catch (e) {
          console.error('Todas as tentativas de som falharam:', e);
        }
      }
    };
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
        console.log(`🔍🔍🔍 DIAGNÓSTICO DE EVENTO Socket.io: ${event}`, args);
        console.log('Estrutura do evento:', JSON.stringify(args, null, 2));
        
        // Incrementar apenas para eventos que realmente parecem ser mensagens
        if (event.toLowerCase().includes('message') || event === 'MESSAGES_UPSERT') {
          // Verificar se o evento tem estrutura de mensagem
          let isRealMessage = false;
          
          // Verificar o primeiro argumento
          if (args && args.length > 0) {
            const arg = args[0];
            
            // Testes básicos para identificar uma mensagem
            if (typeof arg === 'object') {
              if (arg && (
                  (arg.key && arg.key.remoteJid) ||
                  (arg.messages && Array.isArray(arg.messages)) ||
                  (arg.type === 'notify') ||
                  (arg.data && Array.isArray(arg.data))
                )) {
                isRealMessage = true;
              }
            }
          }
          
          // Se parece ser uma mensagem real, incrementar contador
          if (isRealMessage) {
            console.log(`💬 Possível nova mensagem em evento ${eventName}`);
            setTotalMessagesReceived(prev => prev + 1);
          }
        }
      });
      
      // Log para facilitar debug
      console.log('Contagem atual de não lidas:', conversations.map(c => `${c.contactName}: ${c.unreadCount}`));
      
      // DETECÇÃO FOCALIZADA DE MENSAGENS - Registramos apenas os eventos importantes
      console.log('💡 Registrando eventos importantes para mensagens');
      
      // Eventos especificamente relacionados a MENSAGENS na Evolution API
      const messageEvents = [
        'message', 'messages.upsert', 'MESSAGES_UPSERT'
      ];
      
      // Listener para eventos de mensagem
      messageEvents.forEach(eventName => {
        socket.on(eventName, (data) => {
          console.log(`💬💬💬 EVENTO DE MENSAGEM: ${eventName} 💬💬💬`);
          console.log(`Conteúdo da mensagem ${eventName}:`, data);
          
          // Verificar se é realmente uma mensagem e não uma atualização de status
          let isTrueMessage = false;
          
          try {
            // Verificar estrutura do objeto para confirmar que é uma mensagem de texto
            if (data) {
              // Caso 1: dados com propriedade key e remote
              if (data.key && data.key.remoteJid) {
                isTrueMessage = true;
              }
              // Caso 2: array com dados de mensagem
              else if (Array.isArray(data) && data.length > 0 && data[0].key) {
                isTrueMessage = true;
              }
              // Caso 3: formato notify com array de mensagens
              else if (data.type === 'notify' && data.messages && data.messages.length > 0) {
                isTrueMessage = true;
              }
              // Caso 4: mensagem em data.data
              else if (data.data) {
                isTrueMessage = true;
              }
            }
            
            // Só incrementa o contador se for uma mensagem verdadeira
            if (isTrueMessage) {
              console.log(`✅ CONFIRMADO evento de mensagem em: ${eventName}`);
              setTotalMessagesReceived(prev => {
                const novo = prev + 1;
                console.log(`📲 Incrementando contador: ${prev} -> ${novo}`);
                return novo;
              });
              
              // Colocar elemento de áudio para interagir com o DOM diretamente
              if (audioRef.current) {
                audioRef.current.play().catch(e => {
                  console.warn('Erro ao tocar áudio, esperado em alguns navegadores:', e);
                });
              }
            } else {
              console.log(`❌ Não parece ser uma mensagem de texto real em ${eventName}`);
            }
            
          } catch (e) {
            console.error('Erro ao processar dados do evento:', e);
          }
        });
      });
      
      // Monitorar evento para contatos (apenas para debug, não incrementa contador)
      socket.on('contacts.update', (data) => {
        console.log('📝 Evento de atualização de contato detectado:', data);
        // NÃO incrementa o contador pois não é uma mensagem
      });
      
      // DETECTOR PRINCIPAL DA EVOLUTION API - diretamente para MESSAGES_UPSERT
      socket.on('MESSAGES_UPSERT', (data) => {
        console.log('⚫⚫⚫ Evento MESSAGES_UPSERT recebido ⚫⚫⚫');
        
        // Extrair o remoteJid (ID do contato) da mensagem e verificar se é mensagem recebida
        const contactId = extractContactId(data);
        
        // Se tiver um ID de contato, é porque é uma mensagem recebida válida
        if (contactId) {
          // Incrementar o contador total de mensagens, independente de qualquer outra condição
          setTotalMessagesReceived(prev => {
            const novo = prev + 1;
            console.log(`📥📥📥 MENSAGEM DETECTADA de ${contactId}. Contador: ${prev} -> ${novo}`);
            return novo;
          });
          
          // Tocar som de notificação
          playNotificationSound();
          
          console.log(`Mensagem recebida de: ${contactId}`);
          
          // Normalizar IDs para comparação consistente
          const normalizedContactId = normalizeContactId(contactId);
          const normalizedSelectedId = selectedConversation ? normalizeContactId(selectedConversation) : null;
          
          // Verificar se a conversa está atualmente aberta/selecionada
          const isCurrentlySelected = normalizedContactId === normalizedSelectedId;
          
          // Determinar se é uma mensagem enviada por nós (verificação padrão)
          const isFromMe = data && data.key && data.key.fromMe === true;
          
          // Só incrementamos o contador individual quando a conversa NÃO está selecionada
          // e a mensagem NÃO foi enviada por nós
          if (!isFromMe && !isCurrentlySelected) {
            console.log(`🔕 [MESSAGES_UPSERT] Incrementando contador para ${contactId} (não selecionada)`);
            incrementUnreadCount(contactId);
          } else {
            console.log(`🔔 [MESSAGES_UPSERT] NÃO incrementando contador: ${isCurrentlySelected ? 'conversa atual' : 'mensagem enviada por mim'}`);
          }
        } else {
          console.log('Dados recebidos não contêm ID de contato válido ou não é mensagem recebida.');
        }
        
        // Processar as mensagens normalmente para atualizar a UI
        processSocketMessages(data);
      });
      
      // PRINCIPAL EVENTO PARA MENSAGENS - confirmado nos testes
      socket.on('messages.upsert', (data) => {
        console.log('📞📞📞 EVENTO PRINCIPAL messages.upsert RECEBIDO:', data);
        
        // Verificar estrutura do evento para garantir que é uma mensagem válida
        if (data && data.data && data.data.key && data.data.key.remoteJid) {
          // Extrair o ID do contato diretamente da estrutura conhecida
          const contactId = data.data.key.remoteJid;
          const isFromMe = data.data.key.fromMe === true;
          const pushName = data.data.pushName || 'Desconhecido';
          const messageContent = data.data.message?.conversation || data.data.message?.extendedTextMessage?.text || '';
          
          console.log(`Nova mensagem de ${pushName} (${contactId}): "${messageContent}". De mim: ${isFromMe}`);
          
          // Incrementar contagem global de mensagens recebidas (independente de quem enviou)
          setTotalMessagesReceived(prev => prev + 1);
          
          // Normalizar IDs para comparação consistente
          const normalizedContactId = normalizeContactId(contactId);
          const normalizedSelectedId = selectedConversation ? normalizeContactId(selectedConversation) : null;
          
          // Verificar se a conversa está atualmente aberta/selecionada
          const isCurrentlySelected = normalizedContactId === normalizedSelectedId;
          
          // Só incrementamos o contador individual quando AMBAS condições são verdadeiras:
          // 1. A mensagem NÃO foi enviada por nós (não é fromMe)
          // 2. A conversa NÃO é a que está atualmente selecionada/aberta
          if (!isFromMe && !isCurrentlySelected) {
            console.log(`🔕 Incrementando contador individual para ${contactId} (conversa não selecionada)`);  
            incrementUnreadCount(contactId);
            playNotificationSound();
          } else if (isCurrentlySelected) {
            console.log(`🔔 Mensagem para conversa atual (${contactId}). NÃO incrementando contador.`);
            // Opcional: tocar som mesmo sendo conversa atual
            playNotificationSound();
          } else {
            console.log(`🔕 Mensagem enviada por mim. Não incrementando contador.`);
          }
        } else {
          console.log('Evento messages.upsert sem estrutura válida de mensagem');  
        }
        
        processSocketMessages(data);
      });
      
      // Evento message genérico - deve capturar mensagens em alguns casos
      socket.on('message', (data) => {
        console.log('📨📨📨 Evento message recebido:', data);
        
        // Verificar se tem uma estrutura válida de mensagem antes de incrementar
        let isValidMessageStructure = false;
        
        if (data && (
            (data.key && data.key.remoteJid) ||
            (typeof data === 'object' && data.message) ||
            (typeof data === 'object' && data.text)
          )) {
          isValidMessageStructure = true;
        }
        
        if (isValidMessageStructure) {
          console.log('⚡ Evento message válido detectado, incrementando contador global');
          // Incrementar contador global apenas para mensagens com estrutura válida
          setTotalMessagesReceived(prev => {
            const novo = prev + 1;
            console.log(`💬 Contador global atualizado via 'message': ${prev} -> ${novo}`);
            return novo;
          });
          
          // Verificar se a mensagem é recebida (não enviada por nós)
          const isFromMe = data && data.key && data.key.fromMe === true;
          
          // Extrair o remoteJid (ID do contato) da mensagem
          const contactId = extractContactId(data);
          
          if (contactId) {
            // Normalizar IDs para comparação consistente
            const normalizedContactId = normalizeContactId(contactId);
            const normalizedSelectedId = selectedConversation ? normalizeContactId(selectedConversation) : null;
            
            // Verificar se a conversa está atualmente aberta/selecionada
            const isCurrentlySelected = normalizedContactId === normalizedSelectedId;
            
            // Só incrementamos se não for mensagem minha E não for conversa selecionada
            if (!isFromMe && !isCurrentlySelected) {
              console.log(`🔕 [message] Incrementando contador para ${contactId} (não selecionada)`);
              playNotificationSound();
              incrementUnreadCount(contactId);
            } else {
              console.log(`🔔 [message] NÃO incrementando contador: ${isCurrentlySelected ? 'conversa atual' : 'mensagem enviada por mim'}`);
              playNotificationSound();
            }
          }
        }
        
        processSocketMessages(data);
      });
      
      socket.on('messages', (data) => {
        console.log('Evento messages recebido:', data);
        
        // Verificar se há mensagens novas recebidas e tocar som
        const isIncomingMessage = isMessageFromContact(data);
        const isFromMe = data && data.key && data.key.fromMe === true;
        
        if (isIncomingMessage) {
          // Incrementar contador global
          setTotalMessagesReceived(prev => prev + 1);
          
          const contactId = extractContactId(data);
          
          if (contactId) {
            // Normalizar IDs para comparação consistente
            const normalizedContactId = normalizeContactId(contactId);
            const normalizedSelectedId = selectedConversation ? normalizeContactId(selectedConversation) : null;
            
            // Verificar se a conversa está atualmente aberta/selecionada
            const isCurrentlySelected = normalizedContactId === normalizedSelectedId;
            
            // Tocar som independentemente de incrementar ou não
            playNotificationSound();
            
            // Só incrementar se não for mensagem minha E não for a conversa selecionada
            if (!isFromMe && !isCurrentlySelected) {
              console.log(`🔕 [messages] Incrementando contador para ${contactId} (não selecionada)`);
              incrementUnreadCount(contactId);
            } else {
              console.log(`🔔 [messages] NÃO incrementando contador: ${isCurrentlySelected ? 'conversa atual' : 'mensagem enviada por mim'}`);
            }
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
        console.log(`❤️❤️❤️ INCREMENTANDO CONTADOR para: ${contactId} ❤️❤️❤️`);
        
        // Verificar novamente se esta conversa já está selecionada (para evitar incremento quando aberta)
        const normalizedId = normalizeContactId(contactId);
        const normalizedSelectedId = selectedConversation ? normalizeContactId(selectedConversation) : null;
        
        // Se for a conversa atual, não incrementamos contador individual
        if (normalizedId === normalizedSelectedId) {
          console.log(`💡 Conversa ${contactId} está aberta - NÃO incrementando contador individual`);
          return; // Sair da função sem incrementar
        }
        
        // Tocar som de notificação quando incrementar o contador
        playNotificationSound();
        
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
      
      // Adicionar evento para qualquer mensagem, com logs detalhados para diagnóstico
      socket.onAny((eventName, ...args) => {
        console.log(`🔍🔍🔍 DIAGNÓSTICO DE EVENTO Socket.io: ${eventName}`, args);
        console.log('Estrutura do evento:', JSON.stringify(args, null, 2));
        
        // Incrementar apenas para eventos que realmente parecem ser mensagens
        if (eventName.toLowerCase().includes('message') || eventName === 'MESSAGES_UPSERT') {
          // Verificar se o evento tem estrutura de mensagem
          let isRealMessage = false;
          
          // Verificar o primeiro argumento
          if (args && args.length > 0) {
            const arg = args[0];
            
            // Testes básicos para identificar uma mensagem
            if (typeof arg === 'object') {
              if (arg && (
                  (arg.key && arg.key.remoteJid) ||
                  (arg.messages && Array.isArray(arg.messages)) ||
                  (arg.type === 'notify') ||
                  (arg.data && Array.isArray(arg.data))
                )) {
                isRealMessage = true;
              }
            }
          }
          
          // Se parece ser uma mensagem real, incrementar contador
          if (isRealMessage) {
            console.log(`💬 Possível nova mensagem em evento ${eventName}`);
            setTotalMessagesReceived(prev => prev + 1);
          }
        }
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

  // Notificar o wrapper que o carregamento terminou
  useEffect(() => {
    onLoadingComplete();
  }, []);

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
              <div className="flex justify-between p-2 bg-[#1E1E1E]" data-component-name="ChatNexoContent">
                <div className="flex space-x-2">
                  <div 
                    className="flex items-center text-xs text-white bg-emerald-600 px-2 py-1 rounded-md cursor-pointer"
                    onClick={() => {
                      // Forçar incremento do contador quando clicar (para testes e debug)
                      setTotalMessagesReceived(prev => prev + 1);
                      console.log('Contador incrementado manualmente');  
                      
                      // Tentar tocar som de notificação quando clicar para pré-autorizar som
                      try {
                        if (audioRef.current) {
                          audioRef.current.currentTime = 0;
                          audioRef.current.play();
                        }
                      } catch (e) {
                        console.error('Erro ao tocar som de teste:', e);
                      }
                    }}
                    title="Clique para incrementar o contador e permitir notificações sonoras">
                    <span className="mr-1">Mensagens recebidas:</span>
                    <span className="font-bold">{totalMessagesReceived}</span>
                  </div>
                  
                  <button 
                    className="text-xs text-white bg-blue-600 px-2 py-1 rounded-md"
                    onClick={() => {
                      // Reset do contador
                      setTotalMessagesReceived(0);
                      localStorage.setItem('nexochat_total_messages', '0');
                      console.log('Contador resetado para 0');
                    }}
                    title="Resetar contador para zero">
                    Reset
                  </button>
                </div>
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

              {/* Sistema de Navegação de Abas com Paginação */}
              <div className="relative border-b border-gray-700 w-full">
                {/* Container para animação e setas */}
                <div className="flex items-center">
                  {/* Botão seta esquerda */}
                  <button 
                    className="px-2 py-3 text-gray-400 hover:text-white focus:outline-none transition-colors"
                    onClick={() => {
                      // Obter todos os elementos de aba
                      const tabContainer = document.getElementById('tabs-container');
                      if (tabContainer) {
                        // Rolar para a esquerda
                        tabContainer.scrollBy({ left: -150, behavior: 'smooth' });
                      }
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  
                  {/* Container escrolável de abas */}
                  <div 
                    id="tabs-container"
                    className="flex-1 flex overflow-x-auto scrollbar-hide" 
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Firefox e IE
                  >
                    {/* Aba Pendentes */}
                    <button
                      className={`min-w-[100px] whitespace-nowrap px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
                      onClick={() => setActiveTab('pending')}
                    >
                      Pendentes
                      {filteredConversations.filter(conv => conv.status === 'pending').length > 0 && (
                        <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                          {filteredConversations.filter(conv => conv.status === 'pending').length}
                        </span>
                      )}
                    </button>
                    
                    {/* Aba Atendendo */}
                    <button
                      className={`min-w-[100px] whitespace-nowrap px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'attending' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
                      onClick={() => setActiveTab('attending')}
                    >
                      Atendendo
                      {filteredConversations.filter(conv => conv.status === 'attending').length > 0 && (
                        <span className="bg-yellow-500 text-gray-900 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {filteredConversations.filter(conv => conv.status === 'attending').length}
                        </span>
                      )}
                    </button>
                    
                    {/* Aba Finalizados */}
                    <button
                      className={`min-w-[100px] whitespace-nowrap px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'finished' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
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
                    
                    {/* Aba Contatos */}
                    <button
                      className={`min-w-[100px] whitespace-nowrap px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'contacts' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
                      onClick={() => {
                        setActiveTab('contacts');
                        // Ao selecionar a aba Contatos, popular a lista de contatos a partir das conversas existentes
                        if (contacts.length === 0) {
                          // Criar lista única de contatos a partir das conversas existentes
                          const uniqueContacts = Array.from(
                            new Map(
                              conversations.map(conv => [conv.id, conv])
                            ).values()
                          );
                          setContacts(uniqueContacts);
                        }
                      }}
                    >
                      Contatos
                      {/* Contador de contatos (opcional) */}
                      {contacts.length > 0 && (
                        <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                          {contacts.length}
                        </span>
                      )}
                    </button>
                    
                    {/* Espaço para abas adicionais no futuro */}
                  </div>
                  
                  {/* Botão seta direita */}
                  <button 
                    className="px-2 py-3 text-gray-400 hover:text-white focus:outline-none transition-colors"
                    onClick={() => {
                      // Obter todos os elementos de aba
                      const tabContainer = document.getElementById('tabs-container');
                      if (tabContainer) {
                        // Rolar para a direita
                        tabContainer.scrollBy({ left: 150, behavior: 'smooth' });
                      }
                    }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                
                {/* Estilos aplicados diretamente via style e className */}
                {/* Os estilos para ocultar a scrollbar já estão aplicados via className="scrollbar-hide" e style inline */}
              </div>
              
              {/* Filtro de Setor - Mostrado apenas quando não estiver na aba Contatos */}
              {activeTab !== 'contacts' && (
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
              )}
            </div>
            
            {/* Removido as subabas - Agora a aba Contatos já mostra diretamente a grid de empresas */}
            
            {/* Campo de Pesquisa */}
            <div className="p-3 border-b border-gray-800" data-component-name="ChatNexo">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Pesquisar contatos..."
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
            
            {/* Lista de Conversas ou Contatos dependendo da aba ativa */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'contacts' ? (
                // Lista de Contatos
                contacts.filter(contact => 
                  contact.contactName.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                  // Mensagem quando não há contatos correspondentes à pesquisa
                  <div className="p-4 text-center text-gray-400">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Nenhum contato encontrado.</p>
                    <p className="text-xs">Tente outro termo de busca.</p>
                  </div>
                ) : (
                  // Lista de contatos filtrados pela pesquisa
                  contacts
                    .filter(contact => contact.contactName.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(contact => (
                      <div
                        key={contact.id}
                        className="cursor-pointer p-3 border-b border-gray-800 hover:bg-[#2A2A2A] transition-colors"
                        onClick={() => {
                          // Procurar se existe uma conversa ativa com esse contato
                          const existingConversation = conversations.find(conv => conv.id === contact.id);
                          if (existingConversation) {
                            // Se existe conversa, seleciona e vai para a aba apropriada
                            setSelectedConversation(existingConversation.id);
                            setActiveTab(existingConversation.status);
                          } else {
                            // Se não existe conversa, iniciar uma nova conversa pendente
                            const newConversation: Conversation = {
                              ...contact,
                              status: 'pending',
                              messages: [],
                              unreadCount: 0
                            };
                            setConversations(prev => [...prev, newConversation]);
                            setSelectedConversation(contact.id);
                            setActiveTab('pending');
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-medium">
                              {contact.contactName.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          
                          {/* Informações do Contato */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col">
                              {/* Nome e Status do Contato */}
                              <div className="flex items-center w-full justify-between">
                                <h3 className="font-medium text-white truncate max-w-[70%]">
                                  {contact.contactName}
                                </h3>
                                <span className="text-xs text-gray-400">
                                  {formatTimestamp(contact.timestamp)}
                                </span>
                              </div>
                              
                              {/* Número do Contato */}
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-sm text-gray-400 truncate max-w-[80%]">
                                  {contact.id.split('@')[0]}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                )
              ) : (
                // Lista de Conversas Original (para as outras abas)
                filteredConversations.length === 0 ? (
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
                            // Atualizar contador no banco de dados
                            saveStatusToDatabase(conv.id, conv.status, 0);
                            return { ...c, unreadCount: 0 };
                          }
                          return c;
                        });
                      });
                      
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
              ))}
            </div>
          </div>
          
          {/* Área de Chat ou Grid de Empresas */}
          <div className="flex-1 flex flex-col">
            {/* O overlay principal agora está no componente wrapper */}
            
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

            {/* Exibir a grid de empresas quando estiver na aba Contatos */}
            {activeTab === 'contacts' ? (
              <div className="flex flex-col h-full bg-[#1A1A1A]">
                {/* Cabeçalho da grid de empresas */}
                <div className="p-4 border-b border-gray-800 bg-[#2A2A2A]">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold text-white">Gerenciamento de Empresas</h2>
                    <button 
                      className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 transition-colors rounded-lg text-white font-medium flex items-center justify-center gap-2"
                      onClick={() => setShowCompanyForm(true)}
                    >
                      <Users size={16} />
                      Cadastrar Empresa
                    </button>
                  </div>
                  
                  {/* Filtros de pesquisa para empresas */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder={`Pesquisar por ${companyFilterType === 'name' ? 'nome' : 'telefone'}...`}
                        className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        value={companySearchQuery}
                        onChange={(e) => setCompanySearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <select
                        className="appearance-none bg-[#1A1A1A] border border-gray-800 text-white py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={companyFilterType}
                        onChange={(e) => setCompanyFilterType(e.target.value as 'name' | 'phone')}
                      >
                        <option value="name">Nome</option>
                        <option value="phone">Telefone</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Área da grid de empresas */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {/* Cabeçalho da tabela */}
                  <div className="grid grid-cols-4 gap-4 mb-3 px-4 py-2 bg-[#2A2A2A] rounded-lg text-gray-400 text-sm font-medium">
                    <div>Nome da Empresa</div>
                    <div>Telefone</div>
                    <div>E-mail</div>
                    <div className="text-right">Ações</div>
                  </div>
                  
                  {/* Linhas da tabela filtradas e se não tiver dados, mostrar mensagem */}
                  {filteredCompanies.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Store size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="text-lg mb-2">Nenhuma empresa cadastrada</p>
                      <p className="text-sm">Clique no botão "Cadastrar Empresa" para adicionar</p>
                    </div>
                  ) : (
                    filteredCompanies.map(company => (
                      <div key={company.id} className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-gray-800 hover:bg-[#2A2A2A] transition-colors">
                        <div className="text-white font-medium">{company.name}</div>
                        <div className="text-gray-300">{company.phone}</div>
                        <div className="text-gray-300 pr-4 truncate">{company.email || '-'}</div>
                        <div className="flex justify-end space-x-4">
                          <button className="p-1 text-emerald-500 hover:text-emerald-400 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                          </button>
                          <button className="p-1 text-red-500 hover:text-red-400 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Formulário deslizante para cadastro de empresas */}
                <div className={`fixed top-0 right-0 h-full w-[500px] bg-[#1A1A1A] border-l border-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${showCompanyForm ? 'translate-x-0' : 'translate-x-full'}`}>
                  {/* Cabeçalho do formulário */}
                  <div className="p-4 border-b border-gray-800 bg-[#2A2A2A] flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Cadastrar Empresa</h2>
                    <button
                      onClick={() => setShowCompanyForm(false)}
                      className="text-gray-400 hover:text-white transition-colors focus:outline-none"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  
                  {/* Corpo do formulário com scrolling */}
                  <div className="overflow-y-auto h-[calc(100%-64px)]">
                    {/* Sistema de abas */}
                    <div className="flex border-b border-gray-800">
                      <button
                        type="button"
                        className={`px-4 py-2 font-medium text-sm transition-colors ${activeFormTab === 'general' 
                          ? 'text-emerald-500 border-b-2 border-emerald-500' 
                          : 'text-gray-400 hover:text-gray-300'}`}
                        onClick={() => setActiveFormTab('general')}
                      >
                        Dados Gerais
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 font-medium text-sm transition-colors ${activeFormTab === 'system' 
                          ? 'text-emerald-500 border-b-2 border-emerald-500' 
                          : 'text-gray-400 hover:text-gray-300'}`}
                        onClick={() => setActiveFormTab('system')}
                      >
                        Inf. Sistema
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 font-medium text-sm transition-colors ${activeFormTab === 'contacts' 
                          ? 'text-emerald-500 border-b-2 border-emerald-500' 
                          : 'text-gray-400 hover:text-gray-300'}`}
                        onClick={() => setActiveFormTab('contacts')}
                      >
                        Contatos
                      </button>
                    </div>
                    
                    <form className="p-4">
                      {/* Aba de Dados Gerais */}
                      {activeFormTab === 'general' && (
                        <>
                          {/* Status */}
                          <div className="mb-4">
                            <label className="block text-gray-300 mb-2">Status</label>
                            <select
                              className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                              value={companyForm.status}
                              onChange={(e) => {
                                setCompanyForm(prev => ({
                                  ...prev,
                                  status: e.target.value
                                }));
                              }}
                            >
                              <option value="Ativo">Ativo</option>
                              <option value="Bloqueado">Bloqueado</option>
                              <option value="Cancelado">Cancelado</option>
                            </select>
                          </div>
                        
                          {/* Tipo de documento (CNPJ ou CPF) */}
                          <div className="mb-4">
                            <label className="block text-gray-300 mb-2">Tipo de documento</label>
                            <div className="flex space-x-4">
                              <label className="inline-flex items-center">
                                <input
                                  type="radio"
                                  className="form-radio text-emerald-500 h-4 w-4"
                                  checked={documentType === 'cnpj'}
                                  onChange={() => setDocumentType('cnpj')}
                                />
                                <span className="ml-2 text-gray-300">CNPJ</span>
                              </label>
                              <label className="inline-flex items-center">
                                <input
                                  type="radio"
                                  className="form-radio text-emerald-500 h-4 w-4"
                                  checked={documentType === 'cpf'}
                                  onChange={() => setDocumentType('cpf')}
                                />
                                <span className="ml-2 text-gray-300">CPF</span>
                              </label>
                            </div>
                          </div>

                          {/* CNPJ ou CPF com máscara */}
                          <div className="mb-4">
                            <label className="block text-gray-300 mb-2">
                              {documentType === 'cnpj' ? 'CNPJ' : 'CPF'}
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                                placeholder={documentType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                                value={companyForm.document}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '');
                                  let maskedValue = '';
                                  
                                  if (documentType === 'cnpj') {
                                    // Máscara para CNPJ: 00.000.000/0000-00
                                    if (value.length <= 2) {
                                      maskedValue = value;
                                    } else if (value.length <= 5) {
                                      maskedValue = `${value.slice(0, 2)}.${value.slice(2)}`;
                                    } else if (value.length <= 8) {
                                      maskedValue = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5)}`;
                                    } else if (value.length <= 12) {
                                      maskedValue = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8)}`;
                                    } else {
                                      maskedValue = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12, 14)}`;
                                    }
                                  } else {
                                    // Máscara para CPF: 000.000.000-00
                                    if (value.length <= 3) {
                                      maskedValue = value;
                                    } else if (value.length <= 6) {
                                      maskedValue = `${value.slice(0, 3)}.${value.slice(3)}`;
                                    } else if (value.length <= 9) {
                                      maskedValue = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
                                    } else {
                                      maskedValue = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9, 11)}`;
                                    }
                                  }
                                  
                                  setCompanyForm(prev => ({
                                    ...prev,
                                    document: maskedValue
                                  }));
                                }}
                              />
                              {documentType === 'cnpj' && (
                                <button
                                  type="button"
                                  className="absolute right-2 top-2 text-gray-400 hover:text-emerald-500"
                                  onClick={() => {
                                    // Implementar busca de dados do CNPJ
                                    console.log('Buscar dados do CNPJ:', companyForm.document);
                                  }}
                                >
                                  <Search size={18} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Razão Social (apenas para CNPJ) */}
                          {documentType === 'cnpj' && (
                            <div className="mb-4">
                              <label className="block text-gray-300 mb-2">Razão Social</label>
                              <input
                                type="text"
                                className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                                placeholder="Razão Social da empresa"
                                value={companyForm.companyName}
                                onChange={(e) => setCompanyForm(prev => ({
                                  ...prev,
                                  companyName: e.target.value
                                }))}
                              />
                            </div>
                          )}

                          {/* Nome Fantasia */}
                          <div className="mb-4">
                            <label className="block text-gray-300 mb-2">Nome Fantasia</label>
                            <input
                              type="text"
                              className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                              placeholder="Nome Fantasia"
                              value={companyForm.tradeName}
                              onChange={(e) => setCompanyForm(prev => ({
                                ...prev,
                                tradeName: e.target.value
                              }))}
                            />
                          </div>
                          
                          {/* Email da empresa */}
                          <div className="mb-4">
                            <label className="block text-gray-300 mb-2">Email da Empresa</label>
                            <input
                              type="email"
                              className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                              placeholder="email@empresa.com"
                              value={companyForm.email || ''}
                              onChange={(e) => setCompanyForm(prev => ({
                                ...prev,
                                email: e.target.value
                              }))}
                            />
                          </div>
                          
                          {/* Endereço */}
                          <div className="mb-4">
                            <label className="block text-gray-300 mb-2">Endereço</label>
                            <textarea
                              className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                              placeholder="Endereço completo da empresa"
                              rows={3}
                              value={companyForm.address || ''}
                              onChange={(e) => setCompanyForm(prev => ({
                                ...prev,
                                address: e.target.value
                              }))}
                            />
                          </div>
                        </>
                      )}
                      
                      {/* Aba de Informações do Sistema */}
                      {activeFormTab === 'system' && (
                        <>
                          {/* Código do Sistema */}
                          <div className="mb-4">
                            <label className="block text-gray-300 mb-2">Código do Sistema</label>
                            <input
                              type="text"
                              className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                              placeholder="Informe o código do sistema utilizado"
                              value={companyForm.systemCode || ''}
                              onChange={(e) => setCompanyForm(prev => ({
                                ...prev,
                                systemCode: e.target.value
                              }))}
                            />
                          </div>

                          {/* Observações */}
                          <div className="mb-4">
                            <label className="block text-gray-300 mb-2">Observações</label>
                            <textarea
                              className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                              placeholder="Informações detalhadas sobre o sistema utilizado pelo cliente"
                              rows={10}
                              value={companyForm.systemNotes || ''}
                              onChange={(e) => setCompanyForm(prev => ({
                                ...prev,
                                systemNotes: e.target.value
                              }))}
                            />
                          </div>
                        </>
                      )}
                      
                      {/* Aba de Contatos */}
                      {activeFormTab === 'contacts' && (
                        <div>
                          {/* Lista de contatos */}
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-3">
                              <label className="block text-gray-300 font-medium">Contatos</label>
                              <button
                                type="button"
                                className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                                onClick={() => {
                                  setCompanyForm(prev => ({
                                    ...prev,
                                    contacts: [
                                      ...prev.contacts,
                                      { 
                                        id: Date.now().toString(),
                                        name: '', 
                                        phone: '', 
                                        position: 'Funcionário'
                                      }
                                    ]
                                  }));
                                }}
                              >
                                <Plus size={16} />
                                <span>Adicionar contato</span>
                              </button>
                            </div>
                            
                            {/* Cabeçalho da lista de contatos */}
                            <div className="grid grid-cols-12 gap-3 mb-2 px-2 text-xs text-gray-400">
                              <div className="col-span-5">Nome</div>
                              <div className="col-span-4">WhatsApp</div>
                              <div className="col-span-2">Cargo</div>
                              <div className="col-span-1"></div>
                            </div>
                            
                            {/* Lista de contatos */}
                            <div className="max-h-[300px] overflow-y-auto pr-1">
                              {companyForm.contacts.map((contact, index) => (
                                <div key={contact.id} className="grid grid-cols-12 gap-3 mb-3 items-center">
                                  {/* Nome do contato */}
                                  <div className="col-span-5">
                                    <input
                                      type="text"
                                      className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                                      placeholder="Nome do contato"
                                      value={contact.name}
                                      onChange={(e) => {
                                        const updatedContacts = [...companyForm.contacts];
                                        updatedContacts[index] = {
                                          ...updatedContacts[index],
                                          name: e.target.value
                                        };
                                        setCompanyForm(prev => ({
                                          ...prev,
                                          contacts: updatedContacts
                                        }));
                                      }}
                                    />
                                  </div>
                                  
                                  {/* Telefone do contato com máscara */}
                                  <div className="col-span-4">
                                    <input
                                      type="text"
                                      className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                                      placeholder="(00) 00000-0000"
                                      value={contact.phone}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        let maskedValue = '';
                                        
                                        if (value.length <= 2) {
                                          maskedValue = value.length > 0 ? `(${value}` : '';
                                        } else if (value.length <= 6) {
                                          maskedValue = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                                        } else if (value.length <= 10) {
                                          maskedValue = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
                                        } else {
                                          maskedValue = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
                                        }
                                        
                                        const updatedContacts = [...companyForm.contacts];
                                        updatedContacts[index] = {
                                          ...updatedContacts[index],
                                          phone: maskedValue
                                        };
                                        setCompanyForm(prev => ({
                                          ...prev,
                                          contacts: updatedContacts
                                        }));
                                      }}
                                    />
                                  </div>
                                  
                                  {/* Cargo do contato */}
                                  <div className="col-span-2">
                                    <select
                                      className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                                      value={contact.position}
                                      onChange={(e) => {
                                        const updatedContacts = [...companyForm.contacts];
                                        updatedContacts[index] = {
                                          ...updatedContacts[index],
                                          position: e.target.value
                                        };
                                        setCompanyForm(prev => ({
                                          ...prev,
                                          contacts: updatedContacts
                                        }));
                                      }}
                                    >
                                      <option value="Proprietário">Proprietário</option>
                                      <option value="Gerente">Gerente</option>
                                      <option value="Funcionário">Funcionário</option>
                                    </select>
                                  </div>
                                  
                                  {/* Botão para remover contato */}
                                  <div className="col-span-1 text-center">
                                    {companyForm.contacts.length > 1 && (
                                      <button
                                        type="button"
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                        onClick={() => {
                                          const updatedContacts = companyForm.contacts.filter((_, i) => i !== index);
                                          setCompanyForm(prev => ({
                                            ...prev,
                                            contacts: updatedContacts
                                          }));
                                        }}
                                      >
                                        <X size={18} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Nota sobre contatos */}
                            <p className="text-xs text-gray-400 mt-2 italic">
                              Os contatos cadastrados estarão disponíveis para identificação no chat quando entrarem em contato via WhatsApp.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Botões de Ação */}
                      <div className="flex justify-end space-x-2 mt-6">
                        <button
                          type="button"
                          onClick={() => setShowCompanyForm(false)}
                          className="py-2 px-4 bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Aqui seria a lógica para salvar a empresa no backend
                            // Por enquanto, apenas adicionamos à lista local
                            
                            // Formatar o telefone do contato principal para exibir na lista
                            const mainContact = companyForm.contacts[0];
                            const displayPhone = mainContact ? mainContact.phone : '';
                            
                            // Formatar o telefone no padrão WhatsApp para armazenar
                            const whatsappPhone = mainContact ? mainContact.phone.replace(/\D/g, '') : '';
                            
                            const newCompany = {
                              id: Date.now().toString(),
                              status: companyForm.status, // Adicionar o status da empresa
                              name: companyForm.tradeName || companyForm.companyName,
                              phone: displayPhone, // Telefone formatado para exibição
                              whatsappPhone: whatsappPhone, // Telefone sem formatação para WhatsApp
                              email: companyForm.email || '',
                              address: companyForm.address || '',
                              contacts: companyForm.contacts,
                              createdAt: new Date()
                            };
                            
                            // Atualizar a lista de empresas - filteredCompanies é derivado automaticamente de companies
                            setCompanies([newCompany, ...companies]);
                            setShowCompanyForm(false);
                            
                            // Resetar o formulário
                            setCompanyForm({
                              status: 'Ativo',
                              document: '',
                              companyName: '',
                              tradeName: '',
                              systemCode: '',
                              systemNotes: '',
                              email: '',
                              address: '',
                              contacts: [{ 
                                id: Date.now().toString(),
                                name: '', 
                                phone: '', 
                                position: 'Proprietário'
                              }]
                            });
                            
                            // Voltar para a primeira aba ao fechar o formulário
                            setActiveFormTab('general');
                            setDocumentType('cnpj');
                            
                            alert('Empresa cadastrada com sucesso!');
                          }}
                          className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 transition-colors rounded-lg text-white"
                        >
                          Salvar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            ) : currentConversation ? (
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
                
                {/* Botão de teste de som de notificação */}
                <div className="bg-[#1A1A1A] px-4 py-2 border-b border-gray-800">
                  <button 
                    onClick={() => {
                      // Chamar a função de reprodução de som na mesma função que é usada pela notificação
                      if (socketRef.current) {
                        // Acessando a função via socketRef, já que está dentro do escopo do connectSocketIO
                        const playSound = () => {
                          try {
                            // Verificar se temos um elemento de áudio
                            if (audioRef.current) {
                              // Reiniciar o som para garantir que toque novamente
                              audioRef.current.currentTime = 0;
                              
                              // Tocar o som com volume apropriado
                              audioRef.current.volume = 0.7;
                              
                              // Reproduzir o som
                              const playPromise = audioRef.current.play();
                              
                              if (playPromise !== undefined) {
                                playPromise
                                  .then(() => {
                                    console.log('Som de teste reproduzido com sucesso');
                                  })
                                  .catch(error => {
                                    console.error('Erro ao reproduzir áudio de teste:', error);
                                    // Fallback
                                    const fallbackAudio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=notification-sound-7062.mp3');
                                    fallbackAudio.play().catch(e => console.error('Erro no fallback do teste:', e));
                                  });
                              }
                            } else {
                              // Fallback
                              const fallbackAudio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=notification-sound-7062.mp3');
                              fallbackAudio.play().catch(e => console.error('Erro de fallback do teste:', e));
                            }
                          } catch (error) {
                            console.error('Erro ao reproduzir som de teste:', error);
                          }
                        };
                        
                        playSound();
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center text-sm"
                  >
                    <span className="mr-2">🔊</span> Testar Som de Notificação
                  </button>
                </div>
                
                {/* Mensagens */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-[#1A1A1A] custom-scrollbar">
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
