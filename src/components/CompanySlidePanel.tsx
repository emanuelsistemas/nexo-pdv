import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

interface CompanySlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RegimeTributarioItem {
  id: number;
  codigo: string;
  descricao: string;
}

interface CompanyData {
  id?: string;
  segment: string;
  document_type: 'CNPJ' | 'CPF';
  document_number: string;
  legal_name: string;
  trade_name: string;
  whatsapp: string;
  state_registration: string;
  cnae?: string; // CNAE - Classificação Nacional de Atividades Econômicas
  // Campo antigo mantido temporariamente para compatibilidade
  tax_regime?: string;
  // Novo campo que usa o ID da tabela nfe_regime_tributario
  regime_tributario_id: number;
  // Campos de endereço
  address_cep?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_district?: string;
  address_city?: string;
  address_state?: string;
}

const SEGMENTS = [
  'Lanchonete',
  'Pizzaria',
  'Bar',
  'Restaurante',
  'Padaria',
  'Mercado',
  'Atacado',
  'Varejo',
  'Distribuidora',
];

// Array de estados para o dropdown de estado
const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function CompanySlidePanel({ isOpen, onClose }: CompanySlidePanelProps) {
  // Estado para controlar qual aba está ativa
  const [activeTab, setActiveTab] = useState<'dados' | 'endereco'>('dados');
  
  const [formData, setFormData] = useState<CompanyData>({
    segment: '',
    document_type: 'CNPJ',
    document_number: '',
    legal_name: '',
    trade_name: '',
    whatsapp: '',
    state_registration: '',
    cnae: '',
    regime_tributario_id: 1, // Simples Nacional como padrão
  });
  
  // Estado para o regime tributário
  const [regimeOptions, setRegimeOptions] = useState<RegimeTributarioItem[]>([]);
  const [showRegimeDropdown, setShowRegimeDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isIeExempt, setIsIeExempt] = useState(false); // Estado para controlar se é isento de IE
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCompanyData();
      loadRegimes();
    }
  }, [isOpen]);
  
  // Effect para atualizar o estado de isento quando o valor da inscrição estadual mudar
  useEffect(() => {
    // Verifica se o valor da IE é "ISENTO" (insensitive) ou vazio
    setIsIeExempt(formData.state_registration?.toUpperCase() === 'ISENTO');
  }, [formData.state_registration]);
  
  // Função para carregar os regimes tributários do banco de dados
  const loadRegimes = async () => {
    try {
      const { data, error } = await supabase
        .from('nfe_regime_tributario')
        .select('*')
        .order('id');
        
      if (error) {
        throw error;
      }
      
      if (data) {
        // Conversão segura do tipo para RegimeTributarioItem[]
        const regimes = data as unknown as RegimeTributarioItem[];
        setRegimeOptions(regimes);
      }
    } catch (error) {
      console.error('Erro ao carregar regimes tributários:', error);
      toast.error('Erro ao carregar opções de regime tributário');
    }
  };

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, status_cad_empresa')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Erro ao carregar perfil');
      }

      if (profile?.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();

        if (companyError) {
          throw new Error('Erro ao carregar dados da empresa');
        }

        if (company) {
          // Formatar o número do documento ANTES de definir o estado
          // Precisamos passar o tipo de documento da 'company' para formatDocument
          // Adicionar verificação explícita de tipo para garantir que é string
          let docNumToFormat = '';
          if (typeof company.document_number === 'string') {
            docNumToFormat = company.document_number;
          }
          // Adicionar asserção de tipo para company.document_type
          const docType = company.document_type as 'CNPJ' | 'CPF'; 
          const formattedDocumentNumber = formatDocument(docNumToFormat, docType); 
          
          // Certificar-se de que os tipos estão corretos e usar o número formatado
          setFormData({
            ...company,
            document_number: formattedDocumentNumber, // Usar o valor formatado
            regime_tributario_id: company.regime_tributario_id || 1
          } as CompanyData);
          setIsEditing(true);
        }
      } else {
        setFormData({
          segment: '',
          document_type: 'CNPJ',
          document_number: '',
          legal_name: '',
          trade_name: '',
          email: '',
          whatsapp: '',
          state_registration: '',
          regime_tributario_id: 1, // Simples Nacional como padrão
        });
        setIsEditing(false);
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error(error.message || 'Erro ao carregar dados da empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Se estiver mudando o tipo de documento, limpar o campo document_number
    if (name === 'document_type' && value !== formData.document_type) {
      setFormData(prev => ({ 
        ...prev, 
        document_type: value as 'CNPJ' | 'CPF',
        document_number: '' // Limpar o número do documento quando mudar o tipo
      }));
      return;
    }
    
    // Aplicar máscaras conforme o campo
    let formattedValue = value;
    
    switch (name) {
      case 'document_number':
        formattedValue = formatDocument(value);
        break;
      case 'whatsapp':
        formattedValue = formatWhatsApp(value);
        break;
      case 'state_registration':
        formattedValue = formatStateRegistration(value);
        break;
      case 'cnae':
        formattedValue = formatCNAE(value);
        break;
      case 'address_cep':
        formattedValue = formatCEP(value);
        break;
    }
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  // Atualizar formatDocument para aceitar o tipo de documento como parâmetro opcional
  const formatDocument = (value: string, docType?: 'CNPJ' | 'CPF') => {
    // Primeiro limpar todos os caracteres não numéricos para garantir consistencia
    const numbers = value.replace(/\D/g, '');
    const type = docType || formData.document_type; // Usar o tipo passado ou o do estado
    
    if (type === 'CNPJ') { // Usar a variável 'type' aqui
      return numbers
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18);
    } else {
      return numbers
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2')
        .slice(0, 14);
    }
  };

  const formatWhatsApp = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d)(\d{4})$/, '$1-$2')
      .slice(0, 15);
  };
  
  // Função para formatação da Inscrição Estadual
  // Como cada estado tem um formato diferente, esta é uma implementação genérica
  const formatStateRegistration = (value: string) => {
    // Remove caracteres inválidos, deixando apenas números, letras e pontos/traços/barras
    const formattedValue = value.replace(/[^a-zA-Z0-9.\-\/]/g, '');
    return formattedValue;
  };
  
  // Função para formatação do CNAE no formato padrão 0000-0/00
  const formatCNAE = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 4) {
      return numbers;
    } else if (numbers.length <= 5) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4, 5)}/${numbers.slice(5)}`;
    } else {
      return `${numbers.slice(0, 4)}-${numbers.slice(4, 5)}/${numbers.slice(5, 7)}`;
    }
  };
  
  // Formatação para CEP: 00.000-000
  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
      .slice(0, 10);
  };
  
  // Função para buscar CEP via API
  const searchCEP = async () => {
    const cep = formData.address_cep?.replace(/\D/g, '') || '';
    
    if (cep.length !== 8) {
      toast.error('CEP inválido. Informe os 8 dígitos do CEP.');
      return;
    }
    
    try {
      setCepLoading(true);
      
      // Buscar CEP na API ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado. Verifique o número informado.');
        return;
      }
      
      // Atualizar os campos de endereço com os dados retornados
      setFormData(prev => ({
        ...prev,
        address_street: data.logradouro || prev.address_street,
        address_district: data.bairro || prev.address_district,
        address_city: data.localidade || prev.address_city,
        address_state: data.uf || prev.address_state
      }));
      
      toast.success('Endereço carregado com sucesso!');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP. Tente novamente.');
    } finally {
      setCepLoading(false);
    }
  };

  const searchCompany = async () => {
    try {
      setSearchLoading(true);
      toast.info('Buscando dados da empresa...');
      // Simula um delay para demonstrar o loading
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.info('Busca de CNPJ não implementada');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação manual de todos os campos obrigatórios
    if (!formData.segment) {
      toast.error('Por favor, selecione um segmento.');
      return;
    }
    if (!formData.document_number) {
      toast.error(`Por favor, informe o ${formData.document_type}.`);
      return;
    }
    if (!formData.legal_name) {
      toast.error('Por favor, informe a Razão Social.');
      return;
    }
    if (!formData.trade_name) {
      toast.error('Por favor, informe o Nome Fantasia.');
      return;
    }
    if (!formData.whatsapp) {
      toast.error('Por favor, informe o WhatsApp.');
      return;
    }
    if (!formData.state_registration) {
      toast.error('Por favor, informe a Inscrição Estadual.');
      return;
    }

    try {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar se já existe uma empresa com o mesmo número de documento
      if (!isEditing) {
        const { data: existingCompany, error: checkError } = await supabase
          .from('companies')
          .select('id')
          .eq('document_number', formData.document_number)
          .maybeSingle();

        if (checkError) {
          console.error('Erro ao verificar documento:', checkError);
        }

        if (existingCompany) {
          throw new Error(`Este ${formData.document_type} já está cadastrado no sistema. Por favor, utilize outro documento ou entre em contato com o suporte.`);
        }
      }

      if (isEditing && formData.id) {
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            segment: formData.segment,
            document_type: formData.document_type,
            document_number: formData.document_number,
            legal_name: formData.legal_name,
            trade_name: formData.trade_name,
            whatsapp: formData.whatsapp,
            state_registration: formData.state_registration,
            cnae: formData.cnae || null, // Campo opcional
            regime_tributario_id: formData.regime_tributario_id,
            // Dados de endereço
            address_cep: formData.address_cep || null,
            address_street: formData.address_street || null,
            address_number: formData.address_number || null,
            address_complement: formData.address_complement || null,
            address_district: formData.address_district || null,
            address_city: formData.address_city || null,
            address_state: formData.address_state || null
          })
          .eq('id', formData.id);

        if (updateError) {
          throw new Error('Erro ao atualizar empresa: ' + updateError.message);
        }

        toast.success('Empresa atualizada com sucesso!');
      } else {
        // Criar objeto com tipagem correta para inserção no banco
        const companyInsertData = {
          segment: formData.segment,
          document_type: formData.document_type,
          document_number: formData.document_number,
          legal_name: formData.legal_name,
          trade_name: formData.trade_name,
          whatsapp: formData.whatsapp,
          state_registration: formData.state_registration,
          cnae: formData.cnae || null, // Campo opcional
          regime_tributario_id: formData.regime_tributario_id,
          // Dados de endereço
          address_cep: formData.address_cep || null,
          address_street: formData.address_street || null,
          address_number: formData.address_number || null,
          address_complement: formData.address_complement || null,
          address_district: formData.address_district || null,
          address_city: formData.address_city || null,
          address_state: formData.address_state || null
        };
        
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert(companyInsertData)
          .select('*')
          .single();

        if (companyError || !company) {
          throw new Error('Erro ao criar empresa: ' + (companyError?.message || 'Dados não retornados'));
        }

        console.log('Empresa criada com sucesso:', company);
        
        // Vincular empresa ao perfil do usuário
        console.log('Tentando atualizar o perfil do usuário com company_id:', company.id);
        console.log('User ID:', user.id);
        
        const { data: profileUpdateData, error: profileError } = await supabase
          .from('profiles')
          .update({
            company_id: company.id,
            status_cad_empresa: 'S'
          })
          .eq('id', user.id)
          .select();
          
        console.log('Resultado da atualização do perfil:', profileUpdateData);

        if (profileError) {
          console.error('Erro ao atualizar perfil:', profileError);
          
          // Tenta excluir a empresa se não conseguir vincular ao perfil
          if (company && company.id) {
            await supabase
              .from('companies')
              .delete()
              .eq('id', company.id);
          }

          throw new Error('Erro ao vincular empresa ao perfil: ' + profileError.message);
        }
        
        // Verificação adicional para garantir que o perfil foi atualizado
        const { data: checkProfile } = await supabase
          .from('profiles')
          .select('company_id, status_cad_empresa')
          .eq('id', user.id)
          .single();
          
        console.log('Verificação do perfil após atualização:', checkProfile);
        
        if (checkProfile?.company_id !== company.id || checkProfile?.status_cad_empresa !== 'S') {
          console.error('Perfil não atualizado corretamente:', checkProfile);
          toast.warning('Empresa criada, mas pode haver um problema com o registro. Por favor, verifique e tente novamente se necessário.');
        }

        // Obter unidades de medida do sistema
        const { data: systemUnits, error: systemUnitsError } = await supabase
          .from('system_units')
          .select('*');

        if (systemUnitsError) {
          throw new Error('Erro ao obter unidades de medida do sistema: ' + systemUnitsError.message);
        }

        // Criar unidades de medida para a empresa baseadas nas unidades do sistema
        if (systemUnits && systemUnits.length > 0) {
          const companyUnits = systemUnits.map(unit => ({
            company_id: company.id,
            code: unit.code,
            name: unit.name,
            description: unit.description
          }));

          const { error: unitsError } = await supabase
            .from('product_units')
            .insert(companyUnits);

          if (unitsError) {
            console.error('Erro ao criar unidades de medida:', unitsError);
            // Vamos analisar o erro para mostrar mensagens mais específicas
            if (unitsError.code === '23505') { // código para violação de chave única/duplicada
              console.log('Unidades já existem - ignorando erro');
              // Não mostramos aviso, pois isso é normal se as unidades já existirem
            } else {
              // Para outros erros, mostramos a mensagem de aviso
              toast.warning('Empresa criada, mas houve um erro ao configurar unidades de medida');
            }
          }
        }

        // Criar grupo padrão "Diversos" para a empresa
        const { error: groupError } = await supabase
          .from('product_groups')
          .insert({
            company_id: company.id,
            name: 'Diversos',
            description: 'Grupo padrão para itens diversos'
          });

        if (groupError) {
          console.error('Erro ao criar grupo padrão:', groupError);
          
          // Verificar se o erro é de chave duplicada (grupo já existe)
          if (groupError.code === '23505') {
            console.log('Grupo já existe - ignorando erro');
            // Não mostramos aviso, pois isso é normal se o grupo já existir
          } else {
            // Para outros erros, mostramos a mensagem de aviso
            toast.warning('Empresa criada, mas houve um erro ao configurar o grupo padrão');
          }
        }

        // Atualize o estado local para evitar o bloqueio do painel
        setIsEditing(true);
        
        // Atualize a página para que o Dashboard atualize o companyRegistrationStatus
        toast.success('Empresa cadastrada com sucesso!');
        setTimeout(() => {
          window.location.reload();
        }, 1500); // Espere um momento para o toast ser visto
      }
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast.error(error.message || 'Erro ao processar empresa');
    } finally {
      setLoading(false);
    }
  };

  const panelClasses = `fixed right-0 top-0 h-full w-full md:w-[600px] bg-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  }`;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40"
          onClick={onClose}
        />
      )}

      <div className={`${panelClasses} z-50`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-200">
              {isEditing ? 'Editar Empresa' : 'Configuração da Empresa'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Abas */}
          <div className="flex border-b border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('dados')}
              className={`flex-1 py-3 px-4 ${activeTab === 'dados' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'}`}
            >
              Dados da Empresa
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('endereco')}
              className={`flex-1 py-3 px-4 ${activeTab === 'endereco' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'}`}
            >
              Endereço
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form id="companyForm" onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'dados' && (
              <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Segmento *
                </label>
                <select
                  name="segment"
                  value={formData.segment}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione um segmento</option>
                  {/* Adicionar o segmento atual como opção se não estiver na lista padrão */}
                  {formData.segment && !SEGMENTS.includes(formData.segment) && (
                    <option key={formData.segment} value={formData.segment}>{formData.segment}</option>
                  )}
                  {SEGMENTS.map(segment => (
                    <option key={segment} value={segment}>{segment}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Tipo de Documento *
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: "document_type", value: "CNPJ" } } as React.ChangeEvent<HTMLInputElement>)}
                    className={`flex-1 px-4 py-2 rounded-lg border border-slate-600 transition-colors ${formData.document_type === 'CNPJ' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                  >
                    CNPJ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: "document_type", value: "CPF" } } as React.ChangeEvent<HTMLInputElement>)}
                    className={`flex-1 px-4 py-2 rounded-lg border border-slate-600 transition-colors ${formData.document_type === 'CPF' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                  >
                    CPF
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {formData.document_type} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="document_number"
                    value={formData.document_number}
                    onChange={handleChange}
                    maxLength={formData.document_type === 'CNPJ' ? 18 : 14}
                    placeholder={formData.document_type === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  {formData.document_type === 'CNPJ' && (
                    <button
                      type="button"
                      onClick={searchCompany}
                      disabled={searchLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                    >
                      {searchLoading ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <Search size={20} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Razão Social *
                </label>
                <input
                  type="text"
                  name="legal_name"
                  value={formData.legal_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nome Fantasia *
                </label>
                <input
                  type="text"
                  name="trade_name"
                  value={formData.trade_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>



              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  WhatsApp *
                </label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="(00) 0 0000-0000"
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-300">
                    Inscrição Estadual *
                  </label>
                  <div className="flex items-center">
                    <span className="text-sm text-slate-400 mr-2">Isento</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newIsExempt = !isIeExempt;
                        setIsIeExempt(newIsExempt);
                        // Se marcar como isento, atualiza o campo para "ISENTO"
                        // Se desmarcar, limpa o campo
                        setFormData(prev => ({
                          ...prev,
                          state_registration: newIsExempt ? 'ISENTO' : ''
                        }));
                      }}
                      className={`w-12 h-6 rounded-full focus:outline-none transition-colors duration-200 ease-in-out ${isIeExempt ? 'bg-green-500' : 'bg-slate-600'}`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${isIeExempt ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                </div>
                
                {!isIeExempt ? (
                  <input
                    type="text"
                    name="state_registration"
                    value={formData.state_registration}
                    onChange={handleChange}
                    placeholder="Formato varia conforme o estado"
                    maxLength={18} // Tamanho máximo para cobrir a maior IE
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                ) : (
                  <div className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-between">
                    <span>ISENTO</span>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Contribuinte isento de IE</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  CNAE - Classificação Nacional de Atividades Econômicas
                </label>
                <input
                  type="text"
                  name="cnae"
                  value={formData.cnae}
                  onChange={handleChange}
                  placeholder="Ex: 5611-2/01"
                  maxLength={9} // Tamanho exato do CNAE formatado
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Regime Tributário *
                </label>
                <div className="relative">
                  <div
                    onClick={() => setShowRegimeDropdown(!showRegimeDropdown)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between cursor-pointer"
                  >
                    <span>
                      {regimeOptions.find(r => r.id === formData.regime_tributario_id)?.descricao || 'Selecione...'}
                    </span>
                    {showRegimeDropdown ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                  
                  {showRegimeDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {regimeOptions.map(regime => (
                        <div
                          key={regime.id}
                          className={`px-4 py-2 cursor-pointer hover:bg-slate-700 ${formData.regime_tributario_id === regime.id ? 'bg-blue-500/20' : ''}`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, regime_tributario_id: regime.id }));
                            setShowRegimeDropdown(false);
                          }}
                        >
                          <div className="text-slate-200">{regime.descricao}</div>
                          <div className="text-xs text-slate-400">Código: {regime.codigo}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </div>
              )}

              {/* Conteúdo da aba Endereço */}
              {activeTab === 'endereco' && (
                <div className="space-y-6">
                  {/* CEP */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      CEP *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="address_cep"
                        value={formData.address_cep || ''}
                        onChange={handleChange}
                        placeholder="00.000-000"
                        maxLength={10}
                        className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={searchCEP}
                        disabled={cepLoading}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 disabled:opacity-50"
                      >
                        {cepLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Endereço *
                    </label>
                    <input
                      type="text"
                      name="address_street"
                      value={formData.address_street || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Número */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Número *
                    </label>
                    <input
                      type="text"
                      name="address_number"
                      value={formData.address_number || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Complemento */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      name="address_complement"
                      value={formData.address_complement || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Bairro */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Bairro *
                    </label>
                    <input
                      type="text"
                      name="address_district"
                      value={formData.address_district || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Cidade */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      name="address_city"
                      value={formData.address_city || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Estado *
                    </label>
                    <select
                      name="address_state"
                      value={formData.address_state || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Selecione um estado</option>
                      {STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="p-6 border-t border-slate-700">
            <button
              type="submit"
              form="companyForm"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2.5 px-4 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>{isEditing ? 'Atualizando...' : 'Salvando...'}</span>
                </>
              ) : (
                <span>{isEditing ? 'Atualizar' : 'Salvar'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
