import React, { useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Teste super simplificado para Socket.io sem hooks personalizados
export default function SimplifiedSocketTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Função para adicionar logs
  const addLog = (message: string, ...args: any[]) => {
    const timestamp = new Date().toLocaleTimeString();
    let logMessage = `[${timestamp}] ${message}`;
    if (args.length > 0) {
      try {
        logMessage += ' ' + JSON.stringify(args);
      } catch (e) {
        logMessage += ' [Objeto não serializável]';
      }
    }
    setLogs(prev => [logMessage, ...prev]);
  };
  
  // Função para conectar apenas o Socket.io - versão super simplificada
  const connectSocket = async () => {
    // Configuração padrão do localStorage
    try {
      const savedConfig = localStorage.getItem('nexochat_config');
      if (!savedConfig) {
        addLog('Nenhuma configuração encontrada no localStorage');
        return;
      }
      
      const config = JSON.parse(savedConfig);
      const { baseUrl, apikey, instanceName } = config;
      
      addLog(`SEGUINDO A SEQUÊNCIA EXATA DO CHATNEXO`);
      addLog(`1. Primeiro, verificando status da instância: ${instanceName}`);
      
      // PASSO 1: Verificar o status da instância (EXATAMENTE como no ChatNexo)
      try {
        const url = `${baseUrl}/instance/connectionState/${instanceName}`;
        addLog(`Verificando status em: ${url}`);
        
        const response = await fetch(url, {
          headers: { 'apikey': apikey }
        });
        
        if (response.ok) {
          const data = await response.json();
          addLog(`Status da instância verificado com sucesso:`, data);
        } else {
          addLog(`Erro ao verificar status: ${response.status} ${response.statusText}`);
          throw new Error(`Falha ao verificar status: ${response.status}`);
        }
      } catch (error) {
        addLog(`Erro na verificação do status: ${error instanceof Error ? error.message : String(error)}`);
        throw error; // Interromper se a verificação falhar
      }
      
      // PASSO 2: Somente após verificar o status, conectar Socket.io
      addLog(`2. Agora sim, conectando Socket.io para: ${instanceName}`);
      
      // Fechar socket existente
      if (socketRef.current) {
        socketRef.current.disconnect();
        addLog('Socket existente desconectado');
      }
      
      // Criar socket com configuração idêntica à do ChatNexo
      const socket = io(baseUrl, {
        transports: ['websocket', 'polling'],
        query: { instance: instanceName },
        extraHeaders: { 'apikey': apikey },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      // Registrar eventos básicos
      socket.on('connect', () => {
        addLog(`Socket conectado! ID: ${socket.id}`);
        setIsConnected(true);
        
        // Enviar subscribe
        socket.emit('subscribe', { 
          action: 'subscribe',
          instance: instanceName
        });
        addLog('Enviado evento subscribe');
      });
      
      socket.on('disconnect', (reason) => {
        addLog(`Socket desconectado. Razão: ${reason}`);
        setIsConnected(false);
      });
      
      socket.on('connect_error', (error) => {
        addLog(`Erro de conexão: ${error.message}`);
      });
      
      socket.on('error', (error) => {
        addLog(`Erro: ${error}`);
      });
      
      // Monitorar todos os eventos
      socket.onAny((event, ...args) => {
        addLog(`Evento recebido: ${event}`, ...args);
      });
      
      socketRef.current = socket;
      
    } catch (error) {
      addLog(`Erro ao conectar: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Tentar outra opção de conexão usando só WebSocket (sem polling)
  const connectWebSocketOnly = () => {
    try {
      const savedConfig = localStorage.getItem('nexochat_config');
      if (!savedConfig) {
        addLog('Nenhuma configuração encontrada no localStorage');
        return;
      }
      
      const config = JSON.parse(savedConfig);
      const { baseUrl, apikey, instanceName } = config;
      
      addLog(`Tentando conectar APENAS com WebSocket a: ${baseUrl}`);
      
      // Fechar socket existente
      if (socketRef.current) {
        socketRef.current.disconnect();
        addLog('Socket existente desconectado');
      }
      
      // WebSocket-only connection
      const socket = io(baseUrl, {
        transports: ['websocket'],  // Apenas WebSocket, sem polling
        query: { instance: instanceName },
        extraHeaders: { 'apikey': apikey }
      });
      
      // Mesmos eventos do método anterior
      socket.on('connect', () => {
        addLog(`Socket (WebSocket only) conectado! ID: ${socket.id}`);
        setIsConnected(true);
        
        socket.emit('subscribe', { 
          action: 'subscribe',
          instance: instanceName
        });
      });
      
      socket.on('disconnect', (reason) => {
        addLog(`Socket desconectado. Razão: ${reason}`);
        setIsConnected(false);
      });
      
      socket.on('connect_error', (error) => {
        addLog(`Erro de conexão: ${error.message}`);
      });
      
      socket.onAny((event, ...args) => {
        addLog(`Evento recebido: ${event}`, ...args);
      });
      
      socketRef.current = socket;
      
    } catch (error) {
      addLog(`Erro ao conectar: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Tentar conexão com sufixo "/socket.io" explícito
  const connectWithPath = () => {
    try {
      const savedConfig = localStorage.getItem('nexochat_config');
      if (!savedConfig) {
        addLog('Nenhuma configuração encontrada no localStorage');
        return;
      }
      
      const config = JSON.parse(savedConfig);
      let { baseUrl, apikey, instanceName } = config;
      
      // Remover qualquer / no final da URL
      baseUrl = baseUrl.replace(/\/$/, '');
      
      addLog(`Tentando conectar com path explícito: ${baseUrl}/socket.io`);
      
      // Fechar socket existente
      if (socketRef.current) {
        socketRef.current.disconnect();
        addLog('Socket existente desconectado');
      }
      
      // Conexão especificando path
      const socket = io(baseUrl, {
        path: '/socket.io', // caminho explícito 
        transports: ['websocket', 'polling'],
        query: { instance: instanceName },
        extraHeaders: { 'apikey': apikey }
      });
      
      // Mesmos eventos
      socket.on('connect', () => {
        addLog(`Socket (com path) conectado! ID: ${socket.id}`);
        setIsConnected(true);
        
        socket.emit('subscribe', { 
          action: 'subscribe',
          instance: instanceName
        });
      });
      
      socket.on('disconnect', (reason) => {
        addLog(`Socket desconectado. Razão: ${reason}`);
        setIsConnected(false);
      });
      
      socket.on('connect_error', (error) => {
        addLog(`Erro de conexão: ${error.message}`);
      });
      
      socket.onAny((event, ...args) => {
        addLog(`Evento recebido: ${event}`, ...args);
      });
      
      socketRef.current = socket;
      
    } catch (error) {
      addLog(`Erro ao conectar: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Função para verificar se a API está disponível
  const testApi = async () => {
    try {
      setIsLoading(true);
      addLog('Testando API...');
      
      const savedConfig = localStorage.getItem('nexochat_config');
      if (!savedConfig) {
        addLog('Nenhuma configuração encontrada no localStorage');
        return;
      }
      
      const config = JSON.parse(savedConfig);
      const { baseUrl, apikey, instanceName } = config;
      
      const url = `${baseUrl}/instance/connectionState/${instanceName}`;
      addLog(`Testando URL: ${url}`);
      
      const response = await fetch(url, {
        headers: { 'apikey': apikey }
      });
      
      if (response.ok) {
        const data = await response.json();
        addLog(`API respondeu com sucesso (${response.status}):`, data);
      } else {
        addLog(`API respondeu com erro: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      addLog(`Erro ao testar API: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // UI da página
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Teste Simplificado de Socket.io</h1>
        
        {/* Status */}
        <div className="mb-4 bg-white rounded-md shadow p-4">
          <div className="flex items-center">
            <span className="font-medium mr-2">Status:</span>
            <span className={`${isConnected ? 'text-green-600' : 'text-red-600'} font-semibold`}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
            <div className={`ml-2 h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
        
        {/* Configuração atual */}
        <div className="mb-4 bg-white rounded-md shadow p-4">
          <h2 className="text-lg font-medium mb-2">Configuração Atual</h2>
          {(() => {
            try {
              const savedConfig = localStorage.getItem('nexochat_config');
              if (!savedConfig) return <p className="text-gray-500">Nenhuma configuração encontrada</p>;
              
              const config = JSON.parse(savedConfig);
              return (
                <div className="text-sm">
                  <p><strong>URL Base:</strong> {config.baseUrl}</p>
                  <p><strong>Nome da Instância:</strong> {config.instanceName}</p>
                  <p><strong>API Key:</strong> {config.apikey?.substring(0, 5)}...</p>
                </div>
              );
            } catch (e) {
              return <p className="text-red-500">Erro ao ler configuração: {String(e)}</p>;
            }
          })()}
        </div>
        
        {/* Ações */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          <button 
            onClick={testApi}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          >
            {isLoading ? 'Testando...' : 'Testar API'}
          </button>
          
          <button 
            onClick={connectSocket}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
          >
            Conectar Socket (Padrão)
          </button>
          
          <button 
            onClick={connectWebSocketOnly}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded"
          >
            Conectar WebSocket Only
          </button>
          
          <button 
            onClick={connectWithPath}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded"
          >
            Conectar com Path
          </button>
          
          <button 
            onClick={() => {
              if (socketRef.current) {
                socketRef.current.disconnect();
                addLog('Socket desconectado manualmente');
                setIsConnected(false);
              } else {
                addLog('Não há socket conectado');
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
          >
            Desconectar
          </button>
          
          <button 
            onClick={() => setLogs([])}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
          >
            Limpar Logs
          </button>
        </div>
        
        {/* Logs */}
        <div className="bg-black text-white rounded-md shadow p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-medium">Logs</h2>
            <span className="text-xs text-gray-400">{logs.length} mensagens</span>
          </div>
          
          <div className="h-96 overflow-y-auto p-2 bg-gray-900 rounded font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500">Nenhum log</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1 break-all whitespace-pre-wrap">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
