import React from 'react';
import { Phone, User } from 'lucide-react';
import { ConversationStatus } from '../../types/chat';

interface ChatHeaderProps {
  contactName: string;
  status: ConversationStatus;
  avatarUrl?: string;
  onChangeStatus: (status: ConversationStatus) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  contactName,
  status,
  avatarUrl,
  onChangeStatus
}) => {
  // Função para obter a cor do status
  const getStatusColor = (status: ConversationStatus): string => {
    switch (status) {
      case 'pending':
      case 'pendente':
        return 'bg-yellow-500';
      case 'attending':
        return 'bg-blue-500';
      case 'finished':
        return 'bg-green-500';
      case 'waiting':
        return 'bg-purple-500';
      case 'deletado':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Texto do status para ser exibido
  const getStatusText = (status: ConversationStatus): string => {
    switch (status) {
      case 'pending':
      case 'pendente':
        return 'Pendente';
      case 'attending':
        return 'Em Atendimento';
      case 'finished':
        return 'Finalizado';
      case 'waiting':
        return 'Aguardando';
      case 'deletado':
        return 'Apagado';
      case 'contacts':
        return 'Contato';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <div className="bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Avatar do contato */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 text-white">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={contactName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6" />
            )}
          </div>
          
          {/* Indicador de status */}
          <div
            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${getStatusColor(
              status
            )}`}
          />
        </div>

        {/* Informações do contato */}
        <div>
          <h3 className="font-medium text-white">{contactName}</h3>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${getStatusColor(
                status
              )}`}
            />
            <span className="text-sm text-gray-400">{getStatusText(status)}</span>
          </div>
        </div>
      </div>

      {/* Ações do cabeçalho */}
      <div className="flex items-center gap-2">
        {/* Seletor de status */}
        <select
          value={status}
          onChange={(e) => onChangeStatus(e.target.value as ConversationStatus)}
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="pending">Pendente</option>
          <option value="attending">Em Atendimento</option>
          <option value="finished">Finalizado</option>
          <option value="waiting">Aguardando</option>
        </select>

        {/* Botão de ligação (exemplo, pode ser implementado depois) */}
        <button
          type="button"
          className="p-2 rounded-full bg-green-600 hover:bg-green-700 text-white"
        >
          <Phone className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
