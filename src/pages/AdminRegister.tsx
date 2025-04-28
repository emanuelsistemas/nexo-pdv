import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Loader2, ArrowLeft, Database, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

export default function AdminRegister() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchingCNPJ, setSearchingCNPJ] = useState(false);
  const [formData, setFormData] = useState({
    nome_usuario: '',
    email: '',
    senha: '',
    confirmar_senha: '',
    tipo_documento: 'CNPJ',
    documento: '',
    razao_social: '',
    nome_fantasia: '',
    whatsapp: '',
    dev: 'N'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validar formulário
      if (formData.senha !== formData.confirmar_senha) {
        throw new Error('As senhas não coincidem');
      }
      
      // Verificar se as senhas correspondem visualmente ao que o usuário esperaria
      const senhaLength = formData.senha.trim().length;
      const confirmarSenhaLength = formData.confirmar_senha.trim().length;
      
      if (senhaLength === 0 || confirmarSenhaLength === 0) {
        throw new Error('A senha não pode estar vazia');
      }

      if (formData.senha.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }

      if (!formData.documento || !validarDocumento(formData.documento, formData.tipo_documento)) {
        throw new Error(`${formData.tipo_documento} inválido`);
      }

      if (!formData.email || !validarEmail(formData.email)) {
        throw new Error('Email inválido');
      }

      setLoading(true);

      // Verificar se o email já existe
      const { data: emailExists } = await supabase
        .from('profile_admin')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (emailExists) {
        throw new Error('Este email já está em uso');
      }

      // Verificar se o documento já existe
      const { data: documentoExists } = await supabase
        .from('profile_admin')
        .select('id')
        .eq('documento', formatarDocumento(formData.documento))
        .maybeSingle();

      if (documentoExists) {
        throw new Error('Este documento já está em uso');
      }

      // Criar novo administrador
      const { error } = await supabase
        .from('profile_admin')
        .insert({
          nome_usuario: formData.nome_usuario,
          email: formData.email,
          senha: formData.senha, // Em produção, deve-se usar hash de senha
          tipo_documento: formData.tipo_documento,
          documento: formatarDocumento(formData.documento),
          razao_social: formData.razao_social,
          nome_fantasia: formData.nome_fantasia,
          whatsapp: formData.whatsapp,
          dev: formData.dev
        })
        .select()
        .single();

      if (error) {
        throw new Error('Erro ao criar conta: ' + error.message);
      }

      toast.success('Cadastro realizado com sucesso! Faça login para continuar.');
      navigate('/admin/login');
    } catch (error: any) {
      console.error('Erro ao fazer cadastro:', error);
      toast.error(error.message || 'Erro ao fazer cadastro');
    } finally {
      setLoading(false);
    }
  };

  // Função para validar email
  const validarEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Função para validar documento (CPF ou CNPJ)
  const validarDocumento = (documento: string, tipo: string) => {
    const numerosSomente = documento.replace(/\D/g, '');
    
    if (tipo === 'CPF') {
      return numerosSomente.length === 11;
    } else if (tipo === 'CNPJ') {
      return numerosSomente.length === 14;
    }
    
    return false;
  };

  // Função para formatar o documento conforme o tipo
  const formatarDocumento = (documento: string) => {
    const numerosSomente = documento.replace(/\D/g, '');
    
    if (formData.tipo_documento === 'CPF') {
      return numerosSomente.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (formData.tipo_documento === 'CNPJ') {
      return numerosSomente.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return documento;
  };

  // Função para buscar informações do CNPJ
  const searchCNPJ = async () => {
    // Remove caracteres não numéricos do CNPJ
    const cnpj = formData.documento.replace(/\D/g, '');
    
    // Valida o comprimento do CNPJ
    if (cnpj.length !== 14) {
      toast.warning('Digite um CNPJ válido com 14 dígitos');
      return;
    }
    
    try {
      setSearchingCNPJ(true);
      
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('CNPJ não encontrado na base de dados.');
        } else {
          toast.error('Erro ao consultar CNPJ. Tente novamente mais tarde.');
        }
        setSearchingCNPJ(false);
        return;
      }
      
      const data = await response.json();
      console.log('Dados do CNPJ:', data);

      // Atualizar o estado com os dados formatados
      setFormData(prev => ({
        ...prev,
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || ''
      }));

      toast.success('Dados do CNPJ carregados com sucesso!');
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      toast.error('Erro ao consultar CNPJ. Verifique sua conexão e tente novamente.');
    } finally {
      setSearchingCNPJ(false);
    }
  };

  // Função para lidar com a mudança do documento, formatando-o
  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '');
    
    let valorFormatado = valor;
    if (formData.tipo_documento === 'CPF') {
      if (valor.length <= 11) {
        valorFormatado = valor
          .replace(/(\d{3})(?=\d)/, '$1.')
          .replace(/(\d{3})(?=\d)/, '$1.')
          .replace(/(\d{3})(?=\d)/, '$1-');
      }
    } else if (formData.tipo_documento === 'CNPJ') {
      if (valor.length <= 14) {
        valorFormatado = valor
          .replace(/(\d{2})(?=\d)/, '$1.')
          .replace(/(\d{3})(?=\d)/, '$1.')
          .replace(/(\d{3})(?=\d)/, '$1/')
          .replace(/(\d{4})(?=\d)/, '$1-');
      }
    }
    
    setFormData(prev => ({ ...prev, documento: valorFormatado }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1C1C1C]">
      <div className="w-full max-w-2xl space-y-8 bg-[#2A2A2A] p-8 rounded-xl border border-gray-800">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Database className="w-10 h-10 text-emerald-500" />
            <h1 className="text-3xl font-bold text-white">Admin</h1>
          </div>
          <p className="text-gray-400">Cadastro de novo administrador</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nome de Usuário
              </label>
              <input
                type="text"
                value={formData.nome_usuario}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_usuario: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="Seu nome"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tipo de Documento
              </label>
              <select
                value={formData.tipo_documento}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    tipo_documento: e.target.value,
                    documento: ''
                  }));
                }}
                className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                required
              >
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {formData.tipo_documento}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.documento}
                  onChange={handleDocumentoChange}
                  className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                  placeholder={formData.tipo_documento === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                  required
                  maxLength={formData.tipo_documento === 'CPF' ? 14 : 18}
                />
                {formData.tipo_documento === 'CNPJ' && (
                  <button
                    type="button"
                    onClick={searchCNPJ}
                    disabled={searchingCNPJ}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Buscar informações do CNPJ"
                  >
                    {searchingCNPJ ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Razão Social
              </label>
              <input
                type="text"
                value={formData.razao_social}
                onChange={(e) => setFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="Razão Social"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={formData.nome_fantasia}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="Nome Fantasia"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                WhatsApp
              </label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, '').substr(0, 11) }))}
                className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.senha}
                  onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Confirmar Senha
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmar_senha}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmar_senha: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Voltar para login</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  <span>Cadastrar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
