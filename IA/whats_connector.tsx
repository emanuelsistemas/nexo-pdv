import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MessageSquare, Plus, LogOut, Trash2, X, Check, RefreshCw } from 'lucide-react';
import { supabase } from '../src/lib/supabase';

// Interface para conexões WhatsApp
interface WhatsAppConnection {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive' | 'connecting';
  created_at: string;
  instance_name?: string;
}

// Interfaces de resposta da API serão implementadas conforme necessário

const WhatsConnector: React.FC = () => {
  const navigate = useNavigate();
  
  // Estado de autenticação
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  
  // ID do admin para associar as conexões
  const [adminId, setAdminId] = useState<string>('');
  // Estado para armazenar as conexões existentes
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(false); // Será usado para controlar o estado de carregamento da lista
  
  // Estado para controlar o modal de nova conexão
  const [showModal, setShowModal] = useState(false);
  
  // Estado para o processo de criação/conexão
  const [instanceName, setInstanceName] = useState('');
  const [qrCodeData, setQRCodeData] = useState('');
  const [loadingQRCode, setLoadingQRCode] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [instanceCreated, setInstanceCreated] = useState(false);
  
  // Estado para controlar o modal de conexão de instância existente
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentConnection, setCurrentConnection] = useState<WhatsAppConnection | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'pending' | 'connected' | 'failed'>('pending');
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  // Ref para armazenar o ID do intervalo de verificação
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Constantes para a API
  const EVOLUTION_API_URL = 'https://apiwhatsapp.nexopdv.com';
  const EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
  
  // Carregar dados do usuário logado e as conexões
  useEffect(() => {
    // Buscar usuário logado
    const getLoggedUser = async () => {
      try {
        console.log('Verificando autenticação...');
        
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        
        if (!user) {
          console.error('Nenhum usuário autenticado');
          toast.error('Usuário não autenticado - favor fazer login');
          navigate('/admin/whats-login');
          return;
        }
        
        console.log('Usuário autenticado:', user.email);
        
        // Buscar admin pelo user_id
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (adminError) {
          console.error('Erro ao buscar admin:', adminError);
          
          // Se o erro for NOT_FOUND, verificar se existe em outras tabelas
          if (adminError.code === 'PGRST116') {
            // Tentar buscar o usuário pelo id diretamente
            const { data: userDirectly } = await supabase
              .from('admins')
              .select('id')
              .eq('id', user.id)
              .single();
              
            if (userDirectly && userDirectly.id) {
              const directAdminId = userDirectly.id.toString();
              console.log('Admin encontrado diretamente pelo ID:', directAdminId);
              setAdminId(directAdminId);
              setAuthenticated(true);
              loadWhatsAppConnections(directAdminId);
              return;
            }
          }
          
          // Verificar se usuário é o admin principal
          console.log('Verificando se usuário é admin principal...');
          
          // Tenta usar o user.id como adminId (muitas vezes funciona no Nexo PDV)
          const userId = user.id.toString();
          setAdminId(userId);
          setAuthenticated(true);
          console.log('Usando o ID do usuário como adminId:', userId);
          loadWhatsAppConnections(userId);
          
          return;
        }
        
        if (adminData && adminData.id) {
          const adminIdStr = adminData.id.toString();
          console.log('Admin encontrado com sucesso:', adminIdStr);
          setAdminId(adminIdStr);
          setAuthenticated(true);
          loadWhatsAppConnections(adminIdStr);
        } else {
          console.error('Admin não encontrado para este usuário');
          toast.error('Usuário não encontrado - favor fazer login');
          navigate('/admin/whats-login');
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        toast.error('Erro ao verificar autenticação');
        navigate('/admin/whats-login');
      }
    };
    
    getLoggedUser();
  }, [navigate]); // Adicionado navigate como dependência
  
  // Função para carregar conexões do banco de dados
  const loadWhatsAppConnections = async (adminId: string) => {
    try {
      setLoading(true);
      
      console.log('Carregando conexões para o admin:', adminId);
      
      // Buscar as conexões existentes na tabela do Supabase
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('admin_id', adminId);
        
      if (error) {
        throw error;
      }
      
      if (data) {
        // Converter explicitamente para o tipo WhatsAppConnection
        const typedConnections: WhatsAppConnection[] = data.map((item: any) => ({
          id: item.id as string,
          name: item.name as string,
          phone: item.phone as string,
          status: (item.status as 'active' | 'inactive' | 'connecting') || 'inactive',
          created_at: item.created_at as string,
          instance_name: item.instance_name as string
        }));
        
        console.log('Conexões carregadas:', typedConnections.length);
        setConnections(typedConnections);
      }
    } catch (error: any) {
      console.error('Erro ao carregar conexões WhatsApp:', error);
      toast.error('Erro ao carregar conexões: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para abrir o modal de nova conexão
  const handleAddConnection = () => {
    setInstanceName('');
    setQRCodeData('');
    setConnectionError('');
    setInstanceCreated(false);
    setShowModal(true);
  };
  
  // Função para conectar uma instância existente
  const handleConnectExisting = (connection: WhatsAppConnection) => {
    setCurrentConnection(connection);
    setInstanceName(connection.instance_name || '');
    setQRCodeData('');
    setConnectionError('');
    setLoadingQRCode(false);
    setConnectionStatus('pending');
    setShowQRModal(true);
    
    // Buscar o QR Code da instância existente
    if (connection.instance_name) {
      getQRCodeForExistingInstance(connection.instance_name);
      
      // Iniciar verificação periódica do status
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
      
      // Verificar status imediatamente e depois a cada 5 segundos
      const instanceNameStr = connection.instance_name || '';
      if (instanceNameStr) {
        checkConnectionStatus(instanceNameStr, connection.id);
        statusCheckIntervalRef.current = setInterval(() => {
          checkConnectionStatus(instanceNameStr, connection.id);
        }, 5000);
      } else {
        console.error('Nome da instância não disponível');
        toast.error('Erro: Nome da instância não disponível');
      }
    }
  };
  
  // Função para fechar o modal
  const handleCloseModal = () => {
    setShowModal(false);
  };
  
  // Função para fechar o modal de QR Code
  const handleCloseQRModal = () => {
    // Limpar o intervalo de verificação ao fechar o modal
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
    
    setShowQRModal(false);
    setCurrentConnection(null);
    setConnectionStatus('pending');
  };
  
  // Função para desconectar uma instância WhatsApp
  const handleDisconnectWhatsApp = async (connectionId: string, instanceName: string) => {
    try {
      setLoading(true);
      
      // 1. Desconectar a instância na Evolution API
      if (instanceName) {
        try {
          // Chama o endpoint de logout da Evolution API
          const response = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY
            }
          });
          
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Erro ao desconectar instância');
          }
          
          console.log(`Instância ${instanceName} desconectada com sucesso na Evolution API`);
        } catch (apiError: any) {
          console.error('Erro ao desconectar instância na API:', apiError);
          toast.error('Erro ao desconectar instância: ' + apiError.message);
        }
      }
      
      // 2. Atualizar o status da conexão para 'inactive' no banco de dados
      const { error } = await supabase
        .from('whatsapp_connections')
        .update({ status: 'inactive' })
        .eq('id', connectionId);
      
      if (error) {
        throw error;
      }
      
      // 3. Atualizar a lista de conexões
      if (adminId) {
        loadWhatsAppConnections(adminId);
      }
      
      toast.success('WhatsApp desconectado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao desconectar WhatsApp:', error);
      toast.error('Erro ao desconectar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para excluir uma conexão
  const handleDeleteConnection = async (connectionId: string, instanceName: string) => {
    if (!confirm(`Tem certeza que deseja excluir esta conexão?\nA instância ${instanceName} será removida.`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      // 1. Excluir a instância na Evolution API
      if (instanceName) {
        try {
          const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY
            }
          });
          
          const data = await response.json();
          console.log('Resposta da API ao excluir instância:', data);
        } catch (apiError) {
          console.error('Erro ao excluir instância na API:', apiError);
          // Continuamos mesmo com erro na API para remover do banco
        }
      }
      
      // 2. Excluir a conexão do banco de dados
      const { error } = await supabase
        .from('whatsapp_connections')
        .delete()
        .eq('id', connectionId);
      
      if (error) {
        throw error;
      }
      
      // 3. Atualizar a lista de conexões
      if (adminId) {
        loadWhatsAppConnections(adminId);
      }
      
      toast.success('Conexão excluída com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir conexão:', error);
      toast.error('Erro ao excluir conexão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para criar uma instância na Evolution API
  const createInstance = async () => {
    if (!instanceName.trim()) {
      setConnectionError('Nome da instância é obrigatório');
      return;
    }
    
    try {
      setLoadingQRCode(true);
      setConnectionError('');
      
      console.log('Tentando criar instância:', instanceName.trim());
      
      // Criar a instância na Evolution API
      const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
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
      
      // Salvar a nova conexão no banco de dados Supabase
      if (!adminId) {
        console.error('Admin ID não disponível. Tentando recuperar...');
        
        try {
          // Tentar obter novamente o ID do admin antes de desistir
          const { data } = await supabase.auth.getUser();
          const user = data.user;
          
          if (user) {
            console.log('Usuário ainda autenticado, usando ID como fallback');
            const userId = user.id.toString();
            setAdminId(userId);
            
            // Continuar com a operação usando o ID do usuário como admin_id
            saveInstanceToDatabase(instanceName.trim(), userId);
            return;
          } else {
            toast.error('Sessão expirada. Faça login novamente.');
            navigate('/admin/whats-login');
            return;
          }
        } catch (authError) {
          console.error('Erro ao tentar recuperar autenticação:', authError);
          toast.error('Erro: Admin não identificado. Faça login novamente.');
          return;
        }
      }
      
      // Se chegou aqui, temos um adminId válido
      await saveInstanceToDatabase(instanceName.trim(), adminId);
      
      // Sucesso na criação da instância
      toast.success('Instância criada com sucesso!');
      handleCloseModal(); // Fecha o modal após criar com sucesso
      
    } catch (error: any) {
      console.error('Erro ao criar instância:', error);
      setConnectionError(error.message || 'Erro ao criar instância');
    } finally {
      setLoadingQRCode(false);
    }
  };
  // Função para verificar o status da conexão
  const checkConnectionStatus = async (instanceName: string, connectionId: string) => {
    try {
      setCheckingStatus(true);
      
      console.log('Verificando status da conexão WhatsApp:', instanceName);
      
      // Usar diretamente o endpoint que sabemos que funciona
      const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao verificar status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Estado da conexão:', data);
      
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
        setConnectionStatus('connected');
        
        // Buscar informações adicionais da instância para obter o número do telefone
        try {
          // Tentar obter informações pelo endpoint fetchInstances
          const infoResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY
            }
          });
          
          if (!infoResponse.ok) {
            throw new Error('Não foi possível obter informações da instância');
          }
          
          const infoData = await infoResponse.json();
          console.log('Informações das instâncias:', infoData);
          
          // Encontrar a instância correspondente
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
        
        return true;
      }
      
      return false; // Não conectado
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setCheckingStatus(false);
    }
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
        console.error('Erro ao atualizar conexão:', error);
      } else {
        console.log('Conexão atualizada com sucesso!');
        // Recarregar as conexões
        if (adminId) {
          loadWhatsAppConnections(adminId);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar conexão:', error);
    }
  };
  
  // Função para obter o QR Code de uma instância existente
  const getQRCodeForExistingInstance = async (instanceName: string) => {
    try {
      setLoadingQRCode(true);
      setConnectionError('');
      
      console.log('Obtendo QR Code para a instância existente:', instanceName);
      
      // Buscar o QR Code da Evolution API
      const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      });
      
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
    } catch (error: any) {
      console.error('Erro ao obter QR Code:', error);
      setConnectionError(error.message || 'Erro ao obter QR Code');
    } finally {
      setLoadingQRCode(false);
    }
  };
  
  // Função para formatar o QR Code base64 para uso em imagem
  const formatQRCodeToDataURL = (qrCodeBase64: string): string => {
    // Se já começar com 'data:', é um dataURL válido
    if (qrCodeBase64.startsWith('data:')) {
      return qrCodeBase64;
    }
    
    // Remover possíveis caracteres não válidos de base64
    const cleanBase64 = qrCodeBase64.replace(/^data:image\/[a-z]+;base64,/, '').trim();
    
    // Retornar como dataURL
    return `data:image/png;base64,${cleanBase64}`;
  };
  
  // Função para recarregar o QR Code
  const refreshQRCode = () => {
    if (currentConnection?.instance_name) {
      getQRCodeForExistingInstance(currentConnection.instance_name);
    }
  };
  
  // Função para salvar a instância no banco de dados
  const saveInstanceToDatabase = async (instanceNameTrimmed: string, adminId: string) => {
    try {
      console.log('Salvando instância no banco, adminId:', adminId);
      
      // Verificar se já existe uma conexão com este instance_name
      const { data: existingConnection } = await supabase
        .from('whatsapp_connections')
        .select('id')
        .eq('instance_name', instanceNameTrimmed)
        .eq('admin_id', adminId);
      
      if (existingConnection && existingConnection.length > 0) {
        console.log('Conexão já existe no banco:', existingConnection[0]);
        toast.info('Esta instância já está cadastrada!');
      } else {
        // Inserir nova conexão
        const { data: newConnection, error } = await supabase
          .from('whatsapp_connections')
          .insert([{
            admin_id: adminId,
            name: `WhatsApp ${instanceNameTrimmed}`,
            phone: 'Aguardando conexão...',
            status: 'inactive',
            instance_name: instanceNameTrimmed
          }])
          .select()
          .single();
        
        if (error) {
          console.error('Erro ao salvar conexão no banco:', error);
          toast.error('Erro ao salvar conexão: ' + error.message);
        } else {
          console.log('Conexão salva com sucesso:', newConnection);
          toast.success('Conexão salva com sucesso!');
        }
      }
      
      // Recarregar conexões para exibir na grid
      loadWhatsAppConnections(adminId);
    } catch (dbError: any) {
      console.error('Erro ao salvar conexão:', dbError);
      toast.error('Erro ao salvar conexão: ' + dbError.message);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      <header className="bg-[#2A2A2A] border-b border-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">Teste de Conexão WhatsApp</h1>
        {authenticated && (
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success('Logout realizado com sucesso!');
              navigate('/admin/whats-login');
            }}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg flex items-center gap-1"
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        )}
      </header>
      
      <main className="p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Gerenciador de Conexões</h2>
            <button
              onClick={handleAddConnection}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              <Plus size={16} />
              <span>Adicionar Conexão</span>
            </button>
          </div>
        
        <div className="bg-[#2A2A2A] rounded-lg border border-gray-800 overflow-hidden w-full">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              <span className="ml-2 text-gray-300">Carregando conexões...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#353535] text-left">
                    <th className="p-2 text-gray-300 font-medium text-sm">Nome</th>
                    <th className="p-2 text-gray-300 font-medium text-sm">Número</th>
                    <th className="p-2 text-gray-300 font-medium text-sm">Instância</th>
                    <th className="p-2 text-gray-300 font-medium text-sm">Status</th>
                    <th className="p-2 text-gray-300 font-medium text-sm">Criado em</th>
                    <th className="p-2 text-gray-300 font-medium text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {connections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-400">
                        Nenhuma conexão WhatsApp configurada. Clique em "Adicionar Conexão" para começar.
                      </td>
                    </tr>
                  ) : (
                    connections.map((connection) => (
                      <tr key={connection.id} className="hover:bg-[#333]">
                        <td className="p-2 text-white text-sm">{connection.name}</td>
                        <td className="p-2 text-white text-sm">{connection.phone}</td>
                        <td className="p-2 text-white text-sm">{connection.instance_name || 'N/A'}</td>
                        <td className="p-2">
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
                        <td className="p-2 text-gray-300 text-sm">
                          {new Date(connection.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {connection.status === 'active' ? (
                              <button
                                className="p-1 text-orange-400 hover:text-orange-300 rounded-lg flex items-center gap-1 text-xs"
                                title="Desconectar"
                                onClick={() => handleDisconnectWhatsApp(connection.id, connection.instance_name || '')}
                              >
                                <LogOut size={18} />
                                <span className="hidden sm:inline">Desconectar</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConnectExisting(connection)}
                                className="p-1 text-green-400 hover:text-green-300 rounded-lg flex items-center gap-1 text-xs"
                                title="Conectar"
                              >
                                <MessageSquare size={18} />
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
      </main>
      
      {/* Modal para adicionar nova instância */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={handleCloseModal} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#2A2A2A] rounded-lg shadow-lg border border-gray-800 p-4 w-full max-w-[400px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <MessageSquare size={18} className="text-emerald-500" />
                  {instanceCreated ? 'Conectar ao WhatsApp' : 'Nova Conexão WhatsApp'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              
              {!instanceCreated ? (
                <div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nome da Instância
                    </label>
                    <input
                      type="text"
                      value={instanceName}
                      onChange={(e) => setInstanceName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Ex: nexo_whatsapp_01"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Use apenas letras, números e underscores. Não use espaços ou caracteres especiais.
                    </p>
                  </div>
                  <button
                    onClick={createInstance}
                    disabled={!instanceName.trim() || loadingQRCode}
                    className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loadingQRCode ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Criando...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>Criar Instância</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="mb-4 text-gray-300">
                    Escaneie o QR Code abaixo com seu WhatsApp para conectar:
                  </p>
                  
                  {loadingQRCode ? (
                    <div className="flex flex-col items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-2"></div>
                      <span className="text-gray-300">Gerando QR Code...</span>
                    </div>
                  ) : qrCodeData ? (
                    <div className="bg-white p-4 rounded-lg inline-block mb-4">
                      {/* Aqui será exibido o QR Code quando tivermos a implementação */}
                      <img 
                        src="https://via.placeholder.com/200x200/ffffff/000000?text=QR+Code" 
                        alt="QR Code para conexão" 
                        className="w-48 h-48 object-contain" 
                      />
                    </div>
                  ) : (
                    <div className="bg-[#1C1C1C] p-6 rounded-lg mb-4">
                      <p className="text-red-400">{connectionError || 'QR Code não disponível'}</p>
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-gray-400 mb-6">
                    Este QR Code expira em 45 segundos. Se expirar, clique em "Recarregar QR Code".
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => console.log('Recarregar QR Code')}
                      disabled={loadingQRCode}
                      className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                    >
                      Recarregar QR Code
                    </button>
                    <button
                      onClick={() => console.log('Verificar status')}
                      disabled={loadingQRCode}
                      className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                    >
                      Verificar Status
                    </button>
                  </div>
                </div>
              )}
              
              {connectionError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{connectionError}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Modal para conectar instância existente (QR Code) */}
      {showQRModal && currentConnection && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={handleCloseQRModal} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#2A2A2A] rounded-lg shadow-lg border border-gray-800 p-4 w-full max-w-[400px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <MessageSquare size={18} className="text-emerald-500" />
                  Conectar WhatsApp
                </h3>
                <button
                  onClick={handleCloseQRModal}
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
                      <strong className="text-white"> {currentConnection.instance_name}</strong>:
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
                        />
                      </div>
                    ) : (
                      <div className="bg-[#1C1C1C] p-6 rounded-lg mb-4">
                        <p className="text-red-400">{connectionError || 'QR Code não disponível'}</p>
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-gray-400 mb-6">
                      Este QR Code expira em 45 segundos. Se expirar, clique em "Recarregar QR Code".
                    </div>
                  </>
                )}
                
                <div className="flex gap-2">
                  {connectionStatus === 'connected' ? (
                    <button
                      onClick={handleCloseQRModal}
                      className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      <span>Concluído</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={refreshQRCode}
                        disabled={loadingQRCode}
                        className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={14} className={loadingQRCode ? "animate-spin" : ""} />
                        <span>Recarregar QR Code</span>
                      </button>
                      <button
                        onClick={() => {
                          if (currentConnection.instance_name) {
                            checkConnectionStatus(currentConnection.instance_name, currentConnection.id);
                          } else {
                            toast.error('Erro: Nome da instância não disponível');
                          }
                        }}
                        disabled={checkingStatus}
                        className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white text-sm rounded-lg transition-colors flex items-center justify-center"
                      >
                        {checkingStatus ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <span>Verificar</span>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {connectionError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{connectionError}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WhatsConnector;
