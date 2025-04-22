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
export const loadNfeConfig = async (companyId: string) => {
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
export const loadNfceConfig = async (companyId: string) => {
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
}

/**
 * Interface para configurações fiscais completas
 */
export interface FiscalConfig {
  nfe: {
    ativo: boolean;
    ambiente: 'producao' | 'homologacao';
    versao: string;
    modelo: string;
    serie: string;
    numeroAtual: string;
    certificadoArquivo: string;
    certificadoSenha: string;
    certificadoValidade: string;
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
    certificadoArquivo: string;
    certificadoSenha: string;
    certificadoValidade: string;
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
      ambiente: config.ambiente,
      versao: config.versao,
      modelo_nfe: config.modelo_nfe || '55',
      serie: parseInt(config.serie, 10) || 1,
      numero_atual: parseInt(config.numero_atual, 10) || 1,
      certificado_arquivo: config.certificado_arquivo,
      certificado_senha: config.certificado_senha,
      certificado_validade: config.certificado_validade,
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
        .insert(nfeConfig);
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
      ambiente: config.ambiente,
      versao: config.versao,
      modelo_nfce: config.modelo_nfce || '65',
      serie: parseInt(config.serie, 10) || 1,
      numero_atual: parseInt(config.numero_atual, 10) || 1,
      csc_id: config.csc_id,
      csc_token: config.csc_token,
      certificado_arquivo: config.certificado_arquivo,
      certificado_senha: config.certificado_senha,
      certificado_validade: config.certificado_validade,
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
        .insert(nfceConfig);
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
    const nfeConfig = await loadNfeConfig(profile.company_id);
    const nfceConfig = await loadNfceConfig(profile.company_id);

    // Estrutura de configuração padrão
    const defaultConfig = {
      nfe: {
        ativo: !!nfeConfig,
        ambiente: nfeConfig?.ambiente === '1' ? 'producao' : 'homologacao',
        versao: nfeConfig?.versao || '4.00',
        modelo: nfeConfig?.modelo_nfe || '55',
        serie: String(nfeConfig?.serie) || '1',
        numeroAtual: String(nfeConfig?.numero_atual) || '1',
        certificadoArquivo: nfeConfig?.certificado_arquivo || '',
        certificadoSenha: nfeConfig?.certificado_senha || '',
        certificadoValidade: nfeConfig?.certificado_validade 
          ? new Date(nfeConfig.certificado_validade).toISOString().split('T')[0] 
          : '',
        logoUrl: nfeConfig?.logo_url || ''
      },
      nfce: {
        ativo: !!nfceConfig,
        ambiente: nfceConfig?.ambiente === '1' ? 'producao' : 'homologacao',
        versao: nfceConfig?.versao || '4.00',
        modelo: nfceConfig?.modelo_nfce || '65',
        serie: String(nfceConfig?.serie) || '1',
        numeroAtual: String(nfceConfig?.numero_atual) || '1',
        cscId: nfceConfig?.csc_id || '',
        cscToken: nfceConfig?.csc_token || '',
        certificadoArquivo: nfceConfig?.certificado_arquivo || '',
        certificadoSenha: nfceConfig?.certificado_senha || '',
        certificadoValidade: nfceConfig?.certificado_validade 
          ? new Date(nfceConfig.certificado_validade).toISOString().split('T')[0] 
          : '',
        logoUrl: nfceConfig?.logo_url || ''
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
      const nfeConfig = {
        ambiente: config.nfe.ambiente === 'producao' ? '1' : '2',
        versao: config.nfe.versao,
        modelo_nfe: '55',
        serie: parseInt(config.nfe.serie, 10) || 1,
        numero_atual: parseInt(config.nfe.numeroAtual, 10) || 1,
        certificado_arquivo: config.nfe.certificadoArquivo,
        certificado_senha: config.nfe.certificadoSenha,
        certificado_validade: config.nfe.certificadoValidade || null,
        logo_url: config.nfe.logoUrl
      };

      const success = await saveNfeConfig(profile.company_id, nfeConfig);
      if (!success) {
        throw new Error('Falha ao salvar configuração NF-e');
      }
    }

    // Preparar configurações NFC-e (modelo 65) se estiver ativo
    if (config.nfce.ativo) {
      const nfceConfig = {
        ambiente: config.nfce.ambiente === 'producao' ? '1' : '2',
        versao: config.nfce.versao,
        modelo_nfce: '65',
        serie: parseInt(config.nfce.serie, 10) || 1,
        numero_atual: parseInt(config.nfce.numeroAtual, 10) || 1,
        csc_id: config.nfce.cscId,
        csc_token: config.nfce.cscToken,
        certificado_arquivo: config.nfce.certificadoArquivo,
        certificado_senha: config.nfce.certificadoSenha,
        certificado_validade: config.nfce.certificadoValidade || null,
        logo_url: config.nfce.logoUrl
      };

      const success = await saveNfceConfig(profile.company_id, nfceConfig);
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
