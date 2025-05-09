import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, X, Plus, RefreshCw, Check, LogOut, MessageSquare } from 'lucide-react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AIChat from '../components/AIChat';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

// Interface para conexões WhatsApp
interface WhatsAppConnection {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive' | 'connecting' | 'disconnected';
  created_at: string;
  instance_name: string;
  reseller_id?: string;
}

// Interface para instância da Evolution API
interface EvolutionInstance {
  instanceName: string;
  token: string;
  status: string;
  qrcode?: string;
  number?: string;
}

// Interface para resposta do QR Code
interface QRCodeResponse {
  qrcode: string;
  status: string;
}

// Interface para usuários
interface Usuario {
  id: string;
  admin_id: string;
  nome: string;
  email: string;
  tipo: string;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
  reseller_id?: string;
  source: 'profile_admin' | 'profile_admin_user'; // Identifica a tabela de origem do usuário
  dev?: string; // Campo para indicar se o usuário é desenvolvedor (S/N)
}

// Interface para revendas
interface Revenda {
  id: string;
  trade_name: string;
  legal_name: string;
  document_number: string;
  address_cep: string;
  address_street: string;
  address_number: string;
  address_complement?: string;
  address_district: string;
  address_city: string;
  address_state: string;
  created_at: string;
  status: string;
  code?: string;
  website?: string;
  additional_info?: string;
  // Campos do usuário admin
  admin_id?: string;
  admin_nome?: string;
  admin_email?: string;
  admin_senha?: string;
}

// Interface para configurações do Chat Nexo
interface NexoChatConfig {
  id?: string;
  reseller_id?: string;
  nome_assistente?: string;
  mensagem_boas_vindas?: string;
  resposta_automatica?: boolean;
  setor_suporte?: boolean;
  setor_comercial?: boolean;
  setor_administrativo?: boolean;
  prompt_suporte?: string;
  prompt_comercial?: string;
  prompt_administrativo?: string;
  integracao_ia?: boolean;
  horario_segunda_ativo?: boolean;
  horario_segunda_inicio?: string;
  horario_segunda_fim?: string;
  horario_terca_ativo?: boolean;
  horario_terca_inicio?: string;
  horario_terca_fim?: string;
  horario_quarta_ativo?: boolean;
  horario_quarta_inicio?: string;
  horario_quarta_fim?: string;
  horario_quinta_ativo?: boolean;
  horario_quinta_inicio?: string;
  horario_quinta_fim?: string;
  horario_sexta_ativo?: boolean;
  horario_sexta_inicio?: string;
  horario_sexta_fim?: string;
  horario_sabado_ativo?: boolean;
  horario_sabado_inicio?: string;
  horario_sabado_fim?: string;
  horario_domingo_ativo?: boolean;
  horario_domingo_inicio?: string;
  horario_domingo_fim?: string;
  created_at?: string;
  updated_at?: string;
}

