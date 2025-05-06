import { supabase } from '../lib/supabase';
import { ChatMessage, Conversation, ConversationStatus } from '../types/chat';
import { loadEvolutionApiConfig } from './storage';
import { v4 } from 'uuid';

// Função de teste para salvar mensagens diretamente no banco
export const testSaveMessage = async () => {
  try {
    console.log('=== TESTE DE INSERÇÃO DIRETA NO BANCO DE DADOS ===');
    
    // Usar a função v4() da biblioteca uuid para gerar IDs confiáveis
    console.log('[WhatsappStorage] Gerando UUID com a biblioteca uuid v4');
    
    // Dados de teste
    const testData = {
      id: v4(),
      revenda_id: 'da7b6429-f31c-45c8-864a-dbe3862d2531', // ID da revenda do localStorage
      instance_name: '123',
      phone: '5512996807562',
      name: 'Teste direto',
      message: {id: 'test-123', content: 'Mensagem de teste', sender: 'me', timestamp: new Date()},
      message_type: 'text',
      content: 'Mensagem de teste direto no banco',
      from_me: true,
      timestamp: Date.now(),
      message_id: 'test-msg-' + Date.now(),
      created_at: new Date(),
      updated_at: new Date(),
      status: 'Aguardando',
      status_msg: 'fechada',
      unread_count: 0
    };
    
    console.log('Dados de teste:', testData);
    
    // Tentar inserir diretamente no banco
    console.log('Tentando inserir diretamente no banco...');
    const { data, error } = await supabase
      .from('whatsapp_revenda_msg')
      .insert(testData);
      
    if (error) {
      console.error('ERRO AO INSERIR TESTE:', error);
      console.error('Detalhes:', error.details);
      console.error('Mensagem:', error.message);
      console.error('Código:', error.code);
      return {success: false, error};
    } else {
      console.log('INSERÇÃO DE TESTE BEM-SUCEDIDA!');
      console.log('Resultado:', data);
      return {success: true, data};
    }
  } catch (e) {
    console.error('ERRO INESPERADO NO TESTE:', e);
    return {success: false, error: e};
  }
};

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
    console.log('[WhatsappStorage] =============================================');
    console.log('[WhatsappStorage] === INICIO saveMessage - DIAGNÓSTICO DETALHADO ===');
    console.log('[WhatsappStorage] =============================================');
    console.log('[WhatsappStorage] >>> Parâmetros recebidos:');
    console.log('[WhatsappStorage] ID da mensagem:', message.id || 'AUSENTE');
    console.log('[WhatsappStorage] Conteúdo:', message.content || 'AUSENTE');
    console.log('[WhatsappStorage] Sender:', message.sender || 'AUSENTE');
    console.log('[WhatsappStorage] Timestamp:', message.timestamp || 'AUSENTE');
    console.log('[WhatsappStorage] InstanceName:', message.instanceName || 'AUSENTE');
    console.log('[WhatsappStorage] MessageType:', (message as any).message_type || 'AUSENTE');
    console.log('[WhatsappStorage] RevendaId:', revendaId || 'AUSENTE - CRÍTICO');
    console.log('[WhatsappStorage] Nome:', name || 'AUSENTE');
    console.log('[WhatsappStorage] ConversationId:', conversationId || 'AUSENTE');
    console.log('[WhatsappStorage] >>> Verificação de tipos:');
    console.log('[WhatsappStorage] Tipo do RevendaId:', typeof revendaId);
    console.log('[WhatsappStorage] Tipo da mensagem:', typeof message);
    console.log('[WhatsappStorage] Mensagem é array?', Array.isArray(message));
    console.log('[WhatsappStorage] Tipo do conversationId:', typeof conversationId);
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
    
    // Usar a biblioteca uuid para gerar IDs confiáveis
    console.log('[WhatsappStorage] Gerando UUID com a biblioteca uuid v4');

    // Verificar se o revendaId é um UUID válido
    const isValidUUID = (uuid: string) => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
    };

    // Validar o revendaId de forma mais rigorosa
    if (!revendaId) {
      console.error(`[WhatsappStorage] ERRO CRÍTICO: revendaId está ausente ou vazio`);
      throw new Error('revendaId é obrigatório para salvar mensagens');
    }

    // Verificar se o revendaId é um UUID válido
    if (!isValidUUID(revendaId)) {
      console.error(`[WhatsappStorage] ERRO CRÍTICO: revendaId (${revendaId}) não é um UUID válido`);
      throw new Error('revendaId deve ser um UUID válido');
    }
      
      // Preparar os dados para inserção no banco
      const messageData = {
        id: v4(), // Campo id obrigatório na tabela
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
        unread_count: message.sender === 'me' ? 0 : 1, // Se a mensagem é do usuário (me), unread_count = 0, senão = 1
        setor: (message as any).setor || 'Geral' // Novo campo para armazenar o setor da mensagem
      };
      
      console.log('[WhatsappStorage] Dados formatados:', messageData);

      // Inserir no Supabase
      console.log('[WhatsappStorage] === ENVIANDO PARA SUPABASE ===');
      console.log('[WhatsappStorage] Dados completos sendo enviados:', JSON.stringify(messageData, null, 2));
      
      // Verificar a estrutura da tabela antes de tentar inserir
      try {
        console.log('[WhatsappStorage] >>> VERIFICAÇÃO DO BANCO DE DADOS:');
        console.log('[WhatsappStorage] Acessando a tabela whatsapp_revenda_msg...');
        
        // Não vamos mais tentar verificar se a tabela existe através do information_schema
        // pois isso está causando o erro 'relation "public.information_schema.tables" does not exist'
        // Ao invés disso, tentaremos acessar a tabela diretamente
        
        // Obter a estrutura da tabela
        console.log('[WhatsappStorage] Verificando estrutura da tabela whatsapp_revenda_msg');
        const { data: tableInfo, error: tableError } = await supabase
          .from('whatsapp_revenda_msg')
          .select('*')
          .limit(1);
          
        if (tableError) {
          console.error('[WhatsappStorage] ERRO AO VERIFICAR TABELA:', tableError);
          console.error('[WhatsappStorage] Código do erro:', tableError.code);
          console.error('[WhatsappStorage] Mensagem do erro:', tableError.message);
          console.error('[WhatsappStorage] Detalhes do erro:', tableError.details || 'Nenhum');
          console.error('[WhatsappStorage] A tabela whatsapp_revenda_msg existe no banco de dados?');
        } else {
          console.log('[WhatsappStorage] Estrutura da tabela OK, continuando com insert');
          console.log('[WhatsappStorage] Exemplo de registro na tabela:', tableInfo);
        }
        
        // Log de todos os campos que estamos enviando para debug
        console.log('[WhatsappStorage] >>> DADOS QUE SERÃO INSERIDOS:');
        console.log('[WhatsappStorage] === CAMPOS QUE SERÃO ENVIADOS PARA INSERT ===');
        Object.entries(messageData as Record<string, any>).forEach(([key, value]) => {
          const valueType = typeof value;
          const stringValue = JSON.stringify(value)?.substring(0, 100); // Limitar o tamanho
          console.log(`[WhatsappStorage] ${key}: ${valueType} = ${stringValue}${stringValue?.length >= 100 ? '...' : ''}`);
          
          // Verificações especiais para campos críticos
          if (key === 'id' || key === 'revenda_id') {
            console.log(`[WhatsappStorage] >> CRÍTICO: ${key} é UUID válido?`, isValidUUID(value));
          }
          if (key === 'message') {
            console.log('[WhatsappStorage] >> CRÍTICO: message é serializável?', 
              (() => {
                try {
                  JSON.stringify(value);
                  return 'SIM';
                } catch (e) {
                  return `NÃO - Erro: ${e instanceof Error ? e.message : String(e)}`;
                }
              })());
          }
        });
        
        console.log('[WhatsappStorage] >>> TENTATIVA DE INSERÇÃO:');
        console.log('[WhatsappStorage] Executando upsert na tabela whatsapp_revenda_msg...');
        
        // Verificações finais antes de inserir
        const requiredFields = ['id', 'revenda_id', 'instance_name', 'phone', 'message_id', 'content'];
        const missingFields = requiredFields.filter(field => {
          // Usar hasOwnProperty para verificar se a propriedade existe no objeto
          return !messageData.hasOwnProperty(field) || !messageData[field as keyof typeof messageData];
        });
        
        if (missingFields.length > 0) {
          console.error(`[WhatsappStorage] ERRO: Campos obrigatórios faltando: ${missingFields.join(', ')}`);
          throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
        }
        
        // Tentativa 1: Usar upsert com os dados completos
        console.log('[WhatsappStorage] >>> TENTATIVA 1: Upsert com todos os campos');
        let data, error;
        try {
          const result = await supabase
            .from('whatsapp_revenda_msg')
            .upsert(messageData, { 
              onConflict: 'message_id, revenda_id',
              ignoreDuplicates: true 
            });
            
          data = result.data;
          error = result.error;
            
          if (error) {
            console.error('[WhatsappStorage] ERRO NA TENTATIVA 1:', error);
            console.error('[WhatsappStorage] Detalhes do erro:', error.details);
            console.error('[WhatsappStorage] Mensagem do erro:', error.message);
            console.error('[WhatsappStorage] Código do erro:', error.code);
            console.error('[WhatsappStorage] Hint:', error.hint);
            
            // Se falhou, tentar com dados mínimos
            console.log('[WhatsappStorage] >>> TENTATIVA 2: Insert com campos mínimos');
            const minimalData = {
              id: messageData.id,
              revenda_id: messageData.revenda_id,
              instance_name: messageData.instance_name,
              phone: messageData.phone,
              message_id: messageData.message_id,
              content: typeof messageData.content === 'string' ? messageData.content : 'conteúdo não disponível',
              from_me: !!messageData.from_me,
              timestamp: typeof messageData.timestamp === 'number' ? messageData.timestamp : Date.now()
            };
            
            console.log('[WhatsappStorage] Dados mínimos:', minimalData);
            
            const minResult = await supabase
              .from('whatsapp_revenda_msg')
              .insert(minimalData);
              
            if (minResult.error) {
              console.error('[WhatsappStorage] ERRO NA TENTATIVA 2:', minResult.error);
              console.error('[WhatsappStorage] Detalhes do erro:', minResult.error.details);
              console.error('[WhatsappStorage] Mensagem do erro:', minResult.error.message);
              console.error('[WhatsappStorage] Código:', minResult.error.code);
              throw new Error(`Erro ao salvar mensagem (ambas tentativas): ${error.message} | ${minResult.error.message}`);
            } else {
              console.log('[WhatsappStorage] === MENSAGEM SALVA COM SUCESSO NA TENTATIVA 2 ===');
              console.log('[WhatsappStorage] Resposta do Supabase:', minResult.data);
              return; // Sucesso na tentativa 2
            }
          } else {
            console.log('[WhatsappStorage] === MENSAGEM SALVA COM SUCESSO NA TENTATIVA 1 ===');
            console.log('[WhatsappStorage] Resposta do Supabase:', data);
          }
        } catch (innerError) {
          console.error('[WhatsappStorage] ERRO INESPERADO DURANTE UPSERT:', innerError);
          if (innerError instanceof Error) {
            console.error('[WhatsappStorage] Stack trace:', innerError.stack);
          }
          throw innerError;
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
