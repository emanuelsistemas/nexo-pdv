import { supabase } from '../lib/supabase';
import { ChatMessage, Conversation, ConversationStatus } from '../types/chat';
import { loadEvolutionApiConfig } from './storage';
import { v4 } from 'uuid';

// Interface para os dados da tabela whatsapp_revenda_status
interface WhatsappRevendaStatus {
  id: string;
  revenda_id: string;
  phone: string;
  conversation_id?: string;
  name?: string;
  last_message?: string;
  last_message_time: string | number;
  status?: string;
  status_msg?: string;
  unread_count?: number;
  setor?: string;
  scroll_position?: number | null;
  created_at?: string;
  updated_at?: string;
}

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
      
      // Preparar os dados para inserção no banco - apenas dados da mensagem
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
      };
      
      // Recebe o setor da mensagem - será usado para atualizar o status da conversa
      const messageSetor = (message as any).setor || 'Geral';
      const isFromMe = message.sender === 'me';
      
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
              
              // Mesmo com a tentativa 2 sendo bem-sucedida, continuamos para atualizar o status da conversa
              await this.updateConversationStatus(phone, revendaId, messageData.content, messageData.timestamp, isFromMe, messageSetor, conversationId);
              
              return; // Sucesso na tentativa 2
            }
          } else {
            console.log('[WhatsappStorage] === MENSAGEM SALVA COM SUCESSO NA TENTATIVA 1 ===');
            console.log('[WhatsappStorage] Resposta do Supabase:', data);
            
            // Depois de salvar a mensagem, atualizar o status da conversa
            await this.updateConversationStatus(phone, revendaId, messageData.content, messageData.timestamp, isFromMe, messageSetor, conversationId);
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
      console.log('[WhatsappStorage] Carregando todas as conversas para revenda', revendaId);
      
      // Em vez de buscar diretamente as mensagens, vamos usar a tabela de status
      const { data: statusData, error: statusError } = await supabase
        .from('whatsapp_revenda_status')
        .select('*')
        .eq('revenda_id', revendaId)
        .order('last_message_time', { ascending: false });
      
      if (statusError) {
        console.error('[WhatsappStorage] Erro ao carregar status das conversas:', statusError);
        // Fallback para o método antigo caso a tabela de status não esteja disponível
        return this.loadAllConversationsLegacy(revendaId, messagesPerConversation);
      }
      
      if (!statusData || statusData.length === 0) {
        console.log('[WhatsappStorage] Nenhuma conversa encontrada na tabela de status, tentando método legado');
        // Tente o método legado se não houver dados de status
        return this.loadAllConversationsLegacy(revendaId, messagesPerConversation);
      }
      
      console.log('[WhatsappStorage] Encontradas', statusData.length, 'conversas na tabela de status');
      
      // Para cada status, carregar as mensagens e construir a conversa
      const conversations: Conversation[] = [];
      
      for (const status of statusData as unknown as WhatsappRevendaStatus[]) {
        // Converter o ID da conversa para o formato esperado ou usar o padrão
        const conversationId = status.conversation_id || `${status.phone}@s.whatsapp.net`;
        
        // Carregar mensagens para esta conversa
        const messages = await this.loadMessages(conversationId, revendaId, messagesPerConversation);
        
        // Criar objeto de conversa usando dados do status
        conversations.push({
          id: conversationId,
          name: status.name || status.phone,
          phone: status.phone,
          contactName: status.name || '',
          sector: status.setor || '', // Usando o setor da tabela de status
          lastMessage: status.last_message || '',
          last_message: status.last_message || '',
          last_message_time: new Date(status.last_message_time || Date.now()),
          timestamp: new Date(status.last_message_time || Date.now()),
          messages: messages,
          status: (status.status as ConversationStatus) || 'Aguardando',
          unread_count: status.unread_count || 0,
          instanceName: messages.length > 0 ? messages[messages.length - 1].instanceName : ''
        });
      }
      
      return conversations;
    } catch (error) {
      console.error('[WhatsappStorage] Erro ao carregar conversas:', error);
      return [];
    }
  },
  
  // Método legado para carregar conversas (caso a tabela de status não esteja disponível)
  async loadAllConversationsLegacy(
    revendaId: string,
    messagesPerConversation: number = 20
  ): Promise<Conversation[]> {
    try {
      console.log('[WhatsappStorage] Usando método legado para carregar conversas');
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
            sector: 'Geral', // Usar setor padrão
            lastMessage: lastMessage.content,
            last_message: lastMessage.content,
            last_message_time: lastMessage.timestamp,
            timestamp: lastMessage.timestamp,
            messages: messages,
            status: 'Aguardando' as ConversationStatus,
            unread_count: 0,
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
      console.error('Erro ao carregar conversas do Supabase (legado):', error);
      return [];
    }
  },
  
  /**
   * Atualiza o status da conversa na tabela whatsapp_revenda_status
   * @param phone Número do telefone
   * @param revendaId ID da revenda
   * @param lastMessage Última mensagem
   * @param timestamp Timestamp da mensagem
   * @param isFromMe Se a mensagem é do usuário
   * @param setor Setor da conversa
   * @param conversationId ID completo da conversa (opcional)
   */
  async updateConversationStatus(
    phone: string,
    revendaId: string,
    lastMessage: string,
    timestamp: number | Date,
    isFromMe: boolean,
    setor: string = 'Geral',
    conversationId: string = ''
  ): Promise<void> {
    try {
      console.log('[WhatsappStorage] Atualizando status da conversa para', phone);
      
      // Converter timestamp para número se for Date
      const timestampNumber = timestamp instanceof Date ? timestamp.getTime() : timestamp;
      
      // Verificar se a conversa já existe
      const { data: existingConversation, error: fetchError } = await supabase
        .from('whatsapp_revenda_status')
        .select('*')
        .eq('revenda_id', revendaId)
        .eq('phone', phone)
        .maybeSingle();
        
      if (fetchError) {
        console.error('[WhatsappStorage] Erro ao buscar conversa existente:', fetchError);
        // Se o erro for porque a tabela não existe, é melhor não tentar continuar
        if (fetchError.message?.includes('does not exist')) {
          console.error('[WhatsappStorage] A tabela whatsapp_revenda_status não existe. Pulando atualização de status.');
          return;
        }
      }
      
      // Tipagem para o existingConversation
      const existingData = existingConversation as unknown as WhatsappRevendaStatus | null;
      
      // Preparar os dados para upsert
      const statusData: WhatsappRevendaStatus = {
        // Se não existir, gerar um novo ID, caso contrário manter o existente
        id: existingData?.id || v4(),
        revenda_id: revendaId,
        phone: phone,
        conversation_id: conversationId || existingData?.conversation_id || `${phone}@s.whatsapp.net`,
        name: existingData?.name || phone, // Manter o nome existente ou usar o telefone
        last_message: lastMessage,
        last_message_time: timestampNumber,
        // Manter o status e setor se existirem, caso contrário usar padrões
        status: existingData?.status || 'Aguardando',
        status_msg: isFromMe ? existingData?.status_msg || 'fechada' : 'fechada',
        // Se a mensagem é nossa, manter o contador, senão incrementar (ou iniciar com 1)
        unread_count: isFromMe ? 0 : (existingData ? (existingData.unread_count || 0) + 1 : 1),
        // Manter o setor existente ou usar o novo
        setor: existingData?.setor || setor,
        // Manter a posição de rolagem se existir
        scroll_position: existingData?.scroll_position || null,
        // Timestamps
        updated_at: new Date().toISOString()
      };
      
      // Se não existir, adicionar created_at
      if (!existingData) {
        statusData.created_at = new Date().toISOString();
      }
      
      console.log('[WhatsappStorage] Dados do status da conversa:', statusData);
      
      // Upsert na tabela de status
      const { error: upsertError } = await supabase
        .from('whatsapp_revenda_status')
        .upsert(statusData as unknown as Record<string, unknown>, {
          onConflict: 'revenda_id,phone',
          ignoreDuplicates: false // Queremos atualizar se já existir
        });
        
      if (upsertError) {
        console.error('[WhatsappStorage] Erro ao atualizar status da conversa:', upsertError);
      } else {
        console.log('[WhatsappStorage] Status da conversa atualizado com sucesso');
      }
    } catch (error) {
      console.error('[WhatsappStorage] Erro ao atualizar status da conversa:', error);
    }
  },
  
  /**
   * Atualiza o status de uma conversa (Aguardando, Atendendo, Pendentes, Finalizados)
   * @param conversationId ID da conversa
   * @param revendaId ID da revenda
      const { error } = await supabase
        .from('whatsapp_revenda_status')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('revenda_id', revendaId)
        .eq('phone', phone);
        
      if (error) {
        console.error('[WhatsappStorage] Erro ao atualizar status:', error);
        throw error;
      }
    } else {
      // Atualizar o status diretamente
      const { error } = await supabase
        .from('whatsapp_revenda_status')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('revenda_id', revendaId)
        .eq('phone', phone);
        
      if (error) {
        console.error('[WhatsappStorage] Erro ao atualizar status:', error);
        throw error;
      }
    }
  },
  
  /**
      if (!phone) {
        throw new Error('ID de conversa inválido');
      }
      
      console.log(`[WhatsappStorage] Atualizando setor da conversa ${phone} para ${newSetor}`);
      
      // Verificar se a tabela existe primeiro
      const { count, error: countError } = await supabase
        .from('whatsapp_revenda_status')
        .select('*', { count: 'exact', head: true })
        .eq('revenda_id', revendaId)
        .eq('phone', phone);
      
      if (countError) {
        console.error('[WhatsappStorage] Erro ao verificar tabela de status:', countError);
        // Se o erro for porque a tabela não existe, é melhor não tentar continuar
        if (countError.message?.includes('does not exist')) {
          console.error('[WhatsappStorage] A tabela whatsapp_revenda_status não existe. Pulando atualização de setor.');
          return;
        }
        throw countError;
      }
      
      // Se o registro não existir, precisamos criar com o updateConversationStatus
      if (count === 0) {
        console.log('[WhatsappStorage] Status não encontrado, criando novo registro');
        await this.updateConversationStatus(
          phone,
          revendaId,
          '',  // sem mensagem
          Date.now(),
          true, // isFromMe
          newSetor,
          conversationId
        );
      } else {
        // Atualizar o setor diretamente
        const { error } = await supabase
          .from('whatsapp_revenda_status')
          .update({ setor: newSetor, updated_at: new Date().toISOString() })
          .eq('revenda_id', revendaId)
          .eq('phone', phone);
          
        if (error) {
          console.error('[WhatsappStorage] Erro ao atualizar setor:', error);
          throw error;
        }
      }
      
      console.log('[WhatsappStorage] Setor atualizado com sucesso');
    } catch (error) {
      console.error('[WhatsappStorage] Erro ao atualizar setor:', error);
      throw error;
    }
  },
  
  /**
   * Zera o contador de mensagens não lidas de uma conversa
   * @param conversationId ID da conversa
   * @param revendaId ID da revenda
   */
  async resetUnreadCount(
    conversationId: string,
    revendaId: string
  ): Promise<void> {
    try {
      // Extrair o telefone do ID da conversa
      const phone = conversationId.split('@')[0];
      
      if (!phone) {
        throw new Error('ID de conversa inválido');
      }
      
      console.log(`[WhatsappStorage] Zerando contador de mensagens não lidas para ${phone}`);
      
      // Verificar se a tabela existe primeiro
      const { count, error: countError } = await supabase
        .from('whatsapp_revenda_status')
        .select('*', { count: 'exact', head: true })
        .eq('revenda_id', revendaId)
        .eq('phone', phone);
      
      if (countError) {
        console.error('[WhatsappStorage] Erro ao verificar tabela de status:', countError);
        // Se o erro for porque a tabela não existe, é melhor não tentar continuar
        if (countError.message?.includes('does not exist')) {
          console.error('[WhatsappStorage] A tabela whatsapp_revenda_status não existe. Pulando zerar contador.');
          return;
        }
        throw countError;
      }
      
      // Se o registro não existir, precisamos criar com o updateConversationStatus
      if (count === 0) {
        console.log('[WhatsappStorage] Status não encontrado, criando novo registro');
        await this.updateConversationStatus(
          phone,
          revendaId,
          '',  // sem mensagem
          Date.now(),
          true, // isFromMe
          'Geral',
          conversationId
        );
      } else {
        // Atualizar o contador diretamente
        const { error } = await supabase
          .from('whatsapp_revenda_status')
          .update({ 
            unread_count: 0, 
            status_msg: 'aberta',
            updated_at: new Date().toISOString() 
          })
          .eq('revenda_id', revendaId)
          .eq('phone', phone);
          
        if (error) {
          console.error('[WhatsappStorage] Erro ao zerar contador:', error);
          throw error;
        }
      }
      
      console.log('[WhatsappStorage] Contador zerado com sucesso');
    } catch (error) {
      console.error('[WhatsappStorage] Erro ao zerar contador:', error);
      throw error;
    }
  },
  
  /**
   * Salva a posição de rolagem de uma conversa
   * @param conversationId ID da conversa
   * @param revendaId ID da revenda
   * @param position Posição de rolagem
   */
  async saveScrollPosition(
    conversationId: string,
    revendaId: string,
    position: number
  ): Promise<void> {
    try {
      // Extrair o telefone do ID da conversa
      const phone = conversationId.split('@')[0];
      
      if (!phone) {
        throw new Error('ID de conversa inválido');
      }
      
      console.log(`[WhatsappStorage] Salvando posição de rolagem ${position} para ${phone}`);
      
      // Verificar se a tabela existe primeiro
      const { count, error: countError } = await supabase
        .from('whatsapp_revenda_status')
        .select('*', { count: 'exact', head: true })
        .eq('revenda_id', revendaId)
        .eq('phone', phone);
      
      if (countError) {
        console.error('[WhatsappStorage] Erro ao verificar tabela de status:', countError);
        // Se o erro for porque a tabela não existe, é melhor não tentar continuar
        if (countError.message?.includes('does not exist')) {
          console.error('[WhatsappStorage] A tabela whatsapp_revenda_status não existe. Pulando salvar posição.');
          return;
        }
        throw countError;
      }
      
      // Se o registro não existir, precisamos criar com o updateConversationStatus
      if (count === 0) {
        console.log('[WhatsappStorage] Status não encontrado, criando novo registro');
        await this.updateConversationStatus(
          phone,
          revendaId,
          '',  // sem mensagem
          Date.now(),
          true, // isFromMe
          'Geral',
          conversationId
        );
        
        // Agora atualizar a posição de rolagem
        const { error } = await supabase
          .from('whatsapp_revenda_status')
          .update({ 
            scroll_position: position,
            updated_at: new Date().toISOString() 
          })
          .eq('revenda_id', revendaId)
          .eq('phone', phone);
          
        if (error) {
          console.error('[WhatsappStorage] Erro ao salvar posição de rolagem:', error);
          throw error;
        }
      } else {
        // Atualizar a posição diretamente
        const { error } = await supabase
          .from('whatsapp_revenda_status')
          .update({ 
            scroll_position: position,
            updated_at: new Date().toISOString() 
          })
          .eq('revenda_id', revendaId)
          .eq('phone', phone);
          
        if (error) {
          console.error('[WhatsappStorage] Erro ao salvar posição de rolagem:', error);
          throw error;
        }
      }
      
      console.log('[WhatsappStorage] Posição de rolagem salva com sucesso');
    } catch (error) {
      console.error('[WhatsappStorage] Erro ao salvar posição de rolagem:', error);
      throw error;
    }
  }
};