export default function Settings() {
  const navigate = useNavigate();
  // Referência para o intervalo de atualização do QR Code
  const qrCodeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Referência para o intervalo de verificação do status da conexão
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [activeTab, setActiveTab] = useState<'whatsapp' | 'usuarios' | 'revenda' | 'chat_nexo'>('whatsapp');
  const [iaIntegrationEnabled, setIaIntegrationEnabled] = useState(false);
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [revenda, setRevenda] = useState<Revenda | null>(null);
  const [loading, setLoading] = useState(false);
  const [revendaLoading, setRevendaLoading] = useState(false);
  
  // Estados para configurações do Chat Nexo
  const [chatConfig, setChatConfig] = useState<NexoChatConfig>({
    nome_assistente: '',
    mensagem_boas_vindas: '',
    resposta_automatica: false,
    setor_suporte: false,
    setor_comercial: false,
    setor_administrativo: false,
    prompt_suporte: '',
    prompt_comercial: '',
    prompt_administrativo: '',
    integracao_ia: false,
    horario_segunda_ativo: false,
    horario_segunda_inicio: '08:00',
    horario_segunda_fim: '18:00',
    horario_terca_ativo: false,
    horario_terca_inicio: '08:00',
    horario_terca_fim: '18:00',
    horario_quarta_ativo: false,
    horario_quarta_inicio: '08:00',
    horario_quarta_fim: '18:00',
    horario_quinta_ativo: false,
    horario_quinta_inicio: '08:00',
    horario_quinta_fim: '18:00',
    horario_sexta_ativo: false,
    horario_sexta_inicio: '08:00',
    horario_sexta_fim: '18:00',
    horario_sabado_ativo: false,
    horario_sabado_inicio: '08:00',
    horario_sabado_fim: '18:00',
    horario_domingo_ativo: false,
    horario_domingo_inicio: '08:00',
    horario_domingo_fim: '18:00'
  });
  const [chatConfigLoading, setChatConfigLoading] = useState(false);
  
  // Estados para o modal de WhatsApp
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [instanceName, setInstanceName] = useState('');
  const [qrCodeData, setQRCodeData] = useState<string>('');
  const [loadingQRCode, setLoadingQRCode] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [instanceCreated, setInstanceCreated] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<{id: string, action: string} | null>(null);
  const [showDeleteConfirmWhatsapp, setShowDeleteConfirmWhatsapp] = useState(false);
  const [instanceToDelete, setInstanceToDelete] = useState<{id: string, name: string, instance: string} | null>(null);
  const [currentConnection, setCurrentConnection] = useState<WhatsAppConnection | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'pending' | 'connected' | 'failed'>('pending');
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  // Estado para o modal de confirmação (usado tanto para desconectar quanto para excluir)
  const [confirmationModal, setConfirmationModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDelete: false,
    instanceName: '',
    connectionId: '',
    loading: false
  });
  
  // Estados para o modal de adicionar/editar usuário
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    tipo: 'Administrativo',
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });
  const [errors, setErrors] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });
  
  // Estado para confirmação de exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);
  // Usar localStorage para manter o estado do menu entre navegações
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Verificar se há uma preferência salva no localStorage
    const savedState = localStorage.getItem('sidebar_collapsed');
    // Se não houver preferência salva, começar retraído por padrão
    return savedState === null ? true : savedState === 'true';
  });
  
  // Estado para o chat de IA
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // Informações do usuário logado
  const [userInfo, setUserInfo] = useState({
    email: '',
    companyName: '',
    id: '',
    reseller_id: null as string | null,
    userType: '',
    dev: 'N',
    nome: '' // Adicionado o campo nome para compatibilidade com o chat IA
  });

  useEffect(() => {
    // Check admin session
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) {
      navigate('/admin/login');
      return;
    }

    const session = JSON.parse(adminSession);
    const sessionAge = Date.now() - session.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxAge) {
      localStorage.removeItem('admin_session');
      navigate('/admin/login');
      return;
    }
    
    // Extrair informações do usuário da sessão
    setUserInfo({
      email: session.email || '',
      companyName: session.companyName || '',
      id: session.id || '',
      reseller_id: session.reseller_id || null,
      userType: session.userType || '',
      dev: session.dev || 'N', // Obter o valor do campo dev da sessão
      nome: session.nome || '' // Adicionado o campo nome para compatibilidade com o chat IA
    });
    
    // Carregar usuários vinculados ao administrador logado e/ou à revenda
    loadUsers(session.id, session.reseller_id as string | null, session.userType);

    // Se for um usuário admin (profile_admin) e tiver uma revenda associada, carregar dados da revenda
    if (session.userType === 'admin' && session.reseller_id) {
      loadRevendaData(session.reseller_id);
    }
    
    // Carregar conexões WhatsApp
    loadWhatsAppConnections(session.id);
  }, [navigate]);
  
  // useEffect para carregar configurações do Chat Nexo quando a aba for selecionada
  useEffect(() => {
    if (activeTab === 'chat_nexo' && userInfo.reseller_id) {
      console.log('Carregando configurações do Chat Nexo...');
      loadChatConfig(userInfo.reseller_id as string);
    }
  }, [activeTab, userInfo.reseller_id]);

  // Função para carregar os dados da revenda
  const loadRevendaData = async (resellerId: string) => {
    try {
      setRevendaLoading(true);
      
      // Buscar os dados da revenda
      const { data: resellerData, error: resellerError } = await supabase
        .from('resellers')
        .select('*')
        .eq('id', resellerId)
        .single();
      
      if (resellerError) {
        console.error('Erro ao buscar dados da revenda:', resellerError);
        toast.error('Erro ao carregar dados da revenda');
        return;
      }
      
      if (resellerData) {
        // Buscar o usuário admin associado a esta revenda
        const { data: adminData, error: adminError } = await supabase
          .from('profile_admin')
          .select('id, nome_usuario, email')
          .eq('reseller_id', resellerId)
          .maybeSingle();

        if (adminError) {
          console.error('Erro ao buscar dados do admin da revenda:', adminError);
        }

        // Usar type assertion para corrigir problemas de tipagem
        const revendaCompleta: Revenda = {
          id: String(resellerData.id),
          trade_name: String(resellerData.trade_name),
          legal_name: String(resellerData.legal_name),
          document_number: String(resellerData.document_number),
          address_cep: String(resellerData.address_cep),
          address_street: String(resellerData.address_street),
          address_number: String(resellerData.address_number),
          address_complement: resellerData.address_complement ? String(resellerData.address_complement) : undefined,
          address_district: String(resellerData.address_district),
          address_city: String(resellerData.address_city),
          address_state: String(resellerData.address_state),
          created_at: String(resellerData.created_at),
          status: String(resellerData.status),
          code: resellerData.code ? String(resellerData.code) : undefined,
          website: resellerData.website ? String(resellerData.website) : undefined,
          additional_info: resellerData.additional_info ? String(resellerData.additional_info) : undefined,
          admin_id: adminData?.id ? String(adminData.id) : undefined,
          admin_nome: adminData?.nome_usuario ? String(adminData.nome_usuario) : undefined,
          admin_email: adminData?.email ? String(adminData.email) : undefined
        };

        setRevenda(revendaCompleta);
        console.log('Dados da revenda carregados com sucesso:', revendaCompleta);
      } else {
        console.error('Nenhum dado de revenda encontrado para o ID:', resellerId);
        toast.error('Dados da revenda não encontrados');
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados da revenda:', error);
      toast.error('Erro ao carregar dados da revenda: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setRevendaLoading(false);
    }
  };

  
  // Função para carregar os usuários vinculados ao admin_id e/ou revenda
  const loadUsers = async (adminId: string, resellerId: string | null, userType: string) => {
    try {
      setLoading(true);
      
      // Array para armazenar todos os usuários das duas tabelas
      let allUsers: Usuario[] = [];
      
      // 1. Primeiro, carregar os usuários da tabela profile_admin_user
      let queryAdminUsers = supabase
        .from('profile_admin_user')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filtrar os usuários com base no tipo de usuário logado e revenda
      if (userType === 'admin' && resellerId) {
        // Para admin com revenda vinculada, mostrar apenas usuários da mesma revenda
        queryAdminUsers = queryAdminUsers.eq('reseller_id', resellerId);
      } else if (userType === 'admin_user' && resellerId) {
        // Para admin_user com revenda vinculada, mostrar apenas usuários da mesma revenda
        queryAdminUsers = queryAdminUsers.eq('reseller_id', resellerId);
      } else {
        // Para admin sem revenda vinculada, mostrar seus usuários criados
        queryAdminUsers = queryAdminUsers.eq('admin_id', adminId);
      }
      
      const { data: adminUserData, error: adminUserError } = await queryAdminUsers;
      
      if (adminUserError) {
        throw adminUserError;
      }
      
      if (adminUserData) {
        // Converter explicitamente cada objeto da tabela profile_admin_user para o tipo Usuario
        const typedAdminUserData: Usuario[] = adminUserData.map((item: any) => ({
          id: item.id as string,
          admin_id: item.admin_id as string,
          nome: item.nome as string,
          email: item.email as string,
          tipo: item.tipo as string,
          status: item.status as 'active' | 'inactive' | 'blocked',
          created_at: item.created_at as string,
          reseller_id: item.reseller_id as string | undefined,
          source: 'profile_admin_user', // Marcar a origem como profile_admin_user
          dev: item.dev as string // Incluir o campo dev
        }));
        allUsers = [...typedAdminUserData];
      }
      
      // 2. Agora, carregar os usuários da tabela profile_admin
      let queryAdmins = supabase
        .from('profile_admin')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Aplicar o mesmo filtro por reseller_id, se aplicável
      if (resellerId) {
        queryAdmins = queryAdmins.eq('reseller_id', resellerId);
      }
      
      const { data: adminData, error: adminError } = await queryAdmins;
      
      if (adminError) {
        throw adminError;
      }
      
      if (adminData) {
        // Converter explicitamente cada objeto da tabela profile_admin para o tipo Usuario
        const typedAdminData: Usuario[] = adminData.map((item: any) => ({
          id: item.id as string,
          admin_id: '', // admin não tem admin_id pois é o próprio admin
          nome: item.nome_usuario as string,
          email: item.email as string,
          tipo: 'Administrador', // Definir um tipo para admins
          status: item.status as 'active' | 'inactive' | 'blocked',
          created_at: item.created_at as string,
          reseller_id: item.reseller_id as string | undefined,
          source: 'profile_admin', // Marcar a origem como profile_admin
          dev: item.dev as string // Incluir o campo dev
        }));
        allUsers = [...allUsers, ...typedAdminData];
      }
      
      // Ordenar todos os usuários por data de criação (mais recentes primeiro)
      allUsers.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setUsuarios(allUsers);
      
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    navigate('/admin/login');
  };
  
  // Função para mostrar modal de confirmação de desconexão
  const showDisconnectConfirmation = (connectionId: string, instanceName: string) => {
    setConfirmationModal({
      show: true,
      title: 'Desconectar WhatsApp',
      message: `Tem certeza que deseja desconectar esta conexão WhatsApp?\n\nA instância "${instanceName}" será desconectada, mas não será excluída.`,
      onConfirm: () => handleDisconnectWhatsApp(connectionId, instanceName),
      isDelete: false,
      instanceName,
      connectionId
    });
  };
  
  // Função para mostrar modal de confirmação de exclusão
  const showDeleteConfirmation = (connectionId: string, instanceName: string) => {
    setConfirmationModal({
      show: true,
      title: 'Excluir Conexão',
      message: `Tem certeza que deseja excluir esta conexão WhatsApp?\n\nA instância "${instanceName}" será completamente removida. Esta ação não pode ser desfeita.`,
      onConfirm: () => handleDeleteConnectionConfirmed(connectionId, instanceName),
      isDelete: true,
      instanceName,
      connectionId
    });
  };
  
  // Função para fechar o modal de confirmação
  const closeConfirmationModal = () => {
    setConfirmationModal(prev => ({ ...prev, show: false, loading: false }));
  };
  
  // Função para desconectar uma instância WhatsApp
  const handleDisconnectWhatsApp = async (connectionId: string, instanceName: string) => {
    try {
      setLoadingAction({ id: connectionId, action: 'disconnect' });
      
      // Chamada para a API de desconexão
      const response = await fetch(`https://apiwhatsapp.nexopdv.com/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '429683C4C977415CAAFCCE10F7D57E11'
        }
      });
      
      // Verificar se a requisição foi bem-sucedida
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao desconectar instância');
      }
      
      // Atualizar status da conexão no banco de dados
      const { error: dbError } = await supabase
        .from('whatsapp_connections')
        .update({ status: 'inactive' })
        .eq('id', connectionId);
      
      if (dbError) {
        throw dbError;
      }
      
      // Atualizar a lista de conexões para refletir a mudança de status
      setWhatsappConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status: 'inactive' as 'active' | 'inactive' | 'connecting' } 
            : conn
        )
      );
      
      toast.success('Conexão WhatsApp desconectada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao desconectar WhatsApp:', error);
      toast.error(`Erro ao desconectar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoadingAction(null);
      closeConfirmationModal();
    }
  };
  
  // Função para excluir uma conexão (mostra confirmação)
  const handleDeleteConnection = (connectionId: string, instanceName: string) => {
    showDeleteConfirmation(connectionId, instanceName);
  };
  
  // Função que executa a exclusão após confirmação
  const handleDeleteConnectionConfirmed = async (connectionId: string, instanceName: string) => {
    try {
      setLoadingAction({ id: connectionId, action: 'delete' });
      
      // Deletar a instância na API Evolution
      const response = await fetch(`https://apiwhatsapp.nexopdv.com/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '429683C4C977415CAAFCCE10F7D57E11'
        }
      });
      
      // Verificar se a requisição foi bem-sucedida
      if (!response.ok) {
        // Ignoramos erros da API, pois a instância pode não existir mais no servidor
        console.warn('Aviso: A instância pode não ter sido encontrada na API, continuando com a exclusão do banco de dados');
      }
      
      // Remover a conexão do banco de dados
      const { error: dbError } = await supabase
        .from('whatsapp_connections')
        .delete()
        .eq('id', connectionId);
      
      if (dbError) {
        throw dbError;
      }
      
      // Atualizar a lista de conexões para remover a conexão excluída
      setWhatsappConnections(prev => prev.filter(conn => conn.id !== connectionId));
      
      toast.success('Conexão WhatsApp excluída com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir conexão:', error);
      toast.error(`Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoadingAction(null);
      closeConfirmationModal();
    }
  };
  
  // Função para abrir o modal de edição de usuário
  const handleEditUser = (usuario: Usuario) => {
    // Não permitir editar usuários da tabela profile_admin
    if (usuario.source === 'profile_admin') {
      toast.error('Não é possível editar usuários administradores.');
      return;
    }
    
    setIsEditMode(true);
    setEditingUserId(usuario.id);
    setNewUser({
      tipo: usuario.tipo,
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      confirmarSenha: ''
    });
    setErrors({
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: ''
    });
    setShowAddUserModal(true);
  };
  
  // Função para alternar o status do usuário (ativar/inativar)
  const handleToggleStatus = async (usuario: Usuario) => {
    // Não permitir alterar status de usuários da tabela profile_admin
    if (usuario.source === 'profile_admin') {
      toast.error('Não é possível alterar o status de usuários administradores.');
      return;
    }
    
    // Impedir que o usuário logado desative seu próprio usuário
    if (usuario.id === userInfo.id) {
      toast.error('Não é possível alterar o status do seu próprio usuário.');
      return;
    }
    
    try {
      // Determinar o novo status (se está ativo, inativar; se está inativo, ativar)
      const newStatus = usuario.status === 'active' ? 'inactive' : 'active';
      
      const { data, error } = await supabase
        .from('profile_admin_user')
        .update({ status: newStatus })
        .eq('id', usuario.id)
        .select();
        
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        // Converter o objeto retornado para o tipo Usuario
        const updatedUser: Usuario = {
          id: data[0].id as string,
          admin_id: data[0].admin_id as string,
          nome: data[0].nome as string,
          email: data[0].email as string,
          tipo: data[0].tipo as string,
          status: data[0].status as 'active' | 'inactive' | 'blocked',
          created_at: data[0].created_at as string,
          reseller_id: data[0].reseller_id as string | undefined,
          source: 'profile_admin_user', // Usuários editados sempre são da tabela profile_admin_user
          dev: data[0].dev as string // Incluir o campo dev
        };
        
        // Atualizar o usuário na lista
        setUsuarios(prev => prev.map(u => u.id === usuario.id ? updatedUser : u));
        
        toast.success(`Usuário ${newStatus === 'active' ? 'ativado' : 'inativado'} com sucesso!`);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar status do usuário:', error);
      toast.error('Erro ao atualizar status: ' + error.message);
    }
  };
  
  // Função para abrir o modal de confirmação de exclusão
  const handleDeleteClick = (usuario: Usuario) => {
    // Não permitir excluir usuários da tabela profile_admin
    if (usuario.source === 'profile_admin') {
      toast.error('Não é possível excluir usuários administradores.');
      return;
    }
    
    // Impedir que o usuário logado exclua seu próprio usuário
    if (usuario.id === userInfo.id) {
      toast.error('Não é possível excluir seu próprio usuário.');
      return;
    }
    
    setUserToDelete(usuario);
    setShowDeleteConfirm(true);
  };
  
  // Função para criar novo modal de confirmação de exclusão
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    
    // Verificação adicional de segurança
    if (userToDelete.source === 'profile_admin') {
      toast.error('Não é possível excluir usuários administradores.');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profile_admin_user')
        .delete()
        .eq('id', userToDelete.id);
        
      if (error) {
        throw error;
      }
      
      toast.success('Usuário excluído com sucesso!');
      
      // Atualizar a lista de usuários
      setUsuarios(prev => prev.filter(u => u.id !== userToDelete.id));
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário: ' + error.message);
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  // Função para carregar configurações do Chat Nexo
  const loadChatConfig = async (resellerId: string) => {
    if (!resellerId) {
      console.log('ID da revenda não informado');
      return;
    }
    
    setChatConfigLoading(true);
    try {
      console.log('Carregando configurações do chat para revenda:', resellerId);
      const { data, error } = await supabase
        .from('nexochat_config')
        .select('*')
        .eq('reseller_id', resellerId)
        .single();
      
      if (error) {
        console.error('Erro ao carregar configurações do chat:', error);
        // Se não encontrar configuração, pode criar uma nova
        if (error.code === 'PGRST116') {
          console.log('Nenhuma configuração encontrada, criando nova...');
          await createDefaultChatConfig(resellerId);
        } else {
          toast.error('Erro ao carregar configurações do chat');
        }
      } else if (data) {
        console.log('Configurações do chat carregadas:', data);
        // Formatar os horários para o formato da interface (HH:MM)
        const formattedConfig = {
          ...data,
          horario_segunda_inicio: data.horario_segunda_inicio ? data.horario_segunda_inicio.substring(0, 5) : '08:00',
          horario_segunda_fim: data.horario_segunda_fim ? data.horario_segunda_fim.substring(0, 5) : '18:00',
          horario_terca_inicio: data.horario_terca_inicio ? data.horario_terca_inicio.substring(0, 5) : '08:00',
          horario_terca_fim: data.horario_terca_fim ? data.horario_terca_fim.substring(0, 5) : '18:00',
          horario_quarta_inicio: data.horario_quarta_inicio ? data.horario_quarta_inicio.substring(0, 5) : '08:00',
          horario_quarta_fim: data.horario_quarta_fim ? data.horario_quarta_fim.substring(0, 5) : '18:00',
          horario_quinta_inicio: data.horario_quinta_inicio ? data.horario_quinta_inicio.substring(0, 5) : '08:00',
          horario_quinta_fim: data.horario_quinta_fim ? data.horario_quinta_fim.substring(0, 5) : '18:00',
          horario_sexta_inicio: data.horario_sexta_inicio ? data.horario_sexta_inicio.substring(0, 5) : '08:00',
          horario_sexta_fim: data.horario_sexta_fim ? data.horario_sexta_fim.substring(0, 5) : '18:00',
          horario_sabado_inicio: data.horario_sabado_inicio ? data.horario_sabado_inicio.substring(0, 5) : '08:00',
          horario_sabado_fim: data.horario_sabado_fim ? data.horario_sabado_fim.substring(0, 5) : '18:00',
          horario_domingo_inicio: data.horario_domingo_inicio ? data.horario_domingo_inicio.substring(0, 5) : '08:00',
          horario_domingo_fim: data.horario_domingo_fim ? data.horario_domingo_fim.substring(0, 5) : '18:00',
        };
        
        setChatConfig(formattedConfig);
        // Atualizar o estado de integração com IA
        setIaIntegrationEnabled(!!data.integracao_ia);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do chat:', error);
      toast.error('Erro ao carregar configurações do chat');
    } finally {
      setChatConfigLoading(false);
    }
  };

  // Função para criar configuração padrão se não existir
  const createDefaultChatConfig = async (resellerId: string) => {
    try {
      const defaultConfig = {
        reseller_id: resellerId,
        nome_assistente: 'Assistente Nexo',
        mensagem_boas_vindas: 'Olá, sou o assistente virtual do Nexo PDV. Como posso ajudar?',
        resposta_automatica: false,
        setor_suporte: false,
        setor_comercial: false,
        setor_administrativo: false,
        integracao_ia: false,
        horario_segunda_ativo: false,
        horario_terca_ativo: false,
        horario_quarta_ativo: false,
        horario_quinta_ativo: false,
        horario_sexta_ativo: false,
        horario_sabado_ativo: false,
        horario_domingo_ativo: false
      };
      
      const { data, error } = await supabase
        .from('nexochat_config')
        .insert(defaultConfig)
        .select()
        .single();
        
      if (error) {
        console.error('Erro ao criar configuração padrão:', error);
        toast.error('Erro ao criar configuração padrão do chat');
      } else if (data) {
        setChatConfig(data);
        toast.success('Configuração padrão do chat criada com sucesso');
      }
    } catch (error) {
      console.error('Erro ao criar configuração padrão:', error);
      toast.error('Erro ao criar configuração padrão do chat');
    }
  };

  // Função para salvar configurações do Chat Nexo
  const saveChatConfig = async () => {
    if (!userInfo.reseller_id) {
      toast.error('ID da revenda não encontrado');
      return;
    }
    
    setChatConfigLoading(true);
    try {
      // Formatar os dados para o formato do banco
      const dataToSave = {
        ...chatConfig,
        reseller_id: userInfo.reseller_id,
        integracao_ia: iaIntegrationEnabled,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('nexochat_config')
        .upsert(dataToSave, { onConflict: 'reseller_id' });
        
      if (error) {
        console.error('Erro ao salvar configurações do chat:', error);
        toast.error('Erro ao salvar configurações do chat');
      } else {
        toast.success('Configurações do chat salvas com sucesso');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações do chat:', error);
      toast.error('Erro ao salvar configurações do chat');
    } finally {
      setChatConfigLoading(false);
    }
  };
  
  // Função para carregar conexões WhatsApp do banco de dados
  const loadWhatsAppConnections = async (adminId: string) => {
    try {
      // Verificar se adminId é válido (não vazio)
      if (!adminId) {
        console.error('AdminId inválido ou vazio:', adminId);
        setWhatsappLoading(false);
        return;
      }
      
      console.log('Carregando conexões WhatsApp para adminId:', adminId || 'não definido');
      setWhatsappLoading(true);
      
      // Primeiro, precisamos obter o reseller_id do admin logado
      const { data: adminData, error: adminError } = await supabase
        .from('profile_admin')
        .select('reseller_id')
        .eq('id', adminId)
        .single();
        
      if (adminError) {
        console.error('Erro ao obter dados do administrador:', adminError);
        throw new Error('Erro ao obter dados do administrador: ' + adminError.message);
      }
      
      const resellerId = adminData?.reseller_id;
      console.log('Reseller ID do admin logado:', resellerId);
      
      // Buscar diretamente na API Evolution todas as instâncias
      try {
        const apiResponse = await fetch('https://apiwhatsapp.nexopdv.com/instance/fetchInstances', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': '429683C4C977415CAAFCCE10F7D57E11'
          }
        });
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          console.log('Instâncias encontradas na API:', apiData?.data?.length || 0);
        }
      } catch (apiError) {
        console.error('Erro ao buscar instâncias na API:', apiError);
      }
      
      // Buscar as conexões existentes na tabela do Supabase, filtrando por reseller_id se existir
      let query = supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('admin_id', adminId);
      
      // Se tiver reseller_id, filtrar por ele também
      if (resellerId) {
        query = query.eq('reseller_id', resellerId);
      }
      
      const { data, error } = await query;
        
      if (error) {
        throw error;
      }
      
      let typedConnections: WhatsAppConnection[] = [];
      
      console.log('Conexões encontradas no banco:', data ? data.length : 0);
      
      if (data) {
        // Converter explicitamente para o tipo WhatsAppConnection
        const connections = data.map(item => ({
          id: String(item.id),
          admin_id: String(item.admin_id),
          name: String(item.name),
          phone: String(item.phone || ''),
          status: item.status && typeof item.status === 'string' && ['active', 'inactive', 'connecting', 'disconnected'].includes(item.status) ? item.status as WhatsAppConnection['status'] : 'inactive',
          created_at: String(item.created_at),
          instance_name: String(item.instance_name || '')
        }));
        typedConnections = connections;
      }
      
      // Buscar todas as instâncias na Evolution API
      try {
        const response = await fetch('https://apiwhatsapp.nexopdv.com/instance/fetchInstances', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': '429683C4C977415CAAFCCE10F7D57E11'
          }
        });
        
        if (response.ok) {
          const apiInstances = await response.json();
          console.log('Instâncias da API:', apiInstances);
          
          if (apiInstances && apiInstances.data && Array.isArray(apiInstances.data)) {
            // Para cada instância da API, verificar se já existe no banco
            for (const instance of apiInstances.data) {
              // Buscar o status da instância
              let instanceStatus: WhatsAppConnection['status'] = 'disconnected';
              try {
                const statusResponse = await fetch(`https://apiwhatsapp.nexopdv.com/instance/connectionState?instanceName=${instance.instance.instanceName}`, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': '429683C4C977415CAAFCCE10F7D57E11'
                  }
                });
                
                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  instanceStatus = statusData.state === 'open' ? 'active' : 'disconnected';
                }
              } catch (statusError) {
                console.error('Erro ao verificar status da instância:', statusError);
              }
              
              // Verificar se a instância já existe no banco
              const existingConnection = typedConnections.find(conn => 
                conn.instance_name === instance.instance.instanceName
              );
              
              if (existingConnection) {
                // Atualizar o status da instância existente
                if (existingConnection.status !== instanceStatus) {
                  await supabase
                    .from('whatsapp_connections')
                    .update({ status: instanceStatus })
                    .eq('id', existingConnection.id);
                    
                  // Atualizar na lista em memória
                  existingConnection.status = instanceStatus;
                }
              } else {
                // Criar nova conexão no banco para instância encontrada na API
                const { data: newConn, error: insertError } = await supabase
                  .from('whatsapp_connections')
                  .insert({
                    admin_id: adminId,
                    instance_name: instance.instance.instanceName,
                    name: instance.instance.instanceName,
                    phone: '',  // Podemos tentar buscar mais informações se necessário
                    status: instanceStatus,
                    created_at: new Date().toISOString()
                  })
                  .select();
                  
                if (insertError) {
                  console.error('Erro ao inserir nova conexão:', insertError);
                } else if (newConn && newConn.length > 0) {
                  // Adicionar a nova conexão à lista
                  typedConnections.push({
                    id: newConn[0].id,
                    name: newConn[0].name,
                    phone: newConn[0].phone,
                    status: newConn[0].status && typeof newConn[0].status === 'string' && ['active', 'inactive', 'connecting', 'disconnected'].includes(newConn[0].status) ? newConn[0].status as WhatsAppConnection['status'] : 'disconnected',
                    created_at: newConn[0].created_at,
                    instance_name: newConn[0].instance_name
                  });
                }
              }
            }
          }
        }
      } catch (apiError) {
        console.error('Erro ao buscar instâncias da API:', apiError);
      }
      
      setWhatsappConnections(typedConnections);
    } catch (error: any) {
      console.error('Erro ao carregar conexões WhatsApp:', error);
      toast.error('Erro ao carregar conexões: ' + error.message);
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleAddWhatsAppConnection = () => {
    setConnectionError('');
    setQRCodeData('');
    setInstanceName('');
    setInstanceCreated(false);
    setSelectedConnectionId(null);
    setSelectedInstance('');
    setShowWhatsAppModal(true);
  };
  
  const closeWhatsAppModal = () => {
    // Limpar os intervalos ao fechar o modal
    if (qrCodeIntervalRef.current) {
      clearInterval(qrCodeIntervalRef.current);
      qrCodeIntervalRef.current = null;
    }
    
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
    
    setShowWhatsAppModal(false);
    setConnectionError('');
    setQRCodeData('');
    setSelectedConnectionId(null);
    setSelectedInstance('');
    
    // Forçar atualização da lista de conexões quando fechar o modal
    if (userInfo) {
      // Pequeno delay para garantir que qualquer operação de banco tenha finalizado
      setTimeout(() => {
        loadWhatsAppConnections(userInfo.id);
      }, 500);
    }
  };
  
  const createInstance = async () => {
    if (!instanceName.trim()) {
      setConnectionError('Nome da instância é obrigatório');
      return;
    }
    
    if (!userInfo || !userInfo.id) {
      setConnectionError('Erro de autenticação. Faça login novamente.');
      return;
    }
    
    try {
      setLoadingQRCode(true);
      setConnectionError('');
      
      console.log('Tentando criar instância:', instanceName.trim());
      
      // Verificar primeiro se a instância já existe na Evolution API
      try {
        const checkResponse = await fetch(`https://apiwhatsapp.nexopdv.com/instance/fetchInstances`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': '429683C4C977415CAAFCCE10F7D57E11'
          }
        });
        
        const checkData = await checkResponse.json();
        console.log('Instâncias existentes:', checkData);
        
        // Verificar se a instância já existe
        if (checkData && checkData.data && Array.isArray(checkData.data)) {
          const exists = checkData.data.some((instance: { instance: { instanceName: string } }) => 
            instance.instance.instanceName === instanceName.trim()
          );
          
          if (exists) {
            // Se a instância já existe na API, criar apenas no banco se não existir
            const { data: existsInDb } = await supabase
              .from('whatsapp_connections')
              .select('id')
              .eq('instance_name', instanceName.trim())
              .eq('admin_id', userInfo.id);
              
            if (!existsInDb || existsInDb.length === 0) {
              // Instância existe na API mas não no banco, então criar no banco
              await saveInstanceToDatabase(instanceName.trim());
              toast.success('Instância existente vinculada com sucesso!');
            }
            
            // Fechar o modal em vez de mostrar QR Code
            closeWhatsAppModal();
            setTimeout(() => {
              toast.info('Clique em "Conectar" na linha da instância para escanear o QR code');
            }, 1000);
            return;
          }
        }
      } catch (checkError) {
        console.error('Erro ao verificar instâncias:', checkError);
      }
      
      // Criar a instância na Evolution API - formato validado via curl
      const response = await fetch('https://apiwhatsapp.nexopdv.com/instance/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '429683C4C977415CAAFCCE10F7D57E11'
        },
        body: JSON.stringify({
          instanceName: instanceName.trim(),
          integration: 'WHATSAPP-BAILEYS'
        })
      });
      
      console.log('Status da resposta:', response.status, response.statusText);
      
      const responseText = await response.text();
      console.log('Resposta bruta:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erro ao analisar JSON:', parseError);
        throw new Error(`Erro no formato da resposta: ${responseText.substring(0, 100)}...`);
      }
      
      if (!response.ok) {
        console.error('Erro detalhado:', data);
        throw new Error(data.message || data.error || 'Erro ao criar instância');
      }
      
      // Salvar a instância no banco de dados imediatamente
      await saveInstanceToDatabase(instanceName.trim());
      
      // Fechar o modal em vez de mostrar QR Code
      closeWhatsAppModal();
      
      toast.success('Instância criada com sucesso!');
      setTimeout(() => {
        toast.info('Clique em "Conectar" na linha da instância para escanear o QR code');
      }, 1000);
    } catch (error: any) {
      console.error('Erro ao criar instância:', error);
      setConnectionError(error.message || 'Erro ao criar instância');
      setLoadingQRCode(false);
    }
  };
  
  // Função auxiliar para salvar a instância no banco de dados
  const saveInstanceToDatabase = async (instanceNameToSave: string) => {
    if (!userInfo || !userInfo.id) {
      console.error('userInfo não disponível para salvar instância');
      return;
    }
    
    try {
      // Verificar se userInfo.id é válido
      if (!userInfo.id || userInfo.id.trim() === '') {
        console.error('ID do usuário inválido ou vazio');
        throw new Error('ID do usuário inválido. Faça login novamente.');
      }
      
      console.log('Salvando instância no banco:', instanceNameToSave, 'para admin_id:', userInfo.id);
      
      // Obter o reseller_id do admin logado
      const { data: adminData, error: adminError } = await supabase
        .from('profile_admin')
        .select('reseller_id')
        .eq('id', userInfo.id)
        .single();
        
      if (adminError) {
        console.error('Erro ao obter reseller_id do admin:', adminError);
        throw new Error('Erro ao obter dados do administrador: ' + adminError.message);
      }
      
      const resellerId = adminData?.reseller_id;
      console.log('Reseller ID do admin logado:', resellerId);
      
      const { data: newConnection, error: insertError } = await supabase
        .from('whatsapp_connections')
        .insert([
          {
            admin_id: userInfo.id,
            instance_name: instanceNameToSave,
            name: instanceNameToSave,
            phone: '',
            status: 'disconnected',
            reseller_id: resellerId,
            created_at: new Date().toISOString()
          }
        ])
        .select();
        
      console.log('Resultado insert:', newConnection, insertError);
        
      if (insertError) {
        console.error('Erro ao salvar conexão no banco:', insertError);
        toast.error('Erro ao salvar conexão no banco: ' + insertError.message);
      } else if (newConnection && newConnection.length > 0) {
        console.log('Conexão criada com sucesso:', newConnection[0]);
        
        // Adicionar a nova conexão à lista em memória
        setWhatsappConnections(prev => [
          ...prev,
          {
            id: newConnection[0].id,
            name: newConnection[0].name,
            phone: newConnection[0].phone || '',
            status: newConnection[0].status || 'disconnected',
            created_at: newConnection[0].created_at,
            instance_name: newConnection[0].instance_name
          }
        ]);
        
        // Forçar atualização da lista de conexões
        setTimeout(() => {
          if (userInfo) loadWhatsAppConnections(userInfo.id);
        }, 1000);
      }
    } catch (dbError: any) {
      console.error('Erro ao inserir conexão no banco:', dbError);
      toast.error('Erro ao inserir conexão: ' + dbError.message);
    }
  };
  
  const getQRCode = async () => {
    try {
      // Limpar intervalo anterior se existir
      if (qrCodeIntervalRef.current) {
        clearInterval(qrCodeIntervalRef.current);
        qrCodeIntervalRef.current = null;
      }
      
      setLoadingQRCode(true);
      setConnectionError('');
      
      console.log('Tentando obter QR Code para instância:', instanceName);
      
      // Na Evolution API 2.2.3, o endpoint correto para obter o QR code é GET /instance/connect/{instanceName}
      console.log('Usando o endpoint correto para Evolution API 2.2.3');
      const response = await fetch(`https://apiwhatsapp.nexopdv.com/instance/connect/${instanceName}`, {
        method: 'GET',  // IMPORTANTE: deve ser GET, não POST
        headers: {
          'Content-Type': 'application/json',
          'apikey': '429683C4C977415CAAFCCE10F7D57E11'
        }
      });
      
      if (!response.ok) {
        console.log('Endpoint principal falhou, tentando endpoints alternativos...');
        // Tentar endpoint alternativo (compatibilidade com versões anteriores)
        const altEndpoints = [
          `https://apiwhatsapp.nexopdv.com/v1/instance/${instanceName}/qrcode`,
          `https://apiwhatsapp.nexopdv.com/instance/qrcode?instanceName=${instanceName}`
        ];
        
        for (const endpoint of altEndpoints) {
          try {
            console.log(`Tentando endpoint alternativo: ${endpoint}`);
            const altResponse = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'apikey': '429683C4C977415CAAFCCE10F7D57E11'
              }
            });
            
            if (altResponse.ok) {
              const altData = await altResponse.json();
              console.log('Resposta do endpoint alternativo:', altData);
              
              // Extrair QR Code de vários possíveis campos na resposta
              if (altData.base64) {
                console.log('QR Code encontrado no campo base64');
                setQRCodeData(altData.base64); // Já vem com prefixo correto
                return;
              } else if (altData.qrcode) {
                console.log('QR Code encontrado no campo qrcode');
                const formattedQRCode = formatQRCodeToDataURL(altData.qrcode);
                setQRCodeData(formattedQRCode);
                return;
              }
            }
          } catch (altError) {
            console.error(`Erro no endpoint alternativo ${endpoint}:`, altError);
          }
        }
        
        // Se chegou aqui, todas as alternativas falharam
        throw new Error('Não foi possível obter o QR Code em nenhum endpoint');
      }
      
      // Processando a resposta do endpoint principal
      const data = await response.json();
      console.log('Resposta da API para QR code:', data);
      
      // Na Evolution API 2.2.3, o QR Code fica no campo 'base64' e já vem formatado corretamente
      if (data.base64) {
        console.log('QR Code encontrado no campo base64 (formato correto do Evolution API 2.2.3)');
        setQRCodeData(data.base64); // Já está com prefixo data:image/png;base64,
      } 
      // Verificar outros campos possíveis (diferentes versões/endpoints da API)
      else if (data.qrcode) {
        console.log('QR Code encontrado no campo qrcode');
        const formattedQRCode = formatQRCodeToDataURL(data.qrcode);
        setQRCodeData(formattedQRCode);
      } 
      else if (data.code) {
        console.log('QR Code encontrado no campo code');
        const formattedQRCode = formatQRCodeToDataURL(data.code);
        setQRCodeData(formattedQRCode);
      }
      else {
        console.error('Resposta não contém campo de QR Code conhecido:', data);
        throw new Error('QR Code não disponível na resposta da API');
      }  
    } catch (error: any) {
      console.error('Erro ao obter QR Code:', error);
      setConnectionError(error.message || 'Erro ao obter QR Code');
    } finally {
      setLoadingQRCode(false);
    }
  };
  
  // Função para formatar o QR Code base64 em um formato que pode ser usado em src de <img>
  const formatQRCodeToDataURL = (qrCodeBase64: string): string => {
    // Se já começar com 'data:', é um dataURL válido
    if (qrCodeBase64.startsWith('data:')) {
      return qrCodeBase64;
    }
    
    // Se começar com 'http', é uma URL de imagem
    if (qrCodeBase64.startsWith('http')) {
      return qrCodeBase64;
    }
    
    // Limpar formatações que podem vir com o base64
    let cleanBase64 = qrCodeBase64.replace(/^data:image\/(png|jpg|jpeg|gif);base64,/, '');
    cleanBase64 = cleanBase64.replace(/\n/g, '');
    
    // Adicionar o prefixo correto para uma imagem em base64
    return `data:image/png;base64,${cleanBase64}`;
  };
  
  // Função para atualizar o status da conexão no banco e opcionalmente o número de telefone
  const updateConnectionStatus = async (connectionId: string, phoneNumber?: string) => {
    try {
      // Prepara os dados para atualização
      const updateData: { status: string; phone?: string; name?: string } = { 
        status: 'active' 
      };
      
      // Adiciona o número de telefone se estiver disponível
      if (phoneNumber) {
        updateData.phone = phoneNumber;
        // Atualiza o nome para incluir o número do telefone
        // Primeiro, limpar o número de qualquer caractere não numérico
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        
        // Tenta formatar de acordo com o padrão brasileiro se possível
        let formattedPhone = phoneNumber;
        if (cleanPhone.length >= 11) {
          // Formato DDI + DDD + número
          formattedPhone = cleanPhone.replace(/^(\d{2})(\d{2})(\d+)$/, '+$1 ($2) $3');
        } else if (cleanPhone.length >= 10) {
          // Apenas DDD + número
          formattedPhone = cleanPhone.replace(/^(\d{2})(\d+)$/, '($1) $2');
        }
        
        updateData.name = `WhatsApp ${formattedPhone}`;
      }
      
      console.log('Atualizando conexão com dados:', updateData);
      
      // Atualizar o status e telefone no Supabase
      const { error } = await supabase
        .from('whatsapp_connections')
        .update(updateData)
        .eq('id', connectionId);
        
      if (error) {
        console.error('Erro ao atualizar status da conexão:', error);
        return;
      }
      
      // Atualizar na lista em memória
      setWhatsappConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status: 'active', phone: phoneNumber || conn.phone, name: updateData.name || conn.name } 
            : conn
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar status da conexão:', error);
    }
  };
  
  // Função para verificar o status da conexão
  const checkConnectionStatus = async (instanceName: string, connectionId: string) => {
    if (!instanceName || !userInfo.id) return;
    
    setCheckingStatus(true);
    try {
      console.log('Verificando status da conexão WhatsApp:', selectedInstance);
      
      // Usando o endpoint correto que já funcionava anteriormente
      const response = await fetch(`https://apiwhatsapp.nexopdv.com/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '429683C4C977415CAAFCCE10F7D57E11'
        }
      });
      
      // Primeiro obter o texto bruto da resposta para debugging
      const responseText = await response.text();
      console.log('Resposta bruta do status:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erro ao analisar JSON do status:', parseError);
        setConnectionStatus('failed');
        return;
      }
      
      if (!response.ok) {
        console.error(`Erro na resposta da API: ${response.status} ${response.statusText}`);
        setConnectionStatus('failed');
        return;
      }
      
      // Verificar o formato da resposta para extrair o estado
      let state = '';
      let isConnected = false;
      
      if (data.instance && data.instance.state) {
        // Formato: {"instance":{"instanceName":"2","state":"open"}}
        state = data.instance.state;
        isConnected = state === 'open' || state === 'connected';
      } else if (data.state) {
        // Formato alternativo direto: {"state":"open"}
        state = data.state;
        isConnected = state === 'open' || state === 'connected';
      }
      
      console.log(`Status da conexão: ${state} (Conectado: ${isConnected})`);
      
      if (isConnected) {
        console.log('CONEXÃO DETECTADA! WhatsApp conectado com sucesso!');
        
        // Se o status anterior não era connected, mostramos mensagem de sucesso
        if (connectionStatus !== 'connected') {
          toast.success('WhatsApp conectado com sucesso!');
        }
        
        setConnectionStatus('connected');
        
        // Antes de atualizar o status, tentamos obter o número de telefone
        try {
          // Tentar obter informações pelo endpoint fetchInstances, exatamente como no WhatsConnector
          const infoResponse = await fetch(`https://apiwhatsapp.nexopdv.com/instance/fetchInstances`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'apikey': '429683C4C977415CAAFCCE10F7D57E11'
            }
          });
          
          if (infoResponse.ok) {
            const infoData = await infoResponse.json();
            console.log('Informações das instâncias:', infoData);
            
            // Encontrar a instância correspondente e extrair o número de telefone
            let phoneNumber = '';
            if (Array.isArray(infoData)) {
              const instance = infoData.find(inst => inst.name === instanceName);
              if (instance) {
                // Tentar obter o número de telefone de vários campos possíveis
                phoneNumber = instance.number || 
                            instance.phone || 
                            (instance.ownerJid ? instance.ownerJid.split('@')[0] : '') ||
                            '';
                
                console.log('Instância encontrada:', instance);
                console.log('OwnerJid:', instance.ownerJid);
              }
            }
            
            console.log('Número de telefone obtido:', phoneNumber);
            
            // Atualizar o status e o número de telefone no banco de dados
            await updateConnectionStatus(connectionId, phoneNumber);
          } else {
            console.error('Erro ao obter informações da instância');
            // Mesmo com erro, ainda atualizamos o status da conexão
            await updateConnectionStatus(connectionId);
          }
        } catch (infoError) {
          console.error('Erro ao obter informações da instância:', infoError);
          // Mesmo com erro, ainda atualizamos o status da conexão
          await updateConnectionStatus(connectionId);
        }
        
        // Parar de verificar o status após conectar
        if (statusCheckIntervalRef.current) {
          clearInterval(statusCheckIntervalRef.current);
          statusCheckIntervalRef.current = null;
        }
        
        // Fechar modal de QR code após conexão bem-sucedida
        setTimeout(() => {
          closeQRModal();
          setLoadingQRCode(false);
          // Recarregar conexões
          loadWhatsAppConnections(userInfo.id);
        }, 2000);
      } else {
        setConnectionStatus('pending');
      }
    } catch (error) {
      console.error('Erro ao verificar status da conexão:', error);
      setConnectionStatus('failed');
    } finally {
      setCheckingStatus(false); // Restauramos esta linha para o botão funcionar corretamente
    }
  };
  
  // Função para fechar o modal de QR Code e limpar intervalos
  const closeQRModal = () => {
    // Limpar o intervalo de verificação de status
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
    
    // Limpar o intervalo de atualização do QR code
    if (qrCodeIntervalRef.current) {
      clearInterval(qrCodeIntervalRef.current);
      qrCodeIntervalRef.current = null;
    }
    
    setShowQRModal(false);
  };

  // Função para recarregar o QR Code ao clicar no botão de refresh
  const refreshQRCode = () => {
    if (selectedInstance && selectedConnectionId) {
      getQRCodeForExistingInstance(selectedInstance, selectedConnectionId);
      // Reiniciar o intervalo de verificação de status
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
      
      statusCheckIntervalRef.current = setInterval(() => {
        checkConnectionStatus(selectedInstance, selectedConnectionId);
      }, 3000); // Verificar a cada 3 segundos
    }
  };
  
  // Efeito para verificar o status da conexão periodicamente para novas instâncias
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (qrCodeData && instanceCreated) {
      // Verificar imediatamente
      checkConnectionStatus && checkConnectionStatus();
      
      // E então iniciar o intervalo
      intervalId = setInterval(() => {
        checkConnectionStatus && checkConnectionStatus();
      }, 5000); // Verificar a cada 5 segundos
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [qrCodeData, instanceCreated, selectedInstance, selectedConnectionId]);
  
  // Limpeza ao fechar o modal
  useEffect(() => {
    if (!showQRModal) {
      // Quando o modal é fechado, limpar o intervalo de verificação
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
    }
  }, [showQRModal]);
  
  // Atualizar periodicamente o status de todas as conexões
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (userInfo && userInfo.id && activeTab === 'whatsapp') {
      // Verificar se userInfo.id existe e é válido
      if (userInfo.id && userInfo.id.trim() !== '') {
        // Carregar imediatamente
        loadWhatsAppConnections(userInfo.id);
        
        // E então iniciar o intervalo
        intervalId = setInterval(() => {
          if (!whatsappLoading && userInfo && userInfo.id) {
            loadWhatsAppConnections(userInfo.id);
          }
        }, 10000); // Atualizar a cada 10 segundos
      }
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [userInfo, activeTab]); // Remover whatsappLoading da dependência para evitar problemas

  const handleAddUsuario = () => {
    // Limpar os dados do formulário e abrir o modal para adicionar novo usuário
    setIsEditMode(false);
    setEditingUserId(null);
    setNewUser({
      tipo: 'Administrativo',
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: ''
    });
    setErrors({
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: ''
    });
    setShowAddUserModal(true);
  };
  
  const closeAddUserModal = () => {
    setShowAddUserModal(false);
    setIsEditMode(false);
    setEditingUserId(null);
  };
  
  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
    
    // Limpar erro ao digitar
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Validar senha em tempo real
    if (name === 'senha' || name === 'confirmarSenha') {
      const senha = name === 'senha' ? value : newUser.senha;
      const confirmarSenha = name === 'confirmarSenha' ? value : newUser.confirmarSenha;
      
      if (senha && confirmarSenha && senha !== confirmarSenha) {
        setErrors(prev => ({ ...prev, confirmarSenha: 'As senhas não coincidem' }));
      } else {
        setErrors(prev => ({ ...prev, confirmarSenha: '' }));
      }
    }
  };
  
  const validateForm = () => {
    let valid = true;
    const newErrors = {
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: ''
    };
    
    // Verificar nome
    if (!newUser.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
      valid = false;
    }
    
    // Verificar email
    if (!newUser.email.trim()) {
      newErrors.email = 'Email é obrigatório';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(newUser.email)) {
      newErrors.email = 'Email inválido';
      valid = false;
    }
    
    // No modo de edição, a senha é opcional
    if (!isEditMode) {
      // Verificar senha apenas para novo usuário
      if (!newUser.senha) {
        newErrors.senha = 'Senha é obrigatória';
        valid = false;
      } else if (newUser.senha.length < 6) {
        newErrors.senha = 'Senha deve ter no mínimo 6 caracteres';
        valid = false;
      }
      
      // Verificar confirmação de senha
      if (!newUser.confirmarSenha) {
        newErrors.confirmarSenha = 'Confirme sua senha';
        valid = false;
      } else if (newUser.senha !== newUser.confirmarSenha) {
        newErrors.confirmarSenha = 'As senhas não coincidem';
        valid = false;
      }
    } else if (newUser.senha || newUser.confirmarSenha) {
      // Se estiver editando e forneceu senha, precisa validar
      if (newUser.senha.length > 0 && newUser.senha.length < 6) {
        newErrors.senha = 'Senha deve ter no mínimo 6 caracteres';
        valid = false;
      }
      
      if (newUser.senha !== newUser.confirmarSenha) {
        newErrors.confirmarSenha = 'As senhas não coincidem';
        valid = false;
      }
    }
    
    setErrors(newErrors);
    return valid;
  };
  
  const handleCreateUser = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      // Obter o ID do administrador e revenda da sessão
      const adminSession = localStorage.getItem('admin_session');
      if (!adminSession) {
        toast.error('Sessão expirada. Faça login novamente.');
        navigate('/admin/login');
        return;
      }
      
      const session = JSON.parse(adminSession);
      const adminId = session.id;
      const resellerId = session.reseller_id || null; // Pegar o ID da revenda se existir
      
      // Verificar se o email já existe em alguma das tabelas
      async function checkEmailExists(email: string, excludeId?: string) {
        // 1. Verificar na tabela profile_admin
        const { data: adminData, error: adminError } = await supabase
          .from('profile_admin')
          .select('id, email')
          .eq('email', email)
          .maybeSingle();

        if (adminError) {
          console.error('Erro ao verificar email na tabela profile_admin:', adminError);
          throw adminError;
        }
        
        // 2. Verificar na tabela profile_admin_user
        const queryBuilder = supabase
          .from('profile_admin_user')
          .select('id, email')
          .eq('email', email);
          
        // Se estiver editando, excluir o próprio ID da busca
        if (excludeId) {
          queryBuilder.neq('id', excludeId);
        }
        
        const { data: adminUserData, error: adminUserError } = await queryBuilder.maybeSingle();
        
        if (adminUserError) {
          console.error('Erro ao verificar email na tabela profile_admin_user:', adminUserError);
          throw adminUserError;
        }
        
        // Se existir em alguma das tabelas, retorna true
        return !!adminData || !!adminUserData;
      }
      
      if (isEditMode && editingUserId) {
        // Verificar duplicação de email apenas se o email foi alterado
        const usuario = usuarios.find(u => u.id === editingUserId);
        
        // Se o email for diferente do atual, verificar se já existe
        if (usuario && usuario.email !== newUser.email) {
          const emailExists = await checkEmailExists(newUser.email, editingUserId);
          
          if (emailExists) {
            toast.error(`O email ${newUser.email} já está em uso por outro usuário do sistema.`);
            return;
          }
        }
        
        // Atualizar usuário existente
        const updateData: any = {
          nome: newUser.nome,
          email: newUser.email,
          tipo: newUser.tipo
        };
        
        // Só atualiza a senha se foi fornecida
        if (newUser.senha) {
          updateData.senha = newUser.senha; // Em produção, esta senha deveria ser hashed
        }
        
        const { data, error } = await supabase
          .from('profile_admin_user')
          .update(updateData)
          .eq('id', editingUserId)
          .select();
          
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          toast.success('Usuário atualizado com sucesso!');
          closeAddUserModal();
          
          // Converter o objeto retornado para o tipo Usuario e atualizar a lista
          const updatedUser: Usuario = {
            id: data[0].id as string,
            admin_id: data[0].admin_id as string,
            nome: data[0].nome as string,
            email: data[0].email as string,
            tipo: data[0].tipo as string,
            status: data[0].status as 'active' | 'inactive' | 'blocked',
            created_at: data[0].created_at as string,
            reseller_id: data[0].reseller_id as string | undefined,
            source: 'profile_admin_user', // Usuários editados sempre são da tabela profile_admin_user
            dev: data[0].dev as string // Incluir o campo dev
          };
          setUsuarios(prev => prev.map(u => u.id === editingUserId ? updatedUser : u));
        }
      } else {
        // Verificar se o email já existe antes de criar um novo usuário
        const emailExists = await checkEmailExists(newUser.email);
        
        if (emailExists) {
          toast.error(`O email ${newUser.email} já está em uso por outro usuário do sistema.`);
          return;
        }
        
        // Criar novo usuário
        const { data, error } = await supabase
          .from('profile_admin_user')
          .insert([
            {
              admin_id: adminId,
              nome: newUser.nome,
              email: newUser.email,
              senha: newUser.senha, // Em produção, esta senha deveria ser hashed
              tipo: newUser.tipo,
              status: 'active',
              reseller_id: resellerId, // Associar à mesma revenda do usuário logado
              dev: 'N' // Definir campo dev como 'N' por padrão
            }
          ])
          .select();
          
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          toast.success('Usuário criado com sucesso!');
          closeAddUserModal();
          
          // Converter o objeto retornado para o tipo Usuario e adicionar à lista
          const newUsuario: Usuario = {
            id: data[0].id as string,
            admin_id: data[0].admin_id as string,
            nome: data[0].nome as string,
            email: data[0].email as string,
            tipo: data[0].tipo as string,
            status: data[0].status as 'active' | 'inactive' | 'blocked',
            created_at: data[0].created_at as string,
            reseller_id: data[0].reseller_id as string | undefined,
            source: 'profile_admin_user', // Novos usuários sempre são da tabela profile_admin_user
            dev: data[0].dev as string // Incluir o valor do campo dev
          };
          setUsuarios(prev => [newUsuario, ...prev]);
        }
      }
    } catch (error: any) {
      console.error(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} usuário:`, error);
      toast.error(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} usuário: ` + error.message);
    }
  };

  const handleConnectExistingInstance = (connectionId: string, instanceName: string) => {
    setConnectionError('');
    setQRCodeData(''); // Limpa QR code anterior
    setConnectionStatus('pending');
    setCheckingStatus(false);
    
    // Define a conexão selecionada
    const connection = whatsappConnections.find(conn => conn.id === connectionId);
    setCurrentConnection(connection || null);
    
    // Armazena o ID e nome da instância
    setSelectedConnectionId(connectionId);
    setSelectedInstance(instanceName);
    
    // Abre o modal de QR code (modal para conexão existente)
    setShowQRModal(true);
    
    // Limpar qualquer intervalo existente
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
    
    if (qrCodeIntervalRef.current) {
      clearInterval(qrCodeIntervalRef.current);
      qrCodeIntervalRef.current = null;
    }
    
    // Inicia a geração do QR code para esta instância
    if (instanceName) {
      getQRCodeForExistingInstance(instanceName, connectionId);
      
      // Inicia a verificação periódica do status
      console.log('Iniciando verificação automática a cada 2 segundos...');
      // Primeiro verificamos imediatamente
      checkConnectionStatus(instanceName, connectionId);
      
      // E depois a cada 2 segundos
      statusCheckIntervalRef.current = setInterval(() => {
        console.log('Verificando status automático...');
        checkConnectionStatus(instanceName, connectionId);
      }, 2000); // Verificar a cada 2 segundos
      
      // Configurar atualização automática do QR code a cada 30 segundos
      qrCodeIntervalRef.current = setInterval(() => {
        if (connectionStatus !== 'connected') {
          console.log('Atualizando QR code automaticamente após 30 segundos');
          getQRCodeForExistingInstance(instanceName, connectionId);
        } else {
          // Se estiver conectado, parar de atualizar o QR code
          if (qrCodeIntervalRef.current) {
            clearInterval(qrCodeIntervalRef.current);
            qrCodeIntervalRef.current = null;
          }
        }
      }, 30000); // Atualizar QR code a cada 30 segundos
    }
  };
  
  // Função para obter QR Code para instância existente
  const getQRCodeForExistingInstance = async (instanceName: string, connectionId: string) => {
    try {
      setLoadingQRCode(true);
      setConnectionError('');
      
      console.log('Obtendo QR Code para instância existente:', instanceName);
      
      const response = await fetch(`https://apiwhatsapp.nexopdv.com/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '429683C4C977415CAAFCCE10F7D57E11'
        }
      });
      
      // Primeiro obter o texto bruto da resposta para debugging
      const responseText = await response.text();
      console.log('Resposta bruta do QR code:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erro ao analisar JSON:', parseError);
        throw new Error(`Erro no formato da resposta: ${responseText.substring(0, 100)}...`);
      }
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Erro ao obter QR Code');
      }
      
      // Dependendo da versão da API, o QR Code pode estar em diferentes propriedades
      if (data.base64) {
        setQRCodeData(formatQRCodeToDataURL(data.base64));
      } else if (data.qrcode) {
        setQRCodeData(formatQRCodeToDataURL(data.qrcode));
      } else {
        throw new Error('QR Code não disponível na resposta');
      }
      
      // Iniciar verificação periódica do status imediatamente após receber o QR code
      checkConnectionStatus();
    } catch (error: any) {
      console.error('Erro ao obter QR Code:', error);
      setConnectionError(error.message || 'Erro ao obter QR Code');
    } finally {
      setLoadingQRCode(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C1C1C] flex">
      {/* Sidebar modularizado */}
      <AdminSidebar
        activeMenuItem="/admin/settings"
        onLogout={handleLogout}
        collapsed={isSidebarCollapsed}
        onCollapseChange={setIsSidebarCollapsed}
        onAiChatClick={() => setIsAiChatOpen(!isAiChatOpen)}
        isAiChatOpen={isAiChatOpen}
        userInfo={userInfo}
      />

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-[#2A2A2A] border-b border-gray-800 p-6">
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-gray-400">Gerencie as configurações do sistema</p>
        </header>

        <div className="p-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-800 mb-6">
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'whatsapp'
                  ? 'text-emerald-500 border-b-2 border-emerald-500'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('whatsapp')}
            >
              WhatsApp
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'chat_nexo'
                  ? 'text-emerald-500 border-b-2 border-emerald-500'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('chat_nexo')}
            >
              Chat Nexo
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'usuarios'
                  ? 'text-emerald-500 border-b-2 border-emerald-500'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('usuarios')}
            >
              Usuários
            </button>
            {/* Aba Revenda - exibida apenas para usuários admin (profile_admin) */}
            {userInfo.userType === 'admin' && userInfo.reseller_id && (
              <button
                className={`px-4 py-2 font-medium ${
                  activeTab === 'revenda'
                    ? 'text-emerald-500 border-b-2 border-emerald-500'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab('revenda')}
              >
                Revenda
              </button>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'revenda' && (
            <div>
              {revendaLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                  <span className="ml-2 text-gray-300">Carregando dados da revenda...</span>
                </div>
              ) : !revenda ? (
                <div className="bg-[#2A2A2A] p-6 rounded-lg border border-gray-800">
                  <p className="text-gray-300">Nenhuma revenda encontrada associada ao seu usuário.</p>
                </div>
              ) : (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      setRevendaLoading(true);
                      
                      // Atualizar dados básicos da revenda
                      const { error: resellerError } = await supabase
                        .from('resellers')
                        .update({
                          trade_name: revenda.trade_name,
                          legal_name: revenda.legal_name,
                          document_number: revenda.document_number,
                          address_cep: revenda.address_cep,
                          address_street: revenda.address_street,
                          address_number: revenda.address_number,
                          address_complement: revenda.address_complement,
                          address_district: revenda.address_district,
                          address_city: revenda.address_city,
                          address_state: revenda.address_state,
                          website: revenda.website,
                          additional_info: revenda.additional_info
                        })
                        .eq('id', revenda.id);
                        
                      if (resellerError) {
                        throw resellerError;
                      }
                      
                      // Atualizar dados do admin da revenda, se existir admin_id
                      if (revenda.admin_id) {
                        const { error: adminError } = await supabase
                          .from('profile_admin')
                          .update({
                            nome_usuario: revenda.admin_nome,
                            email: revenda.admin_email
                          })
                          .eq('id', revenda.admin_id);
                          
                        if (adminError) {
                          throw adminError;
                        }
                      }
                      
                      toast.success('Dados da revenda atualizados com sucesso!');
                      loadRevendaData(revenda.id);
                      
                    } catch (error: any) {
                      console.error('Erro ao atualizar revenda:', error);
                      toast.error('Erro ao atualizar dados: ' + (error.message || 'Erro desconhecido'));
                    } finally {
                      setRevendaLoading(false);
                    }
                  }}
                  className="space-y-6"
                >
                  <div className="bg-[#2A2A2A] p-6 rounded-lg border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Dados da Revenda</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Nome Fantasia</label>
                        <input
                          type="text"
                          value={revenda.trade_name}
                          onChange={(e) => setRevenda({...revenda, trade_name: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Razão Social</label>
                        <input
                          type="text"
                          value={revenda.legal_name}
                          onChange={(e) => setRevenda({...revenda, legal_name: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">CNPJ</label>
                        <input
                          type="text"
                          value={revenda.document_number}
                          onChange={(e) => setRevenda({...revenda, document_number: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Status</label>
                        <div className="px-3 py-2 bg-gray-700 text-white rounded-lg">
                          {revenda.status === 'active' ? 'Ativo' : 
                           revenda.status === 'inactive' ? 'Inativo' : 
                           revenda.status === 'blocked' ? 'Bloqueado' : 
                           revenda.status === 'canceled' ? 'Cancelado' : revenda.status}
                        </div>
                        <p className="text-xs text-gray-400">O status da revenda só pode ser alterado na tela de Revendas</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Código</label>
                        <div className="px-3 py-2 bg-gray-700 text-white rounded-lg">
                          {revenda.code || 'Não definido'}
                        </div>
                        <p className="text-xs text-gray-400">O código da revenda é gerado automaticamente</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Website</label>
                        <input
                          type="text"
                          value={revenda.website || ''}
                          onChange={(e) => setRevenda({...revenda, website: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="https://"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#2A2A2A] p-6 rounded-lg border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Endereço</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">CEP</label>
                        <input
                          type="text"
                          value={revenda.address_cep}
                          onChange={(e) => setRevenda({...revenda, address_cep: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Rua</label>
                        <input
                          type="text"
                          value={revenda.address_street}
                          onChange={(e) => setRevenda({...revenda, address_street: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Número</label>
                        <input
                          type="text"
                          value={revenda.address_number}
                          onChange={(e) => setRevenda({...revenda, address_number: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Complemento</label>
                        <input
                          type="text"
                          value={revenda.address_complement || ''}
                          onChange={(e) => setRevenda({...revenda, address_complement: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Bairro</label>
                        <input
                          type="text"
                          value={revenda.address_district}
                          onChange={(e) => setRevenda({...revenda, address_district: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Cidade</label>
                        <input
                          type="text"
                          value={revenda.address_city}
                          onChange={(e) => setRevenda({...revenda, address_city: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Estado</label>
                        <input
                          type="text"
                          value={revenda.address_state}
                          onChange={(e) => setRevenda({...revenda, address_state: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#2A2A2A] p-6 rounded-lg border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Dados do Usuário Admin</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Nome</label>
                        <input
                          type="text"
                          value={revenda.admin_nome || ''}
                          onChange={(e) => setRevenda({...revenda, admin_nome: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Email</label>
                        <input
                          type="email"
                          value={revenda.admin_email || ''}
                          onChange={(e) => setRevenda({...revenda, admin_email: e.target.value})}
                          className="w-full py-2 px-3 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">Para alterar a senha do usuário admin, entre em contato com o suporte.</p>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={revendaLoading}
                    >
                      {revendaLoading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
          
          {activeTab === 'whatsapp' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Conexões WhatsApp</h2>
                <button
                  onClick={handleAddWhatsAppConnection}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
                >
                  <Plus size={16} />
                  <span>Adicionar Conexão</span>
                </button>
              </div>
              
              <div className="bg-[#2A2A2A] rounded-lg border border-gray-800 overflow-hidden w-full">
                {whatsappLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    <span className="ml-2 text-gray-300">Carregando conexões...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#353535] text-left">
                          <th className="p-3 text-gray-300 font-medium text-sm">Nome</th>
                          <th className="p-3 text-gray-300 font-medium text-sm">Número</th>
                          <th className="p-3 text-gray-300 font-medium text-sm">Instância</th>
                          <th className="p-3 text-gray-300 font-medium text-sm">Status</th>
                          <th className="p-3 text-gray-300 font-medium text-sm">Criado em</th>
                          <th className="p-3 text-gray-300 font-medium text-sm">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {whatsappConnections.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-gray-400">
                              Nenhuma conexão WhatsApp configurada. Clique em "Adicionar Conexão" para começar.
                            </td>
                          </tr>
                        ) : (
                          whatsappConnections.map((connection) => (
                            <tr key={connection.id} className="hover:bg-[#333]">
                              <td className="p-3 text-white text-sm">{connection.name}</td>
                              <td className="p-3 text-white text-sm">{connection.phone}</td>
                              <td className="p-3 text-white text-sm">{connection.instance_name || 'N/A'}</td>
                              <td className="p-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    connection.status === 'active'
                                      ? 'bg-green-100 text-green-800'
                                      : connection.status === 'connecting'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {connection.status === 'active'
                                    ? 'Conectado'
                                    : connection.status === 'connecting'
                                    ? 'Conectando'
                                    : 'Desconectado'}
                                </span>
                              </td>
                              <td className="p-3 text-gray-300 text-sm">
                                {new Date(connection.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {connection.status === 'active' ? (
                                    <button
                                      className="p-1 text-orange-400 hover:text-orange-300 rounded-lg flex items-center gap-1 text-xs"
                                      title="Desconectar"
                                      onClick={() => showDisconnectConfirmation(connection.id, connection.instance_name || '')}
                                    >
                                      <LogOut size={18} />
                                      <span className="hidden sm:inline">Desconectar</span>
                                    </button>
                                  ) : (
                                    <button
                                      className="text-emerald-500 hover:text-emerald-700 transition-colors flex items-center gap-1 text-sm p-1 rounded"
                                      title="Conectar"
                                      onClick={() => handleConnectExistingInstance(connection.id, connection.instance_name)}
                                    >
                                      <MessageSquare size={16} />
                                      <span className="hidden sm:inline">Conectar</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteConnection(connection.id, connection.instance_name || '')}
                                    className="p-1 text-red-400 hover:text-red-300 rounded-lg flex items-center gap-1 text-xs"
                                    title="Excluir"
                                  >
                                    <Trash2 size={18} />
                                    <span className="hidden sm:inline">Excluir</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'chat_nexo' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Configurações do Chat Nexo</h2>
              </div>
              
              {chatConfigLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                  <span className="ml-3 text-white">Carregando configurações...</span>
                </div>
              ) : (
                <div className="bg-[#2A2A2A] rounded-lg border border-gray-800 p-6 w-full">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white mb-4">Configurações Gerais</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Assistente</label>
                      <input
                        type="text"
                        className="w-full p-2 bg-[#333] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Ex: Assistente Nexo"
                        value={chatConfig.nome_assistente || ''}
                        onChange={(e) => setChatConfig({...chatConfig, nome_assistente: e.target.value})}
                      />
                      <p className="mt-1 text-xs text-gray-400">Nome que será exibido para os clientes no chat</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Mensagem de Boas-vindas</label>
                      <textarea
                        className="w-full p-2 bg-[#333] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
                        placeholder="Ex: Olá, sou o assistente virtual do Nexo PDV. Como posso ajudar?"
                        value={chatConfig.mensagem_boas_vindas || ''}
                        onChange={(e) => setChatConfig({...chatConfig, mensagem_boas_vindas: e.target.value})}
                      />
                      <p className="mt-1 text-xs text-gray-400">Mensagem que será enviada quando um cliente iniciar uma conversa</p>
                    </div>
                    
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="autoresponder" 
                        className="w-4 h-4 text-emerald-600 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                        checked={chatConfig.resposta_automatica || false}
                        onChange={(e) => setChatConfig({...chatConfig, resposta_automatica: e.target.checked})}
                      />
                      <label htmlFor="autoresponder" className="ml-2 text-sm font-medium text-gray-300">Ativar resposta automática</label>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Setor</label>
                      <div className="space-y-2 bg-[#333] border border-gray-700 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-2">Selecione os setores disponíveis para atendimento</p>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center">
                              <input 
                                type="checkbox" 
                                id="setor-suporte" 
                                className="w-4 h-4 text-emerald-600 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                                checked={chatConfig.setor_suporte || false}
                                onChange={(e) => setChatConfig({...chatConfig, setor_suporte: e.target.checked})}
                              />
                              <label htmlFor="setor-suporte" className="ml-2 text-sm text-white">Suporte Técnico</label>
                            </div>
                            {iaIntegrationEnabled && (
                              <div className="mt-2 ml-6">
                                <textarea
                                  className="w-full p-2 bg-[#444] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs min-h-[80px]"
                                  placeholder="Insira o prompt para que a IA responda sobre Suporte Técnico..."
                                  value={chatConfig.prompt_suporte || ''}
                                  onChange={(e) => setChatConfig({...chatConfig, prompt_suporte: e.target.value})}
                                />
                                <p className="mt-1 text-xs text-gray-400">A IA usará este prompt como base para respostas automatizadas</p>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <div className="flex items-center">
                              <input 
                                type="checkbox" 
                                id="setor-comercial" 
                                className="w-4 h-4 text-emerald-600 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                                checked={chatConfig.setor_comercial || false}
                                onChange={(e) => setChatConfig({...chatConfig, setor_comercial: e.target.checked})}
                              />
                              <label htmlFor="setor-comercial" className="ml-2 text-sm text-white">Comercial</label>
                            </div>
                            {iaIntegrationEnabled && (
                              <div className="mt-2 ml-6">
                                <textarea
                                  className="w-full p-2 bg-[#444] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs min-h-[80px]"
                                  placeholder="Insira o prompt para que a IA responda sobre questões Comerciais..."
                                  value={chatConfig.prompt_comercial || ''}
                                  onChange={(e) => setChatConfig({...chatConfig, prompt_comercial: e.target.value})}
                                />
                                <p className="mt-1 text-xs text-gray-400">A IA usará este prompt como base para respostas automatizadas</p>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <div className="flex items-center">
                              <input 
                                type="checkbox" 
                                id="setor-administrativo" 
                                className="w-4 h-4 text-emerald-600 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                                checked={chatConfig.setor_administrativo || false}
                                onChange={(e) => setChatConfig({...chatConfig, setor_administrativo: e.target.checked})}
                              />
                              <label htmlFor="setor-administrativo" className="ml-2 text-sm text-white">Administrativo</label>
                            </div>
                            {iaIntegrationEnabled && (
                              <div className="mt-2 ml-6">
                                <textarea
                                  className="w-full p-2 bg-[#444] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs min-h-[80px]"
                                  placeholder="Insira o prompt para que a IA responda sobre questões Administrativas..."
                                  value={chatConfig.prompt_administrativo || ''}
                                  onChange={(e) => setChatConfig({...chatConfig, prompt_administrativo: e.target.value})}
                                />
                                <p className="mt-1 text-xs text-gray-400">A IA usará este prompt como base para respostas automatizadas</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 border-t border-gray-800 pt-6">
                    <h3 className="text-lg font-medium text-white mb-4">Configurações Avançadas</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Integração com IA</label>
                          <p className="text-xs text-gray-400">Utilizar inteligência artificial para respostas automáticas</p>
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            id="ia_integration" 
                            className="w-4 h-4 text-emerald-600 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                            checked={iaIntegrationEnabled}
                            onChange={(e) => setIaIntegrationEnabled(e.target.checked)}
                          />
                          <label htmlFor="ia_integration" className="ml-2 text-sm font-medium text-gray-300">Ativar</label>
                        </div>
                      </div>
                      
                      <div>
                        <div>
                          <label className="text-sm font-medium text-gray-300">Horário de funcionamento</label>
                          <p className="text-xs text-gray-400">Defina os dias e horários em que o chat estará disponível</p>
                        </div>
                        
                        <div className="mt-3 bg-[#333] border border-gray-700 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              {nome: 'Segunda', ativo: 'horario_segunda_ativo', inicio: 'horario_segunda_inicio', fim: 'horario_segunda_fim'},
                              {nome: 'Terça', ativo: 'horario_terca_ativo', inicio: 'horario_terca_inicio', fim: 'horario_terca_fim'},
                              {nome: 'Quarta', ativo: 'horario_quarta_ativo', inicio: 'horario_quarta_inicio', fim: 'horario_quarta_fim'},
                              {nome: 'Quinta', ativo: 'horario_quinta_ativo', inicio: 'horario_quinta_inicio', fim: 'horario_quinta_fim'},
                              {nome: 'Sexta', ativo: 'horario_sexta_ativo', inicio: 'horario_sexta_inicio', fim: 'horario_sexta_fim'},
                              {nome: 'Sábado', ativo: 'horario_sabado_ativo', inicio: 'horario_sabado_inicio', fim: 'horario_sabado_fim'},
                              {nome: 'Domingo', ativo: 'horario_domingo_ativo', inicio: 'horario_domingo_inicio', fim: 'horario_domingo_fim'}
                            ].map((dia, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border-b border-gray-700">
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`dia-${index}`}
                                    className="w-4 h-4 text-emerald-600 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                                    checked={chatConfig[dia.ativo as keyof NexoChatConfig] as boolean || false}
                                    onChange={(e) => setChatConfig({...chatConfig, [dia.ativo]: e.target.checked})}
                                  />
                                  <label htmlFor={`dia-${index}`} className="ml-2 text-sm text-white">{dia.nome}</label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div>
                                    <label htmlFor={`inicio-${index}`} className="text-xs text-gray-400 block mb-1">Início</label>
                                    <input
                                      type="time"
                                      id={`inicio-${index}`}
                                      className="text-xs p-1 bg-[#444] border border-gray-600 rounded text-white w-[85px]"
                                      value={chatConfig[dia.inicio as keyof NexoChatConfig] as string || '08:00'}
                                      onChange={(e) => setChatConfig({...chatConfig, [dia.inicio]: e.target.value})}
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`fim-${index}`} className="text-xs text-gray-400 block mb-1">Fim</label>
                                    <input
                                      type="time"
                                      id={`fim-${index}`}
                                      className="text-xs p-1 bg-[#444] border border-gray-600 rounded text-white w-[85px]"
                                      value={chatConfig[dia.fim as keyof NexoChatConfig] as string || '18:00'}
                                      onChange={(e) => setChatConfig({...chatConfig, [dia.fim]: e.target.value})}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={saveChatConfig}
                      disabled={chatConfigLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-emerald-600"
                    >
                      {chatConfigLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Salvar Configurações
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Usuários do Sistema</h2>
                <button
                  onClick={handleAddUsuario}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  <span>Adicionar Usuário</span>
                </button>
              </div>

              <div className="bg-[#2A2A2A] rounded-lg border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#353535] text-left">
                        <th className="p-4 text-gray-300 font-medium">Nome</th>
                        <th className="p-4 text-gray-300 font-medium">Email</th>
                        <th className="p-4 text-gray-300 font-medium">Cargo</th>
                        <th className="p-4 text-gray-300 font-medium">Status</th>
                        <th className="p-4 text-gray-300 font-medium">Criado em</th>
                        <th className="p-4 text-gray-300 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-gray-400">
                            Carregando usuários...
                          </td>
                        </tr>
                      ) : usuarios.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-gray-400">
                            Nenhum usuário cadastrado. Clique em "Adicionar Usuário" para começar.
                          </td>
                        </tr>
                      ) : (
                        usuarios.map((usuario) => (
                          <tr key={usuario.id} className={`hover:bg-[#333] ${usuario.source === 'profile_admin' ? 'bg-[#2D2D35]' : ''} ${usuario.id === userInfo.id ? 'bg-[#323D2D]' : ''}`}>
                            <td className="p-4 text-white">
                              {usuario.nome}
                              {usuario.source === 'profile_admin' && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-900/50 text-blue-200 rounded">
                                  Admin
                                </span>
                              )}
                              {usuario.id === userInfo.id && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-900/50 text-green-200 rounded">
                                  Você
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-white">{usuario.email}</td>
                            <td className="p-4 text-white">{usuario.tipo}</td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  usuario.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : usuario.status === 'inactive'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {usuario.status === 'active'
                                  ? 'Ativo'
                                  : usuario.status === 'inactive'
                                  ? 'Inativo'
                                  : 'Bloqueado'}
                              </span>
                            </td>
                            <td className="p-4 text-gray-300">
                              {new Date(usuario.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {/* Exibir botões de ação apenas para usuários da tabela profile_admin_user */}
                                {usuario.source === 'profile_admin_user' ? (
                                  <>
                                    {/* Sempre permitir o botão de edição */}
                                    <button
                                      className="p-1 text-blue-400 hover:text-blue-300 rounded-lg"
                                      title="Editar"
                                      onClick={() => handleEditUser(usuario)}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                      </svg>
                                    </button>
                                    
                                    {/* Botão de ativação/desativação - desabilitado para o próprio usuário */}
                                    {usuario.id === userInfo.id ? (
                                      <button
                                        className="p-1 text-gray-500 cursor-not-allowed rounded-lg"
                                        title="Não é possível alterar o status do seu próprio usuário"
                                        disabled
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <line x1="18" y1="6" x2="6" y2="18"></line>
                                          <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                      </button>
                                    ) : (
                                      <button
                                        className={`p-1 ${usuario.status === 'active' ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'} rounded-lg`}
                                        title={usuario.status === 'active' ? 'Inativar' : 'Ativar'}
                                        onClick={() => handleToggleStatus(usuario)}
                                      >
                                        {usuario.status === 'active' ? (
                                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                          </svg>
                                        ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                          </svg>
                                        )}
                                      </button>
                                    )}
                                    
                                    {/* Botão de exclusão - desabilitado para o próprio usuário */}
                                    {usuario.id === userInfo.id ? (
                                      <button
                                        className="p-1 text-gray-500 cursor-not-allowed rounded-lg"
                                        title="Não é possível excluir seu próprio usuário"
                                        disabled
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    ) : (
                                      <button
                                        className="p-1 text-red-400 hover:text-red-300 rounded-lg"
                                        title="Excluir"
                                        onClick={() => handleDeleteClick(usuario)}
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-500 text-xs italic">Usuário administrador (não editável)</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação para excluir conexão WhatsApp */}
      {showDeleteConfirmWhatsapp && instanceToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#2A2A2A] rounded-lg shadow-lg border border-gray-800 p-6 w-full max-w-md">
              <h2 className="text-base font-semibold leading-7 text-white mb-3">
                Confirmar exclusão
              </h2>
              
              <p className="text-gray-300 mb-4">
                Tem certeza que deseja excluir a instância <strong>{instanceToDelete.name}</strong>? Esta ação não pode ser desfeita.
              </p>
              
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowDeleteConfirmWhatsapp(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md mr-2"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => instanceToDelete && handleDeleteConnectionConfirmed(instanceToDelete.id, instanceToDelete.instance)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
                >
                  {loadingAction?.id === (instanceToDelete?.id || '') && loadingAction?.action === 'delete' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Excluindo...
                    </>
                  ) : (
                    <>Excluir</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para adicionar ou conectar WhatsApp */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#2A2A2A] rounded-lg shadow-lg border border-gray-800 p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">Adicionar conexão WhatsApp</h3>
              
              {!instanceCreated ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="instanceName">
                      Nome da instância
                    </label>
                    <input
                      id="instanceName"
                      value={instanceName}
                      onChange={(e) => setInstanceName(e.target.value)}
                      placeholder="Nome da instância (ex: loja-principal)"
                      className="w-full p-2 bg-[#333] border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Use apenas letras, números e hífen. Sem espaços.</p>
                  </div>
                  
                  {connectionError && (
                    <div className="mb-4 p-2 bg-red-900/50 text-red-100 rounded border border-red-700">
                      {connectionError}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={closeWhatsAppModal}
                      className="px-4 py-2 border border-gray-700 rounded text-gray-300 hover:bg-gray-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={createInstance}
                      disabled={loadingQRCode}
                      className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-emerald-800/50 disabled:cursor-not-allowed flex items-center"
                    >
                      {loadingQRCode ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Criando...
                        </>
                      ) : (
                        'Criar instância'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4 text-center">
                    <p className="mb-4 text-gray-300">
                      Escaneie o QR Code abaixo com seu celular para conectar o WhatsApp:
                    </p>
                    
                    <div className="bg-white p-4 rounded-lg mx-auto w-[220px] h-[220px] flex items-center justify-center">
                      {loadingQRCode ? (
                        <div className="flex flex-col items-center justify-center">
                          <svg className="animate-spin h-10 w-10 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="mt-2 text-gray-600">Gerando QR Code...</p>
                        </div>
                      ) : qrCodeData ? (
                        <img
                          src={qrCodeData}
                          alt="QR Code para conexão WhatsApp"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error('Erro ao carregar imagem do QR Code');
                            setConnectionError('Erro ao exibir QR Code. Tente novamente.');
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="mt-2 text-red-500">Erro ao gerar QR Code</p>
                        </div>
                      )}
                    </div>
                    
                    {connectionError && (
                      <div className="mt-4 p-2 bg-red-900/50 text-red-100 rounded border border-red-700">
                        {connectionError}
                      </div>
                    )}
                    
                    <p className="mt-4 text-gray-400 text-sm">
                      Após escanear, o sistema verificará automaticamente a conexão.
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={closeWhatsAppModal}
                      className="px-4 py-2 border border-gray-700 rounded text-gray-300 hover:bg-gray-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={getQRCode}
                      disabled={loadingQRCode}
                      className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-emerald-800/50 disabled:cursor-not-allowed flex items-center"
                    >
                      {loadingQRCode ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Gerando...
                        </>
                      ) : (
                        'Tentar novamente'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de QR Code para conexões existentes */}
      {showQRModal && currentConnection && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#2A2A2A] rounded-lg shadow-lg border border-gray-800 p-4 w-full max-w-[400px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <MessageSquare size={18} className="text-emerald-500" />
                  Conectar WhatsApp
                </h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="text-center">
                {connectionStatus === 'connected' ? (
                  <div className="mb-6">
                    <div className="flex flex-col items-center justify-center p-6">
                      <div className="bg-green-500 rounded-full p-4 mb-4">
                        <Check size={40} className="text-white" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Conexão Estabelecida!</h3>
                      <p className="text-gray-300">
                        Seu WhatsApp está conectado à instância
                        <strong className="text-white"> {currentConnection.instance_name}</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mb-4 text-sm text-gray-300">
                      Escaneie o QR Code abaixo com seu WhatsApp para conectar
                      <strong className="text-white"> {currentConnection.name || currentConnection.instance_name}</strong>:
                    </p>
                    
                    {loadingQRCode ? (
                      <div className="flex flex-col items-center justify-center p-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-2"></div>
                        <span className="text-gray-300">Gerando QR Code...</span>
                      </div>
                    ) : qrCodeData ? (
                      <div className="bg-white p-4 rounded-lg inline-block mb-4">
                        <img 
                          src={qrCodeData} 
                          alt="QR Code para conexão" 
                          className="w-48 h-48 object-contain" 
                          onError={(e) => {
                            console.error('Erro ao carregar imagem do QR Code');
                            setConnectionError('Erro ao exibir QR Code. Tente novamente.');
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="bg-[#1C1C1C] p-6 rounded-lg mb-4">
                        <p className="text-red-400">{connectionError || 'QR Code não disponível'}</p>
                      </div>
                    )}
                    

                    
                    {connectionError && (
                      <div className="mt-4 mb-4 p-2 bg-red-900/50 text-red-100 rounded border border-red-700">
                        {connectionError}
                      </div>
                    )}
                  </>
                )}
                
                <div className="flex gap-4">
                  {connectionStatus === 'connected' ? (
                    <button
                      onClick={closeQRModal}
                      className="flex-1 px-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      <span>Concluído</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={refreshQRCode}
                        disabled={loadingQRCode}
                        className="flex-1 px-3 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={14} className={loadingQRCode ? "animate-spin" : ""} />
                        <span>Recarregar QR Code</span>
                      </button>
                      <button
                        onClick={() => checkConnectionStatus(selectedInstance || '', selectedConnectionId || '')}
                        className="px-3 py-3 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center"
                      >
                        <span>Verificar</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para adicionar/editar usuário */}
      {showAddUserModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={closeAddUserModal} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div 
              className="bg-[#2A2A2A] rounded-lg shadow-lg border border-gray-800 p-6 w-full max-w-md" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {isEditMode ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
                </h3>
                <button
                  onClick={closeAddUserModal}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Usuário</label>
                  <select
                    name="tipo"
                    value={newUser.tipo}
                    onChange={handleUserInputChange}
                    className="w-full px-4 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="Proprietario">Proprietário</option>
                    <option value="Tecnico">Técnico</option>
                    <option value="Administrativo">Administrativo</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                  <input
                    type="text"
                    name="nome"
                    value={newUser.nome}
                    onChange={handleUserInputChange}
                    className={`w-full px-4 py-2 bg-[#1C1C1C] border ${errors.nome ? 'border-red-500' : 'border-gray-800'} rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    placeholder="Nome completo"
                  />
                  {errors.nome && <p className="mt-1 text-sm text-red-500">{errors.nome}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleUserInputChange}
                    className={`w-full px-4 py-2 bg-[#1C1C1C] border ${errors.email ? 'border-red-500' : 'border-gray-800'} rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    placeholder="exemplo@email.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
                  <input
                    type="password"
                    name="senha"
                    value={newUser.senha}
                    onChange={handleUserInputChange}
                    className={`w-full px-4 py-2 bg-[#1C1C1C] border ${errors.senha ? 'border-red-500' : 'border-gray-800'} rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    placeholder="••••••••"
                  />
                  {errors.senha && <p className="mt-1 text-sm text-red-500">{errors.senha}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    name="confirmarSenha"
                    value={newUser.confirmarSenha}
                    onChange={handleUserInputChange}
                    className={`w-full px-4 py-2 bg-[#1C1C1C] border ${errors.confirmarSenha ? 'border-red-500' : 'border-gray-800'} rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    placeholder="••••••••"
                  />
                  {errors.confirmarSenha && <p className="mt-1 text-sm text-red-500">{errors.confirmarSenha}</p>}
                </div>
                
                <button
                  onClick={handleCreateUser}
                  className="w-full mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  {isEditMode ? 'Atualizar Usuário' : 'Criar Usuário'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    
      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && userToDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#2A2A2A] rounded-lg shadow-lg border border-gray-800 p-6 w-full max-w-[400px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Trash2 size={22} className="text-red-500" />
                  Confirmar Exclusão
                </h3>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                <p className="text-gray-300 text-sm">
                  <span className="font-semibold">Atenção:</span> Esta ação não poderá ser desfeita. O usuário será removido permanentemente do sistema.
                </p>
              </div>
              {userToDelete && (
                <p className="text-gray-300 mb-6">
                  Tem certeza que deseja excluir o usuário <span className="font-semibold text-white">{userToDelete.nome}</span> ({userToDelete.email})?
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#353535] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Excluir Definitivamente
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Componente do Chat com IA */}
      <AIChat 
        isOpen={isAiChatOpen} 
        onClose={() => setIsAiChatOpen(false)} 
        userName={userInfo.nome || userInfo.email}
      />
      
      {/* Modal de Confirmação para Conexões WhatsApp */}
      {confirmationModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">{confirmationModal.title}</h3>
            <p className="text-gray-300 mb-6 whitespace-pre-line">{confirmationModal.message}</p>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={closeConfirmationModal}
                className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancelar
              </button>
              
              <button
                onClick={() => {
                  setConfirmationModal(prev => ({ ...prev, loading: true }));
                  confirmationModal.onConfirm();
                }}
                disabled={confirmationModal.loading}
                className={`px-8 py-3 ${confirmationModal.isDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-70 text-white rounded-lg flex items-center justify-center min-w-[120px]`}
              >
                {confirmationModal.loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span>{confirmationModal.isDelete ? 'Excluindo...' : 'Desconectando...'}</span>
                  </>
                ) : (
                  <span>{confirmationModal.isDelete ? 'Excluir' : 'Desconectar'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
