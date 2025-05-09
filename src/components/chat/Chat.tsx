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
import { whatsappStorage } from '../../services/whatsappStorage';
import { refreshAllAvatars, fetchProfilePictureUrl, updateContactAvatar } from '../../services/avatarService';

const Chat: React.FC = () => {
  // Estados para armazenar dados do usuário e revenda
  const [revendaId, setRevendaId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
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

  // Usar apiConfig do hook useWhatsAppInstance para enviar mensagens
  const { sendMessage: apiSendMessage } = useEvolutionApi(apiConfig);

  // Carregar o ID da revenda do usuário logado
  useEffect(() => {
    const loadRevendaId = async () => {
      console.log('=== CARREGANDO ID DA REVENDA DO USUÁRIO LOGADO ===');
      try {
        // Primeiro tentamos obter a sessão atual do usuário
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        
        console.log('UserID identificado na sessão:', userId);
        
        if (!userId) {
          console.warn('Usuário não logado ou ID de usuário não disponível');
          // Tenta carregar da configuração como fallback
          await loadRevendaIdFromConfig();
          return;
        }
        
        // Tentar buscar na tabela profile_admin primeiro
        let { data: adminData, error: adminError } = await supabase
          .from('profile_admin')
          .select('reseller_id')
          .eq('id', userId)
          .maybeSingle();
        
        // Se encontramos o ID na tabela profile_admin
        if (adminData?.reseller_id && typeof adminData.reseller_id === 'string') {
          console.log('ID da revenda encontrado na tabela profile_admin:', adminData.reseller_id);
          setRevendaId(adminData.reseller_id);
          // Salvar no localStorage para uso futuro como fallback
          localStorage.setItem('revendaId', adminData.reseller_id);
          return;
        }
        
        // Se não encontrou ou deu erro, tentar na tabela profile_admin_user
        let { data: userProfileData, error: userProfileError } = await supabase
          .from('profile_admin_user')
          .select('reseller_id')
          .eq('id', userId)
          .maybeSingle();
        
        // Se encontramos o ID na tabela profile_admin_user
        if (userProfileData?.reseller_id && typeof userProfileData.reseller_id === 'string') {
          console.log('ID da revenda encontrado na tabela profile_admin_user:', userProfileData.reseller_id);
          setRevendaId(userProfileData.reseller_id);
          // Salvar no localStorage para uso futuro como fallback
          localStorage.setItem('revendaId', userProfileData.reseller_id);
          return;
        }
        
        // Se chegou aqui, não encontramos em nenhuma das tabelas
        if (adminError) console.error('Erro ao buscar na tabela profile_admin:', adminError);
        if (userProfileError) console.error('Erro ao buscar na tabela profile_admin_user:', userProfileError);
        
        // Última tentativa: verificar no nexochat_config
        await loadRevendaIdFromConfig();
      } catch (error) {
        console.error('Erro ao carregar ID da revenda:', error);
        // Tentar carregar do localStorage como último recurso
        const savedRevendaId = localStorage.getItem('revendaId');
        if (savedRevendaId) {
          console.log('Usando ID da revenda salvo no localStorage:', savedRevendaId);
          setRevendaId(savedRevendaId);
        }
      }
    };
    
    // Função auxiliar para carregar da tabela nexochat_config (método anterior)
    const loadRevendaIdFromConfig = async () => {
      try {
        console.log('Tentando buscar ID da revenda na tabela nexochat_config...');
        const { data, error } = await supabase
          .from('nexochat_config')
          .select('reseller_id')
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (error) {
          console.error('Erro ao buscar ID da revenda em nexochat_config:', error);
          return false;
        }
        
        if (data && data.length > 0 && data[0].reseller_id) {
          const resellerId = data[0].reseller_id as string;
          console.log('ID da revenda carregado de nexochat_config:', resellerId);
          setRevendaId(resellerId);
          localStorage.setItem('revendaId', resellerId);
          return true;
        } else {
          console.warn('Nenhuma configuração de chat encontrada com ID de revenda válido');
          return false;
        }
      } catch (configError) {
        console.error('Erro ao carregar ID da revenda da configuração:', configError);
        return false;
      }
    };
    
    // Carregar o ID da revenda imediatamente ao montar o componente
    loadRevendaId();
  }, []);
  
  // Efeito para debug - log quando o revendaId mudar
  useEffect(() => {
    console.log('=== REVENDA ID ATUALIZADO ===', revendaId);
    
    // Carregar apenas o email do usuário logado
    const loadUserEmail = async () => {
      try {
        // Buscar email do usuário logado
        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData?.session?.user?.email;
        if (email) {
          setUserEmail(email);
          console.log('Email do usuário logado:', email);
        }
      } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
      }
    };
    
    loadUserEmail();
  }, [revendaId]);

  // Efeito para atualizar diretamente o status da conversa selecionada para 'aberta'
  useEffect(() => {
    // Se temos uma conversa selecionada, garantir que está marcada como 'aberta'
    const ensureConversationIsOpen = async () => {
      if (selectedConversationId && revendaId) {
        try {
          console.log('[Chat IMPORTANTE] Garantindo que a conversa selecionada está marcada como ABERTA:', selectedConversationId);
          const phone = selectedConversationId.split('@')[0];
          if (phone) {
            await supabase
              .from('whatsapp_revenda_status')
              .update({ 
                status_msg: 'aberta',
                unread_count: 0,
                updated_at: new Date().toISOString() 
              })
              .eq('revenda_id', revendaId)
              .eq('phone', phone);
          }
        } catch (error) {
          console.error('Erro ao marcar conversa como aberta:', error);
        }
      }
    };
    
    // Executar a função sempre que selectedConversationId mudar
    ensureConversationIsOpen();
    
    // Configurar um intervalo para verificar periodicamente (a cada 5 segundos)
    const intervalId = setInterval(ensureConversationIsOpen, 5000);
    
    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(intervalId);
  }, [selectedConversationId, revendaId]);
  
  // Efeito para FORÇAR o contador a ser zero para a conversa selecionada - independente do que aconteça
  useEffect(() => {
    if (!selectedConversationId) return;
    
    console.log('[Chat] ***** FORÇANDO contador zero para a conversa selecionada:', selectedConversationId);
    
    // Função para garantir que conversas selecionadas sempre tenham contador zero
    const forceZeroUnreadCount = () => {
      setConversations(prevConversations => 
        prevConversations.map(conv => {
          if (conv.id === selectedConversationId) {
            // Se for a conversa selecionada, FORÇAR contador para zero
            if (conv.unread_count !== 0) {
              console.log(`[Chat] FORÇANDO contador zero para ${conv.id} (era ${conv.unread_count})`);
              return {
                ...conv,
                unread_count: 0
              };
            }
          }
          return conv;
        })
      );
    };
    
    // Executar imediatamente e também configurar um intervalo para executar periodicamente
    forceZeroUnreadCount();
    const intervalId = setInterval(forceZeroUnreadCount, 1000); // Verificar a cada segundo
    
    // Cleanup: limpar o intervalo quando mudar a seleção ou desmontar o componente
    return () => clearInterval(intervalId);
  }, [selectedConversationId, setConversations]);

  // Efeito para atualização periódica de avatares
  useEffect(() => {
    if (!revendaId || !apiConfig) return;
    
    console.log('[Chat] Configurando atualização periódica de avatares');
    console.log('[Chat] DEPURAÇÃO: Forçando atualização imediata de avatares');
    
    // Forçar uma atualização imediata de todos os avatares
    // Isso usará true para forçar a atualização mesmo de avatares existentes
    refreshAllAvatars(revendaId, apiConfig, true).then(() => {
      console.log('[Chat] DEPURAÇÃO: Atualização forçada de avatares concluída');
    });
    
    // Função para atualizar os avatares das conversas no estado local
    const updateAvatarsFromDatabase = async () => {
      try {
        // Buscar dados atualizados de todas as conversas, incluindo avatar_url
        const { data: statusData, error } = await supabase
          .from('whatsapp_revenda_status')
          .select('phone, avatar_url')
          .eq('revenda_id', revendaId);
          
        if (error) {
          console.error('[Chat] Erro ao buscar avatares:', error);
          return;
        }
        
        if (statusData && statusData.length > 0) {
          // Atualizar o estado local das conversas com os avatares do banco
          setConversations(prevConversations => 
            prevConversations.map(conv => {
              // Encontrar o registro correspondente no banco
              const matchingStatus = statusData.find(status => 
                status.phone === conv.phone || status.phone === conv.id.replace('@s.whatsapp.net', '')
              );
              
              // Se encontrar e tiver avatar_url, atualizar a conversa
              if (matchingStatus?.avatar_url) {
                // Garantir que o avatar_url é uma string para compatibilidade com o tipo
                const avatarUrlString = String(matchingStatus.avatar_url);
                return {
                  ...conv,
                  avatarUrl: avatarUrlString,
                  avatar_url: avatarUrlString
                };
              }
              
              return conv;
            })
          );
        }
      } catch (error) {
        console.error('[Chat] Erro ao processar atualização de avatares:', error);
      }
    };
    
    // Função para forçar a atualização de todos os avatares
    const refreshAllContactAvatars = async () => {
      try {
        if (!apiConfig) {
          console.error('[Chat] Configuração da API não disponível');
          return;
        }

        console.log('[Chat] Iniciando atualização completa de avatares...');
        await refreshAllAvatars(revendaId, apiConfig, false); // false = não forçar atualização de avatares existentes
        // Atualizar o estado local com os novos avatares
        await updateAvatarsFromDatabase();
        console.log('[Chat] Atualização de avatares concluída');
      } catch (error) {
        console.error('[Chat] Erro ao atualizar avatares:', error);
      }
    };
    
    // Executar imediatamente e depois a cada 6 horas
    updateAvatarsFromDatabase();
    const refreshInterval = setInterval(refreshAllContactAvatars, 6 * 60 * 60 * 1000); // 6 horas
    
    // Cleanup: limpar o intervalo quando desmontar o componente
    return () => clearInterval(refreshInterval);
  }, [revendaId, setConversations]);
  
  // Subscription em tempo real para atualizações de status/contadores no banco
  useEffect(() => {
    if (!revendaId) return;
    
    console.log('[Chat] Configurando subscription em tempo real para whatsapp_revenda_status');
    
    // Criar canal de subscription
    const channel = supabase
      .channel('whatsapp_status_changes')
      .on('postgres_changes', 
        { 
          event: '*', // escutar todos os eventos (insert, update, delete)
          schema: 'public',
          table: 'whatsapp_revenda_status',
          filter: `revenda_id=eq.${revendaId}` // filtrar apenas registros desta revenda
        }, 
        (payload) => {
          console.log('[Chat] Recebeu atualização em tempo real:', payload);
          
          // Extrai os dados do payload
          const { new: newRecord } = payload;
          
          if (newRecord) {
            // Converter para tipo apropriado usando interface WhatsappRevendaStatus
            const statusRecord = newRecord as unknown as {
              phone: string;
              revenda_id: string;
              unread_count: number;
              status_msg: string;
            };
            
            // Atualizar o estado local com os dados do banco
            setConversations(prevConversations => 
              prevConversations.map(conv => {
                // Verificar se a conversa é a mesma que foi atualizada
                const conversationPhone = conv.id.split('@')[0];
                if (conversationPhone === statusRecord.phone && revendaId === statusRecord.revenda_id) {
                  console.log(`[Chat] Atualizando conversa ${conv.id} de acordo com o banco:`, {
                    unread_count: statusRecord.unread_count || 0,
                    status_msg: statusRecord.status_msg
                  });
                  
                  // Importante: Se esta for a conversa selecionada, FORÇAR contador para zero
                  // independente do valor vindo do banco
                  if (conv.id === selectedConversationId) {
                    console.log(`[Chat] Esta é a conversa selecionada - FORÇANDO contador para zero`);
                    const updatedConv = {
                      ...conv,
                      unread_count: 0,
                      status_msg: 'aberta'
                    };
                    return updatedConv;
                  }
                  
                  // Caso contrário, usar o valor do banco
                  const updatedConv = {
                    ...conv,
                    // Atualizar o contador de não lidas e o status
                    unread_count: statusRecord.unread_count !== null && statusRecord.unread_count !== undefined ? 
                      Number(statusRecord.unread_count) : 0
                  };
                  return updatedConv;
                }
                return conv;
              })
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('[Chat] Status da subscription:', status);
      });
      
    // Cleanup: desinscrever quando o componente for desmontado
    return () => {
      console.log('[Chat] Limpando subscription do banco de dados');
      supabase.removeChannel(channel);
    };
  }, [revendaId, selectedConversationId, setConversations]);

  // Efeito para lidar com o fechamento da página
  useEffect(() => {
    // Função para marcar a conversa atual como fechada
    const markCurrentConversationAsClosed = async () => {
      if (selectedConversationId && revendaId) {
        try {
          console.log('Fechando conversa atual antes de sair da página:', selectedConversationId);
          const phone = selectedConversationId.split('@')[0];
          if (phone) {
            await supabase
              .from('whatsapp_revenda_status')
              .update({ 
                status_msg: 'fechada',
                updated_at: new Date().toISOString() 
              })
              .eq('revenda_id', revendaId)
              .eq('phone', phone);
          }
        } catch (error) {
          console.error('Erro ao fechar conversa antes de sair:', error);
        }
      }
    };

    // Handler para o evento beforeunload
    const handleBeforeUnload = () => {
      markCurrentConversationAsClosed();
      // Note: não podemos retornar uma Promise aqui, pois beforeunload não espera por Promises
    };

    // Adicionar o event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Também vamos marcar a conversa como fechada quando o componente for desmontado
      markCurrentConversationAsClosed();
    };
  }, [selectedConversationId, revendaId]);

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

  // Estados para controlar o carregamento de mensagens do banco de dados
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState<boolean>(false);

  // Carregar mensagens APENAS do banco de dados local
  useEffect(() => {
    const loadMessagesFromDatabase = async () => {
      if (isLoadingMessages || !revendaId || initialLoadAttempted) {
        return;
      }

      try {
        console.log('Carregando mensagens do banco de dados Supabase...');
        setIsLoadingMessages(true);
        
        const conversations = await whatsappStorage.loadAllConversations(revendaId);
        
        if (conversations && conversations.length > 0) {
          console.log(`Carregadas ${conversations.length} conversas do banco de dados`);
          setConversations(conversations);
        } else {
          console.log('Nenhuma conversa encontrada no banco de dados');
        }
      } catch (error) {
        console.error('Erro ao carregar mensagens do banco de dados:', error);
      } finally {
        setIsLoadingMessages(false);
        setInitialLoadAttempted(true); // Marcar que já tentamos carregar uma vez
      }
    };

    // Carregar do banco de dados apenas se tivermos o revendaId e ainda não tentamos carregar
    if (revendaId && !initialLoadAttempted) {
      loadMessagesFromDatabase();
    }
  }, [revendaId, isLoadingMessages, initialLoadAttempted]);

  // Função para salvar a prévia da mensagem no localStorage
  const saveMessagePreviewToLocalStorage = (remoteJid: string, content: string, timestamp: Date) => {
    try {
      // Obter o cache existente ou criar um novo objeto
      const messagePreviewCache = JSON.parse(localStorage.getItem('whatsapp_message_preview_cache') || '{}');
      
      // Adicionar/atualizar a entrada para este contato
      messagePreviewCache[remoteJid] = {
        content,
        timestamp: timestamp.getTime()
      };
      
      // Salvar o cache atualizado
      localStorage.setItem('whatsapp_message_preview_cache', JSON.stringify(messagePreviewCache));
      console.log(`[Chat] Salvou prévia da mensagem no localStorage para ${remoteJid}`);
    } catch (error) {
      console.error(`[Chat] Erro ao salvar prévia no localStorage:`, error);
    }
  };
  
  // Função para buscar a prévia da mensagem do localStorage
  const getMessagePreviewFromLocalStorage = (remoteJid: string): {content: string, timestamp: number} | null => {
    try {
      const messagePreviewCache = JSON.parse(localStorage.getItem('whatsapp_message_preview_cache') || '{}');
      const cacheEntry = messagePreviewCache[remoteJid];
      
      // Se temos um cache e ele contém conteúdo
      if (cacheEntry && cacheEntry.content) {
        return cacheEntry;
      }
      return null;
    } catch (error) {
      console.error(`[Chat] Erro ao ler prévia do localStorage:`, error);
      return null;
    }
  };
  
  // Processar mensagens recebidas e atualizar estado
  const processMessages = (messages: any[], instanceName?: string) => {
    if (!messages || !Array.isArray(messages)) {
      return;
    }

    console.log(`Processando ${messages.length} mensagens ${instanceName ? 'da instância ' + instanceName : ''}`);

    // Para cada mensagem recebida
  messages.forEach(async (msg) => {
    if (!msg || !msg.key || !msg.key.remoteJid) {
      console.log('Mensagem inválida recebida:', msg);
      return;
    }

    const remoteJid = msg.key.remoteJid;
    const fromMe = msg.key.fromMe;
    const timestamp = new Date();
    let content = '';
    
    // Tentar buscar o avatar do contato se a mensagem for recebida (não enviada)
    // Removido a busca de avatar durante o processamento de mensagens para evitar problemas
    // com o revendaId não disponível em determinados momentos do fluxo assíncrono
    // Avatares serão atualizados de forma confiável pelo processo periódico (refreshAllAvatars)
    // que roda a cada 6 horas e quando o componente é montado
    let avatarUrl = null;
      
      // Extrair conteúdo com base no tipo de mensagem e definir metadados adicionais
      let messageType: 'text' | 'audio' | 'image' | 'video' = 'text';
      let audioData = null;
      
      if (msg.message?.conversation) {
        content = msg.message.conversation;
      } else if (msg.message?.extendedTextMessage?.text) {
        content = msg.message.extendedTextMessage.text;
      } else if (msg.message?.imageMessage?.caption) {
        content = '[Imagem] ' + msg.message.imageMessage.caption;
        messageType = 'image';
      } else if (msg.message?.videoMessage?.caption) {
        content = '[Vídeo] ' + msg.message.videoMessage.caption;
        messageType = 'video';
      } else if (msg.message?.documentMessage?.fileName) {
        content = '[Documento] ' + msg.message.documentMessage.fileName;
      } else if (msg.message?.audioMessage) {
        content = '[Áudio]';
        messageType = 'audio';
        
        // Extrair dados do áudio
        const audio = msg.message.audioMessage;
        audioData = {
          url: audio.url,
          mimetype: audio.mimetype,
          seconds: Number(audio.seconds) || 0,
          ptt: Boolean(audio.ptt),
          fileLength: audio.fileLength
        };
        
        console.log('[Chat] Dados de áudio recebidos:', audioData);
      } else if (msg.message?.locationMessage) {
        content = '[Localização]';
      } else if (msg.message?.contactMessage) {
        content = '[Contato]';
      } else if (msg.message?.stickerMessage) {
        content = '[Sticker]';
      } else {
        content = '[Mensagem desconhecida]';
      }

      // Incluir informação sobre a instância e setor nos metadados da mensagem
      const newMessage: ChatMessage = {
        id: msg.key.id,
        content,
        sender: fromMe ? 'me' : 'them',
        timestamp,
        instanceName: instanceName, // Nome da instância
        setor: selectedSector, // Setor selecionado atualmente
        type: messageType, // Tipo da mensagem
        audioData: messageType === 'audio' ? audioData : undefined // Dados de áudio (se aplicável)
      } as ChatMessage & { setor: string }; // Type assertion para incluir o campo setor

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
          
          // Extrair o número de telefone do remoteJid para uso abaixo
          const phoneNumber = remoteJid.split('@')[0];
          
          // Para conversas selecionadas, SEMPRE manter o contador em zero
          // Para as demais, incrementar apenas se a mensagem não for do usuário
          const isCurrentlySelected = selectedConversationId === remoteJid;
          
          // Se a conversa está selecionada ou a mensagem é do usuário, o contador DEVE ser zero
          // Caso contrário, incrementamos o contador atual
          const unreadCount = isCurrentlySelected || fromMe ? 0 : (conversation.unread_count || 0) + 1;
          
          // Salvar a prévia da mensagem no localStorage para acesso rápido
          saveMessagePreviewToLocalStorage(remoteJid, content, timestamp);
          
          updatedConversations.unshift({
            ...conversation,
            messages: updatedMessages,
            last_message: content,
            last_message_time: timestamp,
            unread_count: unreadCount,
            // Se encontramos um novo avatar, atualizar
            ...(avatarUrl ? { avatarUrl: avatarUrl, avatar_url: avatarUrl } : {}),
            instanceName: instanceName || conversation.instanceName // Manter ou atualizar a instância
          });
          
          // CORREÇÃO: Salvar a mensagem no banco de dados
          if (revendaId) {
            // Verificar se a conversa atual é a selecionada
            console.log(`[Chat DEBUG] =========== COMPARAÇÃO DE IDs ===========`);
            console.log(`[Chat DEBUG] selectedConversationId: "${selectedConversationId}"`);
            console.log(`[Chat DEBUG] remoteJid: "${remoteJid}"`);
            const isCurrentlySelected = selectedConversationId === remoteJid;
            console.log(`[Chat DEBUG] Resultado da comparação: ${isCurrentlySelected ? 'CONVERSA SELECIONADA' : 'CONVERSA NÃO SELECIONADA'}`);
            
            console.log(`[Chat] Salvando mensagem no banco de dados - conversa ${isCurrentlySelected ? 'SELECIONADA' : 'não selecionada'}`);
            whatsappStorage.saveMessage(
              newMessage,
              revendaId,
              conversation.name || conversation.contactName || phoneNumber,
              remoteJid,
              isCurrentlySelected // Passar o estado de seleção para o método saveMessage
            ).catch(error => {
              console.error('[Chat] Erro ao salvar mensagem no banco:', error);
            });
          } else {
            console.error('[Chat] Não é possível salvar a mensagem: revendaId não disponível');
          }
        } else {
          // Nova conversa: criar e adicionar ao topo da lista
          // Extrair informações do remoteJid (nome, telefone)
          const phoneNumber = remoteJid.split('@')[0];
          const displayName = phoneNumber; // Poderia buscar o nome em uma lista de contatos
          
          // Verificar se a nova conversa é a selecionada (raro, mas pode acontecer)
          const isCurrentlySelected = selectedConversationId === remoteJid;
          
          // Se a conversa está selecionada, o contador deve ser zero
          // Caso contrário, começa com 1 para indicar a nova mensagem
          const initialUnreadCount = isCurrentlySelected || fromMe ? 0 : 1;
          
          console.log(`[Chat] Nova conversa ${isCurrentlySelected ? 'SELECIONADA' : 'NÃO selecionada'} - contador inicial: ${initialUnreadCount}`);
          
          updatedConversations.unshift({
            id: remoteJid,
            name: displayName,
            phone: phoneNumber,
            contactName: displayName, // Adicionar contactName para satisfazer o tipo Conversation
            messages: [newMessage],
            status: 'Aguardando', // Inicialmente, todas as novas conversas estão pendentes
            last_message: content,
            last_message_time: timestamp,
            unread_count: initialUnreadCount,
            sector: 'Geral', // Setor padrão
            // Adicionar o avatar se encontrado
            ...(avatarUrl ? { avatarUrl: avatarUrl, avatar_url: avatarUrl } : {}),
            instanceName: instanceName // Registrar qual instância recebeu esta conversa
          });
          
          // CORREÇÃO: Salvar a mensagem no banco de dados (nova conversa)
          if (revendaId) {
            // Verificar se a nova conversa é a selecionada (raro, mas pode acontecer)
            const isCurrentlySelected = selectedConversationId === remoteJid;
            
            console.log(`[Chat] Salvando mensagem no banco de dados - nova conversa ${isCurrentlySelected ? 'SELECIONADA' : 'não selecionada'}`);
            whatsappStorage.saveMessage(
              newMessage,
              revendaId,
              displayName,
              remoteJid,
              isCurrentlySelected // Passar o estado de seleção para o método saveMessage
            ).catch(error => {
              console.error('[Chat] Erro ao salvar mensagem no banco:', error);
            });
          } else {
            console.error('[Chat] Não é possível salvar a mensagem: revendaId não disponível');
          }
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
    // Se a conversa selecionada for a mesma, não faz nada
    if (conversationId === selectedConversationId) return;
    
    // IMPORTANTE: Primeiro atualizamos o ID da conversa selecionada para minimizar rerenderizações
    // Isso dá feedback visual imediato ao usuário e evita piscadas
    setSelectedConversationId(conversationId);
    
    // Depois, em um único batch, atualizamos a lista de conversas para zerar o contador
    setConversations(prevConversations => 
      prevConversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            unread_count: 0
          };
        }
        return conv;
      })
    );
    
    // Resetar posição de rolagem
    setScrollPosition(undefined);
    
    // Carregar posição salva para esta conversa
    const savedData = loadStatusFromLocalStorage(conversationId);
    if (savedData.scrollPosition !== undefined) {
      setScrollPosition(savedData.scrollPosition);
    }
    
    // Todas as operações de banco de dados são executadas em segundo plano
    // sem causar mais atualizações de estado que gerariam piscadas na UI
    setTimeout(() => {
      // 1. Fechar a conversa anterior (se aplicável)
      if (selectedConversationId && selectedConversationId !== conversationId && revendaId) {
        const closeConversation = async () => {
          try {
            const phone = selectedConversationId.split('@')[0];
            if (phone) {
              await supabase
                .from('whatsapp_revenda_status')
                .update({ 
                  status_msg: 'fechada',
                  updated_at: new Date().toISOString() 
                })
                .eq('revenda_id', revendaId)
                .eq('phone', phone);
            }
          } catch (closeError) {
            console.error('Erro ao fechar conversa anterior:', closeError);
          }
        };
        
        closeConversation();
      }
      
      // 2. Resetar contador no banco de dados
      if (revendaId) {
        try {
          const phone = conversationId.split('@')[0];
          
          // Atualizar no banco de dados sem afetar a UI
          whatsappStorage.resetUnreadCount(conversationId, revendaId)
            .catch(err => console.error('Erro ao zerar contador:', err));
        } catch (error) {
          console.error('Erro ao tentar resetar contador:', error);
        }
      }
    }, 0); // setTimeout com 0ms executa após o próximo ciclo de renderização
  }, [setSelectedConversationId, setConversations, revendaId, selectedConversationId]);

  // Função para enviar mensagem
  const handleSendMessage = useCallback(async (content: string) => {
    const currentConversation = getCurrentConversation();
    if (!currentConversation) {
      console.error('[Chat] Falha ao enviar: nenhuma conversa selecionada');
      return;
    }
    
    // Adicionar mensagem localmente via contexto imediatamente para feedback visual
    contextSendMessage(content);
    
    // Preparar timestamp da mensagem
    const timestamp = new Date();
    
    // Enviar mensagem via API Evolution
    try {
      console.log(`[Chat] Enviando mensagem para ${currentConversation.id}`);
      // Usar o ID completo da conversa, que já contém o formato correto
      const success = await apiSendMessage(currentConversation.id, content);
      
      if (success) {
        console.log(`[Chat] Mensagem enviada com sucesso para ${currentConversation.id}`);
        
        // Salvar mensagem no banco de dados
        if (revendaId) {
          try {
            const phone = currentConversation.id.split('@')[0];
            await supabase.from('whatsapp_revenda_mensagens').insert({
              revenda_id: revendaId,
              phone: phone,
              mensagem: content,
              direcao: 'saida',
              data_hora: timestamp.toISOString(),
              status: 'enviado'
            });
            console.log(`[Chat] Mensagem armazenada no banco de dados`);
            
            // Atualizar a prévia da mensagem no localStorage
            saveMessagePreviewToLocalStorage(currentConversation.id, content, timestamp);
          } catch (dbError) {
            console.error('[Chat] Erro ao salvar mensagem no banco:', dbError);
          }
        }
      } else {
        console.error(`[Chat] Falha no envio da mensagem para ${currentConversation.id}`);
        // TODO: Mostrar notificação de erro para o usuário
      }
    } catch (error) {
      console.error('[Chat] Erro ao enviar mensagem:', error);
      // TODO: Implementar lógica de retry ou notificar o usuário visualmente do erro
    }
  }, [getCurrentConversation, contextSendMessage, apiSendMessage, revendaId, saveMessagePreviewToLocalStorage]);

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
      
      // PASSO 2: Conectar Socket.io - simplificando a inicialização
      console.log('Conectando Socket.io de forma simplificada...');
      
      // Criar socket com opções mínimas para evitar sobrecarga inicial
      const socket = io(baseUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      // Registrar eventos antes de qualquer outra operação
      // Eventos principais - primeiro o evento de conexão
      socket.on('connect', () => {
        console.log(`Socket.io conectado! ID: ${socket.id}`);
        setIsConnected(true);
        setSocketError(null);
        setConnectionAttempts(0); // Resetar contador após sucesso
        
        // Só configura parâmetros adicionais DEPOIS que a conexão for estabelecida
        console.log('Configurando parâmetros da instância:', instanceName);
        
        // Configurar a instância e API key DEPOIS da conexão
        if (apikey) {
          socket.io.opts.extraHeaders = { 'apikey': apikey };
        }
        
        socket.io.opts.query = { instance: instanceName };
        
        // Agora sim, enviar subscribe após garantir que tudo está configurado
        setTimeout(() => {
          // Pequeno delay para garantir que tudo está pronto
          const subscribeMessage = {
            action: 'subscribe',
            instance: instanceName
          };
          console.log('Enviando subscribe:', subscribeMessage);
          socket.emit('subscribe', subscribeMessage);
          
          // Formato alternativo
          socket.emit('subscribe', instanceName);
        }, 500); // Pequeno delay de segurança
      });
      
      // Log para todos os eventos - registrado DEPOIS do evento principal
      socket.onAny((event, ...args) => {
        console.log(`Socket.io evento: ${event}`, args);
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
        console.log('=== NOVA MENSAGEM RECEBIDA VIA SOCKET.IO ===');
        console.log('Evento recebido:', data.event || 'N/A');
        console.log('Instance:', data.instance || 'N/A');
        console.log('Data timestamp:', data.date_time || 'N/A');
        console.log('Estrutura completa do objeto data:', JSON.stringify(data, null, 2));
        
        // Obter o ID da revenda - usar o valor do estado ou o fallback do localStorage
        let currentRevendaId = revendaId;
        
        // Se o ID da revenda não estiver disponível no estado, tentar carregá-lo do localStorage
        if (!currentRevendaId) {
          const storedRevendaId = localStorage.getItem('revendaId');
          if (storedRevendaId) {
            console.log('Usando ID da revenda do localStorage:', storedRevendaId);
            currentRevendaId = storedRevendaId;
            // Atualizar o estado para futuras mensagens
            setRevendaId(storedRevendaId);
          } else {
            console.error('ERRO CRÍTICO: Nenhum ID de revenda disponível no estado ou localStorage');
          }
        }
        
        console.log('RevendaId para processamento:', currentRevendaId);
        
        // Verificar a estrutura correta das mensagens na versão mais recente da API
        // Na nova estrutura da API, o objeto mensagem está diretamente em data.data
        // Se for uma única mensagem, tratamos diretamente

        // Verificar se temos o formato antigo (array) ou o novo formato (objeto único)
        let messagesToProcess = [];
        
        // Formato antigo - mensagens em um array
        if (data.data?.messages && Array.isArray(data.data.messages)) {
          messagesToProcess = data.data.messages;
          console.log('Usando formato antigo: data.data.messages (array)');
        } 
        // Formato antigo alternativo
        else if (data.messages && Array.isArray(data.messages)) {
          messagesToProcess = data.messages;
          console.log('Usando formato antigo alternativo: data.messages (array)');
        } 
        // Novo formato - a mensagem é o próprio objeto data.data
        else if (data.data && data.data.key && data.data.message) {
          messagesToProcess = [data.data]; // Colocar em um array para manter compatibilidade
          console.log('Usando novo formato: data.data (objeto único)');
        }
        // Nenhum formato reconhecido
        else {
          console.warn('Formato de mensagem não reconhecido:', data);
          return; // Sair se não reconhecemos o formato
        }
        
        console.log('Número de mensagens a processar:', messagesToProcess.length);
        
        if (messagesToProcess.length > 0) {
          console.log('Estrutura da primeira mensagem:', JSON.stringify(messagesToProcess[0], null, 2));
          // Processar mensagens para atualizar a UI
          processMessages(messagesToProcess, data.instance || instanceName);
          
          // Continuar apenas se tivermos um revendaId válido
          if (currentRevendaId) {
            console.log('=== INICIANDO SALVAMENTO NO BANCO DE DADOS ===');
            console.log('RevendaId usado para salvamento:', currentRevendaId);
            try {
              messagesToProcess.forEach(async (msg: any, index: number) => {
                console.log(`Processando mensagem ${index + 1}/${messagesToProcess.length}`);
                if (!msg || !msg.key || !msg.key.remoteJid) {
                  console.log('Mensagem inválida recebida, pulando:', msg);
                  return;
                }
                
                const remoteJid = msg.key.remoteJid;
                const fromMe = msg.key.fromMe;
                const timestamp = msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000) : new Date();
                let content = '';
                let messageType = 'text';
                
                // Extrair conteúdo com base no tipo de mensagem
                if (msg.message?.conversation) {
                  content = msg.message.conversation;
                } else if (msg.message?.extendedTextMessage?.text) {
                  content = msg.message.extendedTextMessage.text;
                } else if (msg.message?.imageMessage) {
                  content = msg.message.imageMessage.caption || '[image]';
                  messageType = 'image';
                } else if (msg.message?.videoMessage) {
                  content = msg.message.videoMessage.caption || '[video]';
                  messageType = 'video';
                } else if (msg.message?.audioMessage) {
                  content = '[audio]';
                  messageType = 'audio';
                } else if (msg.message?.documentMessage) {
                  content = msg.message.documentMessage.fileName || '[document]';
                  messageType = 'document';
                } else if (msg.message?.locationMessage) {
                  content = '[location]';
                  messageType = 'location';
                } else if (msg.message?.contactMessage) {
                  content = '[contact]';
                  messageType = 'contact';
                } else {
                  // Verifica se tem algum objeto dentro de message
                  const messageKeys = msg.message ? Object.keys(msg.message) : [];
                  if (messageKeys.length > 0) {
                    content = `[${messageKeys[0]}]`;
                    messageType = messageKeys[0];
                  } else {
                    content = '[unknown]';
                    messageType = 'unknown';
                  }
                }
                
                // Criar objeto de mensagem no formato esperado pelo whatsappStorage
                const chatMessage: ChatMessage = {
                  id: msg.key.id || `${remoteJid}_${new Date().getTime()}`,
                  content: content,
                  sender: fromMe ? 'me' : 'them',
                  timestamp: timestamp,
                  instanceName: instanceName || '',
                  setor: selectedSector // Incluir o setor atualmente selecionado
                } as ChatMessage & { setor: string }; // Type assertion para incluir o campo setor
                
                // Extrair nome do contato (usamos o número como fallback)
                const contactName = remoteJid.split('@')[0];
                
                console.log('Salvando mensagem no banco:', {
                  mensagem: chatMessage,
                  revenda: revendaId,
                  contato: contactName,
                  jid: remoteJid,
                  tipo: messageType
                });
                
                try {
                  // Primeiro definimos corretamente o tipo da mensagem no objeto antes de salvar
                  (chatMessage as any).message_type = messageType;
                  
                  console.log('=== CHAMANDO saveMessage ===');
                  console.log('ChatMessage:', JSON.stringify(chatMessage, null, 2));
                  console.log('CurrentRevendaId:', currentRevendaId);
                  console.log('ContactName:', contactName);
                  console.log('RemoteJid:', remoteJid);
                  
                  try {
                    console.log(`Tentando salvar mensagem com ID ${chatMessage.id} no banco de dados...`);
                    // Salvar no banco de dados
                    await whatsappStorage.saveMessage(
                      chatMessage,
                      currentRevendaId, // Usar o ID da revenda que obtivemos
                      contactName,
                      remoteJid
                    );
                    console.log(`SUCESSO! Mensagem ${chatMessage.id} salva no banco de dados`);
                  } catch (saveError) {
                    console.error(`FALHA AO SALVAR MENSAGEM ${chatMessage.id}:`, saveError);
                    // Tentar imprimir mais detalhes sobre o erro se houver
                    if (saveError instanceof Error) {
                      console.error('Mensagem de erro:', saveError.message);
                      console.error('Stack trace:', saveError.stack);
                    }
                  }
                  
                  console.log(`=== FIM DE CHAMADA saveMessage - Conteúdo: ${content.substring(0, 30)}... ===`);
                } catch (saveError) {
                  console.error('=== ERRO AO SALVAR MENSAGEM ===');
                  console.error('Erro detalhado:', saveError);
                  console.error('Stack trace:', (saveError as Error).stack);
                }
              });
            } catch (error) {
              console.error('Erro ao salvar mensagens no banco:', error);
            }
          } else {
            console.warn('ID da revenda não disponível, não foi possível salvar as mensagens no banco');
          }
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
  


  // Função para alternar o status de uma conversa
  const handleChangeStatus = useCallback((conversationId: string, newStatus: ConversationStatus) => {
    updateConversationStatus(conversationId, newStatus);
    
    // Aqui poderia salvar o status no banco de dados
    // Isso já deve estar implementado em updateConversationStatus no contexto
  }, [updateConversationStatus]);
  
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
            <div className="h-full flex flex-col">
              <ConnectionStatus
                connection={connection}
                loading={loading}
                error={error}
                onRefresh={refreshConnection}
                socketConnected={isConnected}
                socketError={socketError}
                socketInstance={apiConfig?.instanceName}
              />
              
              {/* Informações do Usuário e Revenda - apenas para debugging */}
              {(revendaId || userEmail) && (
                <div className="mt-4 mx-4 bg-gray-800 rounded p-3 text-xs border border-gray-700">
                  <div className="font-bold text-emerald-500 mb-1">Informações de Conexão:</div>
                  {revendaId && <div className="py-1"><span className="text-gray-400">ID Revenda:</span> {revendaId}</div>}
                  {userEmail && <div className="py-1"><span className="text-gray-400">Usuário:</span> {userEmail}</div>}
                </div>
              )}
            </div>
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
