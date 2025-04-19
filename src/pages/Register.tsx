import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, UserPlus, CheckCircle, ArrowLeft, ArrowRight, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import ResellerSearchModal from '../components/ResellerSearchModal';
import InputMask from 'react-input-mask';

// Lista de segmentos disponíveis
const SEGMENTS = [
  'Açougue',
  'Adega',
  'Bar',
  'Cafeteria',
  'Casa de Carnes',
  'Distribuidora',
  'Doceria',
  'Farmácia',
  'Hortifruti',
  'Lanchonete',
  'Livraria',
  'Loja de Conveniência',
  'Loja de Roupas',
  'Mercearia',
  'Padaria',
  'Papelaria',
  'Petshop',
  'Pizzaria',
  'Quitanda',
  'Restaurante',
  'Sorveteria',
  'Supermercado',
  'Varejo em Geral'
];

// Lista de regimes tributários
const TAX_REGIMES = [
  'Simples Nacional',
  'Normal'
];

// Lista de estados brasileiros
const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function Register() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchSegment, setSearchSegment] = useState('');
  const [showSegmentDropdown, setShowSegmentDropdown] = useState(false);
  const [searchingCNPJ, setSearchingCNPJ] = useState(false);

  // Referência para o dropdown de segmento
  const segmentDropdownRef = useRef<HTMLDivElement>(null);

  // Form data state
  const [formData, setFormData] = useState({
    // Step 1 - User data
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2 - Company basic info
    resellerId: '',
    resellerCode: '',
    resellerName: '',
    segment: '',
    documentType: 'CNPJ',
    documentNumber: '',
    legalName: '',
    tradeName: '',
    taxRegime: '',
    whatsapp: '',
    
    // Step 3 - Address
    cep: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: ''
  });
  
  // Estado do modal de busca de revendedor
  const [showResellerModal, setShowResellerModal] = useState(false);

  // Filtered segments based on search
  const filteredSegments = SEGMENTS.filter(segment =>
    segment.toLowerCase().includes(searchSegment.toLowerCase())
  );

  const isValidCNPJ = (cnpj: string) => {
    cnpj = cnpj.replace(/[^\d]/g, '');
    
    if (cnpj.length !== 14) return false;
    
    // Check if all digits are the same
    if (/^(\d)\1+$/.test(cnpj)) return false;
    
    // Validate check digits
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    const digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;
    
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    
    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;
    
    return true;
  };

  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (formData.documentType === 'CNPJ') {
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

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
      .slice(0, 10);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    
    // Apply masks based on field
    switch (name) {
      case 'documentNumber':
        formattedValue = formatDocument(value);
        break;
      case 'cep':
        formattedValue = formatCEP(value);
        break;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  // Função para selecionar um segmento
  const handleSegmentSelect = (segment: string) => {
    setFormData(prev => ({ ...prev, segment }));
    setShowSegmentDropdown(false);
    setSearchSegment('');
  };
  
  // Detectar clique fora do dropdown para fechá-lo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (segmentDropdownRef.current && !segmentDropdownRef.current.contains(event.target as Node)) {
        setShowSegmentDropdown(false);
      }
    };

    // Adicionar listener quando o dropdown estiver aberto
    if (showSegmentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Limpar listener quando o componente for desmontado ou o dropdown for fechado
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSegmentDropdown]);

  const searchCNPJ = async () => {
    try {
      const cnpj = formData.documentNumber.replace(/[^\d]/g, '');
      
      if (!isValidCNPJ(cnpj)) {
        toast.error('CNPJ inválido. Verifique os números digitados.');
        return;
      }

      setSearchingCNPJ(true);
      
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('CNPJ não encontrado na base de dados.');
        } else {
          toast.error('Erro ao consultar CNPJ. Tente novamente mais tarde.');
        }
        return;
      }
      
      const data = await response.json();
      console.log('Dados do CNPJ:', data); // Log para debug

      // Formatar o CEP antes de atualizar o estado
      const formattedCep = data.cep 
        ? data.cep.replace(/[^\d]/g, '').replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2-$3')
        : '';

      // Determinar o regime tributário com base nos dados da API
      let taxRegime = 'Normal';
      // Verifica se o campo simples_nacional existe e é true (pode vir como booleano ou string)
      if (data.opcao_pelo_simples === true || data.opcao_pelo_simples === 'true' || 
          data.opcao_pelo_simples === 'Sim' || data.opcao_pelo_simples === 'S' ||
          data.simples_nacional === true || data.simples_nacional === 'true' || 
          data.simples_nacional === 'Sim' || data.simples_nacional === 'S') {
        taxRegime = 'Simples Nacional';
      }
      
      // Atualizar o estado com os dados formatados
      setFormData(prev => ({
        ...prev,
        legalName: data.razao_social || '',
        tradeName: data.nome_fantasia || '',
        taxRegime: taxRegime,
        cep: formattedCep,
        street: data.logradouro || '',
        number: data.numero || '',
        complement: data.complemento || '',
        district: data.bairro || '',
        city: data.municipio || '',
        state: data.uf || ''
      }));

      // Não precisamos buscar o CEP novamente, pois já temos os dados do endereço da API do CNPJ
      // Comentado para evitar o erro de "CEP inválido"
      // if (formattedCep) {
      //   setTimeout(async () => {
      //     await searchCEP();
      //   }, 500);
      // }

      toast.success('Dados da empresa carregados com sucesso!');
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      toast.error('Erro ao processar a consulta. Verifique sua conexão e tente novamente.');
    } finally {
      setSearchingCNPJ(false);
    }
  };

  const searchCEP = async () => {
    // Remove caracteres não numéricos do CEP
    const cep = formData.cep.replace(/\D/g, '');
    
    // Valida o comprimento do CEP
    if (cep.length !== 8) {
      toast.warning('Digite um CEP válido com 8 dígitos');
      return;
    }

    try {
      // Mostra um toast informativo de que a busca está em andamento
      toast.info('Buscando endereço...', { autoClose: 2000 });
      
      // Faz a requisição para a API ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      // Verifica se a API retornou erro
      if (data.erro) {
        toast.error('CEP não encontrado na base de dados');
        return;
      }

      // Atualiza os campos do formulário com os dados retornados
      setFormData(prev => ({
        ...prev,
        street: data.logradouro || prev.street,
        district: data.bairro || prev.district,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      
      toast.success('Endereço encontrado com sucesso!');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar endereço. Verifique sua conexão e tente novamente.');
    }
  };
  
  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validar step 1 - Dados do usuário
      if (formData.password !== formData.confirmPassword) {
        toast.error("As senhas não conferem");
        return;
      }
      
      if (formData.password.length < 6) {
        toast.error("A senha deve ter no mínimo 6 caracteres");
        return;
      }
      
      setCurrentStep(2);
      return;
    } else if (currentStep === 2) {
    // Validar step 2 - Dados da empresa
    if (!formData.segment) {
      toast.error("Selecione um segmento");
      return;
    }
    
    if (!formData.documentType) {
      toast.error("Selecione um tipo de documento");
      return;
    }
    
    if (!formData.documentNumber) {
      toast.error("Digite o número do documento");
      return;
    }
    
    if (formData.documentType === 'CNPJ' && !formData.legalName) {
      toast.error("Digite a razão social");
      return;
    }
    
    if (!formData.tradeName) {
      toast.error("Digite o nome fantasia");
      return;
    }
    
    if (!formData.taxRegime) {
      toast.error("Selecione um regime tributário");
      return;
    }
    
    setCurrentStep(3);
    return;
  }
};

// Função para lidar com o registro final/submissão do formulário
const handleRegister = async () => {
  try {
    setLoading(true);
    
    // Validar dados de endereço (Step 3)
    if (!formData.cep || !formData.street || !formData.number || !formData.district || !formData.city || !formData.state) {
      toast.error("Preencha todos os dados de endereço");
      setLoading(false);
      return;
    }
    
    // Buscar o ID UUID do revendedor padrão "Sem Revenda" (código 58105) se nenhum revendedor foi selecionado
    let resellerIdToUse = null;
    
    if (!formData.resellerId || formData.resellerId.trim() === '') {
      // Buscar o ID UUID do revendedor com código 58105
      const { data: resellerData, error: resellerError } = await supabase
        .from('resellers')
        .select('id')
        .eq('code', '58105')
        .single();
      
      if (!resellerError && resellerData?.id) {
        resellerIdToUse = resellerData.id;
        console.log('Usando revendedor padrão:', resellerIdToUse);
      } else {
        // Se não encontrar o revendedor padrão, mostrar erro e interromper o processo
        console.error('Revendedor padrão não encontrado:', resellerError);
        toast.error('Não foi possível encontrar o revendedor padrão. Por favor, selecione um revendedor.');
        setLoading(false);
        return;
      }
    } else {
      // Usar o revendedor selecionado pelo usuário
      resellerIdToUse = formData.resellerId;
    }
    
    // Primeiro criar o usuário para obter o ID
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.name
        },
        emailRedirectTo: window.location.origin
      }
    });

    if (authError || !authData?.user) {
      console.error('Erro ao criar usuário:', authError);
      toast.error('Erro ao criar usuário: ' + (authError?.message || 'Desconhecido'));
      setLoading(false);
      return;
    }

    // Criar a empresa
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        trade_name: formData.tradeName,
        document_type: formData.documentType, // Adicionar o tipo de documento (CNPJ/CPF)
        document_number: formData.documentNumber.replace(/[^\d]/g, ''),
        segment: formData.segment,
        tax_regime: formData.taxRegime,
        whatsapp: formData.whatsapp,
        address_cep: formData.cep.replace(/[^\d]/g, ''),
        address_street: formData.street,
        address_number: formData.number,
        address_complement: formData.complement || '',
        address_district: formData.district,
        address_city: formData.city,
        address_state: formData.state,
        legal_name: formData.legalName,
        // Removendo completamente o campo reseller_id para evitar problemas de chave estrangeira
        status: 'active',
        created_by: authData.user.id // Agora temos essa coluna no banco de dados
      })
      .select()
      .single();
    
    if (companyError) {
      console.error('Erro ao criar empresa:', companyError);
      toast.error('Erro ao criar empresa: ' + companyError.message);
      setLoading(false);
      return;
    }
    
    // Atualizar os dados do usuário com o ID da empresa
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      data: {
        company_id: companyData.id
      }
    });

    if (updateError) {
      console.error('Erro ao atualizar usuário:', updateError);
      toast.error('Erro ao atualizar dados do usuário: ' + updateError.message);
      setLoading(false);
      return;
    }
    
    // Se um revendedor foi selecionado, vincula a empresa a ele
    if (formData.resellerId && formData.resellerId.trim() !== '') {
      try {
        console.log('Tentando vincular empresa ao revendedor:', formData.resellerId);
        
        // Atualizar a empresa para adicionar o revendedor
        const { error: resellerLinkError } = await supabase
          .from('companies')
          .update({ reseller_id: formData.resellerId })
          .eq('id', companyData.id);
        
        if (resellerLinkError) {
          console.error('Erro ao vincular empresa ao revendedor:', resellerLinkError);
          // Não interrompe o fluxo, apenas registra o erro
          toast.warning('A empresa foi criada, mas não foi possível vinculá-la ao revendedor selecionado.');
        } else {
          console.log('Empresa vinculada ao revendedor com sucesso!');
        }
      } catch (error) {
        console.error('Erro inesperado ao vincular revendedor:', error);
        // Não interrompe o fluxo, apenas registra o erro
      }
    }
    
    // Registro concluído com sucesso!
    toast.success('Registro realizado com sucesso! Verifique seu e-mail para ativar a conta.');
    
    // Redirecionar para página de login após alguns segundos
    setTimeout(() => {
      navigate('/login');
    }, 3000);
    
  } catch (error: any) {
    console.error('Erro inesperado:', error);
    toast.error('Ocorreu um erro inesperado: ' + error.message);
  } finally {
    setLoading(false);
  }
};

