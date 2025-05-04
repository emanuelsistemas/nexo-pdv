import React from 'react';
import { ConversationStatus, StatusTab } from '../../types/chat';

interface StatusTabsProps {
  tabs: StatusTab[];
  activeTab: ConversationStatus | 'all';
  onTabChange: (tabId: ConversationStatus | 'all') => void;
}

const StatusTabs: React.FC<StatusTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  // Função para determinar a cor de fundo do indicador do tab ativo
  const getTabColor = (tabId: ConversationStatus | 'all', isActive: boolean): string => {
    if (!isActive) return '';
    
    switch (tabId) {
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
      case 'all':
        return 'bg-emerald-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex overflow-x-auto no-scrollbar border-b border-gray-700 bg-gray-900">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const tabColor = getTabColor(tab.id, isActive);
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-shrink-0 px-4 py-2 text-sm font-medium focus:outline-none transition-colors
              ${
                isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
          >
            <div className="flex items-center gap-2">
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-gray-700 text-white text-xs rounded-full px-2 py-0.5">
                  {tab.count}
                </span>
              )}
            </div>
            
            {/* Indicador de aba ativa */}
            {isActive && (
              <div
                className={`absolute bottom-0 left-0 h-0.5 w-full ${tabColor}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StatusTabs;
