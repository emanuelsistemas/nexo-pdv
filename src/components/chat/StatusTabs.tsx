import React from 'react';
import { ConversationStatus, StatusTab } from '../../types/chat';

interface StatusTabsProps {
  tabs: StatusTab[];
  activeTab: ConversationStatus | 'all';
  onTabChange: (tabId: ConversationStatus | 'all') => void;
}

const StatusTabs: React.FC<StatusTabsProps> = ({ tabs, activeTab, onTabChange }) => {

  // Separar as abas em duas linhas
  const firstRowTabs = tabs.slice(0, 3); // Primeiras 3 abas: Aguardando, Em Atendimento, Finalizadas
  const secondRowTabs = tabs.slice(3);   // Abas restantes: Pendentes, Contatos
  
  // Componente de botão para cada aba
  const TabButton = ({ tab }: { tab: StatusTab }) => {
    const isActive = activeTab === tab.id;
    
    return (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`relative flex-1 whitespace-nowrap px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${isActive ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
      >
        <div className="flex items-center gap-2">
          <span>{tab.label}</span>
          {tab.count > 0 && (
            <span className="bg-gray-700 text-white text-xs rounded-full px-2 py-0.5">
              {tab.count}
            </span>
          )}
        </div>
      </button>
    );
  };
  
  return (
    <div className="flex flex-col border-b border-gray-800 bg-[#1e1e1e]">
      {/* Primeira linha de abas */}
      <div className="flex justify-center">
        {firstRowTabs.map((tab) => (
          <TabButton key={tab.id} tab={tab} />
        ))}
      </div>
      
      {/* Segunda linha de abas */}
      <div className="flex justify-center">
        {secondRowTabs.map((tab) => (
          <TabButton key={tab.id} tab={tab} />
        ))}
      </div>
    </div>
  );
};

export default StatusTabs;
