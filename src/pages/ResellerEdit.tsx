import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Search, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import InputMask from 'react-input-mask';
import axios from 'axios';

interface OpeningHours {
  [key: string]: {
    active: boolean;
    open: string;
    close: string;
  };
}

interface Contact {
  name: string;
  phone: string;
  email: string;
  position?: string;
}

interface Reseller {
  id: string;
  trade_name: string;
  legal_name: string;
  document_number: string;
  address_cep: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_district: string;
  address_city: string;
  address_state: string;
  created_at: string;
  status: string;
  code?: string;
  website?: string;
  opening_hours?: OpeningHours;
  tech_support?: Contact[];
  sales_contacts?: Contact[];
  admin_contacts?: Contact[];
  additional_info?: string;
  // Campos para acesso ao sistema
  user_name?: string;
  user_email?: string;
  user_password?: string;
  [key: string]: any;
}

// Mapeamento dos dias da semana
const WEEKDAYS = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

// Estilo para reduzir o tamanho do ícone do relógio e ajustar espaçamento
const timeInputStyle = `
  input[type="time"]::-webkit-calendar-picker-indicator {
    width: 12px;
    height: 12px;
    opacity: 0.6;
    padding: 0;
    margin: 0;
    margin-left: -2px;
  }
  input[type="time"]::-webkit-datetime-edit {
    font-size: 0.875rem;
    padding: 0;
  }
  input[type="time"] {
    padding-right: 2px !important;
  }
`;

