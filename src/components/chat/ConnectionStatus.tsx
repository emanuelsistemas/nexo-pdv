import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import WhatsAppStatus from './WhatsAppStatus';
import { Smartphone, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { WhatsAppConnection } from '../../hooks/useWhatsAppInstance';

interface ConnectionStatusProps {
  currentConnection: WhatsAppConnection | null;
  loading: boolean;
  error: string | null;
  onRefreshConnection: () => void;
  socketConnected?: boolean; // Adicionar prop para o status do Socket.io
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  currentConnection,
  loading,
  error,
  onRefreshConnection,
  socketConnected = false // Valor padrão caso não seja fornecido
}) => {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState<boolean>(true);

  // Carregar todas as conexões disponíveis para a revenda
  useEffect(() => {
    const loadAllConnections = async () => {
      try {
        setLoadingConnections(true);
        const adminSession = localStorage.getItem('admin_session');
        
        if (!adminSession) {
          return;
        }
        
        const session = JSON.parse(adminSession);
        const adminId = session.id || (session.user && session.user.id);
        
        if (!adminId) {
          return;
        }

        // Buscar o reseller_id do admin logado
        const { data: adminData, error: adminError } = await supabase
          .from('profile_admin')
          .select('reseller_id')
          .eq('id', adminId)
          .single();
          
        if (adminError || !adminData?.reseller_id) {
          console.error('Erro ao obter dados do administrador:', adminError);
          return;
        }
        
        const resellerId = adminData.reseller_id;
        
        // Buscar todas as conexões da revenda
        const { data: connectionData, error: connectionError } = await supabase
          .from('whatsapp_connections')
          .select('*')
          .eq('reseller_id', resellerId)
          .order('created_at', { ascending: false });
          
        if (connectionError) {
          console.error('Erro ao buscar conexões:', connectionError);
          return;
        }
        
        if (connectionData) {
          // Mapear as conexões para o formato correto
          const formattedConnections = connectionData.map(conn => ({
            id: String(conn.id),
            name: String(conn.name || ''),
            phone: String(conn.phone || ''),
            status: conn.status as WhatsAppConnection['status'],
            created_at: String(conn.created_at),
            instance_name: String(conn.instance_name || ''),
            reseller_id: String(conn.reseller_id || '')
          }));
          
          setConnections(formattedConnections);
        }
      } catch (err) {
        console.error('Erro ao carregar conexões:', err);
      } finally {
        setLoadingConnections(false);
      }
    };
    
    loadAllConnections();
  }, []);

  return (
    <div className="py-2 px-1">
      <div className="mb-4 px-3">
        {/* Status do Socket.io - colocado primeiro e renomeado para "Status" */}
        <div className="mb-4 p-3 bg-[#222222] rounded-md border border-gray-800 flex items-center">
          <div className="flex-1">
            <h4 className="text-white text-sm font-medium mb-1">Status</h4>
            <p className="text-xs text-gray-400">Conexão para atualizações em tempo real</p>
          </div>
          <div className="flex items-center">
            <span className={socketConnected ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
              {socketConnected ? "Conectado" : "Desconectado"}
            </span>
            <div 
              className={`ml-2 h-3 w-3 rounded-full ${socketConnected ? "bg-green-500" : "bg-red-500"}`}
              title={socketConnected ? "Socket.io conectado" : "Socket.io desconectado"}
            />
          </div>
        </div>
        
        <h3 className="text-white text-lg font-semibold mb-2">Instância Ativa</h3>
        <WhatsAppStatus
          connection={currentConnection}
          loading={loading}
          error={error}
          onRefresh={onRefreshConnection}
        />
      </div>
      
      <div className="px-3">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white text-lg font-semibold">Todas as Instâncias</h3>
          <button 
            onClick={() => loadingConnections ? null : setLoadingConnections(true)}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#3A3A3A] transition-colors"
          >
            <RefreshCw size={16} className={loadingConnections ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingConnections ? (
          <div className="flex justify-center py-4">
            <RefreshCw size={24} className="animate-spin text-gray-500" />
          </div>
        ) : connections.length === 0 ? (
          <div className="bg-[#2A2A2A] rounded-lg p-4 text-center text-gray-400">
            <Smartphone size={32} className="mx-auto mb-2" />
            <p>Nenhuma instância encontrada</p>
            <p className="text-xs mt-1">Configure uma instância em Configurações</p>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map(conn => (
              <div key={conn.id} className="bg-[#2A2A2A] rounded-lg p-3 flex items-center">
                {conn.status === 'active' ? (
                  <CheckCircle size={16} className="text-green-500 mr-3 flex-shrink-0" />
                ) : (
                  <XCircle size={16} className="text-red-500 mr-3 flex-shrink-0" />
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="text-white font-medium truncate">{conn.name || conn.instance_name}</p>
                  <p className="text-gray-400 text-xs truncate">
                    {conn.phone ? `+${conn.phone}` : conn.instance_name}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  conn.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  conn.status === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {conn.status === 'active' ? 'Ativo' :
                   conn.status === 'connecting' ? 'Conectando' :
                   'Inativo'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
