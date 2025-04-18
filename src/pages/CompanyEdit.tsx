import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

interface Company {
  id: string;
  trade_name: string;
  document_number: string;
  legal_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_district: string;
  address_city: string;
  address_state: string;
  address_cep: string;
  created_at: string;
  status: string;
  user_pai: string;
  reseller_id?: string;
  reseller_name?: string; // Campo auxiliar para exibir o nome da revenda
  [key: string]: any; // Para campos dinâmicos
}

interface Reseller {
  id: string;
  trade_name: string;
  code: string;
}

export default function CompanyEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resellers, setResellers] = useState<Reseller[]>([]);

  useEffect(() => {
    // Check admin session
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) {
      navigate('/admin/login');
      return;
    }

    // Carregar lista de revendas
    loadResellers();

    if (id) {
      loadCompany(id);
    } else {
      navigate('/admin');
    }
  }, [id, navigate]);
  
  // Função para carregar todas as revendas disponíveis
  const loadResellers = async () => {
    try {
      const { data, error } = await supabase
        .from('resellers')
        .select('id, trade_name, code')
        .eq('status', 'active') // Somente revendas ativas
        .order('trade_name');

      if (error) throw error;

      // Tratar corretamente os tipos
      const typedResellers = (data || []).map(item => ({
        id: String(item.id),
        trade_name: String(item.trade_name || ''),
        code: String(item.code || '')
      }));

      setResellers(typedResellers);
    } catch (error) {
      console.error('Erro ao carregar revendas:', error);
    }
  };

  const loadCompany = async (companyId: string) => {
    try {
      setLoading(true);
      
      // Buscar dados da empresa
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      if (data) {
        // Preparar objeto da empresa
        const companyData = data as Company;
        
        // Se tem revenda associada, buscar dados adicionais da revenda
        if (companyData.reseller_id) {
          const { data: resellerData, error: resellerError } = await supabase
            .from('resellers')
            .select('trade_name')
            .eq('id', companyData.reseller_id)
            .single();
            
          if (!resellerError && resellerData) {
            companyData.reseller_name = String(resellerData.trade_name || '');
          }
        }
        
        setCompany(companyData);
      } else {
        toast.error('Empresa não encontrada');
        navigate('/admin');
      }
    } catch (error: any) {
      console.error('Erro ao carregar empresa:', error);
      toast.error('Erro ao carregar os dados da empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (company) {
      setCompany(prevCompany => {
        if (!prevCompany) return null;
        return {
          ...prevCompany,
          [name]: value
        };
      });
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    
    if (company) {
      setCompany(prevCompany => {
        if (!prevCompany) return null;
        return {
          ...prevCompany,
          status: newStatus
        };
      });
    }
  };

  const getStatusOptions = () => {
    if (!company) return [];
    
    const baseOptions = [
      { value: 'active', label: 'Ativo' },
      { value: 'blocked', label: 'Bloquear' },
      { value: 'canceled', label: 'Cancelar' }
    ];
    
    // Adicionar opção de reativação se estiver cancelado
    if (company.status === 'canceled') {
      baseOptions.push({ value: 'active', label: 'Reativar' });
    }
    
    // Adicionar opção de desbloquear se estiver bloqueado
    if (company.status === 'blocked') {
      baseOptions.push({ value: 'active', label: 'Desbloquear' });
    }
    
    return baseOptions.filter((option, index, self) => 
      // Remover duplicatas (como 'active' que pode aparecer mais de uma vez)
      index === self.findIndex(t => t.value === option.value)
    );
  };

  const handleSave = async () => {
    if (!company) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('companies')
        .update({
          trade_name: company.trade_name,
          legal_name: company.legal_name,
          document_number: company.document_number,
          email: company.email,
          phone: company.phone,
          whatsapp: company.whatsapp,
          address_street: company.address_street,
          address_number: company.address_number,
          address_complement: company.address_complement,
          address_district: company.address_district,
          address_city: company.address_city,
          address_state: company.address_state,
          address_cep: company.address_cep,
          status: company.status,
          user_pai: company.user_pai,
          reseller_id: company.reseller_id || null // Adicionar campo reseller_id
        })
        .eq('id', company.id);

      if (error) throw error;
      
      toast.success('Empresa atualizada com sucesso!');
      navigate('/admin');
    } catch (error: any) {
      console.error('Erro ao salvar empresa:', error);
      toast.error('Erro ao salvar os dados da empresa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!company) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .rpc('delete_company_and_related_data', {
          target_company_id: company.id
        });

      if (error) throw error;
      
      toast.success('Empresa e todos os dados relacionados foram excluídos com sucesso!');
      navigate('/admin');
    } catch (error: any) {
      console.error('Erro ao excluir empresa:', error);
      toast.error('Erro ao excluir empresa e dados relacionados');
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center">
        <div className="text-white text-lg">Carregando dados da empresa...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center">
        <div className="text-white text-lg">Empresa não encontrada</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1C1C1C]">
      <header className="bg-[#2A2A2A] border-b border-gray-800 p-6">
        <div className="flex justify-between items-center">
          <div>
            <button 
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
            >
              <ArrowLeft size={18} />
              <span>Voltar para a lista</span>
            </button>
            
            <h1 className="text-2xl font-bold text-white">Editar Empresa</h1>
            <p className="text-gray-400">{company.trade_name}</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
              disabled={saving}
            >
              <Trash2 size={18} />
              <span>Excluir</span>
            </button>
            
            <button
              onClick={handleSave}
              className="px-4 py-2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              disabled={saving}
            >
              <Save size={18} />
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informações Básicas */}
          <div className="bg-[#2A2A2A] rounded-lg border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Informações Básicas</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  name="trade_name"
                  value={company.trade_name || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Razão Social</label>
                <input
                  type="text"
                  name="legal_name"
                  value={company.legal_name || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">CNPJ/CPF</label>
                <input
                  type="text"
                  name="document_number"
                  value={company.document_number || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Status</label>
                <select
                  name="status"
                  value={company.status}
                  onChange={handleStatusChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {getStatusOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Campo para seleção de revenda */}
              <div>
                <label className="block text-gray-400 mb-1">Revenda</label>
                <select
                  name="reseller_id"
                  value={company.reseller_id || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Sem revenda</option>
                  {resellers.map(reseller => (
                    <option key={reseller.id} value={reseller.id}>
                      {reseller.trade_name} (Código: {reseller.code})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Data de Cadastro</label>
                <input
                  type="text"
                  value={new Date(company.created_at).toLocaleDateString('pt-BR')}
                  disabled
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Usuário PAI</label>
                <input
                  type="text"
                  value={company.user_pai || 'Não informado'}
                  disabled
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          {/* Contato */}
          <div className="bg-[#2A2A2A] rounded-lg border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Contato</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={company.email || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Telefone</label>
                <input
                  type="text"
                  name="phone"
                  value={company.phone || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">WhatsApp</label>
                <input
                  type="text"
                  name="whatsapp"
                  value={company.whatsapp || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          {/* Endereço */}
          <div className="bg-[#2A2A2A] rounded-lg border border-gray-800 p-6 md:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Endereço</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-400 mb-1">CEP</label>
                <input
                  type="text"
                  name="address_cep"
                  value={company.address_cep || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-gray-400 mb-1">Logradouro</label>
                <input
                  type="text"
                  name="address_street"
                  value={company.address_street || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Número</label>
                <input
                  type="text"
                  name="address_number"
                  value={company.address_number || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Complemento</label>
                <input
                  type="text"
                  name="address_complement"
                  value={company.address_complement || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Bairro</label>
                <input
                  type="text"
                  name="address_district"
                  value={company.address_district || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Cidade</label>
                <input
                  type="text"
                  name="address_city"
                  value={company.address_city || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Estado</label>
                <input
                  type="text"
                  name="address_state"
                  value={company.address_state || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#2A2A2A] rounded-lg shadow-lg border border-gray-800 p-6 w-full max-w-[400px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Confirmar Exclusão
                </h3>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-300 mb-6">
                Tem certeza que deseja excluir a empresa "{company.trade_name}"? Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#353535] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
