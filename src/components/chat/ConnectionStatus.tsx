import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { WhatsAppConnection } from '../../hooks/useWhatsAppInstance';
import { supabase } from '../../lib/supabase';

// Componente de carregamento circular
const CircularProgress: React.FC<{ size: number; className?: string }> = ({ size, className }) => {
  return (
    <div 
      className={`animate-spin rounded-full border-t-2 border-gray-500 ${className || ''}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};

interface ConnectionStatusProps {
  connection: WhatsAppConnection | null;
  connections?: WhatsAppConnection[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  socketConnected?: boolean;
  socketError?: string | null;
  socketInstance?: string; // Adicionando instância do socket
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connection,
  connections = [],
  loading,
  error,
  onRefresh,
  socketConnected = false,
  socketError = null,
  socketInstance = '' // Valor padrão para instância do socket
}) => {
  // Estado para armazenar todas as conexões da revenda
  const [allConnections, setAllConnections] = useState<WhatsAppConnection[]>([]);
  const [loadingAllConnections, setLoadingAllConnections] = useState<boolean>(true);

  // Usar as conexões passadas como prop ou as carregadas do banco
  const displayConnections = connections.length > 0 ? connections : allConnections;

  // Função para carregar todas as conexões da revenda logada
  const loadAllConnections = async () => {
    try {
      setLoadingAllConnections(true);

      // Obter admin_id do usuário logado
      const adminSession = localStorage.getItem('admin_session');
      
      if (!adminSession) {
        setLoadingAllConnections(false);
        return;
      }
      
      const session = JSON.parse(adminSession);
      
      // Verificar o formato da sessão
      const adminId = session.id || (session.user && session.user.id) || session.admin_id;
      
      if (!adminId) {
        setLoadingAllConnections(false);
        return;
      }

      // Buscar dados do admin para obter reseller_id
      const { data: adminData, error: adminError } = await supabase
        .from('profile_admin')
        .select('reseller_id')
        .eq('id', adminId)
        .single();
        
      if (adminError || !adminData?.reseller_id) {
        setLoadingAllConnections(false);
        return;
      }
      
      const resellerId = adminData.reseller_id;

      // Buscar todas as conexões WhatsApp para esta revenda
      const { data, error: connectionsError } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('reseller_id', resellerId)
        .order('created_at', { ascending: false });
        
      if (connectionsError || !data) {
        setLoadingAllConnections(false);
        return;
      }
      
      // Mapear as conexões para o formato esperado
      const whatsappConnections: WhatsAppConnection[] = data.map((conn: any) => ({
        id: String(conn.id),
        name: String(conn.name || 'Instância WhatsApp'),
        phone: String(conn.phone || ''),
        status: conn.status as WhatsAppConnection['status'],
        created_at: String(conn.created_at),
        instance_name: String(conn.instance_name || ''),
        reseller_id: String(conn.reseller_id || '')
      }));
      
      setAllConnections(whatsappConnections);
    } catch (err) {
      console.error('Erro ao carregar conexões WhatsApp:', err);
    } finally {
      setLoadingAllConnections(false);
    }
  };

  // Carregar as conexões ao inicializar o componente
  useEffect(() => {
    loadAllConnections();
  }, []);

  // Função auxiliar para formatar o status da conexão
  const getStatusLabel = (status: WhatsAppConnection['status']) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'connecting': return 'Conectando';
      case 'disconnected': return 'Desconectado';
      case 'inactive': return 'Inativo';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="py-2 px-1">
      {/* Card de status do Socket.io */}
      <div className="mb-4 px-3">
        <div className="mb-4 p-3 bg-[#222222] rounded-md border border-gray-800 flex flex-col">
          <div className="flex items-center mb-3">
            <div className="flex-1">
              <h4 className="text-white text-sm font-medium mb-1">Status Socket.io</h4>
              <p className="text-xs text-gray-400">Conexão para atualizações em tempo real</p>
            </div>
            <div className="flex items-center">
              <span className={socketConnected ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
                {socketConnected ? "Conectado" : "Desconectado"}
                {socketConnected && socketInstance && (
                  <span className="text-xs ml-1 text-gray-400">
                    (Instância: {socketInstance})
                  </span>
                )}
              </span>
              <div 
                className={`ml-2 h-3 w-3 rounded-full ${socketConnected ? "bg-green-500" : "bg-red-500"}`}
                title={socketConnected ? `Socket.io conectado à instância ${socketInstance}` : "Socket.io desconectado"}
              />
            </div>
          </div>
          
          {socketError && (
            <div className="mt-2 p-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
              {socketError}
            </div>
          )}
        </div>


      </div>
      
      {/* Lista de instâncias WhatsApp */}
      <div className="px-3">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white text-lg font-semibold">Instâncias WhatsApp</h3>
          <button 
            onClick={() => !loadingAllConnections && loadAllConnections()}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#3A3A3A] transition-colors"
          >
            <RefreshCw size={16} className={loadingAllConnections ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Exibição das instâncias com carregamento condicional */}
        {loading || loadingAllConnections ? (
          <div className="flex justify-center py-4">
            <CircularProgress size={24} className="text-gray-500" />
          </div>
        ) : error ? (
          <div className="bg-[#2A2A2A] rounded-lg p-4 text-center text-red-400">
            <p>{error}</p>
            <button 
              onClick={onRefresh}
              className="mt-2 px-3 py-1 text-xs rounded bg-primary text-white hover:bg-primary/80"
            >
              Tentar novamente
            </button>
          </div>
        ) : displayConnections.length === 0 ? (
          <div className="bg-[#2A2A2A] rounded-lg p-4 text-center text-gray-400">
            <p>Nenhuma instância encontrada</p>
            <p className="text-xs mt-1">Configure uma instância em Configurações</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayConnections.map(conn => (
              <div key={conn.id} className="bg-[#2A2A2A] rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-white font-medium truncate">{conn.name || conn.instance_name}</p>
                    <p className="text-gray-400 text-xs">{conn.phone || ''}</p>
                    <p className="text-gray-400 text-xs">Instância: {conn.instance_name}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    {/* Status da instância WhatsApp */}
                    <div className="flex items-center mb-1">
                      <span 
                        className={`text-xs ${conn.status === 'active' ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {getStatusLabel(conn.status)}
                      </span>
                      <div 
                        className={`ml-2 h-3 w-3 rounded-full ${conn.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}
                      />
                    </div>
                    
                    {/* Mostrar apenas o status da API */}
                  </div>
                </div>
                
                {conn.id === connection?.id && (
                  <button 
                    onClick={onRefresh}
                    className="mt-3 px-3 py-1 w-full text-xs rounded bg-primary text-white hover:bg-primary/80 flex items-center justify-center gap-1"
                  >
                    <RefreshCw size={12} />
                    Atualizar Status
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