const renderStep = () => {
  switch (currentStep) {
    case 1:
      return (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nome completo
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Seu nome"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="seu@email.com"
              required
            />
          </div>
          
          {/* Campo de senha */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="******"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Campo de confirmar senha */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Confirmar senha
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="******"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(prev => !prev)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        </div>
      );
    case 2:
      return (
        <div className="space-y-6">
          {/* Revendedor com busca por código */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Revendedor
            </label>
            <div className="flex">
              <button
                type="button"
                onClick={() => setShowResellerModal(true)}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white flex items-center justify-between hover:bg-slate-700 transition-colors"
              >
                {formData.resellerName ? (
                  <>
                    <span>{formData.resellerName}</span>
                    <span className="text-emerald-400 text-sm">{formData.resellerCode}</span>
                  </>
                ) : (
                  <span className="text-center w-full">Selecionar Revendedor</span>
                )}
              </button>
            </div>
          </div>
          
          {/* Segmento */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Segmento
            </label>
            <div className="relative" ref={segmentDropdownRef}>
              <button
                type="button"
                onClick={() => setShowSegmentDropdown(prev => !prev)}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white flex items-center justify-between hover:bg-slate-700 transition-colors"
              >
                <span>{formData.segment || 'Selecione o segmento'}</span>
                {showSegmentDropdown ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {showSegmentDropdown && (
                <div className="absolute w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                  <div className="p-2">
                    <input
                      type="text"
                      value={searchSegment}
                      onChange={(e) => setSearchSegment(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                      placeholder="Buscar segmento..."
                    />
                  </div>
                  <div className="py-1">
                    {filteredSegments.length > 0 ? (
                      filteredSegments.map(segment => (
                        <button
                          key={segment}
                          type="button"
                          onClick={() => handleSegmentSelect(segment)}
                          className="w-full text-left px-4 py-2 text-white hover:bg-slate-700 transition-colors"
                        >
                          {segment}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-slate-400 text-sm">Nenhum segmento encontrado</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Tipo de documento */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Tipo de Documento
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleChange({ target: { name: "documentType", value: "CNPJ" } } as React.ChangeEvent<HTMLInputElement>)}
                className={`flex-1 px-4 py-2 rounded-lg border border-slate-600 transition-colors ${formData.documentType === 'CNPJ' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                CNPJ
              </button>
              <button
                type="button"
                onClick={() => handleChange({ target: { name: "documentType", value: "CPF" } } as React.ChangeEvent<HTMLInputElement>)}
                className={`flex-1 px-4 py-2 rounded-lg border border-slate-600 transition-colors ${formData.documentType === 'CPF' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                CPF
              </button>
            </div>
          </div>

            {/* Número do Documento */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {formData.documentType}
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="documentNumber"
                  value={formData.documentNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder={formData.documentType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                  required
                />
                {formData.documentType === 'CNPJ' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault(); // Impede que o formulário seja submetido
                      e.stopPropagation(); // Impede propagação do evento
                      searchCNPJ();
                    }}
                    disabled={searchingCNPJ || !formData.documentNumber}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
                  >
                    {searchingCNPJ ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Search size={20} />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Razão Social */}
            {formData.documentType === 'CNPJ' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Razão Social
                </label>
                <input
                  type="text"
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                />
              </div>
            )}

            {/* Nome Fantasia */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Nome Fantasia
              </label>
              <input
                type="text"
                name="tradeName"
                value={formData.tradeName}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            {/* Regime Tributário */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Regime Tributário
              </label>
              <select
                name="taxRegime"
                value={formData.taxRegime}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              >
                <option value="">Selecione um regime tributário</option>
                {TAX_REGIMES.map(regime => (
                  <option key={regime} value={regime}>{regime}</option>
                ))}
              </select>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                WhatsApp
              </label>
              <InputMask
                mask="(99) 99999-9999"
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="(00) 00000-0000"
                required
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* CEP */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                CEP
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="cep"
                  value={formData.cep}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="00.000-000"
                  required
                />
                <button
                  type="button"
                  onClick={searchCEP}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <Search size={20} />
                </button>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Endereço
              </label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            {/* Número */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Número
              </label>
              <input
                type="text"
                name="number"
                value={formData.number}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
                name="complement"
                value={formData.complement}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Bairro */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Bairro
              </label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            {/* Cidade */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Cidade
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Estado
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              >
                <option value="">Selecione um estado</option>
                {STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md space-y-8 auth-form p-8 rounded-xl">
        <div className="text-center">
          <Logo />
          <p className="text-slate-400 mt-3">Crie sua conta</p>
        </div>

        {/* Modal de busca de revendedor */}
        <ResellerSearchModal 
          isOpen={showResellerModal}
          onClose={() => setShowResellerModal(false)}
          onSelect={(resellerId, resellerName, resellerCode) => {
            setFormData(prev => ({
              ...prev,
              resellerId,
              resellerName,
              resellerCode
            }));
            setShowResellerModal(false);
          }}
          currentCode={formData.resellerCode}
        />

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === currentStep
                    ? 'bg-blue-500 text-white'
                    : step < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {step}
              
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-slate-700'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        
        <form className="space-y-6" onSubmit={(e) => {
          e.preventDefault();
          if (currentStep < 3) {
            handleNextStep();
          } else {
            handleRegister();
          }
        }}>
          {renderStep()}

          {/* Botões de navegação */}
          <div className="flex flex-col gap-4 mt-6">
            {/* Botão Voltar */}
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors w-full sm:w-auto"
              >
                <ArrowLeft size={20} />
                Voltar
              </button>
            )}
            
            {/* Botão de Ação Principal */}
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 font-medium w-full ${
                currentStep === 3
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 text-lg'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Processando...</span>
                </>
              ) : currentStep === 3 ? (
                <>
                  <UserPlus size={20} />
                  <span>Criar conta</span>
                </>
              ) : (
                <>
                  <span>Próximo</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-400">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}