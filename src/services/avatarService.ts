import { supabase } from '../lib/supabase';
import axios from 'axios';

/**
 * Interface para configuração da API Evolution
 */
export interface EvolutionApiConfig {
  baseUrl: string;
  apikey: string;
  instanceName: string;
}

/**
 * Busca a URL da foto de perfil do WhatsApp para um número de telefone
 * @param phone Número de telefone no formato internacional (ex: 5511999999999)
 * @param apiConfig Configuração da API Evolution para a revenda atual
 * @returns URL da foto de perfil ou null se não encontrada
 */
export async function fetchProfilePictureUrl(
  phone: string,
  apiConfig: EvolutionApiConfig
): Promise<string | null> {
  try {
    // Logs para debug de input
    console.log(`[AVATAR_DEBUG] ==== INÍCIO DE BUSCA DE AVATAR ====`);
    console.log(`[AVATAR_DEBUG] Telefone original recebido:`, phone);
    console.log(`[AVATAR_DEBUG] API Config recebida:`, JSON.stringify(apiConfig));
    
    // Garantir que o telefone está no formato esperado (WhatsApp usa formato internacional)
    const formattedPhone = formatPhoneNumber(phone, true);
    
    console.log(`[AVATAR_DEBUG] Telefone formatado: ${formattedPhone}`);
    console.log(`[AVATAR_DEBUG] URL completa: ${apiConfig.baseUrl}/chat/fetchProfilePictureUrl/${apiConfig.instanceName}`);
    console.log(`[AVATAR_DEBUG] API Key: ${apiConfig.apikey.substring(0, 6)}...${apiConfig.apikey.substring(apiConfig.apikey.length - 4)}`);
    console.log(`[AVATAR_DEBUG] Payload: { number: "${formattedPhone}@s.whatsapp.net" }`);
    
    // Usando o endpoint correto fetchProfilePictureUrl (confirmado por teste)
    const response = await axios.post(
      `${apiConfig.baseUrl}/chat/fetchProfilePictureUrl/${apiConfig.instanceName}`,
      { number: `${formattedPhone}@s.whatsapp.net` },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiConfig.apikey
        }
      }
    );

    console.log(`[AVATAR_DEBUG] Resposta da API recebida:`, JSON.stringify(response.data));
    console.log(`[AVATAR_DEBUG] Tipo de resposta:`, typeof response.data, Array.isArray(response.data) ? 'array' : 'não-array');
    console.log(`[AVATAR_DEBUG] Chaves na resposta:`, Object.keys(response.data || {}));

    // Processar resposta conforme o formato confirmado por teste:
    // { wuid: '5512996807562@s.whatsapp.net', profilePictureUrl: 'https://pps.whatsapp.net/...' }
    if (response.data && response.data.profilePictureUrl) {
      console.log(`[AVATAR_DEBUG] Avatar encontrado:`, response.data.profilePictureUrl);
      console.log(`[AVATAR_DEBUG] ==== FIM DE BUSCA - AVATAR ENCONTRADO ====`);
      return response.data.profilePictureUrl;
    }
    
    // Formato alternativo que possa existir
    if (response.data && response.data.pictureUrl) {
      console.log(`[AVATAR_DEBUG] Avatar encontrado (campo pictureUrl):`, response.data.pictureUrl);
      console.log(`[AVATAR_DEBUG] ==== FIM DE BUSCA - AVATAR ENCONTRADO ====`);
      return response.data.pictureUrl;
    }
    
    // Se chegou aqui, não encontrou o avatar
    console.log(`[AVATAR_DEBUG] Avatar não encontrado na resposta da API`);
    console.log(`[AVATAR_DEBUG] ==== FIM DE BUSCA - SEM AVATAR ====`);
    return null;
    
  } catch (error: any) { // Tipo 'any' para acessar propriedades não declaradas no tipo base
    console.error('[AVATAR_DEBUG] Erro ao buscar avatar:', error?.message || error);
    console.error('[AVATAR_DEBUG] Detalhes do erro:', error?.response?.data || 'Sem detalhes');
    console.log(`[AVATAR_DEBUG] ==== FIM DE BUSCA - ERRO ====`);
    return null;
  }
}

/**
 * Atualiza o avatar de um contato no banco de dados
 * @param phone Número de telefone
 * @param revendaId ID da revenda
 * @param avatarUrl URL da foto de perfil
 */
