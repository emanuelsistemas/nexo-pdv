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
      
      // Update form data with API response
      setFormData(prev => ({
        ...prev,
        legalName: data.razao_social || '',
        tradeName: data.nome_fantasia || '',
        cep: data.cep?.replace(/[^\d]/g, '').replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2-$3') || '',
        street: data.logradouro || '',
        number: data.numero || '',
        complement: data.complemento || '',
        district: data.bairro || '',
        city: data.municipio || '',
        state: data.uf || ''
      }));

      // If CEP was returned, trigger CEP search to ensure all address fields are filled
      if (data.cep) {
        await searchCEP();
      }

      toast.success('Dados da empresa carregados com sucesso!');
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      toast.error('Erro ao processar a consulta. Verifique sua conexão e tente novamente.');
    } finally {
      setSearchingCNPJ(false);
    }
  };

  const searchCEP = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast.error('CEP inválido');
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setFormData(prev => ({
        ...prev,
        street: data.logradouro,
        district: data.bairro,
        city: data.localidade,
        state: data.uf,
      }));
    } catch (error) {
      toast.error('Erro ao buscar CEP');
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

      const signUpResult = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
          emailRedirectTo: 'https://nexopdv.emasoftware.io/login'
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

      await new Promise(resolve => setTimeout(resolve, 1000));

      const profileData = {
        id: authData.user.id,
        name: formData.name,
        status_cad_empresa: 'N',
        email: formData.email
      };
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profileData]);

      if (profileError) {
        console.error('Erro no perfil:', profileError);
      }

      toast.success(
        'Cadastro realizado com sucesso! Por favor, verifique seu e-mail para confirmar sua conta.',
        { autoClose: 8000 }
      );

      navigate('/login', { 
        state: { 
          justRegistered: true,
          email: formData.email 
        } 
      });
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast.error('Erro ao criar usuário. Por favor, tente novamente.');
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
                  onClick={() => setFormData(prev => ({ ...prev, documentType: 'CNPJ' }))}
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
                  onClick={() => setFormData(prev => ({ ...prev, documentType: 'CPF' }))}
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
                    onClick={searchCNPJ}
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

          <div className="flex justify-between gap-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <ArrowLeft size={20} />
                Voltar
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                currentStep === 3
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ml-auto`}
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