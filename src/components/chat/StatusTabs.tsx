import React from 'react';
import { ConversationStatus, StatusTab } from '../../types/chat';

interface StatusTabsProps {
  tabs: StatusTab[];
  activeTab: ConversationStatus | 'all';
  onTabChange: (tabId: ConversationStatus | 'all') => void;
}

const StatusTabs: React.FC<StatusTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  // Separar as abas em duas linhas
  const firstRowTabs = tabs.slice(0, 3); // Primeira linha: Aguardando, Em Atendimento, Pendentes
  const secondRowTabs = tabs.slice(3);   // Segunda linha: Finalizados, Contatos, Status
  
  console.log('Tabs:', tabs);
  console.log('ActiveTab:', activeTab);
  
  // Versão completamente reescrita para garantir que os cliques funcionem
  const handleTabClick = (tabId: string) => {
    console.log('Clicando na aba:', tabId);
    onTabChange(tabId as ConversationStatus | 'all');
  };

  return (
    <div className="flex flex-col border-b border-gray-800 bg-[#1e1e1e]">
      {/* PRIMEIRA LINHA DE ABAS - IMPLEMENTAÇÃO SIMPLIFICADA */}
      <div className="flex justify-center">
        {firstRowTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <div 
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{ cursor: 'pointer', flex: 1, position: 'relative', zIndex: 999 }}
              className={`px-4 py-3 text-center ${isActive ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-700 text-white text-xs rounded-full px-2 py-0.5">
                  {tab.count}
                </span>
              )}
            </div>
          );
        })}
      </div>
      
      {/* SEGUNDA LINHA DE ABAS - IMPLEMENTAÇÃO SIMPLIFICADA */}
      <div className="flex justify-center">
        {secondRowTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <div 
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{ cursor: 'pointer', flex: 1, position: 'relative', zIndex: 999 }}
              className={`px-4 py-3 text-center ${isActive ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-700 text-white text-xs rounded-full px-2 py-0.5">
                  {tab.count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusTabs;
