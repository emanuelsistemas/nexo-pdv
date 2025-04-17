import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Loader2, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

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

  // Form data state
  const [formData, setFormData] = useState({
    // Step 1 - User data
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2 - Company basic info
    resellerId: '',
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

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d)(\d{4})$/, '$1-$2')
      .slice(0, 15);
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
      case 'whatsapp':
        formattedValue = formatWhatsApp(value);
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

  const handleSegmentSelect = (segment: string) => {
    setFormData(prev => ({ ...prev, segment }));
    setShowSegmentDropdown(false);
    setSearchSegment('');
  };

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
      toast.error('Erro na consulta de CEP. Verifique sua conexão e tente novamente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
      return;
    }
    
    // Final submission
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não correspondem');
      return;
    }

    try {
      setLoading(true);

      // 1. Registrar o usuário no Supabase Auth (sem validação por email)
      const signUpResult = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          }
        }
      });

      const { data: authData, error: authError } = signUpResult;
      
      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Este e-mail já está cadastrado. Por favor, faça login ou use outro e-mail.');
          return;
        }
        throw authError;
      }

      if (!authData.user) {
        toast.error('Erro ao criar usuário. Por favor, tente novamente.');
        return;
      }

      // 2. Criar o registro da empresa
      const companyDataToInsert = {
        segment: formData.segment,
        document_type: formData.documentType,
        document_number: formData.documentNumber.replace(/\D/g, ''),
        legal_name: formData.legalName,
        trade_name: formData.tradeName,
        email: formData.email,
        whatsapp: formData.whatsapp,
        tax_regime: formData.taxRegime,
        state_registration: 'S', // Conforme solicitado, definir como 'S'
        
        // Campos de endereço
        address_cep: formData.cep.replace(/\D/g, ''),
        address_street: formData.street,
        address_number: formData.number,
        address_complement: formData.complement,
        address_district: formData.district,
        address_city: formData.city,
        address_state: formData.state,
        address_country: 'Brasil',
        
        // Status padrão
        status: 'active'
      };

      // Criar a empresa
      const { data: companyCreated, error: companyError } = await supabase
        .from('companies')
        .insert(companyDataToInsert)
        .select('*')
        .single();

      if (companyError) {
        console.error('Erro ao criar empresa:', companyError);
        throw new Error('Erro ao criar empresa: ' + companyError.message);
      }

      if (!companyCreated) {
        throw new Error('Erro ao criar empresa: Nenhum dado retornado após a criação');
      }

      console.log('Empresa criada com sucesso:', companyCreated);

      // 3. Vincular empresa ao perfil do usuário com status 'S'
      const profileData = {
        id: authData.user.id,
        name: formData.name,
        status_cad_empresa: 'S', // Alterado de 'N' para 'S' conforme solicitado
        email: formData.email,
        company_id: companyCreated.id
      };
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profileData]);

      if (profileError) {
        console.error('Erro no perfil:', profileError);
        
        // Tentar excluir a empresa se não conseguir vincular ao perfil
        await supabase
          .from('companies')
          .delete()
          .eq('id', companyCreated.id as string);

        throw new Error('Erro ao vincular empresa ao perfil: ' + profileError.message);
      }

      // 4. Criar unidades de medida padrão para a empresa (UN e KG)
      try {
        // Criar diretamente as unidades de medida padrão
        const defaultUnits = [
          {
            company_id: companyCreated.id,
            code: 'UN',
            name: 'Unidade',
            description: 'Unidade padrão do sistema'
          },
          {
            company_id: companyCreated.id,
            code: 'KG',
            name: 'Kilo',
            description: 'Unidade padrão do sistema para peso em quilogramas'
          }
        ];

        const { error: unitsError } = await supabase
          .from('product_units')
          .insert(defaultUnits);

        if (unitsError) {
          // Verificar se o erro é de chave duplicada
          if (unitsError.code === '23505') { // código para violação de chave única/duplicada
            console.log('Unidades já existem - ignorando erro');
          } else {
            console.error('Erro ao criar unidades de medida:', unitsError);
          }
        } else {
          console.log('Unidades de medida padrão criadas com sucesso');
        }
      } catch (err) {
        // Usar tipo any para evitar erro de tipo unknown
        const error = err as any;
        console.error('Erro ao configurar unidades de medida:', error);
        // Não interromper o fluxo por causa deste erro
      }

      // 5. Criar grupo padrão "Diversos" para a empresa
      try {
        const { error: groupError } = await supabase
          .from('product_groups')
          .insert({
            company_id: companyCreated.id,
            name: 'Diversos',
            description: 'Grupo padrão para itens diversos'
          });

        if (groupError && groupError.code !== '23505') { // Ignorar erro de chave duplicada
          console.error('Erro ao criar grupo padrão:', groupError);
        }
      } catch (err) {
        // Usar tipo any para evitar erro de tipo unknown
        const error = err as any;
        console.error('Erro ao configurar grupo padrão:', error);
        // Não interromper o fluxo por causa deste erro
      }

      toast.success(
        'Cadastro realizado com sucesso! Entrando no sistema...',
        { autoClose: 3000 }
      );

      // Fazer login automático após o cadastro
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (loginError) {
        console.error('Erro ao fazer login automático:', loginError);
        toast.error('Erro ao fazer login automático. Por favor, faça login manualmente.');
        navigate('/login', { 
          state: { 
            justRegistered: true,
            email: formData.email 
          } 
        });
        return;
      }

      // Salvar o estado de login no localStorage
      import('../utils/authUtils').then(({ saveLoginState }) => {
        saveLoginState(formData.email);
      }).catch(err => console.error('Erro ao salvar estado de login:', err));
      
      // Abrir o dashboard em modo quiosque
      try {
        const { openKioskWindow } = await import('../utils/windowUtils');
        const dashboardWindow = openKioskWindow(window.location.origin + '/dashboard');
        
        // Verifica se a janela foi aberta com sucesso
        if (!dashboardWindow) {
          console.warn('Não foi possível abrir a janela do Dashboard em modo quiosque.');
          toast.warn('O bloqueador de pop-ups pode estar ativo. Por favor, permita pop-ups para este site.');
          // Fallback para navegação direta caso não seja possível abrir a janela
          navigate('/dashboard');
          return;
        }
        
        // Redirecionamos a janela original para a página inicial
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Erro ao abrir janela em modo quiosque:', error);
        // Fallback para navegação direta
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast.error(error.message || 'Erro ao criar usuário. Por favor, tente novamente.');
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
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Confirmar Senha
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
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
            {/* Revendedor - Simplificado */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Revendedor
              </label>
              <select
                name="resellerId"
                value={formData.resellerId}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled
              >
                <option value="">Sem revendedor</option>
              </select>
            </div>

            {/* Segmento com pesquisa */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Segmento
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.segment || searchSegment}
                  onChange={(e) => {
                    if (!formData.segment) {
                      setSearchSegment(e.target.value);
                    }
                    setShowSegmentDropdown(true);
                  }}
                  onClick={() => setShowSegmentDropdown(true)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Selecione ou pesquise um segmento"
                  required
                />
                {showSegmentDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredSegments.map((segment) => (
                      <button
                        key={segment}
                        type="button"
                        className="w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-700 transition-colors"
                        onClick={() => handleSegmentSelect(segment)}
                      >
                        {segment}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tipo de Documento */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Tipo de Documento
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    // Resetar campos específicos dos steps 2 e 3, mantendo step 1 e alguns campos do step 2
                    setFormData(prev => ({
                      // Manter dados do step 1
                      name: prev.name,
                      email: prev.email,
                      password: prev.password,
                      confirmPassword: prev.confirmPassword,
                      
                      // Manter campos selecionados do step 2
                      resellerId: prev.resellerId,
                      segment: prev.segment,
                      
                      // Definir tipo de documento e resetar os demais campos do step 2
                      documentType: 'CNPJ',
                      documentNumber: '',
                      legalName: '',
                      tradeName: '',
                      taxRegime: '',
                      whatsapp: '',
                      
                      // Resetar campos de endereço (step 3)
                      cep: '',
                      street: '',
                      number: '',
                      complement: '',
                      district: '',
                      city: '',
                      state: ''
                    }))
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    formData.documentType === 'CNPJ'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  CNPJ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Resetar campos específicos dos steps 2 e 3, mantendo step 1 e alguns campos do step 2
                    setFormData(prev => ({
                      // Manter dados do step 1
                      name: prev.name,
                      email: prev.email,
                      password: prev.password,
                      confirmPassword: prev.confirmPassword,
                      
                      // Manter campos selecionados do step 2
                      resellerId: prev.resellerId,
                      segment: prev.segment,
                      
                      // Definir tipo de documento e resetar os demais campos do step 2
                      documentType: 'CPF',
                      documentNumber: '',
                      legalName: '',
                      tradeName: '',
                      taxRegime: '',
                      whatsapp: '',
                      
                      // Resetar campos de endereço (step 3)
                      cep: '',
                      street: '',
                      number: '',
                      complement: '',
                      district: '',
                      city: '',
                      state: ''
                    }))
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    formData.documentType === 'CPF'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
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
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="(00) 0 0000-0000"
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
        
        <form className="space-y-6" onSubmit={handleSubmit}>
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