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
  email: string;
  whatsapp: string;
  state_registration: string;
  // Campo antigo mantido temporariamente para compatibilidade
  tax_regime?: string;
  // Novo campo que usa o ID da tabela nfe_regime_tributario
  regime_tributario_id: number;
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

export function CompanySlidePanel({ isOpen, onClose }: CompanySlidePanelProps) {
  const [formData, setFormData] = useState<CompanyData>({
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
  
  // Estado para o regime tributário
  const [regimeOptions, setRegimeOptions] = useState<RegimeTributarioItem[]>([]);
  const [showRegimeDropdown, setShowRegimeDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCompanyData();
      loadRegimes();
    }
  }, [isOpen]);
  
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
          // Certificar-se de que os tipos estão corretos
          setFormData({
            ...company,
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
    }
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const formatDocument = (value: string) => {
    // Primeiro limpar todos os caracteres não numéricos para garantir consistencia
    const numbers = value.replace(/\D/g, '');
    
    if (formData.document_type === 'CNPJ') {
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
    if (!formData.email) {
      toast.error('Por favor, informe o Email.');
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
            email: formData.email,
            whatsapp: formData.whatsapp,
            state_registration: formData.state_registration,
            regime_tributario_id: formData.regime_tributario_id
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
          email: formData.email,
          whatsapp: formData.whatsapp,
          state_registration: formData.state_registration,
          regime_tributario_id: formData.regime_tributario_id
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

          <div className="flex-1 overflow-y-auto p-6">
            <form id="companyForm" onSubmit={handleSubmit} className="space-y-6">
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
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
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
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Inscrição Estadual *
                </label>
                <input
                  type="text"
                  name="state_registration"
                  value={formData.state_registration}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
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