export default function ResellerEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supportPhone, setSupportPhone] = useState('');
  const [salesPhone, setSalesPhone] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  
  // Estados para senha e confirmação
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const isNew = id === 'new';

  useEffect(() => {
    // Check admin session
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) {
      navigate('/admin/login');
      return;
    }

    if (isNew) {
      // Criar uma nova revenda com horários padrão
      const defaultOpeningHours: OpeningHours = {
        monday: { active: true, open: '08:00', close: '18:00' },
        tuesday: { active: true, open: '08:00', close: '18:00' },
        wednesday: { active: true, open: '08:00', close: '18:00' },
        thursday: { active: true, open: '08:00', close: '18:00' },
        friday: { active: true, open: '08:00', close: '18:00' },
        saturday: { active: false, open: '08:00', close: '13:00' },
        sunday: { active: false, open: '08:00', close: '18:00' }
      };

      setReseller({
        id: '',
        trade_name: '',
        legal_name: '',
        document_number: '',
        address_cep: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_district: '',
        address_city: '',
        address_state: '',
        created_at: new Date().toISOString(),
        status: 'active',
        website: '',
        opening_hours: defaultOpeningHours,
        tech_support: [],
        sales_contacts: [],
        admin_contacts: [],
        additional_info: '',
        user_name: '',
        user_email: '',
        user_password: ''
      });
      setLoading(false);
    } else if (id) {
      loadReseller(id);
    } else {
      navigate('/admin/resellers');
    }
  }, [id, navigate, isNew]);

  const loadReseller = async (resellerId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .eq('id', resellerId)
        .single();

      if (error) throw error;

      if (data) {
        // Garantir que opening_hours tenha todos os dias da semana
        const defaultOpeningHours: OpeningHours = {
          monday: { active: true, open: '08:00', close: '18:00' },
          tuesday: { active: true, open: '08:00', close: '18:00' },
          wednesday: { active: true, open: '08:00', close: '18:00' },
          thursday: { active: true, open: '08:00', close: '18:00' },
          friday: { active: true, open: '08:00', close: '18:00' },
          saturday: { active: false, open: '08:00', close: '13:00' },
          sunday: { active: false, open: '08:00', close: '18:00' }
        };

        // Verificar se o formato dos dados é o esperado
        let opening_hours = defaultOpeningHours;
        
        if (data.opening_hours) {
          // Se os dados vierem como array, converter para o formato de objeto
          if (Array.isArray(data.opening_hours)) {
            const formattedHours: OpeningHours = {};
            const weekdayKeys = Object.keys(WEEKDAYS);
            
            data.opening_hours.forEach((item: any, index: number) => {
              if (index < weekdayKeys.length) {
                const day = weekdayKeys[index];
                formattedHours[day] = {
                  active: item.active || false,
                  open: item.open || '08:00',
                  close: item.close || '18:00'
                };
              }
            });
            
            opening_hours = formattedHours;
          } else {
            // Se já for um objeto, mesclar com os valores padrão
            opening_hours = {
              ...defaultOpeningHours,
              ...data.opening_hours
            };
          }
        }

        setReseller({
          ...data,
          opening_hours
        });
      } else {
        toast.error('Revenda não encontrada');
        navigate('/admin/resellers');
      }
    } catch (error: any) {
      console.error('Erro ao carregar revenda:', error);
      toast.error('Erro ao carregar os dados da revenda');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Limpar erro de senha quando o usuário digita
    if (name === 'user_password') {
      setPasswordError('');
    }
    
    // Atualizar o estado do reseller
    if (reseller) {
      setReseller(prevReseller => {
        if (!prevReseller) return null;
        return {
          ...prevReseller,
          [name]: value
        };
      });
    }
  };
  
  // Função para lidar com a confirmação de senha
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setPasswordError('');
  };
  
  // Função para validar as senhas
  const validatePasswords = () => {
    if (reseller?.user_password && confirmPassword && reseller.user_password !== confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // Função para lidar com alterações nos horários de funcionamento
  const handleOpeningHoursChange = (day: string, field: 'active' | 'open' | 'close', value: boolean | string) => {
    if (!reseller || !reseller.opening_hours) return;
    
    setReseller({
      ...reseller,
      opening_hours: {
        ...reseller.opening_hours,
        [day]: {
          ...reseller.opening_hours[day],
          [field]: value
        }
      }
    });
  };
  
  // Função para adicionar um número de telefone de suporte
  const addSupportPhone = () => {
    if (!reseller) return;
    if (!supportPhone.trim()) {
      toast.error('Digite um número de telefone');
      return;
    }
    
    // Verificar se já existem 5 números
    const currentPhones = reseller.tech_support || [];
    if (currentPhones.length >= 5) {
      toast.error('Máximo de 5 números de suporte permitidos');
      return;
    }
    
    // Criar um novo contato apenas com o telefone
    const newContact: Contact = {
      name: `Suporte ${currentPhones.length + 1}`,
      phone: supportPhone,
      email: `suporte${currentPhones.length + 1}@exemplo.com`
    };
    
    setReseller(prevReseller => {
      if (!prevReseller) return null;
      
      return {
        ...prevReseller,
        tech_support: [...(prevReseller.tech_support || []), newContact]
      };
    });
    
    // Limpar o campo
    setSupportPhone('');
  };
  
  // Função para remover um contato de suporte
  const removeSupportPhone = (index: number) => {
    if (!reseller) return;
    
    setReseller(prevReseller => {
      if (!prevReseller) return null;
      
      const currentPhones = [...(prevReseller.tech_support || [])];
      currentPhones.splice(index, 1);
      
      return {
        ...prevReseller,
        tech_support: currentPhones
      };
    });
  };
  
  // Função para adicionar um número de telefone de vendas
  const addSalesPhone = () => {
    if (!reseller) return;
    if (!salesPhone.trim()) {
      toast.error('Digite um número de telefone');
      return;
    }
    
    // Verificar se já existem 5 números
    const currentPhones = reseller.sales_contacts || [];
    if (currentPhones.length >= 5) {
      toast.error('Máximo de 5 números de vendas permitidos');
      return;
    }
    
    // Criar um novo contato apenas com o telefone
    const newContact: Contact = {
      name: `Vendas ${currentPhones.length + 1}`,
      phone: salesPhone,
      email: `vendas${currentPhones.length + 1}@exemplo.com`
    };
    
    setReseller(prevReseller => {
      if (!prevReseller) return null;
      
      return {
        ...prevReseller,
        sales_contacts: [...(prevReseller.sales_contacts || []), newContact]
      };
    });
    
    // Limpar o campo
    setSalesPhone('');
  };
  
  // Função para remover um contato de vendas
  const removeSalesPhone = (index: number) => {
    if (!reseller) return;
    
    setReseller(prevReseller => {
      if (!prevReseller) return null;
      
      const currentPhones = [...(prevReseller.sales_contacts || [])];
      currentPhones.splice(index, 1);
      
      return {
        ...prevReseller,
        sales_contacts: currentPhones
      };
    });
  };
  
  // Função para adicionar um número de telefone administrativo
  const addAdminPhone = () => {
    if (!reseller) return;
    if (!adminPhone.trim()) {
      toast.error('Digite um número de telefone');
      return;
    }
    
    // Verificar se já existem 5 números
    const currentPhones = reseller.admin_contacts || [];
    if (currentPhones.length >= 5) {
      toast.error('Máximo de 5 números administrativos permitidos');
      return;
    }
    
    // Criar um novo contato apenas com o telefone
    const newContact: Contact = {
      name: `Admin ${currentPhones.length + 1}`,
      phone: adminPhone,
      email: `admin${currentPhones.length + 1}@exemplo.com`
    };
    
    setReseller(prevReseller => {
      if (!prevReseller) return null;
      
      return {
        ...prevReseller,
        admin_contacts: [...(prevReseller.admin_contacts || []), newContact]
      };
    });
    
    // Limpar o campo
    setAdminPhone('');
  };
  
  // Função para remover um contato administrativo
  const removeAdminPhone = (index: number) => {
    if (!reseller) return;
    
    setReseller(prevReseller => {
      if (!prevReseller) return null;
      
      const currentPhones = [...(prevReseller.admin_contacts || [])];
      currentPhones.splice(index, 1);
      
      return {
        ...prevReseller,
        admin_contacts: currentPhones
      };
    });
  };
  
  // Função para manipular alterações no formulário de novo contato
  const handleContactInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setNewContact(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Estado para contatos de vendas e administrativos
  const [newContact, setNewContact] = useState<Contact>({
    name: '',
    phone: '',
    email: '',
    position: ''
  });

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    
    if (reseller) {
      setReseller(prevReseller => {
        if (!prevReseller) return null;
        return {
          ...prevReseller,
          status: newStatus
        };
      });
    }
  };

  const getStatusOptions = () => {
    if (!reseller) return [];
    
    if (reseller.status === 'active') {
      return [
        { value: 'active', label: 'Ativo' },
        { value: 'inactive', label: 'Inativar' },
        { value: 'blocked', label: 'Bloquear' },
        { value: 'canceled', label: 'Cancelar' }
      ];
    }
    
    if (reseller.status === 'canceled') {
      return [
        { value: 'canceled', label: 'Cancelado' },
        { value: 'active', label: 'Reativar' }
      ];
    }
    
    if (reseller.status === 'blocked') {
      return [
        { value: 'blocked', label: 'Bloqueado' },
        { value: 'active', label: 'Desbloquear' }
      ];
    }
    
    if (reseller.status === 'inactive') {
      return [
        { value: 'inactive', label: 'Inativo' },
        { value: 'active', label: 'Ativar' }
      ];
    }
    
    return [
      { value: 'active', label: 'Ativo' },
      { value: 'inactive', label: 'Inativo' },
      { value: 'blocked', label: 'Bloqueado' },
      { value: 'canceled', label: 'Cancelado' }
    ];
  };

  const handleSave = async () => {
    try {
      if (!reseller) return;
      
      // Validar senhas antes de salvar
      if (reseller.user_password && !validatePasswords()) {
        setSaving(false);
        return;
      }
      
      setSaving(true);
      
      // Prepare data for save
      const saveData = {
        trade_name: reseller.trade_name,
        legal_name: reseller.legal_name,
        document_number: reseller.document_number,
        address_cep: reseller.address_cep,
        address_street: reseller.address_street,
        address_number: reseller.address_number,
        address_complement: reseller.address_complement,
        address_district: reseller.address_district,
        address_city: reseller.address_city,
        address_state: reseller.address_state,
        status: reseller.status,
        
        // Campos complementares
        website: reseller.website || null,
        opening_hours: reseller.opening_hours || null,
        tech_support: reseller.tech_support || null,
        sales_contacts: reseller.sales_contacts || null,
        admin_contacts: reseller.admin_contacts || null,
        additional_info: reseller.additional_info || null,
        
        // Dados de acesso ao sistema
        user_name: reseller.user_name || null,
        user_email: reseller.user_email || null,
        user_password: reseller.user_password || null
      };
      
      let result;
      let resellerId = reseller.id;
      
      if (isNew) {
        // Criar nova revenda - o código é gerado automaticamente pela função do banco
        const { error } = await supabase
          .rpc('insert_reseller_with_code', {
            p_trade_name: reseller.trade_name,
            p_legal_name: reseller.legal_name,
            p_document_number: reseller.document_number,
            p_address_cep: reseller.address_cep,
            p_address_street: reseller.address_street,
            p_address_number: reseller.address_number,
            p_address_complement: reseller.address_complement,
            p_address_district: reseller.address_district,
            p_address_city: reseller.address_city,
            p_address_state: reseller.address_state,
            p_status: reseller.status
          });

        if (error) throw error;
        
        // Como a função RPC retorna void, precisamos buscar o ID da revenda criada
        // Buscar pelo document_number para obter o ID
        const { data: resellerData, error: fetchError } = await supabase
          .from('resellers')
          .select('id')
          .eq('document_number', reseller.document_number)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        console.log('Dados da revenda após criação:', resellerData);
        
        if (fetchError) {
          console.error('Erro ao buscar ID da revenda criada:', fetchError);
          throw fetchError;
        }
        
        if (resellerData && resellerData.id) {
          resellerId = resellerData.id;
          console.log('ID da revenda obtido:', resellerId);
        } else {
          console.error('Não foi possível obter o ID da revenda criada');
          throw new Error('Não foi possível obter o ID da revenda criada');
        }
        
        toast.success(`Revenda criada com sucesso! ID: ${resellerId}`);
      } else {
        // Atualizar revenda existente
        result = await supabase
          .from('resellers')
          .update(saveData)
          .eq('id', reseller.id);
        
        if (result.error) throw result.error;
        
        toast.success('Revenda atualizada com sucesso!');
      }
      
      // Salvar dados de acesso na tabela profile_admin se fornecidos
      if (reseller.user_name && reseller.user_email && reseller.user_password) {
        // ETAPA 1: Verificar se o email já existe na tabela profile_admin
        const { data: existingAdminUser, error: adminCheckError } = await supabase
          .from('profile_admin')
          .select('id, email')
          .eq('email', reseller.user_email)
          .maybeSingle();
        
        if (adminCheckError) {
          console.error('Erro ao verificar email existente em profile_admin:', adminCheckError);
          throw adminCheckError;
        }
        
        // ETAPA 2: Verificar se o email já existe na tabela profile_admin_user
        const { data: existingAdminUserUser, error: adminUserCheckError } = await supabase
          .from('profile_admin_user')
          .select('id, email')
          .eq('email', reseller.user_email)
          .maybeSingle();
          
        if (adminUserCheckError) {
          console.error('Erro ao verificar email existente em profile_admin_user:', adminUserCheckError);
          throw adminUserCheckError;
        }
        
        // Se o email existir em profile_admin_user mas não em profile_admin (tabela que estamos manipulando)
        if (existingAdminUserUser && !existingAdminUser) {
          toast.error(`O email ${reseller.user_email} já está em uso por outro usuário do sistema. Por favor, use um email diferente.`);
          throw new Error(`Email já utilizado em profile_admin_user: ${reseller.user_email}`);
        }
        
        // Se o email existir e for de outro usuário admin
        if (existingAdminUser) {
          // Atualizar usuário existente
          const { error: updateError } = await supabase
            .from('profile_admin')
            .update({
              nome_usuario: reseller.user_name,
              senha: reseller.user_password,
              updated_at: new Date().toISOString(),
              tipo_user: 'Admin',
              reseller_id: resellerId // Associação com a revenda
            })
            .eq('id', existingAdminUser.id);
          
          if (updateError) {
            console.error('Erro ao atualizar usuário de acesso:', updateError);
            toast.error('Erro ao atualizar dados de acesso ao sistema');
          } else {
            toast.success('Dados de acesso atualizados com sucesso!');
          }
        } else {
          // Log para debug antes de criar o usuário
          console.log('Criando usuário admin com reseller_id:', resellerId);
          
          // Verificar se o resellerId é válido antes de prosseguir
          if (!resellerId) {
            console.error('resellerId inválido ao criar usuário admin');
            throw new Error('ID da revenda inválido');
          }

          // Criar novo usuário admin
          const { data: newAdminUser, error: insertError } = await supabase
            .from('profile_admin')
            .insert({
              nome_usuario: reseller.user_name,
              email: reseller.user_email,
              senha: reseller.user_password,
              status: 'active',
              tipo_user: 'Admin',
              dev: 'N',
              reseller_id: resellerId // Associação com a revenda
            })
            .select();
          
          if (insertError) {
            console.error('Erro ao criar usuário de acesso:', insertError);
            toast.error('Erro ao criar acesso ao sistema');
          } else {
            toast.success('Acesso ao sistema criado com sucesso!');
            
            // Criar entrada na tabela profile_admin_user associada à revenda
            if (newAdminUser && newAdminUser.length > 0) {
              const adminId = newAdminUser[0].id;
              
              const { error: userError } = await supabase
                .from('profile_admin_user')
                .insert({
                  admin_id: adminId,
                  nome: reseller.user_name,
                  email: reseller.user_email,
                  senha: reseller.user_password,
                  tipo: 'revenda',
                  status: 'active',
                  reseller_id: resellerId
                });
                
              if (userError) {
                console.error('Erro ao vincular usuário à revenda:', userError);
              }
            }
          }
        }
      }
      
      navigate('/admin/resellers');
    } catch (error: any) {
      console.error('Erro ao salvar revenda:', error);
      toast.error('Erro ao salvar os dados da revenda');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reseller || isNew) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('resellers')
        .delete()
        .eq('id', reseller.id);

      if (error) throw error;
      
      toast.success('Revenda excluída com sucesso!');
      navigate('/admin/resellers');
    } catch (error: any) {
      console.error('Erro ao excluir revenda:', error);
      toast.error('Erro ao excluir revenda');
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };
  
  const searchCNPJ = async () => {
    if (!reseller || !reseller.document_number) {
      toast.error('Digite um CNPJ para pesquisar');
      return;
    }
    
    try {
      setSearching(true);
      
      // Remover caracteres não numéricos
      const cnpj = reseller.document_number.replace(/\D/g, '');
      
      if (cnpj.length !== 14) {
        toast.error('CNPJ inválido');
        return;
      }
      
      // Usar BrasilAPI para consulta de CNPJ (mais confiável que ReceitaWS)
      const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      
      // Mapear os dados da resposta da API para o reseller
      setReseller(prevReseller => {
        if (!prevReseller) return null;
        
        // Formatar o CEP antes de atualizar o estado
        const formattedCep = response.data.cep 
          ? response.data.cep.replace(/[^\d]/g, '')
          : prevReseller.address_cep;

        return {
          ...prevReseller,
          legal_name: response.data.razao_social || prevReseller.legal_name,
          trade_name: response.data.nome_fantasia || prevReseller.trade_name,
          address_cep: formattedCep,
          address_street: response.data.logradouro || prevReseller.address_street,
          address_number: response.data.numero || prevReseller.address_number,
          address_complement: response.data.complemento || prevReseller.address_complement,
          address_district: response.data.bairro || prevReseller.address_district,
          address_city: response.data.municipio || prevReseller.address_city,
          address_state: response.data.uf || prevReseller.address_state
        };
      });
      
      toast.success('CNPJ consultado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao consultar CNPJ:', error);
      if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
        toast.error('CNPJ não encontrado na base de dados.');
      } else {
        toast.error('Erro ao consultar CNPJ. Verifique se o número está correto.');
      }
    } finally {
      setSearching(false);
    }
  };
  
  const searchCEP = async () => {
    if (!reseller || !reseller.address_cep) {
      toast.error('Digite um CEP para pesquisar');
      return;
    }
    
    try {
      setSearching(true);
      
      // Remover caracteres não numéricos
      const cep = reseller.address_cep.replace(/\D/g, '');
      
      if (cep.length !== 8) {
        toast.error('CEP inválido');
        return;
      }
      
      // API de consulta de CEP (ViaCEP)
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
      
      if (response.data.erro) {
        throw new Error('CEP não encontrado');
      }
      
      // Atualiza os dados com a resposta da API
      setReseller(prevReseller => {
        if (!prevReseller) return null;
        
        return {
          ...prevReseller,
          address_street: response.data.logradouro || prevReseller.address_street,
          address_district: response.data.bairro || prevReseller.address_district,
          address_city: response.data.localidade || prevReseller.address_city,
          address_state: response.data.uf || prevReseller.address_state
        };
      });
      
      toast.success('CEP consultado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao consultar CEP:', error);
      toast.error('Erro ao consultar CEP. Verifique se o número está correto.');
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center">
        <div className="text-white text-lg">Carregando dados da revenda...</div>
      </div>
    );
  }

  if (!reseller) {
    return (
      <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center">
        <div className="text-white text-lg">Revenda não encontrada</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1C1C1C]">
      {/* Estilo inline para o ícone do relógio */}
      <style>{timeInputStyle}</style>
      <header className="bg-[#2A2A2A] border-b border-gray-800 p-6">
        <div className="flex justify-between items-center">
          <div>
            <button 
              onClick={() => navigate('/admin/resellers')}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
            >
              <ArrowLeft size={18} />
              <span>Voltar para a lista</span>
            </button>
            
            <h1 className="text-2xl font-bold text-white">{isNew ? 'Nova Revenda' : 'Editar Revenda'}</h1>
            {!isNew && <p className="text-gray-400">{reseller.trade_name}</p>}
          </div>
          
          <div className="flex gap-3">
            {!isNew && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                disabled={saving}
              >
                <Trash2 size={18} />
                <span>Excluir</span>
              </button>
            )}
            
            <button
              onClick={handleSave}
              className="px-4 py-2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              disabled={saving}
            >
              <Save size={18} />
              <span>{saving ? 'Salvando...' : 'Salvar'}</span>
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
                <label className="block text-gray-400 mb-1">CNPJ *</label>
                <div className="flex">
                  <InputMask
                    mask="99.999.999/9999-99"
                    type="text"
                    name="document_number"
                    value={reseller.document_number || ''}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-l-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="00.000.000/0000-00"
                  />
                  <button
                    onClick={searchCNPJ}
                    disabled={searching || !reseller.document_number}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg transition-colors disabled:opacity-50"
                    title="Buscar dados pelo CNPJ"
                  >
                    <Search size={18} />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Razão Social *</label>
                <input
                  type="text"
                  name="legal_name"
                  value={reseller.legal_name || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Nome Fantasia *</label>
                <input
                  type="text"
                  name="trade_name"
                  value={reseller.trade_name || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              {!isNew && (
                <div>
                  <label className="block text-gray-400 mb-1">Código</label>
                  <input
                    type="text"
                    value={reseller.code || 'Aguardando geração...'}
                    disabled
                    className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-gray-400 mb-1">Status</label>
                <select
                  name="status"
                  value={reseller.status}
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
              
              {!isNew && (
                <div>
                  <label className="block text-gray-400 mb-1">Data de Cadastro</label>
                  <input
                    type="text"
                    value={new Date(reseller.created_at).toLocaleDateString('pt-BR')}
                    disabled
                    className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Endereço */}
          <div className="bg-[#2A2A2A] rounded-lg border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Endereço</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1">CEP</label>
                <div className="flex">
                  <InputMask
                    mask="99999-999"
                    type="text"
                    name="address_cep"
                    value={reseller.address_cep || ''}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-l-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="00000-000"
                  />
                  <button
                    onClick={searchCEP}
                    disabled={searching || !reseller.address_cep}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg transition-colors disabled:opacity-50"
                    title="Buscar endereço pelo CEP"
                  >
                    <Search size={18} />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Logradouro</label>
                <input
                  type="text"
                  name="address_street"
                  value={reseller.address_street || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1">Número</label>
                  <input
                    type="text"
                    name="address_number"
                    value={reseller.address_number || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-1">Complemento</label>
                  <input
                    type="text"
                    name="address_complement"
                    value={reseller.address_complement || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">Bairro</label>
                <input
                  type="text"
                  name="address_district"
                  value={reseller.address_district || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1">Cidade</label>
                  <input
                    type="text"
                    name="address_city"
                    value={reseller.address_city || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-1">Estado</label>
                  <input
                    type="text"
                    name="address_state"
                    value={reseller.address_state || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Campos complementares */}
              <div className="bg-[#222222] p-6 rounded-lg border border-gray-800 mt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Informações Complementares</h3>
                
                <div className="space-y-4">
                  {/* Website */}
                  <div>
                    <label className="block text-gray-400 mb-1">Website</label>
                    <input
                      type="text"
                      name="website"
                      value={reseller.website || ''}
                      onChange={handleInputChange}
                      placeholder="https://www.exemplo.com.br"
                      className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Horários de Funcionamento */}
                  <div className="pb-4">
                    <label className="block text-gray-400 mb-3 text-lg font-medium">Horários de Funcionamento</label>
                    <div className="grid grid-cols-1 gap-2">
                      {reseller.opening_hours && Object.entries(reseller.opening_hours).map(([day, hours]) => {
                        // Apenas mostrar os dias que estão no mapeamento WEEKDAYS
                        if (!WEEKDAYS[day as keyof typeof WEEKDAYS]) return null;
                        
                        const dayName = WEEKDAYS[day as keyof typeof WEEKDAYS];
                        return (
                          <div key={day} className="flex items-center bg-[#1C1C1C] rounded-lg border border-gray-800 p-3">
                            <div className="flex items-center mr-3 w-32">
                              <input
                                type="checkbox"
                                checked={hours.active}
                                onChange={(e) => handleOpeningHoursChange(day, 'active', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-700 text-emerald-500 focus:ring-emerald-500 bg-[#1C1C1C] mr-2"
                              />
                              <span className="text-white text-sm">{dayName}</span>
                            </div>
                            
                            <div className="flex items-center flex-1 gap-2">
                              <div className="relative flex-1">
                                <div className="relative">
                                  <input
                                    type="time"
                                    value={hours.open}
                                    onChange={(e) => handleOpeningHoursChange(day, 'open', e.target.value)}
                                    disabled={!hours.active}
                                    className="w-full bg-[#1C1C1C] border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm px-2 py-1"
                                    style={{ colorScheme: 'dark' }}
                                  />
                                </div>
                              </div>
                              
                              <span className="text-gray-300 text-sm">às</span>
                              
                              <div className="relative flex-1">
                                <div className="relative">
                                  <input
                                    type="time"
                                    value={hours.close}
                                    onChange={(e) => handleOpeningHoursChange(day, 'close', e.target.value)}
                                    disabled={!hours.active}
                                    className="w-full bg-[#1C1C1C] border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm px-2 py-1"
                                    style={{ colorScheme: 'dark' }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Contatos de Suporte Técnico - NOVA IMPLEMENTAÇÃO */}
                  <div className="pt-2 pb-4 border-t border-gray-800">
                    <label className="block text-lg text-white font-medium mb-3">Contatos de Suporte Técnico</label>
                    
                    {/* Lista de números de telefone */}
                    <div className="space-y-3 mb-4">
                      {reseller.tech_support && reseller.tech_support.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {reseller.tech_support.map((contact, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-[#1C1C1C] rounded-lg">
                              <div className="text-white font-medium">{contact.phone}</div>
                              <button
                                type="button"
                                onClick={() => removeSupportPhone(index)}
                                className="text-red-500 hover:text-red-400 p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 italic">Nenhum número de suporte cadastrado</div>
                      )}
                    </div>
                    
                    {/* Campo para adicionar novo número */}
                    {(reseller.tech_support?.length || 0) < 5 && (
                      <div className="flex gap-2">
                        <InputMask
                          mask="(99) 99999-9999"
                          type="text"
                          value={supportPhone}
                          onChange={(e) => setSupportPhone(e.target.value)}
                          className="flex-1 px-3 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="(00) 00000-0000"
                        />
                        <button
                          type="button"
                          onClick={addSupportPhone}
                          disabled={!supportPhone.trim()}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    )}
                    
                    {(reseller.tech_support?.length || 0) >= 5 && (
                      <div className="text-amber-400 text-sm mt-2">
                        Máximo de 5 números de suporte atingido
                      </div>
                    )}
                  </div>
                  
                  {/* Contatos de Vendas - NOVA IMPLEMENTAÇÃO */}
                  <div className="pt-2 pb-4 border-t border-gray-800">
                    <label className="block text-lg text-white font-medium mb-3">Contatos de Vendas</label>
                    
                    {/* Lista de números de telefone */}
                    <div className="space-y-3 mb-4">
                      {reseller.sales_contacts && reseller.sales_contacts.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {reseller.sales_contacts.map((contact, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-[#1C1C1C] rounded-lg">
                              <div className="text-white font-medium">{contact.phone}</div>
                              <button
                                type="button"
                                onClick={() => removeSalesPhone(index)}
                                className="text-red-500 hover:text-red-400 p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 italic">Nenhum número de vendas cadastrado</div>
                      )}
                    </div>
                    
                    {/* Campo para adicionar novo número */}
                    {(reseller.sales_contacts?.length || 0) < 5 && (
                      <div className="flex gap-2">
                        <InputMask
                          mask="(99) 99999-9999"
                          type="text"
                          value={salesPhone}
                          onChange={(e) => setSalesPhone(e.target.value)}
                          className="flex-1 px-3 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="(00) 00000-0000"
                        />
                        <button
                          type="button"
                          onClick={addSalesPhone}
                          disabled={!salesPhone.trim()}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    )}
                    
                    {(reseller.sales_contacts?.length || 0) >= 5 && (
                      <div className="text-amber-400 text-sm mt-2">
                        Máximo de 5 números de vendas atingido
                      </div>
                    )}
                  </div>
                  
                  {/* Contatos Administrativos - NOVA IMPLEMENTAÇÃO */}
                  <div className="pt-2 pb-4 border-t border-gray-800">
                    <label className="block text-lg text-white font-medium mb-3">Contatos Administrativos</label>
                    
                    {/* Lista de números de telefone */}
                    <div className="space-y-3 mb-4">
                      {reseller.admin_contacts && reseller.admin_contacts.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {reseller.admin_contacts.map((contact, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-[#1C1C1C] rounded-lg">
                              <div className="text-white font-medium">{contact.phone}</div>
                              <button
                                type="button"
                                onClick={() => removeAdminPhone(index)}
                                className="text-red-500 hover:text-red-400 p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 italic">Nenhum número administrativo cadastrado</div>
                      )}
                    </div>
                    
                    {/* Campo para adicionar novo número */}
                    {(reseller.admin_contacts?.length || 0) < 5 && (
                      <div className="flex gap-2">
                        <InputMask
                          mask="(99) 99999-9999"
                          type="text"
                          value={adminPhone}
                          onChange={(e) => setAdminPhone(e.target.value)}
                          className="flex-1 px-3 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="(00) 00000-0000"
                        />
                        <button
                          type="button"
                          onClick={addAdminPhone}
                          disabled={!adminPhone.trim()}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    )}
                    
                    {(reseller.admin_contacts?.length || 0) >= 5 && (
                      <div className="text-amber-400 text-sm mt-2">
                        Máximo de 5 números administrativos atingido
                      </div>
                    )}
                  </div>
                  
                  {/* Informações Adicionais */}
                  <div>
                    <label className="block text-gray-400 mb-1">Informações Adicionais</label>
                    <textarea
                      name="additional_info"
                      value={reseller.additional_info || ''}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Informações adicionais sobre a revenda..."
                    />
                  </div>
                  
                  {/* Acesso ao Sistema */}
                  <div className="pt-6 pb-4 border-t border-gray-800 mt-6">
                    <label className="block text-lg text-white font-medium mb-4">Acesso ao Sistema</label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Nome de Usuário */}
                      <div>
                        <label className="block text-gray-400 mb-1">Nome de Usuário</label>
                        <input
                          type="text"
                          name="user_name"
                          value={reseller.user_name || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="Nome para login no sistema"
                        />
                      </div>
                      
                      {/* Email */}
                      <div>
                        <label className="block text-gray-400 mb-1">Email</label>
                        <input
                          type="email"
                          name="user_email"
                          value={reseller.user_email || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="Email para login"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Senha */}
                      <div>
                        <label className="block text-gray-400 mb-1">Senha</label>
                        <input
                          type="password"
                          name="user_password"
                          value={reseller.user_password || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="••••••••"
                        />
                      </div>
                      
                      {/* Confirmar Senha */}
                      <div>
                        <label className="block text-gray-400 mb-1">Confirmar Senha</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={handleConfirmPasswordChange}
                          onBlur={validatePasswords}
                          className={`w-full px-4 py-2 bg-[#1C1C1C] border ${passwordError ? 'border-red-500' : 'border-gray-800'} rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                          placeholder="••••••••"
                        />
                        {passwordError && (
                          <p className="mt-1 text-sm text-red-500">{passwordError}</p>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-400 mt-3">
                      Estes dados serão utilizados para o login da revenda no sistema administrativo.
                    </p>
                  </div>
                </div>
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
                Tem certeza que deseja excluir a revenda "{reseller.trade_name}"? Esta ação não pode ser desfeita.
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