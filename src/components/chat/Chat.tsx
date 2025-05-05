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
import { 
  loadStatusFromLocalStorage, 
  saveStatusToLocalStorage, 
  saveConversationsToLocalStorage, 
  loadConversationsFromLocalStorage,
  updateUnreadCountInLocalStorage
} from '../../services/storage';
import { io, Socket } from 'socket.io-client';
// axios removido pois não é mais necessário
import { supabase } from '../../lib/supabase';
import { publish, EVENTS } from '../../services/eventBus';

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
  const [socketInstance, setSocketInstance] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);
  
  // Estado para controlar o carregamento de conversas
  const [loadingConversations, setLoadingConversations] = useState(true);
  
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

  // Efeito para marcar todas as conversas como "fechadas" ao inicializar a aplicação
  useEffect(() => {
    // Marcar todas as conversas como fechadas ao inicializar a aplicação
    console.log('[initEffect] Marcando todas as conversas como fechadas ao inicializar');
    
    supabase
      .from('nexochat_status')
      .update({ status_msg: 'fechada' })
      .eq('status_msg', 'aberta')
      .then(({ error }) => {
        if (error) {
          console.error('[initEffect] Erro ao marcar conversas como fechadas ao inicializar:', error);
        } else {
          console.log('[initEffect] Conversas marcadas como fechadas com sucesso ao inicializar');
        }
      });
  }, []); // Este efeito roda apenas uma vez na inicialização
  
  // Inscrever para atualizações em tempo real na tabela nexochat_status
  useEffect(() => {
    console.log('[realtimeEffect] Configurando subscription para nexochat_status');
    
    // Criar canal de tempo real com o Supabase
    const channel = supabase
      .channel('nexochat_status_changes')
      .on('postgres_changes', 
        { 
          event: '*', // Escutar todos os eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'nexochat_status'
        }, 
        (payload) => {
          console.log('[Chat Realtime - UPDATE] Payload recebido:', payload); // LOG ADICIONADO
            
          // Se for uma atualização (unread_count alterado)
          if (payload.eventType === 'UPDATE') {
            const updatedStatus = payload.new;
            const conversationId = updatedStatus.conversation_id;
            
            // Atualizar a lista de conversas com o novo valor do contador
            setConversations(prevConversations => {
              return prevConversations.map(conv => {
                if (conv.id === conversationId) {
                  // Encontrou a conversa que foi atualizada
                  console.log(`[Chat Realtime - UPDATE] Atualizando contador LOCALMENTE para conversa ${conversationId}: ${updatedStatus.unread_count}`); // LOG ADICIONADO
                  return {
                    ...conv,
                    unread_count: updatedStatus.unread_count || 0
                  };
                }
                return conv;
              });
            });
          }
        }
      );
    
    // Iniciar a subscription
    channel.subscribe((status) => {
      console.log('[realtimeEffect] Status da subscription:', status);
    });
    
    // Limpar a subscription quando o componente for desmontado
    return () => {
      console.log('[realtimeEffect] Limpando subscription');
      supabase.removeChannel(channel);
    };
  }, [setConversations]); // Dependência adicionada: setConversations

  // Monitorar mudanças na seleção de conversas para marcar como fechada quando desselecionada
  const previousConversationIdRef = useRef<string | null>(selectedConversationId);
  
  useEffect(() => {
    // Se havia uma conversa selecionada anteriormente e agora não há, marcar como fechada
    if (previousConversationIdRef.current && !selectedConversationId) {
      console.log(`[useEffect] Conversa ${previousConversationIdRef.current} foi desselecionada, marcando como fechada`);
      
      // Atualizar status da conversa anterior para "fechada"
      supabase
        .from('nexochat_status')
        .select('id')
        .eq('conversation_id', previousConversationIdRef.current)
        .then(({ data, error }) => {
          if (error) {
            console.error('[useEffect] Erro ao buscar conversa desselecionada:', error);
          } else if (data && data.length > 0) {
            // Atualizar todos os registros encontrados
            data.forEach((record: any) => {
              if (record && record.id) {
                supabase
                  .from('nexochat_status')
                  .update({ status_msg: 'fechada' })
                  .eq('id', record.id)
                  .then(({ error: updateError }) => {
                    if (updateError) {
                      console.error(`[useEffect] Erro ao marcar conversa ${previousConversationIdRef.current} como fechada:`, updateError);
                    } else {
                      console.log(`[useEffect] Conversa ${previousConversationIdRef.current} marcada como fechada após desseleção`);
                    }
                  });
              }
            });
          }
        });
    }
    
    // Atualizar a referência para a próxima verificação
    previousConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

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
        console.log(`[processMessages] Recebida mensagem para ${remoteJid}. Processando...`); // LOG ADICIONADO
        // Verificar se já existe uma conversa com esse remoteJid
        const existingConversationIndex = prevConversations.findIndex(
          c => c.id === remoteJid
        );

        // Criar nova lista de conversas
        const updatedConversations = [...prevConversations];
        let finalConversations; // Variável para armazenar o resultado final

        if (existingConversationIndex !== -1) {
          // Conversa existente: adicionar mensagem e atualizar para o topo da lista
          const conversation = updatedConversations[existingConversationIndex];
          updatedConversations.splice(existingConversationIndex, 1);
          
          const updatedMessages = [...conversation.messages, newMessage];
          
          // Lógica de atualização do contador de mensagens não lidas
          let unreadCount = conversation.unread_count || 0;
          
          // Verificar se esta conversa é a selecionada atualmente
          const isSelectedConversation = selectedConversationId === remoteJid;
          
          // Se a conversa NÃO estiver selecionada E a mensagem NÃO for do usuário, incrementa o contador
          if (!isSelectedConversation && !fromMe) {
            unreadCount += 1;
            console.log(`[processMessages] INCREMENTANDO contador para ${remoteJid} de ${conversation.unread_count || 0} para ${unreadCount}`); // LOG ADICIONADO
            
            // Publicar evento para atualizar o contador diretamente na interface
            publish(EVENTS.MESSAGE_COUNTER_UPDATE, {
              conversationId: remoteJid,
              count: unreadCount
            });
          } else if (isSelectedConversation) {
            // Se a conversa estiver selecionada, garantir que o contador seja zero
            // independentemente de quem enviou a mensagem
            unreadCount = 0;
            console.log(`[processMessages] ZERANDO contador para ${remoteJid} (conversa selecionada).`); // LOG ADICIONADO
            
            // Publicar evento para zerar o contador na interface
            publish(EVENTS.MESSAGE_COUNTER_UPDATE, {
              conversationId: remoteJid,
              count: 0
            });
          } else {
            // Se a conversa não estiver selecionada e a mensagem for minha, manter o contador
            console.log(`[processMessages] MANTENDO contador para ${remoteJid} (conversa não selecionada, msg minha).`); // LOG ADICIONADO
            unreadCount = conversation.unread_count || 0;
          }
          
          // Formatando a data atual para usar como timestamp
          const currentDate = new Date();
          
          updatedConversations.unshift({
            ...conversation,
            messages: updatedMessages,
            last_message: content,
            lastMessage: content, // Atualizar também o campo lastMessage para compatibilidade
            last_message_time: currentDate, // Usar data atual
            timestamp: currentDate, // Importante: atualizar o timestamp também!
            unread_count: unreadCount,
            instanceName: instanceName || conversation.instanceName // Manter ou atualizar a instância
          });
          console.log(`[processMessages] Conversa ${remoteJid} atualizada e movida para o topo.`); // LOG ADICIONADO
        } else {
          // Nova conversa: criar e adicionar ao topo da lista
          console.log(`[processMessages] Criando NOVA conversa para ${remoteJid}`); // LOG ADICIONADO
          // Extrair informações do remoteJid (nome, telefone)
          const phoneNumber = remoteJid.split('@')[0];
          const displayName = phoneNumber; // Poderia buscar o nome em uma lista de contatos
          
          // Criar a nova conversa com status 'Aguardando'
          const newStatus: ConversationStatus = 'Aguardando';
          
          // Garantir que o timestamp seja uma data atual
          const currentDate = new Date();
          
          const newConversation = {
            id: remoteJid,
            name: displayName,
            phone: phoneNumber,
            contactName: displayName, // Adicionar contactName para satisfazer o tipo Conversation
            messages: [newMessage],
            status: newStatus, // Inicialmente, todas as novas conversas estão pendentes
            last_message: content,
            lastMessage: content, // Adicionando lastMessage para compatibilidade
            last_message_time: currentDate,
            timestamp: currentDate, // Garantir que o timestamp seja o mesmo da last_message_time
            unread_count: 1,
            sector: 'Geral', // Setor padrão
            instanceName: instanceName // Registrar qual instância recebeu esta conversa
          };
          console.log(`[processMessages] Nova conversa criada:`, newConversation); // LOG ADICIONADO
          
          // Adicionar conversa ao array local
          updatedConversations.unshift(newConversation as any);
          
          // Salvar na tabela nexochat_status
          console.log('Salvando nova conversa com ID:', remoteJid, 'Status:', newStatus);
          saveConversationStatus(remoteJid, newStatus, newConversation)
            .then(() => console.log('Conversa salva com sucesso no banco!'))
            .catch(err => console.error('Erro ao salvar conversa no banco:', err));
        }

        // Definir as conversas finais
        finalConversations = updatedConversations;
        console.log(`[processMessages] Estado final das conversas após processar mensagem:`, finalConversations); // LOG ADICIONADO
        
        // Salvar as conversas atualizadas no localStorage para acesso rápido na próxima vez
        saveConversationsToLocalStorage(finalConversations);
        
        // Retornar conversas atualizadas
        return finalConversations;
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
    console.log('[handleSelectConversation] Iniciada para conversationId:', conversationId);

    // Primeiro, fechar TODAS as conversas abertas para garantir que só teremos uma aberta
    console.log('[handleSelectConversation] Fechando todas as conversas abertas primeiro');
    supabase
      .from('nexochat_status')
      .update({ status_msg: 'fechada' })
      .eq('status_msg', 'aberta')
      .then(({ error }) => {
        if (error) {
          console.error('[handleSelectConversation] Erro ao fechar todas as conversas:', error);
        } else {
          console.log('[handleSelectConversation] Todas as conversas foram fechadas com sucesso');
        }
      });
      
    // Agora continuamos o fluxo normal, mas já garantimos que todas estão fechadas
    if (selectedConversationId && selectedConversationId !== conversationId) {
      console.log(`[handleSelectConversation] Antiga conversa selecionada: ${selectedConversationId}`);
    }

    // Resetar posição de rolagem
    setScrollPosition(undefined);
    
    // Carregar posição salva para esta conversa
    const savedData = loadStatusFromLocalStorage(conversationId);
    if (savedData.scrollPosition !== undefined) {
      setScrollPosition(savedData.scrollPosition);
    }
    
    // Limpar contador de não lidas (ambos os campos usados na aplicação)
    setConversations(prevConversations => {
      const updatedConversations = prevConversations.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unreadCount: 0, unread_count: 0 } 
          : conv
      );
      
      // Salvar no localStorage a versão atualizada das conversas
      saveConversationsToLocalStorage(updatedConversations);
      
      // Atualizar também o contador específico no localStorage
      updateUnreadCountInLocalStorage(conversationId, 0);
      
      // Atualizar no banco de dados também
      console.log('[handleSelectConversation] Buscando registros relacionados à conversa:', conversationId);
      
      // Nova abordagem: não dependemos do reseller_id, apenas procuramos pela conversation_id
      // Primeiro, tentar match exato
      supabase
        .from('nexochat_status')
        .select('*')
        .eq('conversation_id', conversationId)
        .then(({ data, error }) => {
          if (error) {
            console.error('[handleSelectConversation] Erro ao buscar conversa:', error);
          } else {
            console.log('[handleSelectConversation] Registros encontrados (match exato):', data);
            
            if (data && data.length > 0) {
              // Atualizar todos os registros encontrados
              data.forEach((record: any) => {
                if (record && record.id) {
                  supabase
                    .from('nexochat_status')
                    .update({ 
                      unread_count: 0,
                      status_msg: 'aberta' // Atualizar status para "aberta"
                    })
                    .eq('id', record.id)
                    .then(({ error: updateError }) => {
                      if (updateError) {
                        console.error('[handleSelectConversation] Erro ao atualizar contador/status (ID ' + record.id + '):', updateError);
                      } else {
                        console.log('[handleSelectConversation] Contador zerado e status definido como "aberta" (ID ' + record.id + ')!');
                      }
                    });
                }
              });
            }
          }
        });
      
      // Segunda abordagem: buscar pelo número sem o @s.whatsapp.net
      if (conversationId.includes('@')) {
        const numberPart = conversationId.split('@')[0];
        console.log('[handleSelectConversation] Buscando com parte numérica:', numberPart);
        
        supabase
          .from('nexochat_status')
          .select('*')
          .ilike('conversation_id', `%${numberPart}%`)
          .then(({ data, error }) => {
            if (error) {
              console.error('[handleSelectConversation] Erro na busca por número:', error);
            } else {
              console.log('[handleSelectConversation] Registros encontrados (por número):', data);
              
              if (data && data.length > 0) {
                // Atualizar todos os registros encontrados
                data.forEach((record: any) => {
                  if (record && record.id) {
                    supabase
                      .from('nexochat_status')
                      .update({ 
                        unread_count: 0,
                        status_msg: 'aberta' // Atualizar status para "aberta"
                      })
                      .eq('id', record.id)
                      .then(({ error: updateError }) => {
                        if (updateError) {
                          console.error('[handleSelectConversation] Erro ao atualizar contador/status (ID ' + record.id + '):', updateError);
                        } else {
                          console.log('[handleSelectConversation] Contador zerado e status definido como "aberta" (ID ' + record.id + ')!');
                        }
                      });
                  }
                });
              }
            }
          });
      }
      
      return updatedConversations;
    });
    
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
    console.log(`=== CONNECT SOCKET CALLED === [API Config Ref: ${!!apiConfigRef.current}, Attempts: ${connectionAttempts}]`);
    // Usar a ref para a verificação inicial
    if (!apiConfigRef.current) {
      console.log('API Config Ref ainda não disponível, abortando conexão');
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
      
      // PASSO 1: Extrair os valores de configuração
      console.log('Pulando verificação HTTP (que retorna erro 404) e indo direto para Socket.io');
      
      // Usar a ref para extrair os valores
      const { baseUrl, instanceName, apikey } = apiConfigRef.current;
      
      if (!baseUrl || !instanceName) {
        // Log adicional para debugging
        console.error('Valores ausentes em apiConfigRef.current:', apiConfigRef.current);
        throw new Error('URL da API ou nome da instância não definidos na ref');
      }
      
      // Log informações importantes
      console.log(`Usando configuração para conexão Socket.io:
        - URL: ${baseUrl}
        - Instância: ${instanceName}
        - API Key: ${apikey ? '***' + apikey.substring(apikey.length - 4) : 'não definida'}
      `);
      
      // PASSO 2: Conectar Socket.io diretamente
      console.log('======= INICIANDO CONEXÃO COM SOCKET.IO =======');
      
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
      
      // Configurar log detalhado para TODOS os eventos
      socket.onAny((event, ...args) => {
        console.log(`======= SOCKET.IO EVENTO: ${event} =======`, JSON.stringify(args, null, 2));
      });
      
      // Tratar evento de conexão
      socket.on('connect', () => {
        console.log(`======= SOCKET.IO CONECTADO! ID: ${socket.id} =======`);
        setIsConnected(true);
        setSocketError(null);
        setConnectionAttempts(0); // Resetar contador
        setSocketInstance(instanceName); // Armazenar instância conectada
        
        // Enviar subscribe de duas formas para garantir
        const subscribeMessage = {
          action: 'subscribe',
          instance: instanceName
        };
        console.log('======= ENVIANDO SUBSCRIBE =======', subscribeMessage);
        socket.emit('subscribe', subscribeMessage);
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
        console.log('\n\n======= NOVA MENSAGEM RECEBIDA VIA SOCKET.IO - HORA: ' + new Date().toISOString() + ' =======');
        console.log('DADOS COMPLETOS DA MENSAGEM:', JSON.stringify(data, null, 2));
        try {
          // Log mais detalhado
          console.log('======= DETALHES DA ESTRUTURA DA MENSAGEM =======');
          console.log('Tipo de evento:', data.event);
          console.log('Nome da instância:', data.instance);
          console.log('Chaves em data:', data.data ? Object.keys(data.data) : 'no data');
          console.log('Tem array de mensagens?', data.data && data.data.messages ? 'SIM' : 'NÃO');
          console.log('Quantidade de mensagens:', data.data && data.data.messages ? data.data.messages.length : 0);
          console.log('======= FIM DOS DETALHES DA ESTRUTURA =======');
          
          // Na Evolution API, mensagens podem estar em diferentes lugares dependendo da estrutura
          // Vamos tratar todos os formatos possíveis
          let messages = [];
          
          if (data.data && data.data.messages) {
            // Formato 1: data.data.messages (array)
            messages = data.data.messages;
            console.log('Formato 1: Usando data.data.messages');
          } else if (data.messages) {
            // Formato 2: data.messages (array)
            messages = data.messages;
            console.log('Formato 2: Usando data.messages');
          } else if (data.data) {
            // Formato 3: data.data é um array de mensagens
            if (Array.isArray(data.data)) {
              messages = data.data;
              console.log('Formato 3: Usando data.data (array)');
            } 
            // Formato 4: data.data é uma única mensagem (objeto)
            else if (data.data.key && data.data.message) {
              // A mensagem está vindo como um único objeto, não um array!
              messages = [data.data]; // Colocamos em um array para processar
              console.log('Formato 4: Mensagem única em data.data');
            }
          }
          
          console.log(`\n======= PROCESSANDO ${messages.length} MENSAGENS DO SOCKET.IO =======`);
          if (messages && messages.length > 0) {
            // Log detalhado das mensagens
            console.log('PRIMEIRA MENSAGEM DETALHADA:', JSON.stringify(messages[0], null, 2));
            
            // Processar mensagens e atualizar estado
            console.log('CHAMANDO processMessages() PARA ATUALIZAR ESTADO LOCAL...');
            processMessages(messages, instanceName);
            console.log('ESTADO LOCAL ATUALIZADO COM NOVAS MENSAGENS!');
            
            // Tentar salvar no banco IMEDIATAMENTE
            console.log('\n======= TENTATIVA DE SALVAMENTO NO BANCO DE DADOS =======');
            
            // Pegar a primeira mensagem para identificar a conversa
            const firstMsg = messages[0];
            console.log('ANALISANDO PRIMEIRA MENSAGEM:', {temKey: !!firstMsg?.key, temRemoteJid: !!firstMsg?.key?.remoteJid});
            
            if (firstMsg && firstMsg.key && firstMsg.key.remoteJid) {
              const remoteJid = firstMsg.key.remoteJid;
              console.log('\n>>> SALVANDO CONVERSA NO BANCO DE DADOS! ID:', remoteJid);
              
              // Encontrar conversa atualizada
              console.log('VERIFICANDO SE JÁ EXISTE CONVERSA COM ID:', remoteJid);
              console.log('ARRAY DE CONVERSAS:', conversations.map(c => c.id));
              const updatedConvo = conversations.find(c => c.id === remoteJid);
              console.log('CONVERSA ENCONTRADA?', !!updatedConvo);
              
              if (updatedConvo) {
                // Conversa existente
                console.log('CONVERSA JÁ EXISTE! ATUALIZANDO COMO:', updatedConvo.status);
                saveConversationStatus(remoteJid, updatedConvo.status, updatedConvo)
                  .then(() => console.log('SALVAMENTO BEM-SUCEDIDO!'))
                  .catch(err => console.error('FALHA NO SALVAMENTO:', err));
              } else {
                // Nova conversa - status padrão: waiting ("Aguardando" no front-end)
                console.log('CRIAR NOVA CONVERSA COM STATUS "waiting" (Aguardando)');
                const phoneNumber = remoteJid.split('@')[0];
                // Usar 'waiting' que é aceito no banco de dados
                const dbStatus = 'waiting';
                const uiStatus: ConversationStatus = 'Aguardando';
                const newConvo = {
                  id: remoteJid,
                  name: phoneNumber,
                  phone: phoneNumber,
                  contactName: phoneNumber,
                  status: uiStatus, // Manter Aguardando para o front-end
                  unread_count: 1
                };
                console.log('DADOS DA NOVA CONVERSA:', newConvo);
                // Passar 'waiting' para o banco de dados (casting para resolver problema de tipo)
                saveConversationStatus(remoteJid, dbStatus as any, newConvo)
                  .then(() => console.log('NOVA CONVERSA SALVA COM SUCESSO!'))
                  .catch(err => console.error('ERRO AO SALVAR NOVA CONVERSA:', err));
              }
            } else {
              console.warn('Mensagem recebida sem remoteJid válido:', firstMsg);
            }
          }
        } catch (error) {
          console.error('Erro ao processar mensagem Socket.io:', error);
        }
      });
      
      socketRef.current = socket;
      
    } catch (error) {
      console.error('Erro ao conectar Socket.io:', error);
      setSocketError(`Erro: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [connectionAttempts]); // Remover apiConfigRef, manter apenas connectionAttempts
  
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
        // Iniciar carregamento
        setLoadingConversations(true);
        console.log('Carregando mensagens iniciais após Socket.io conectado...');
        
        // PASSO 0: Carregar conversas do localStorage primeiro (carregamento mais rápido)
        const localStorageConversations = loadConversationsFromLocalStorage();
        let workingConversations = [...localStorageConversations]; // Criar uma cópia para trabalhar
        
        if (localStorageConversations.length > 0) {
          console.log(`Carregando ${localStorageConversations.length} conversas do localStorage`); 
          setConversations(localStorageConversations); // Mostrar imediatamente para melhor UX
        }
        
        // PASSO 1: Buscar conversas salvas no banco de dados Supabase
        console.log('Carregando conversas salvas da tabela nexochat_status...');
        
        // Extrair reseller_id da sessão (se disponível)
        let resellerId = '';
        try {
          const adminSession = localStorage.getItem('admin_session');
          if (adminSession) {
            const session = JSON.parse(adminSession);
            resellerId = session.reseller_id || '';
            // Salvar o reseller_id no localStorage para uso futuro (importante)
            if (resellerId) {
              localStorage.setItem('reseller_id', resellerId);
              console.log('reseller_id salvo no localStorage:', resellerId);
            }
          }
        } catch (e) {
          console.error('Erro ao obter reseller_id da sessão:', e);
        }
        
        // Buscar todas as conversas no banco se possível (mesmo sem reseller_id)
        const { data: savedConversations, error } = await supabase
          .from('nexochat_status')
          .select('*');
        
        if (error) {
          console.error('Erro ao buscar conversas do banco:', error);
        } else if (savedConversations && savedConversations.length > 0) {
          console.log(`Encontradas ${savedConversations.length} conversas no banco de dados`);
          
          // Para cada conversa no banco, verificar se já existe e atualizar/adicionar
          savedConversations.forEach((savedConvo: any) => {
            if (!savedConvo.conversation_id) return; // Pular registros inválidos
            
            // Verificar se a conversa já existe no nosso conjunto
            const existingIndex = workingConversations.findIndex(
              convo => convo.id === savedConvo.conversation_id
            );
            
            if (existingIndex >= 0) {
              // Atualizar conversa existente com dados do banco
              const existing = workingConversations[existingIndex];
              workingConversations[existingIndex] = {
                ...existing,
                status: savedConvo.status as ConversationStatus,
                unread_count: savedConvo.unread_count || 0,
                // Preservar mensagens e outros dados existentes!
                messages: existing.messages || []
              };
            } else {
              // Criar nova conversa com os dados do banco
              const phoneNumber = String(savedConvo.conversation_id).split('@')[0];
              
              workingConversations.push({
                id: String(savedConvo.conversation_id),
                name: phoneNumber,
                contactName: phoneNumber,
                phone: phoneNumber,
                messages: [], // Mensagens vazias inicialmente
                status: savedConvo.status as ConversationStatus,
                unreadCount: 0, // Campo legado mantido por compatibilidade
                unread_count: Number(savedConvo.unread_count || 0),
                last_message: savedConvo.last_message || 'Conversa carregada do banco',
                lastMessage: savedConvo.last_message || 'Conversa carregada do banco', // Campo duplicado por compatibilidade
                last_message_time: String(savedConvo.updated_at || new Date()),
                timestamp: String(savedConvo.updated_at || new Date()),
                sector: 'Geral'
              });
            }
          });
          
          // Atualizar o estado com as conversas mescladas do localStorage e banco
          console.log('Atualizando estado com conversas mescladas do banco e localStorage:', workingConversations);
          setConversations(workingConversations);
        }
        
        // PASSO 2: Carregar mensagens da Evolution API para enriquecer as conversas
        console.log('Buscando mensagens da Evolution API...');
        const result = await fetchMessages();
        
        if (result.messages && result.messages.length > 0) {
          console.log(`Processando ${result.messages.length} mensagens da Evolution API`);
          // Esta função vai atualizar o estado e adicionar as mensagens às conversas
          processMessages(result.messages);
        } else {
          console.log('Nenhuma mensagem encontrada na Evolution API');
        }
        
        // PASSO 3: Salvar o estado final das conversas no localStorage
        // Observe que estamos usando conversations (estado atualizado após processMessages)
        const finalConversations = conversations;
        console.log('Salvando estado final no localStorage:', finalConversations.length, 'conversas');
        saveConversationsToLocalStorage(finalConversations);
        
        // Atualizar contagens nas abas de status
        const counts: Record<string, number> = {};
        finalConversations.forEach(convo => {
          const status = convo.status || 'Pendentes';
          counts[status] = (counts[status] || 0) + 1;
        });
        
        const updatedTabs = statusTabs.map(tab => ({
          ...tab,
          count: counts[tab.id] || 0
        }));
        
        setStatusTabs(updatedTabs);
      } catch (error) {
        console.error('Erro ao carregar mensagens e conversas iniciais:', error);
      } finally {
        // Finalizar carregamento independente de sucesso ou erro
        console.log('Carregamento de conversas finalizado');
        setLoadingConversations(false);
      }
    }
  }, [apiConfig, fetchMessages, processMessages, conversations, setConversations]);
  
  // Função para salvar o status da conversa na tabela nexochat_status
  const saveConversationStatus = useCallback(async (
    conversationId: string, 
    status: ConversationStatus, 
    conversationData: any
  ) => {
    try {
      console.log(`INICIANDO SALVAMENTO: conversa ${conversationId} com status ${status} no banco de dados`);
      console.log('Dados da conversa para salvar:', conversationData);
      
      // Buscar reseller_id e admin_id do localStorage
      const adminSession = localStorage.getItem('admin_session');
      
      if (!adminSession) {
        console.error('Sessão admin não encontrada');
        return;
      }
      
      console.log('Admin session encontrada:', adminSession);
      const session = JSON.parse(adminSession);
      console.log('Session parsed:', session);
      
      const resellerId = session.reseller_id || '';
      const adminId = session.id || session.admin_id || '';
      const adminUserId = session.user?.id || '';
      
      console.log('Dados extraídos da sessão:', { resellerId, adminId, adminUserId });
      
      // Verificar se a conversa já existe na tabela e obter contador atual
      console.log('Verificando se a conversa já existe no banco de dados...');
      const { data: existingData, error: queryError } = await supabase
        .from('nexochat_status')
        .select('id, unread_count')
        .eq('conversation_id', conversationId)
        .single();
      
      if (queryError) {
        console.log('Erro ao verificar conversa existente:', queryError);
        // PGJSON:22P02 error often means the conversa já não existe (erro no single())
        if (queryError.code === 'PGSQL_ERROR_QUERY_EXCEPT') {
          console.log('Conversa não existe no banco, vamos criar uma nova');
        }
      }
        
      if (existingData) {
        console.log('Conversa existente encontrada, atualizando:', existingData);
        
        // Converter o status para um dos valores permitidos no banco
        let validStatus = status;
        
        // Mapeamento de valores antigos para novos (ingles para português)
        // Usar String para evitar problemas de tipagem
        const statusStr = String(status).toLowerCase();
        
        if (statusStr === 'waiting') validStatus = 'Aguardando';
        if (statusStr === 'attending') validStatus = 'Atendendo';
        if (statusStr === 'pending') validStatus = 'Pendentes';
        if (statusStr === 'finished') validStatus = 'Finalizados';
        if (statusStr === 'contacts') validStatus = 'Contatos';
        
        console.log(`Convertendo status de "${status}" para "${validStatus}"`);
        
        // Obter o contador atual do banco de dados 
        const currentDbCount = Number(existingData?.unread_count || 0);
        console.log('Valor atual do contador no banco:', currentDbCount);
        console.log('Valor do contador no objeto:', conversationData.unread_count || 0);
        
        // Decidir qual valor de contador usar
        let finalUnreadCount: number;
        
        // Verificar se esta conversa é a selecionada atualmente
        const isSelected = conversationId === selectedConversationId;
        console.log(`Conversa ${conversationId} está selecionada? ${isSelected}`);
        
        // Se estamos atualizando depois de uma mensagem recebida
        if (conversationData.unread_count !== undefined) {
          const convCount = Number(conversationData.unread_count || 0);
          
          // Se é a conversa selecionada, não incrementar contador
          if (isSelected) {
            console.log('Conversa está selecionada, mantendo contador em 0');
            finalUnreadCount = 0;
          } else {
            // Se não é a conversa selecionada e o contador não está sendo zerado explicitamente
            if (convCount === 0) {
              finalUnreadCount = 0; // Está sendo zerado explicitamente
            } else {
              // Incrementar contador apenas se não for a conversa selecionada
              finalUnreadCount = Math.max(currentDbCount + 1, convCount);
              console.log(`Conversa não selecionada, incrementando contador para ${finalUnreadCount}`);
            }
          }
        } else {
          // Se não temos valor explicitamente definido, manter o contador atual
          finalUnreadCount = currentDbCount;
        }
        
        console.log(`Atualizando contador para ${finalUnreadCount} (valor final decidido)`);
        
        // Atualiza o registro existente com o status válido e o contador correto
        const { error } = await supabase
          .from('nexochat_status')
          .update({
            status: validStatus, // Usar o status convertido
            updated_at: new Date().toISOString(),
            unread_count: finalUnreadCount
          })
          .eq('conversation_id', conversationId);
          
        // Log adicional para diagnosticar atualização
        console.log('Contador unread_count atualizado para:', finalUnreadCount);
        
        if (error) {
          console.error('Erro ao atualizar status da conversa:', error);
        } else {
          console.log('Conversa atualizada com sucesso!');
        }
      } else {
        console.log('Criando nova entrada na tabela nexochat_status...', {
          conversation_id: conversationId,
          status,
          reseller_id: resellerId,
          profile_admin_id: adminId,
          profile_admin_user_id: adminUserId
        });
        
        // Cria um novo registro
        const { data, error } = await supabase
          .from('nexochat_status')
          .insert({
            conversation_id: conversationId,
            status,
            reseller_id: resellerId,
            profile_admin_id: adminId,
            profile_admin_user_id: adminUserId,
            unread_count: conversationData.unread_count || 0,
            scroll_position: 0
          })
          .select();
          
        if (error) {
          console.error('Erro ao salvar nova conversa no banco:', error);
          console.error('Código do erro:', error.code);
          console.error('Detalhes do erro:', error.details);
          console.error('Mensagem do erro:', error.message);
        } else {
          console.log('Nova conversa salva com sucesso:', data);
        }
      }
      return true;
    } catch (error) {
      console.error('ERRO GERAL ao salvar status da conversa:', error);
      return false;
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
              isLoading={loadingConversations}
            />
          ) : (
            <ConnectionStatus 
              connection={connection}
              loading={loading}
              error={error}
              onRefresh={refreshConnection}
              socketConnected={isConnected}
              socketError={socketError}
              socketInstance={socketInstance}
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