export async function updateContactAvatar(
  phone: string,
  revendaId: string,
  avatarUrl: string | null
): Promise<void> {
  try {
    // Formatar o telefone para usar no banco de dados (sem sufixo @s.whatsapp.net)
    const cleanPhone = formatPhoneNumber(phone, false);
    
    console.log(`[AVATAR_DEBUG] Tentando atualizar avatar para ${cleanPhone}:`, avatarUrl);
    
    // Verificar se é uma URL válida antes de salvar
    if (avatarUrl) {
      try {
        const url = new URL(avatarUrl);
        if (!url.protocol.startsWith('http')) {
          console.error(`[AVATAR_DEBUG] URL inválida: ${avatarUrl} - protocolo não é http/https`);
          return;
        }
      } catch (urlError) {
        console.error(`[AVATAR_DEBUG] URL inválida: ${avatarUrl}`, urlError);
        return;
      }
    }
    
    // Verificar se o contato já existe no banco de dados
    const { data: existingData, error: checkError } = await supabase
      .from('whatsapp_revenda_status')
      .select('id, avatar_url, name, phone')
      .eq('revenda_id', revendaId)
      .eq('phone', cleanPhone)
      .maybeSingle();
    
    if (checkError) {
      console.error('[AVATAR_DEBUG] Erro ao verificar contato existente:', checkError);
      return;
    }
    
    if (existingData) {
      console.log(`[AVATAR_DEBUG] Contato encontrado, ID: ${existingData.id}, avatar atual: ${existingData.avatar_url || 'nenhum'}`);
      
      // Verificar se o avatar_url mudou para fins de log
      if (existingData.avatar_url === avatarUrl) {
        console.log(`[AVATAR_DEBUG] OBSERVAÇÃO: O avatar para ${cleanPhone} já tem o mesmo valor, mas vamos forçar a atualização mesmo assim`);
        console.log(`[AVATAR_DEBUG] avatar_url existente: ${existingData.avatar_url || 'NULL'}`);
        console.log(`[AVATAR_DEBUG] avatarUrl novo: ${avatarUrl || 'NULL'}`);
        // Não retornar aqui para permitir a atualização mesmo se parecer igual
      }
      
      // Atualizar o registro existente
      const { error } = await supabase
        .from('whatsapp_revenda_status')
        .update({ 
          avatar_url: avatarUrl,
          avatarUrl: avatarUrl, // Atualizar ambos os campos para compatibilidade
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id);
      
      if (error) {
        console.error('[AVATAR_DEBUG] Erro ao atualizar avatar no banco:', JSON.stringify(error));
      } else {
        console.log(`[AVATAR_DEBUG] Avatar atualizado com sucesso para: ${cleanPhone}`);
        
        // Verificar se o avatar foi realmente salvo
        const { data: updatedData } = await supabase
          .from('whatsapp_revenda_status')
          .select('avatar_url')
          .eq('id', existingData.id)
          .maybeSingle();
          
        console.log(`[AVATAR_DEBUG] Verificação pós-atualização:`, JSON.stringify(updatedData));
      }
    } else {
      console.log(`[AVATAR_DEBUG] Contato não encontrado para: ${cleanPhone}, tentando criar um novo registro`);
      
      // Criar um novo registro se o contato não existe
      const { error: insertError } = await supabase
        .from('whatsapp_revenda_status')
        .insert({
          revenda_id: revendaId,
          phone: cleanPhone,
          name: `+${cleanPhone}`, // Nome padrão = número de telefone formatado
          avatar_url: avatarUrl,
          avatarUrl: avatarUrl, // Atualizar ambos os campos para compatibilidade
          status: 'Aguardando',
          unread_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (insertError) {
        console.error('[AVATAR_DEBUG] Erro ao criar novo contato com avatar:', insertError);
      } else {
        console.log(`[AVATAR_DEBUG] Novo contato criado com avatar para: ${cleanPhone}`);
      }
    }
  } catch (error: any) { // Corrige o erro de TypeScript usando o tipo any
    console.error('[AVATAR_DEBUG] Erro ao atualizar avatar:', error?.message || error);
  }
}

/**
 * Verifica e atualiza os avatares de todos os contatos
 * @param revendaId ID da revenda
 * @param apiConfig Configuração da API Evolution
 * @param forceUpdate Força atualização mesmo se já tiver um avatar
 */
export async function refreshAllAvatars(
  revendaId: string,
  apiConfig: EvolutionApiConfig,
  forceUpdate: boolean = false
): Promise<void> {
  try {
    console.log(`[AVATAR_DEBUG] ==== INICIANDO ATUALIZAÇÃO EM MASSA DE AVATARES ====`); 
    console.log(`[AVATAR_DEBUG] Revenda ID: ${revendaId}`); 
    console.log(`[AVATAR_DEBUG] API Config:`, JSON.stringify(apiConfig));
    console.log(`[AVATAR_DEBUG] Forçar atualização: ${forceUpdate}`); 
    
    // Buscar todos os contatos da revenda
    const { data: contacts, error } = await supabase
      .from('whatsapp_revenda_status')
      .select('phone, avatar_url')
      .eq('revenda_id', revendaId);
    
    if (error) {
      console.error('[AVATAR_DEBUG] Erro ao buscar contatos:', JSON.stringify(error as unknown));
      console.log(`[AVATAR_DEBUG] ==== FALHA NA ATUALIZAÇÃO DE AVATARES ====`);
      return;
    }
    
    // Garantir que contacts é um array
    if (!contacts || !Array.isArray(contacts)) {
      console.log('[AVATAR_DEBUG] Nenhum contato encontrado para atualizar avatares');
      console.log(`[AVATAR_DEBUG] ==== FIM DA ATUALIZAÇÃO DE AVATARES (0 CONTATOS) ====`);
      return;
    }
    
    console.log(`[AVATAR_DEBUG] Iniciando atualização de avatares para ${contacts.length} contatos`);
    
    // Para cada contato, verificar e atualizar o avatar se necessário
    let atualizados = 0;
    let pulados = 0;
    let falhas = 0;
    
    for (const contact of contacts) {
      // Pular se já tiver avatar e não estiver forçando atualização
      if (contact.avatar_url && !forceUpdate) {
        pulados++;
        continue;
      }
      
      if (!contact.phone) {
        console.log('[AVATAR_DEBUG] Contato sem número de telefone, pulando');
        pulados++;
        continue;
      }
      
      // Formatar o telefone para busca
      const phoneStr = formatPhoneNumber(contact.phone, false);
      console.log(`[AVATAR_DEBUG] Processando contato: ${phoneStr} (${atualizados+1}/${contacts.length})`);
      
      try {
        // Buscar o avatar da API
        console.log(`[AVATAR_DEBUG] Buscando avatar para: ${phoneStr}`);
        const avatarUrl = await fetchProfilePictureUrl(phoneStr, apiConfig);
        
        console.log(`[AVATAR_DEBUG] Resultado da busca para ${phoneStr}: ${avatarUrl || 'NULL'}`);
        
        // Atualizar no banco de dados
        if (avatarUrl) {
          console.log(`[AVATAR_DEBUG] CHAMANDO updateContactAvatar para ${phoneStr} com URL: ${avatarUrl}`);
          
          // Adicionar um pequeno delay para garantir que a operação DB anterior termine
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Forçar a atualização do banco
          await updateContactAvatar(phoneStr, revendaId, avatarUrl);
          
          // Verificar se a atualização foi bem sucedida
          const { data: checkData } = await supabase
            .from('whatsapp_revenda_status')
            .select('avatar_url')
            .eq('revenda_id', revendaId)
            .eq('phone', phoneStr)
            .maybeSingle();
          
          if (checkData && checkData.avatar_url === avatarUrl) {
            console.log(`[AVATAR_DEBUG] Avatar CONFIRMADO no banco para ${phoneStr}`);
            atualizados++;
          } else {
            console.log(`[AVATAR_DEBUG] PROBLEMA: Avatar não foi salvo corretamente para ${phoneStr}!`);
            console.log(`[AVATAR_DEBUG] Valor esperado: ${avatarUrl}`);
            console.log(`[AVATAR_DEBUG] Valor no banco: ${checkData?.avatar_url || 'NULL'}`);
            falhas++;
          }
        } else {
          falhas++;
          console.log(`[AVATAR_DEBUG] Sem avatar disponível para ${phoneStr}`);
        }
      } catch (contactError: any) {
        falhas++;
        console.error(`[AVATAR_DEBUG] Erro ao processar contato ${phoneStr}:`, contactError?.message || contactError);
      }
      
      // Pequeno delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`[AVATAR_DEBUG] ==== RESUMO DE ATUALIZAÇÃO DE AVATARES ====`);
    console.log(`[AVATAR_DEBUG] Total de contatos: ${contacts.length}`);
    console.log(`[AVATAR_DEBUG] Contatos atualizados: ${atualizados}`);
    console.log(`[AVATAR_DEBUG] Contatos pulados: ${pulados}`);
    console.log(`[AVATAR_DEBUG] Falhas: ${falhas}`);
    console.log(`[AVATAR_DEBUG] ==== FIM DA ATUALIZAÇÃO DE AVATARES ====`);
  } catch (error: any) {
    console.error('[AVATAR_DEBUG] Erro geral ao atualizar avatares:', error?.message || error);
    console.log(`[AVATAR_DEBUG] ==== FALHA GRAVE NA ATUALIZAÇÃO DE AVATARES ====`);
  }
}

/**
 * Formata um número de telefone para o formato esperado pelo WhatsApp
 * @param phone Número de telefone
 * @param forWhatsApp Se verdadeiro, adiciona o sufixo @s.whatsapp.net para API do WhatsApp
 * @returns Número formatado
 */
export function formatPhoneNumber(phone: string | unknown, forWhatsApp: boolean = false): string {
  if (!phone) return '';
  
  // Garantir que temos uma string
  const phoneStr = String(phone);
  
  // Remover o sufixo @s.whatsapp.net se existir
  const cleanNumber = phoneStr.replace(/@s\.whatsapp\.net$/, '');
  
  // Remover todos os caracteres não numéricos
  const numbersOnly = cleanNumber.replace(/\D/g, '');
  
  // Garantir que o número começa com o código do país (55 para Brasil)
  const withCountryCode = numbersOnly.startsWith('55') ? numbersOnly : `55${numbersOnly}`;
  
  // Adicionar o sufixo @s.whatsapp.net se solicitado
  return forWhatsApp ? `${withCountryCode}@s.whatsapp.net` : withCountryCode;
}
