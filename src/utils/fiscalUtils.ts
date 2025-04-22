import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

/**
 * Cria configurações iniciais de NF-e e NFC-e para uma empresa recém-registrada
 * @param companyId ID da empresa
 * @returns Promise<boolean> Indica se a operação foi bem-sucedida
 */
export const createInitialFiscalConfigs = async (companyId: string): Promise<boolean> => {
  try {
    if (!companyId) {
      throw new Error('ID da empresa não fornecido');
    }

    // Configuração inicial para NF-e (modelo 55)
    const nfeConfig = {
      company_id: companyId,
      ambiente: '2', // 2 = Homologação (ambiente de testes)
      versao: '4.00',
      modelo_nfe: '55',
      serie: 1,
      numero_atual: 1,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Configuração inicial para NFC-e (modelo 65)
    const nfceConfig = {
      company_id: companyId,
      ambiente: '2', // 2 = Homologação (ambiente de testes)
      versao: '4.00',
      modelo_nfce: '65',
      serie: 1,
      numero_atual: 1,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Inserir configuração NF-e
    const { error: nfeError } = await supabase
      .from('nfe_configuracoes')
      .insert(nfeConfig);

    if (nfeError) {
      console.error('Erro ao criar configuração NF-e:', nfeError);
      throw nfeError;
    }

    // Inserir configuração NFC-e
    const { error: nfceError } = await supabase
      .from('nfce_configuracoes')
      .insert(nfceConfig);

    if (nfceError) {
      console.error('Erro ao criar configuração NFC-e:', nfceError);
      throw nfceError;
    }

    console.log('Configurações fiscais criadas com sucesso para a empresa:', companyId);
    return true;
  } catch (error) {
    console.error('Erro ao criar configurações fiscais:', error);
    return false;
  }
};

/**
 * Carrega as configurações de NF-e para uma empresa
 * @param companyId ID da empresa
 * @returns Configurações de NF-e ou null se ocorrer um erro
 */
export const loadNfeConfig = async (companyId: string): Promise<Record<string, any> | null> => {
  try {
    if (!companyId) {
      throw new Error('ID da empresa não fornecido');
    }

    // Consultar a tabela nfe_configuracoes
    const { data: nfeData, error: nfeError } = await supabase
      .from('nfe_configuracoes')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (nfeError && nfeError.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error('Erro ao carregar configuração NF-e:', nfeError);
      throw nfeError;
    }

    return nfeData || null;
  } catch (error) {
    console.error('Erro ao carregar configuração NF-e:', error);
    return null;
  }
};

/**
 * Carrega as configurações de NFC-e para uma empresa
 * @param companyId ID da empresa
 * @returns Configurações de NFC-e ou null se ocorrer um erro
 */
export const loadNfceConfig = async (companyId: string): Promise<Record<string, any> | null> => {
  try {
    if (!companyId) {
      throw new Error('ID da empresa não fornecido');
    }

    // Consultar a tabela nfce_configuracoes
    const { data: nfceData, error: nfceError } = await supabase
      .from('nfce_configuracoes')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (nfceError && nfceError.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error('Erro ao carregar configuração NFC-e:', nfceError);
      throw nfceError;
    }

    return nfceData || null;
  } catch (error) {
    console.error('Erro ao carregar configuração NFC-e:', error);
    return null;
  }
};

/**
 * Interface para configurações de NF-e
 */
export interface NfeConfig {
  ambiente: string;
  versao: string;
  modelo_nfe?: string;
  serie: number | string;
  numero_atual: number | string;
  certificado_arquivo?: string;
  certificado_senha?: string;
  certificado_validade?: string | Date | null;
  logo_url?: string;
  [key: string]: any; // Propriedade de índice para compatibilidade com Supabase
}

/**
 * Interface para configurações de NFC-e
 */
export interface NfceConfig {
  ambiente: string;
  versao: string;
  modelo_nfce?: string;
  serie: number | string;
  numero_atual: number | string;
  csc_id?: string;
  csc_token?: string;
  certificado_arquivo?: string;
  certificado_senha?: string;
  certificado_validade?: string | Date | null;
  logo_url?: string;
  [key: string]: any; // Propriedade de índice para compatibilidade com Supabase
}

/**
 * Interface para configurações fiscais completas
 */
export interface FiscalConfig {
  // Certificado Digital compartilhado entre NF-e e NFC-e
  certificadoDigital?: {
    arquivo: string;
    senha: string;
    validade: string;
  };
  nfe: {
    ativo: boolean;
    ambiente: 'producao' | 'homologacao';
    versao: string;
    modelo: string;
    serie: string;
    numeroAtual: string;
    logoUrl: string;
  };
  nfce: {
    ativo: boolean;
    ambiente: 'producao' | 'homologacao';
    versao: string;
    modelo: string;
    serie: string;
    numeroAtual: string;
    cscId: string;
    cscToken: string;
    logoUrl: string;
  };
}

/**
 * Salva as configurações de NF-e para uma empresa
 * @param companyId ID da empresa
 * @param config Configurações de NF-e a serem salvas
 * @returns Promise<boolean> Indica se a operação foi bem-sucedida
 */
export const saveNfeConfig = async (companyId: string, config: NfeConfig): Promise<boolean> => {
  try {
    if (!companyId) {
      throw new Error('ID da empresa não fornecido');
    }

    // Verificar se já existe configuração para NF-e
    const { data: existingNfe } = await supabase
      .from('nfe_configuracoes')
      .select('id')
      .eq('company_id', companyId)
      .maybeSingle();

    // Preparar dados para salvar
    const nfeConfig = {
      company_id: companyId,
      ambiente: config.ambiente, // Assumindo que config.ambiente já é '1' ou '2' aqui
      versao: String(config.versao),
      modelo_nfe: config.modelo_nfe || '55',
      serie: Number(config.serie) || 1, // Usar Number() para conversão segura
      numero_atual: Number(config.numero_atual) || 1, // Usar Number() para conversão segura
      certificado_arquivo: config.certificado_arquivo,
      certificado_senha: config.certificado_senha,
      // Garantir que seja Date ou null
      certificado_validade: config.certificado_validade instanceof Date 
                              ? config.certificado_validade 
                              : (typeof config.certificado_validade === 'string' && config.certificado_validade.trim() !== '' ? new Date(config.certificado_validade) : null),
      logo_url: config.logo_url,
      updated_at: new Date()
    };

    let result;
    if (existingNfe) {
      // Atualizar configuração existente
      result = await supabase
        .from('nfe_configuracoes')
        .update(nfeConfig)
        .eq('id', existingNfe.id);
    } else {
      // Inserir nova configuração
      result = await supabase
        .from('nfe_configuracoes')
        .insert(nfeConfig as Record<string, any>);
    }

    if (result.error) {
      console.error('Erro ao salvar configuração NF-e:', result.error);
      throw result.error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar configuração NF-e:', error);
    return false;
  }
};

/**
 * Salva as configurações de NFC-e para uma empresa
 * @param companyId ID da empresa
 * @param config Configurações de NFC-e a serem salvas
 * @returns Promise<boolean> Indica se a operação foi bem-sucedida
 */
export const saveNfceConfig = async (companyId: string, config: NfceConfig): Promise<boolean> => {
  try {
    if (!companyId) {
      throw new Error('ID da empresa não fornecido');
    }

    // Verificar se já existe configuração para NFC-e
    const { data: existingNfce } = await supabase
      .from('nfce_configuracoes')
      .select('id')
      .eq('company_id', companyId)
      .maybeSingle();

    // Preparar dados para salvar
    const nfceConfig = {
      company_id: companyId,
      ambiente: config.ambiente, // Assumindo que config.ambiente já é '1' ou '2' aqui
      versao: String(config.versao),
      modelo_nfce: config.modelo_nfce || '65',
      serie: Number(config.serie) || 1, // Usar Number() para conversão segura
      numero_atual: Number(config.numero_atual) || 1, // Usar Number() para conversão segura
      csc_id: config.csc_id,
      csc_token: config.csc_token,
      certificado_arquivo: config.certificado_arquivo,
      certificado_senha: config.certificado_senha,
      // Garantir que seja Date ou null
      certificado_validade: config.certificado_validade instanceof Date 
                              ? config.certificado_validade 
                              : (typeof config.certificado_validade === 'string' && config.certificado_validade.trim() !== '' ? new Date(config.certificado_validade) : null),
      logo_url: config.logo_url,
      updated_at: new Date()
    };

    let result;
    if (existingNfce) {
      // Atualizar configuração existente
      result = await supabase
        .from('nfce_configuracoes')
        .update(nfceConfig)
        .eq('id', existingNfce.id);
    } else {
      // Inserir nova configuração
      result = await supabase
        .from('nfce_configuracoes')
        .insert(nfceConfig as Record<string, any>);
    }

    if (result.error) {
      console.error('Erro ao salvar configuração NFC-e:', result.error);
      throw result.error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar configuração NFC-e:', error);
    return false;
  }
};

/**
 * Carrega as configurações fiscais completas (NF-e e NFC-e) para uma empresa
 * @returns Configurações fiscais ou null se ocorrer um erro
 */
export const loadFiscalConfigs = async (): Promise<FiscalConfig | null> => {
  try {
    // Obter o usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Obter o ID da empresa
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.company_id) {
      throw new Error('Empresa não encontrada');
    }

    // Carregar configurações de NF-e e NFC-e
    const nfeConfig = await loadNfeConfig(profile.company_id) || {};
    const nfceConfig = await loadNfceConfig(profile.company_id) || {};

    // Estrutura de configuração padrão
    // Função auxiliar para formatar data de validade (retorna string YYYY-MM-DD ou '')
    const formatValidityDate = (dateValue: unknown): string => {
      if (!dateValue) return '';

      try {
        // Se já for string em formato ISO (YYYY-MM-DD, retornar como está)
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
          return dateValue.split('T')[0]; // Remover parte do tempo se existir
        }

        // Converter para Data se for string em outro formato ou objeto Date
        const date = new Date(dateValue as string | number | Date);
        if (isNaN(date.getTime())) return ''; // Data inválida

        // Formatar como YYYY-MM-DD
        return date.toISOString().split('T')[0];
      } catch (e) {
        console.error('Erro ao formatar data:', e);
        return '';
      }
    };

    // Estrutura de configuração padrão com tipos corretos e verificações
    const defaultConfig: FiscalConfig = {
      // Dados do certificado digital compartilhado
      certificadoDigital: {
        arquivo: String(nfeConfig?.certificado_arquivo || nfceConfig?.certificado_arquivo || ''),
        senha: String(nfeConfig?.certificado_senha || nfceConfig?.certificado_senha || ''),
        validade: formatValidityDate(nfeConfig?.certificado_validade || nfceConfig?.certificado_validade || '')
      },
      nfe: {
        ativo: !!nfeConfig,
        ambiente: nfeConfig?.ambiente === '1' ? 'producao' : 'homologacao',
        versao: String(nfeConfig?.versao ?? '4.00'),
        modelo: String(nfeConfig?.modelo_nfe ?? '55'),
        serie: String(nfeConfig?.serie ?? '1'),
        numeroAtual: String(nfeConfig?.numero_atual ?? '1'),
        logoUrl: String(nfeConfig?.logo_url ?? '')
      },
      nfce: {
        ativo: !!nfceConfig,
        ambiente: nfceConfig?.ambiente === '1' ? 'producao' : 'homologacao',
        versao: String(nfceConfig?.versao ?? '4.00'),
        modelo: String(nfceConfig?.modelo_nfce ?? '65'),
        serie: String(nfceConfig?.serie ?? '1'),
        numeroAtual: String(nfceConfig?.numero_atual ?? '1'),
        cscId: String(nfceConfig?.csc_id ?? ''),
        cscToken: String(nfceConfig?.csc_token ?? ''),
        logoUrl: String(nfceConfig?.logo_url ?? '')
      }
    };

    return defaultConfig;
  } catch (error) {
    console.error('Erro ao carregar configurações fiscais:', error);
    toast.error('Erro ao carregar configurações fiscais.');
    return null;
  }
};

/**
 * Salva as configurações fiscais completas (NF-e e NFC-e) para uma empresa
 * @param config Configurações fiscais a serem salvas
 * @returns Promise<boolean> Indica se a operação foi bem-sucedida
 */
export const saveFiscalConfigs = async (config: FiscalConfig): Promise<boolean> => {
  try {
    // Obter o usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Obter o ID da empresa
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.company_id) {
      throw new Error('Empresa não encontrada');
    }

    // Preparar configurações NFE (modelo 55) se estiver ativo
    if (config.nfe.ativo) {
      const nfeConfig: NfeConfig = { // Adicionar tipo explícito
        ambiente: config.nfe.ambiente === 'producao' ? '1' : '2',
        versao: String(config.nfe.versao),
        modelo_nfe: '55',
        serie: Number(config.nfe.serie) || 1,
        numero_atual: Number(config.nfe.numeroAtual) || 1,
        // Usar os dados do certificado compartilhado
        certificado_arquivo: config.certificadoDigital?.arquivo || '',
        certificado_senha: config.certificadoDigital?.senha || '',
        // Garantir que seja Date ou null
        certificado_validade: config.certificadoDigital?.validade ? new Date(config.certificadoDigital.validade) : null,
        logo_url: config.nfe.logoUrl
      };
      const success = await saveNfeConfig(profile.company_id, nfeConfig as NfeConfig);
      if (!success) {
        throw new Error('Falha ao salvar configuração NF-e');
      }
    }

    // Preparar configurações NFC-e (modelo 65) se estiver ativo
    if (config.nfce.ativo) {
      const nfceConfig: NfceConfig = { // Adicionar tipo explícito
        ambiente: config.nfce.ambiente === 'producao' ? '1' : '2',
        versao: String(config.nfce.versao),
        modelo_nfce: '65',
        serie: Number(config.nfce.serie) || 1,
        numero_atual: Number(config.nfce.numeroAtual) || 1,
        csc_id: config.nfce.cscId,
        csc_token: config.nfce.cscToken,
        // Usar os dados do certificado compartilhado
        certificado_arquivo: config.certificadoDigital?.arquivo || '',
        certificado_senha: config.certificadoDigital?.senha || '',
         // Garantir que seja Date ou null
        certificado_validade: config.certificadoDigital?.validade ? new Date(config.certificadoDigital.validade) : null,
        logo_url: config.nfce.logoUrl
      };

      const success = await saveNfceConfig(profile.company_id, nfceConfig as NfceConfig);
      if (!success) {
        throw new Error('Falha ao salvar configuração NFC-e');
      }
    }

    toast.success('Configurações fiscais salvas com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao salvar configurações fiscais:', error);
    toast.error('Erro ao salvar configurações fiscais.');
    return false;
  }
};

/**
 * Gera um código numérico aleatório de 8 dígitos para compor a chave de acesso
 * @returns String com um código numérico aleatório de 8 dígitos
 */
export const gerarCodigoNumerico = (): string => {
  // Gera um número aleatório entre 0 e 99999999
  const numero = Math.floor(Math.random() * 100000000);
  // Formata o número para ter sempre 8 dígitos, preenchendo com zeros à esquerda se necessário
  return numero.toString().padStart(8, '0');
};

/**
 * Calcula o dígito verificador da chave de acesso usando o algoritmo módulo 11
 * @param chave String com os 43 primeiros dígitos da chave de acesso (sem o DV)
 * @returns String contendo o dígito verificador calculado
 */
export const calcularDigitoVerificador = (chave: string): string => {
  if (chave.length !== 43) {
    throw new Error('A chave deve ter 43 dígitos para o cálculo do DV');
  }
  
  // Multiplicadores para o módulo 11 (2 a 9, repetindo)
  const multiplicadores = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  let indiceMultiplicador = 0;
  
  // Percorre a chave de trás para frente, multiplicando cada dígito pelo multiplicador correspondente
  for (let i = chave.length - 1; i >= 0; i--) {
    const digito = parseInt(chave[i], 10);
    const multiplicador = multiplicadores[indiceMultiplicador];
    
    soma += digito * multiplicador;
    
    indiceMultiplicador = (indiceMultiplicador + 1) % multiplicadores.length;
  }
  
  // Calcula o resto da divisão da soma por 11
  const resto = soma % 11;
  
  // Se o resto for 0 ou 1, o DV é 0; caso contrário, subtrai o resto de 11
  const dv = (resto === 0 || resto === 1) ? 0 : (11 - resto);
  
  return dv.toString();
};

/**
 * Gera a chave de acesso de NF-e ou NFC-e (44 dígitos) conforme especificação da SEFAZ
 * @param ufCodigo Código da UF do emitente (2 dígitos)
 * @param dataEmissao Data de emissão do documento
 * @param cnpjEmitente CNPJ do emitente (apenas números)
 * @param modelo Modelo do documento fiscal (55=NF-e, 65=NFC-e)
 * @param serie Série do documento fiscal
 * @param numeroNF Número do documento fiscal
 * @param tipoEmissao Tipo de emissão (1=Normal, 2=Contingência, etc)
 * @returns String contendo a chave de acesso completa (44 dígitos)
 */
export const gerarChaveAcesso = (
  ufCodigo: string,
  dataEmissao: Date,
  cnpjEmitente: string,
  modelo: string,
  serie: string,
  numeroNF: string,
  tipoEmissao: string
): string => {
  // Formatar os valores conforme necessário
  const aamm = dataEmissao.toISOString().slice(2, 4) + dataEmissao.toISOString().slice(5, 7);
  const cnpjLimpo = cnpjEmitente.replace(/\D/g, '').padStart(14, '0');
  const serieFormatada = serie.padStart(3, '0').slice(-3);  // Pega os 3 últimos dígitos
  const numeroFormatado = numeroNF.padStart(9, '0').slice(-9);  // Pega os 9 últimos dígitos
  const modeloFormatado = modelo.padStart(2, '0');
  const cNF = gerarCodigoNumerico();
  
  // Criar a chave sem o DV (43 dígitos)
  const chaveBase = 
    ufCodigo.padStart(2, '0') + 
    aamm + 
    cnpjLimpo + 
    modeloFormatado + 
    serieFormatada.slice(-2) +  // Usa apenas 2 últimos dígitos da série
    numeroFormatado.slice(-8) +  // Usa apenas 8 últimos dígitos do número
    tipoEmissao + 
    cNF;
  
  // Calcular o DV e adicionar à chave
  const dv = calcularDigitoVerificador(chaveBase);
  
  return chaveBase + dv;
};

/**
 * Valida uma chave de acesso de NF-e ou NFC-e
 * @param chave String contendo a chave de acesso a ser validada
 * @returns Boolean indicando se a chave é válida
 */
export const validarChaveAcesso = (chave: string): boolean => {
  // Verifica se a chave tem 44 dígitos e contém apenas números
  if (!/^\d{44}$/.test(chave)) {
    return false;
  }
  
  // Extrai o DV da chave (último dígito)
  const dvInformado = chave.substring(43, 44);
  
  // Calcula o DV com base nos 43 primeiros dígitos
  const chaveBase = chave.substring(0, 43);
  const dvCalculado = calcularDigitoVerificador(chaveBase);
  
  // Compara o DV informado com o calculado
  return dvInformado === dvCalculado;
};
