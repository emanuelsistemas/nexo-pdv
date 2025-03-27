import React, { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

interface CompanySlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
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
  tax_regime: 'Simples Nacional' | 'Normal';
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
    tax_regime: 'Simples Nacional',
  });

  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCompanyData();
    }
  }, [isOpen]);

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
          setFormData(company);
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
          tax_regime: 'Simples Nacional',
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatDocument = (value: string) => {
    if (formData.document_type === 'CNPJ') {
      return value
        .replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18);
    } else {
      return value
        .replace(/\D/g, '')
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

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setFormData(prev => ({ ...prev, whatsapp: formatted }));
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDocument(e.target.value);
    setFormData(prev => ({ ...prev, document_number: formatted }));
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
    
    try {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
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
            tax_regime: formData.tax_regime,
          })
          .eq('id', formData.id);

        if (updateError) {
          throw new Error('Erro ao atualizar empresa: ' + updateError.message);
        }

        toast.success('Empresa atualizada com sucesso!');
      } else {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert(formData)
          .select('*')
          .single();

        if (companyError || !company) {
          throw new Error('Erro ao criar empresa: ' + (companyError?.message || 'Dados não retornados'));
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            company_id: company.id,
            status_cad_empresa: 'S'
          })
          .eq('id', user.id)
          .select('*')
          .single();

        if (profileError) {
          await supabase
            .from('companies')
            .delete()
            .eq('id', company.id);
          
          throw new Error('Erro ao vincular empresa ao perfil: ' + profileError.message);
        }

        toast.success('Empresa cadastrada com sucesso!');
        onClose();
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
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  {SEGMENTS.map(segment => (
                    <option key={segment} value={segment}>{segment}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Tipo de Documento *
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="document_type"
                      value="CNPJ"
                      checked={formData.document_type === 'CNPJ'}
                      onChange={handleChange}
                      className="text-blue-500 focus:ring-blue-500 h-4 w-4"
                      required
                    />
                    <span className="text-slate-200">CNPJ</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="document_type"
                      value="CPF"
                      checked={formData.document_type === 'CPF'}
                      onChange={handleChange}
                      className="text-blue-500 focus:ring-blue-500 h-4 w-4"
                      required
                    />
                    <span className="text-slate-200">CPF</span>
                  </label>
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
                    onChange={handleDocumentChange}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={formData.document_type === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
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
                  onChange={handleWhatsAppChange}
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
                <select
                  name="tax_regime"
                  value={formData.tax_regime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Simples Nacional">Simples Nacional</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>
            </form>
          </div>

          <div className="p-6 border-t border-slate-700">
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
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