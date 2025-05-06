import { supabase } from '../lib/supabase';
import { ChatMessage, Conversation, ConversationStatus } from '../types/chat';
import { loadEvolutionApiConfig } from './storage';

/**
 * Serviço para armazenar e recuperar mensagens do WhatsApp no Supabase
 */
export const whatsappStorage = {
  /**
   * Salva uma mensagem no Supabase
   * @param message Mensagem a ser salva
   * @param revendaId ID da revenda
   * @param name Nome do contato (opcional)
   * @param conversationId ID da conversa (opcional)
   */
  async saveMessage(
    message: ChatMessage,
    revendaId: string,
    name: string = '',
    conversationId: string = ''
  ): Promise<void> {
    console.log('[WhatsappStorage] === INICIO saveMessage ===');
    console.log('[WhatsappStorage] ID da mensagem:', message.id);
    console.log('[WhatsappStorage] Conteúdo:', message.content);
    console.log('[WhatsappStorage] Sender:', message.sender);
    console.log('[WhatsappStorage] Timestamp:', message.timestamp);
    console.log('[WhatsappStorage] InstanceName:', message.instanceName);
    console.log('[WhatsappStorage] MessageType:', (message as any).message_type);
    console.log('[WhatsappStorage] RevendaId:', revendaId);
    console.log('[WhatsappStorage] Nome:', name);
    console.log('[WhatsappStorage] ConversationId:', conversationId);
    try {
      // Extrair o número de telefone do conversationId
      const phone = conversationId 
        ? conversationId.split('@')[0] 
        : '';
        
      if (!phone) {
        console.error('[WhatsappStorage] Erro: Não foi possível extrair número de telefone', { conversationId, message });
        return;
      }
      
      console.log('[WhatsappStorage] Preparando dados para Supabase. Phone:', phone);
      
      // Gerar um UUID para o campo ID
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      // Verificar se o revendaId é um UUID válido
      const isValidUUID = (uuid: string) => {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
      };

      // Avisar se o revendaId não for um UUID válido
      if (!isValidUUID(revendaId)) {
        console.warn(`[WhatsappStorage] ATENÇÃO: revendaId (${revendaId}) não parece ser um UUID válido`);
      }
      
      // Preparar os dados para inserção no banco
      const messageData = {
        id: generateUUID(), // Campo id obrigatório na tabela
        revenda_id: revendaId, // Este deve ser um UUID válido
        instance_name: message.instanceName || loadEvolutionApiConfig()?.instanceName || '123',
        phone: phone,
        name: name || '',
        message: message, // Salvar a mensagem completa como JSON
        message_type: typeof message.content === 'string' 
          ? (message.content.startsWith('[') && message.content.includes(']') 
            ? message.content.split(']')[0].replace('[', '') 
            : 'text')
          : 'unknown',
        content: message.content,
        from_me: message.sender === 'me',
        timestamp: message.timestamp instanceof Date 
          ? message.timestamp.getTime() 
          : (typeof message.timestamp === 'number' ? message.timestamp : new Date().getTime()),
        message_id: message.id || `${phone}_${new Date().getTime()}`,
        created_at: new Date(), // Adicionar timestamp de criação
        updated_at: new Date(), // Adicionar timestamp de atualização
        // Campos adicionados da tabela nexochat_status
        status: 'Aguardando', // Status padrão para novas mensagens
        status_msg: 'fechada',  // Status da mensagem padrão
        unread_count: message.sender === 'me' ? 0 : 1 // Se a mensagem é do usuário (me), unread_count = 0, senão = 1
      };
      
      console.log('[WhatsappStorage] Dados formatados:', messageData);

      // Inserir no Supabase
      console.log('[WhatsappStorage] === ENVIANDO PARA SUPABASE ===');
      console.log('[WhatsappStorage] Dados completos sendo enviados:', JSON.stringify(messageData, null, 2));
      
      // Verificar a estrutura da tabela antes de tentar inserir
      try {
        console.log('[WhatsappStorage] Verificando estrutura da tabela whatsapp_revenda_msg');
        const { error: tableError } = await supabase
          .from('whatsapp_revenda_msg')
          .select('*')
          .limit(1);
          
        if (tableError) {
          console.error('[WhatsappStorage] ERRO AO VERIFICAR TABELA:', tableError);
          console.error('[WhatsappStorage] A tabela whatsapp_revenda_msg existe no banco de dados?');
          // Continue tentando inserir mesmo se houver erro ao verificar tabela
        } else {
          console.log('[WhatsappStorage] Estrutura da tabela OK, continuando com insert');
        }
        
        // Log de todos os campos que estamos enviando para debug
        console.log('[WhatsappStorage] === CAMPOS QUE SERÃO ENVIADOS PARA INSERT ===');
        Object.entries(messageData as Record<string, any>).forEach(([key, value]) => {
          console.log(`[WhatsappStorage] ${key}: ${typeof value} = ${JSON.stringify(value)}`);
        });
        
        console.log('[WhatsappStorage] Executando upsert na tabela whatsapp_revenda_msg...');
        const { data, error } = await supabase
          .from('whatsapp_revenda_msg')
          .upsert(messageData, { 
            onConflict: 'message_id, revenda_id',
            ignoreDuplicates: true 
          });

        if (error) {
          console.error('[WhatsappStorage] ERRO NO SUPABASE:', error);
          console.error('[WhatsappStorage] Detalhes do erro:', error.details);
          console.error('[WhatsappStorage] Mensagem do erro:', error.message);
          console.error('[WhatsappStorage] Código do erro:', error.code);
          console.error('[WhatsappStorage] Hint:', error.hint);
          throw new Error(`Erro ao salvar mensagem: ${error.message}`);
        } else {
          console.log('[WhatsappStorage] === MENSAGEM SALVA COM SUCESSO ===');
          console.log('[WhatsappStorage] Resposta do Supabase:', data);
        }
      } catch (e) {
        console.error('[WhatsappStorage] ERRO INESPERADO ao salvar mensagem:', e);
        // Relançar o erro para ser capturado pelo chamador
        throw e;
      }
    } catch (error) {
      console.error('[WhatsappStorage] Erro no processamento:', error);
    }
  },

  /**
   * Salva múltiplas mensagens no Supabase
   * @param messages Lista de mensagens
   * @param conversationId ID da conversa
   * @param revendaId ID da revenda
   * @param name Nome do contato (opcional)
   */
  async saveMessages(
    messages: ChatMessage[],
    conversationId: string,
    revendaId: string,
    name?: string
  ): Promise<void> {
    try {
      if (!messages || messages.length === 0) return;

      const messagesToInsert = messages.map(message => ({
        revenda_id: revendaId,
        instance_name: message.instanceName || loadEvolutionApiConfig()?.instanceName || '123',
        phone: conversationId.split('@')[0],
        name: name || '',
        message: message,
        message_type: typeof message.content === 'string' 
          ? (message.content.startsWith('[') && message.content.includes(']') 
            ? message.content.split(']')[0].replace('[', '') 
            : 'text')
          : 'unknown',
        content: message.content,
        from_me: message.sender === 'me',
        timestamp: message.timestamp instanceof Date 
          ? message.timestamp.getTime() 
          : (typeof message.timestamp === 'number' ? message.timestamp : new Date().getTime()),
        message_id: message.id || `${conversationId}_${new Date().getTime()}_${Math.random().toString(36).substring(7)}`
      }));

      // Inserir em lote no Supabase
      const { error } = await supabase
        .from('whatsapp_revenda_msg')
        .upsert(messagesToInsert, { 
          onConflict: 'message_id, revenda_id',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error('Erro ao salvar mensagens em lote no Supabase:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar mensagens em lote no Supabase:', error);
    }
  },

  /**
   * Salva todas as mensagens de uma conversa
   * @param conversation Conversa completa
   * @param revendaId ID da revenda
   */
  async saveConversation(conversation: Conversation, revendaId: string): Promise<void> {
    if (!conversation || !conversation.messages || conversation.messages.length === 0) return;
    
    await this.saveMessages(
      conversation.messages, 
      conversation.id, 
      revendaId,
      conversation.name
    );
  },

  /**
   * Salva todas as conversas para uma revenda
   * @param conversations Lista de conversas
   * @param revendaId ID da revenda
   */
  async saveAllConversations(conversations: Conversation[], revendaId: string): Promise<void> {
    if (!conversations || conversations.length === 0) return;
    
    for (const conversation of conversations) {
      await this.saveConversation(conversation, revendaId);
    }
  },

  /**
   * Carrega mensagens de uma conversa específica
   * @param conversationId ID da conversa
   * @param revendaId ID da revenda
   * @param limit Limite de mensagens (padrão: 50)
   */
  async loadMessages(
    conversationId: string,
    revendaId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    try {
      const phone = conversationId.split('@')[0];
      
      const { data, error } = await supabase
        .from('whatsapp_revenda_msg')
        .select('*')
        .eq('revenda_id', revendaId)
        .eq('phone', phone)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao carregar mensagens do Supabase:', error);
        return [];
      }

      // Converter os dados do banco para o formato ChatMessage
      return data.map(item => ({
        id: String(item.message_id),
        content: String(item.content || ''),
        sender: item.from_me ? 'me' : 'them',
        timestamp: new Date(Number(item.timestamp)),
        instanceName: String(item.instance_name || ''),
        ...(typeof item.message === 'object' ? item.message : {}) // Preservar dados adicionais que possam estar na mensagem original
      }) as ChatMessage).reverse(); // Inverter para ordem cronológica
    } catch (error) {
      console.error('Erro ao carregar mensagens do Supabase:', error);
      return [];
    }
  },

  /**
   * Carrega todas as conversas para uma revenda
   * @param revendaId ID da revenda
   * @param messagesPerConversation Número de mensagens a carregar por conversa
   */
  async loadAllConversations(
    revendaId: string,
    messagesPerConversation: number = 20
  ): Promise<Conversation[]> {
    try {
      // Primeiro, buscar todos os números de telefone únicos para esta revenda
      // Obter todos os telefones distintos usando GROUP BY via SQL bruto
      const { data: phones, error: phonesError } = await supabase
        .from('whatsapp_revenda_msg')
        .select('phone, name')
        .eq('revenda_id', revendaId)
        .order('timestamp', { ascending: false })
        // Usando um SQL customizado para obter apenas os registros mais recentes de cada telefone
        // Esta é uma alternativa ao distinctOn que pode não estar disponível em todas as versões
        .limit(500); // Limitar para evitar sobrecarga

      // Filtrar manualmente para obter telefones únicos mantendo apenas o registro mais recente de cada um
      const uniquePhones: { phone: string, name: string }[] = [];
      const phoneSet = new Set<string>();
      
      phones?.forEach(item => {
        const phone = String(item.phone || '');
        if (phone && !phoneSet.has(phone)) {
          phoneSet.add(phone);
          uniquePhones.push({
            phone,
            name: String(item.name || '')
          });
        }
      });

      if (phonesError) {
        console.error('Erro ao carregar contatos do Supabase:', phonesError);
        return [];
      }

      // Para cada telefone, buscar as últimas mensagens
      const conversations: Conversation[] = [];
      
      for (const phoneData of uniquePhones) {
        const messages = await this.loadMessages(`${phoneData.phone}@s.whatsapp.net`, revendaId, messagesPerConversation);
        
        if (messages.length > 0) {
          // Encontrar a última mensagem para usar como preview
          const lastMessage = messages[messages.length - 1];
          
          conversations.push({
            id: `${phoneData.phone}@s.whatsapp.net`,
            name: phoneData.name || phoneData.phone,
            phone: phoneData.phone,
            contactName: phoneData.name || '',
            sector: '', // Campo obrigatório na interface Conversation
            lastMessage: lastMessage.content,
            last_message: lastMessage.content,
            last_message_time: lastMessage.timestamp,
            timestamp: lastMessage.timestamp,
            messages: messages,
            status: 'open' as ConversationStatus,
            unread_count: 0, // Inicialmente zero, será atualizado pelo nexochat_status
            instanceName: lastMessage.instanceName
          });
        }
      }

      return conversations.sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
        return timeB - timeA; // Ordenar do mais recente para o mais antigo
      });
    } catch (error) {
      console.error('Erro ao carregar conversas do Supabase:', error);
      return [];
    }
  }
};
