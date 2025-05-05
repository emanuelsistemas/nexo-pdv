import React, { useState } from 'react';
import MessageCounter, { incrementMessageCounter, resetMessageCounter } from './MessageCounter';

/**
 * Componente de exemplo que demonstra o uso do MessageCounter
 */
const MessageCounterExample: React.FC = () => {
  const [conversationId, setConversationId] = useState<string>('');
  const [messageCount, setMessageCount] = useState<number>(0);

  // Lidar com a mudança do ID da conversa
  const handleConversationIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConversationId(e.target.value);
  };

  // Incrementar contador manualmente (para demonstração)
  const handleIncrement = async () => {
    if (!conversationId) return;
    const success = await incrementMessageCounter(conversationId);
    if (success) {
      console.log(`Contador incrementado para a conversa ${conversationId}`);
    }
  };

  // Resetar contador manualmente (para demonstração)
  const handleReset = async () => {
    if (!conversationId) return;
    const success = await resetMessageCounter(conversationId);
    if (success) {
      console.log(`Contador zerado para a conversa ${conversationId}`);
    }
  };

  return (
    <div className="p-4 bg-[#2A2A2A] rounded-lg space-y-6">
      <h2 className="text-xl font-semibold text-white mb-4">Exemplos de Contador de Mensagens</h2>

      {/* Input para ID da conversa */}
      <div className="space-y-2">
        <label className="block text-sm text-gray-300">ID da Conversa</label>
        <input
          type="text"
          value={conversationId}
          onChange={handleConversationIdChange}
          placeholder="Insira o ID da conversa"
          className="w-full p-2 bg-[#333] border border-gray-700 rounded text-white"
        />
      </div>

      {/* Opções de manipulação do contador */}
      <div className="flex space-x-2">
        <button
          onClick={handleIncrement}
          disabled={!conversationId}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Incrementar
        </button>
        <button
          onClick={handleReset}
          disabled={!conversationId}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          Zerar
        </button>
      </div>

      {/* Exibição do contador */}
      {conversationId && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium text-white">Exibição do Contador</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Exemplo 1: Tamanho pequeno */}
            <div className="flex items-center justify-between bg-[#333] p-3 rounded">
              <span className="text-gray-300">Pequeno:</span>
              <MessageCounter 
                conversationId={conversationId} 
                variant="small" 
                onCountChange={setMessageCount}
              />
            </div>
            
            {/* Exemplo 2: Tamanho médio (padrão) */}
            <div className="flex items-center justify-between bg-[#333] p-3 rounded">
              <span className="text-gray-300">Médio (padrão):</span>
              <MessageCounter 
                conversationId={conversationId} 
                variant="medium"
              />
            </div>
            
            {/* Exemplo 3: Tamanho grande */}
            <div className="flex items-center justify-between bg-[#333] p-3 rounded">
              <span className="text-gray-300">Grande:</span>
              <MessageCounter 
                conversationId={conversationId} 
                variant="large"
              />
            </div>
            
            {/* Exemplo 4: Com classe personalizada */}
            <div className="flex items-center justify-between bg-[#333] p-3 rounded">
              <span className="text-gray-300">Personalizado:</span>
              <MessageCounter 
                conversationId={conversationId} 
                className="bg-purple-500 text-white"
              />
            </div>
            
            {/* Exemplo 5: Mostrar zero */}
            <div className="flex items-center justify-between bg-[#333] p-3 rounded">
              <span className="text-gray-300">Mostrar zero:</span>
              <MessageCounter 
                conversationId={conversationId} 
                showZero={true}
              />
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-gray-300">
              Valor atual do contador: <span className="text-white font-bold">{messageCount}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageCounterExample;
