import React from 'react';
import { WhatsAppConnection } from '../../hooks/useWhatsAppInstance';
import { RefreshCw, Smartphone, Info, CheckCircle, XCircle } from 'lucide-react';

interface WhatsAppStatusProps {
  connection: WhatsAppConnection | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const WhatsAppStatus: React.FC<WhatsAppStatusProps> = ({ 
  connection, 
  loading, 
  error,
  onRefresh
}) => {
  // Determinar o status da conexão para exibição
  const getStatusDisplay = () => {
    if (loading) return 'Carregando...';
    if (error) return `Erro: ${error}`;
    if (!connection) return 'Nenhuma instância configurada';
    
    // Status com base no status da conexão
    switch (connection.status) {
      case 'active':
        return 'Conectado';
      case 'inactive':
        return 'Inativo';
      case 'connecting':
        return 'Conectando...';
      case 'disconnected':
        return 'Desconectado';
      default:
        return 'Status desconhecido';
    }
  };

  // Determinar classe de cor com base no status
  const getStatusClass = () => {
    if (loading) return 'text-yellow-500';
    if (error) return 'text-red-500';
    if (!connection) return 'text-gray-500';
    
    switch (connection.status) {
      case 'active':
        return 'text-green-500';
      case 'inactive':
      case 'disconnected':
        return 'text-red-500';
      case 'connecting':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  // Ícone com base no status
  const StatusIcon = () => {
    if (loading) return <RefreshCw className="animate-spin text-yellow-500" size={16} />;
    if (error) return <Info className="text-red-500" size={16} />;
    if (!connection) return <Smartphone className="text-gray-500" size={16} />;
    
    switch (connection.status) {
      case 'active':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'inactive':
      case 'disconnected':
        return <XCircle className="text-red-500" size={16} />;
      case 'connecting':
        return <RefreshCw className="animate-spin text-yellow-500" size={16} />;
      default:
        return <Info className="text-gray-500" size={16} />;
    }
  };

  return (
    <div className="flex items-center bg-[#2A2A2A] px-3 py-2 rounded-md space-x-2 w-full mb-2">
      <StatusIcon />
      
      <div className="flex-1 text-sm">
        <span className={`font-medium ${getStatusClass()}`}>
          {getStatusDisplay()}
        </span>
        
        {connection && (
          <span className="text-gray-400 ml-2">
            {connection.name || connection.instance_name}
          </span>
        )}
      </div>
      
      <button 
        onClick={onRefresh}
        disabled={loading}
        className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#3A3A3A] transition-colors disabled:opacity-50"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      </button>
    </div>
  );
};

export default WhatsAppStatus;
