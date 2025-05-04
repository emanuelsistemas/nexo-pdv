import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useChat } from '../../contexts/ChatContext';
import ConversationList from './ConversationList';
import ChatContainer from './ChatContainer';
import SearchBar from './SearchBar';
import SectorFilter from './SectorFilter';
import ConnectionStatus from './ConnectionStatus';
import { ConversationStatus, StatusTab, ChatMessage } from '../../types/chat';
import useEvolutionApi from '../../hooks/useEvolutionApi';
import useWhatsAppInstance from '../../hooks/useWhatsAppInstance';
import { loadStatusFromLocalStorage, saveStatusToLocalStorage } from '../../services/storage';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { supabase } from '../../lib/supabase';

const Chat: React.FC = () => {
  // Contexto global do chat
  const {
    conversations,
    setConversations,
    selectedConversationId,
    setSelectedConversationId,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedSector,
    setSelectedSector,
    enabledSectors,
    getCurrentConversation,
    sendMessage: contextSendMessage,
    updateConversationStatus,
    filterConversations
  } = useChat();

  // Estado local
  const [scrollPosition, setScrollPosition] = useState<number | undefined>(undefined);
  const [statusTabs, setStatusTabs] = useState<StatusTab[]>([
    // Primeira linha - usando exatamente os mesmos nomes em português como IDs
    { id: 'Aguardando', label: 'Aguardando', count: 0 },
    { id: 'Atendendo', label: 'Atendendo', count: 0 },
    { id: 'Pendentes', label: 'Pendentes', count: 0 },
    // Segunda linha - usando exatamente os mesmos nomes em português como IDs
    { id: 'Finalizados', label: 'Finalizados', count: 0 },
    { id: 'Contatos', label: 'Contatos', count: 0 },
    { id: 'Status', label: 'Status', count: 0 }
  ]);
  
  // Estado para Socket.io
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [socketError, setSocketError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
  // Hook personalizado para integração com WhatsApp
  const { connection, apiConfig, loading, error, refreshConnection } = useWhatsAppInstance();

  // Usar apiConfig do hook useWhatsAppInstance se estiver disponível
  const {
    fetchMessages,
    sendMessage: apiSendMessage
  } = useEvolutionApi(apiConfig);

  // Calcular contagens para as abas de status
  useEffect(() => {
    const newStatusTabs = statusTabs.map(tab => {
      if (tab.id === 'all') {
        return { ...tab, count: conversations.length };
      } else {
        const count = conversations.filter(c => c.status === tab.id).length;
        return { ...tab, count };
      }
    });

    setStatusTabs(newStatusTabs);
  }, [conversations]);

  // Processar mensagens recebidas e atualizar estado
  const processMessages = (messages: any[], instanceName?: string) => {
    if (!messages || !Array.isArray(messages)) {
      return;
    }

    console.log(`Processando ${messages.length} mensagens ${instanceName ? 'da instância ' + instanceName : ''}`);

    // Para cada mensagem recebida
    messages.forEach((msg) => {
      if (!msg || !msg.key || !msg.key.remoteJid) {
        console.log('Mensagem inválida recebida:', msg);
        return;
      }

      const remoteJid = msg.key.remoteJid;
      const fromMe = msg.key.fromMe;
      const timestamp = new Date();
      let content = '';
      
      // Extrair conteúdo com base no tipo de mensagem
      if (msg.message?.conversation) {
        content = msg.message.conversation;
      } else if (msg.message?.extendedTextMessage?.text) {
        content = msg.message.extendedTextMessage.text;
      } else if (msg.message?.imageMessage?.caption) {
        content = '[Imagem] ' + msg.message.imageMessage.caption;
      } else if (msg.message?.videoMessage?.caption) {
        content = '[Vídeo] ' + msg.message.videoMessage.caption;
      } else if (msg.message?.documentMessage?.fileName) {
        content = '[Documento] ' + msg.message.documentMessage.fileName;
      } else if (msg.message?.audioMessage) {
        content = '[Áudio]';
      } else if (msg.message?.locationMessage) {
        content = '[Localização]';
      } else if (msg.message?.contactMessage) {
        content = '[Contato]';
      } else if (msg.message?.stickerMessage) {
        content = '[Sticker]';
      } else {
        content = '[Mensagem desconhecida]';
      }

      // Incluir informação sobre a instância nos metadados da mensagem
      const newMessage: ChatMessage = {
        id: msg.key.id,
        content,
        sender: fromMe ? 'me' : 'them',
        timestamp,
        instanceName: instanceName // Adicionando o nome da instância como metadado
      };

      // Atualizar a lista de conversas
      setConversations(prevConversations => {
        // Verificar se já existe uma conversa com esse remoteJid
        const existingConversationIndex = prevConversations.findIndex(
          c => c.id === remoteJid
        );

        // Criar nova lista de conversas
        const updatedConversations = [...prevConversations];

        if (existingConversationIndex !== -1) {
          // Conversa existente: adicionar mensagem e atualizar para o topo da lista
          const conversation = updatedConversations[existingConversationIndex];
          updatedConversations.splice(existingConversationIndex, 1);
          
          const updatedMessages = [...conversation.messages, newMessage];
          
          // Atualizar unread_count apenas se não for a conversa selecionada e não for do usuário
          const unreadCount = 
            selectedConversationId === remoteJid || fromMe ? 
            (conversation.unread_count || 0) : 
            (conversation.unread_count || 0) + 1;
          
          updatedConversations.unshift({
            ...conversation,
            messages: updatedMessages,
            last_message: content,
            last_message_time: timestamp,
            unread_count: unreadCount,
            instanceName: instanceName || conversation.instanceName // Manter ou atualizar a instância
          });
        } else {
          // Nova conversa: criar e adicionar ao topo da lista
          // Extrair informações do remoteJid (nome, telefone)
          const phoneNumber = remoteJid.split('@')[0];
          const displayName = phoneNumber; // Poderia buscar o nome em uma lista de contatos
          
          // Criar a nova conversa com status 'Aguardando'
          const newStatus: ConversationStatus = 'Aguardando';
          
          const newConversation = {
            id: remoteJid,
            name: displayName,
            phone: phoneNumber,
            contactName: displayName, // Adicionar contactName para satisfazer o tipo Conversation
            messages: [newMessage],
            status: newStatus, // Inicialmente, todas as novas conversas estão pendentes
            last_message: content,
            last_message_time: timestamp,
            unread_count: 1,
            sector: 'Geral', // Setor padrão
            instanceName: instanceName // Registrar qual instância recebeu esta conversa
          };
          
          // Adicionar conversa ao array local
          updatedConversations.unshift(newConversation as any);
          
          // Salvar na tabela nexochat_status
          saveConversationStatus(remoteJid, newStatus, newConversation);
        }

        return updatedConversations;
      });
    });
  };

  // Função para salvar a posição de rolagem
  const handleScrollPositionChange = useCallback((position: number) => {
    setScrollPosition(position);
    
    if (selectedConversationId) {
      saveStatusToLocalStorage(
        selectedConversationId, 
        getCurrentConversation()?.status || 'Pendentes', // Usar Pendentes em vez de pending
        undefined,
        position
      );
      
      // Aqui também poderia salvar no banco de dados...
    }
  }, [selectedConversationId, getCurrentConversation]);

  // Quando seleciona uma conversa
  const handleSelectConversation = useCallback((conversationId: string) => {
    // Resetar posição de rolagem
    setScrollPosition(undefined);
    
    // Carregar posição salva para esta conversa
    const savedData = loadStatusFromLocalStorage(conversationId);
    if (savedData.scrollPosition !== undefined) {
      setScrollPosition(savedData.scrollPosition);
    }
    
    // Limpar contador de não lidas
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unreadCount: 0 } 
          : conv
      )
    );
    
    // Atualizar conversa selecionada
    setSelectedConversationId(conversationId);
  }, [setSelectedConversationId, setConversations]);

  // Função para enviar mensagem
  const handleSendMessage = useCallback(async (content: string) => {
    const currentConversation = getCurrentConversation();
    if (!currentConversation) return;
    
    // Adicionar mensagem localmente via contexto
    contextSendMessage(content);
    
    // Enviar mensagem via API Evolution
    try {
      const phoneNumber = currentConversation.id.split('@')[0];
      await apiSendMessage(phoneNumber, content);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Aqui poderia implementar lógica de retry ou notificar o usuário
    }
  }, [getCurrentConversation, contextSendMessage, apiSendMessage]);

  // Função para conectar o Socket.io
  const connectSocket = useCallback(async () => {
    console.log(`=== CONNECT SOCKET CALLED === [API Config: ${!!apiConfig}, Attempts: ${connectionAttempts}]`);
    if (!apiConfig) {
      console.log('API Config ainda não disponível, abortando conexão');
      return;
    }
    
    if (connectionAttempts >= 3) {
      console.log('Atingido limite de 3 tentativas, parando conexão');
      return;
    }
    
    if (!mountedRef.current) {
      console.log('Componente desmontado, abortando conexão');
      return;
    }
    
    if (socketRef.current?.connected) {
      console.log('Já existe uma conexão ativa, abortando nova conexão');
      return;
    }
    
    try {
      setConnectionAttempts(prev => prev + 1);
      console.log(`Tentativa de conexão ${connectionAttempts + 1}/3 [${new Date().toISOString()}]`);
      
      // Desconectar socket existente
      if (socketRef.current) {
        console.log('Desconectando socket existente');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // PASSO 1: Verificar o status da instância primeiro
      console.log('Verificando status da instância via HTTP');
      
      const { baseUrl, instanceName, apikey } = apiConfig;
      
      if (!baseUrl || !instanceName) {
        throw new Error('URL da API ou nome da instância não definidos');
      }
      
      // Configurar headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (apikey && apikey.trim() !== '') {
        headers['apikey'] = apikey;
      }
      
      // Verificar status da instância
      const statusUrl = `${baseUrl}/instance/connectionState/${instanceName}`;
      console.log(`Verificando status: ${statusUrl}`);
      
      const response = await axios.get(statusUrl, { headers });
      
      if (response.status !== 200) {
        throw new Error(`Erro ao verificar status: ${response.status}`);
      }
      
      console.log('Status da instância:', response.data);
      
      // PASSO 2: Conectar Socket.io
      console.log('Conectando Socket.io...');
      
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
      
      // Log para todos os eventos
      socket.onAny((event, ...args) => {
        console.log(`Socket.io evento: ${event}`, args);
      });
      
      // Eventos principais
      socket.on('connect', () => {
        console.log(`Socket.io conectado! ID: ${socket.id}`);
        setIsConnected(true);
        setSocketError(null);
        setConnectionAttempts(0); // Resetar contador após sucesso
        
        // Enviar subscribe
        const subscribeMessage = {
          action: 'subscribe',
          instance: instanceName
        };
        console.log('Enviando subscribe:', subscribeMessage);
        socket.emit('subscribe', subscribeMessage);
        
        // Formato alternativo
        socket.emit('subscribe', instanceName);
        
        // Agora que Socket.io está conectado, carregar as mensagens iniciais
        loadInitialMessages();
      });
      
      socket.on('disconnect', (reason) => {
        console.log(`Socket.io desconectado. Razão: ${reason}`);
        setIsConnected(false);
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket.io erro de conexão:', error.message);
        setSocketError(`Erro de conexão: ${error.message}`);
      });
      
      socket.on('error', (error) => {
        console.error('Socket.io erro:', error);
        setSocketError(`Erro: ${JSON.stringify(error)}`);
      });
      
      socket.on('messages.upsert', (data) => {
        console.log('Nova mensagem recebida:', data);
        if (data && data.messages) {
          processMessages(data.messages, instanceName);
        }
      });
      
      socketRef.current = socket;
      
    } catch (error) {
      console.error('Erro ao conectar Socket.io:', error);
      setSocketError(`Erro: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [apiConfig, connectionAttempts]);
  
  // Função para desconectar o Socket.io
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('Desconectando Socket.io');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);
  


  // Função para carregar mensagens iniciais (após Socket.io conectar)
  const loadInitialMessages = useCallback(async () => {
    if (apiConfig) {
      try {
        console.log('Carregando mensagens iniciais após Socket.io conectado...');
        const result = await fetchMessages();
        if (result.messages.length > 0) {
          processMessages(result.messages);
        } else {
          console.log('Nenhuma mensagem encontrada no carregamento inicial');
        }
      } catch (error) {
        console.error('Erro ao carregar mensagens iniciais:', error);
      }
    }
  }, [apiConfig, fetchMessages, processMessages]);
  
  // Função para salvar o status da conversa na tabela nexochat_status
  const saveConversationStatus = useCallback(async (
    conversationId: string, 
    status: ConversationStatus, 
    conversationData: any
  ) => {
    try {
      console.log(`Salvando conversa ${conversationId} com status ${status} no banco de dados`);
      
      // Buscar reseller_id e admin_id do localStorage
      const adminSession = localStorage.getItem('admin_session');
      
      if (!adminSession) {
        console.error('Sessão admin não encontrada');
        return;
      }
      
      const session = JSON.parse(adminSession);
      const resellerId = session.reseller_id || '';
      const adminId = session.id || session.admin_id || '';
      const adminUserId = session.user?.id || '';
      
      // Verificar se a conversa já existe na tabela
      const { data: existingData } = await supabase
        .from('nexochat_status')
        .select('id')
        .eq('conversation_id', conversationId)
        .single();
        
      if (existingData) {
        // Atualiza o registro existente
        const { error } = await supabase
          .from('nexochat_status')
          .update({
            status,
            updated_at: new Date().toISOString(),
            unread_count: conversationData.unread_count || 0
          })
          .eq('conversation_id', conversationId);
          
        if (error) {
          console.error('Erro ao atualizar status da conversa:', error);
        }
      } else {
        // Cria um novo registro
        const { error } = await supabase
          .from('nexochat_status')
          .insert({
            conversation_id: conversationId,
            status,
            reseller_id: resellerId,
            profile_admin_id: adminId,
            profile_admin_user_id: adminUserId,
            unread_count: conversationData.unread_count || 0,
            scroll_position: 0
          });
          
        if (error) {
          console.error('Erro ao salvar nova conversa no banco:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar status da conversa:', error);
    }
  }, []);
  
  // Função para alternar o status de uma conversa
  const handleChangeStatus = useCallback((conversationId: string, newStatus: ConversationStatus) => {
    // Atualizar no estado local
    updateConversationStatus(conversationId, newStatus);
    
    // Buscar conversa nos dados locais
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      // Salvar no banco de dados
      saveConversationStatus(conversationId, newStatus, conversation);
    }
  }, [updateConversationStatus, conversations, saveConversationStatus]);
  
  // Efeito para gerenciar a conexão Socket.io
  // Usando ref para controlar se já montou e prevenir loops
  const hasInitializedRef = useRef(false);
  const mountedRef = useRef(true);
  
  // Ref para apiConfig para estar disponível no useEffect
  const apiConfigRef = useRef(apiConfig);
  useEffect(() => {
    // Manter a ref atualizada quando apiConfig mudar
    apiConfigRef.current = apiConfig;
  }, [apiConfig]);
  
  // useEffect para inicialização - executado apenas UMA vez
  useEffect(() => {
    console.log("=== MOUNT EFFECT ====");
    // Marcar componente como montado
    mountedRef.current = true;
    
    // Função para tentar conexão com delay
    const attemptConnection = () => {
      if (mountedRef.current && apiConfigRef.current && !hasInitializedRef.current) {
        console.log("=== TENTANDO INICIALIZAÇÃO ====", apiConfigRef.current);
        hasInitializedRef.current = true;
        connectSocket();
      }
    };
    
    // Tenta conexão após 2 segundos para garantir que tudo carregou
    console.log("Agendando tentativa de conexão após 2 segundos...");
    const timer = setTimeout(attemptConnection, 2000);
    
    return () => {
      console.log("=== UNMOUNT EFFECT ====");
      mountedRef.current = false;
      clearTimeout(timer);
      disconnectSocket();
    };
  }, []);  // <-- Dependencies vazias para executar apenas uma vez

  return (
    <div className="flex h-full">
      {/* Painel lateral - Lista de conversas */}
      <div className="w-96 h-full border-r border-gray-800 flex flex-col">
        {/* Abas simplificadas para solucionar problema de navegação */}
        <div className="flex flex-col border-b border-gray-800 bg-[#1e1e1e]">
          {/* Primeira linha: Aguardando > Em Atendimento > Pendentes */}
          <div className="flex justify-center">
            {statusTabs.slice(0, 3).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <div 
                  key={tab.id}
                  onClick={() => {
                    console.log('Clicando diretamente na aba:', tab.id);
                    // Forçar a mudança de aba
                    setActiveTab(tab.id as ConversationStatus | 'all');
                  }}
                  style={{ cursor: 'pointer', flex: 1, position: 'relative', zIndex: 999 }}
                  className={`px-4 py-3 text-center ${isActive ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-gray-700 text-white text-xs rounded-full px-2 py-0.5">
                      {tab.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Segunda linha: Finalizados > Contatos > Status */}
          <div className="flex justify-center">
            {statusTabs.slice(3).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <div 
                  key={tab.id}
                  onClick={() => {
                    console.log('Clicando diretamente na aba:', tab.id);
                    // Forçar a mudança de aba
                    setActiveTab(tab.id as ConversationStatus | 'all');
                  }}
                  style={{ cursor: 'pointer', flex: 1, position: 'relative', zIndex: 999 }}
                  className={`px-4 py-3 text-center ${isActive ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-gray-700 text-white text-xs rounded-full px-2 py-0.5">
                      {tab.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        

        
        {/* Filtro de Setor - Mostrado apenas quando não estiver na aba Contatos ou Status */}
        {activeTab !== 'Contatos' && activeTab !== 'Status' && (
          <SectorFilter
            selectedSector={selectedSector}
            onSectorChange={setSelectedSector}
            enabledSectors={enabledSectors}
          />
        )}
        
        {/* Barra de busca - Não exibida na aba Status */}
        {activeTab !== 'Status' && (
          <div className="p-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar conversas..."
            />
          </div>
        )}
        
        <div className="flex-1 overflow-hidden">
          {activeTab !== 'Status' ? (
            <ConversationList
              conversations={filterConversations()}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              statusFilter={activeTab}
            />
          ) : (
            <ConnectionStatus 
              connection={connection}
              loading={loading}
              error={error}
              onRefresh={refreshConnection}
              socketConnected={isConnected}
              socketError={socketError}
            />
          )}
        </div>
        
        {/* Status do Socket.io removido daqui e movido para a aba Status */}
      </div>
      
      {/* Área principal - Conversa */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <ChatContainer
            conversation={getCurrentConversation()}
            onSendMessage={handleSendMessage}
            onChangeStatus={handleChangeStatus}
            scrollPosition={scrollPosition}
            onScrollPositionChange={handleScrollPositionChange}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Selecione uma conversa para começar
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
