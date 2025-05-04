import { useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios'; // Importe o axios corretamente

// Versão super simplificada só para testar o Socket.io
export default function UltraSimpleSocketTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Função auxiliar para logs
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  // Função para conectar o Socket.io EXATAMENTE como no ChatNexo
  const connectSocketExactlyLikeInChatNexo = async () => {
    setIsLoading(true);
    addLog("INICIANDO TESTE - Seguindo EXATAMENTE a sequência do ChatNexo");

    // Configuração FIXA para teste - mesmos valores que funcionam no ChatNexo
    const baseUrl = "https://apiwhatsapp.nexopdv.com";
    const instanceName = "123";
    // Buscar do localStorage para garantir que estamos usando a mesma apikey que o ChatNexo
    let apikey = "";
    try {
      const savedConfig = localStorage.getItem('nexochat_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        apikey = config.apikey || "";
        addLog(`Usando apikey do localStorage: ${apikey.substring(0, 5)}...`);
      } else {
        addLog("Nenhuma configuração encontrada no localStorage. Entre no ChatNexo primeiro para salvar a configuração!");
        // Solicitar API key manualmente se não encontrar no localStorage
        const manualApikey = prompt("Digite a API key completa:");
        if (manualApikey) {
          apikey = manualApikey;
          addLog(`Usando apikey digitada manualmente: ${apikey.substring(0, 5)}...`);
        }
      }
    } catch (e) {
      addLog(`Erro ao ler localStorage: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    addLog(`Usando: URL=${baseUrl}, Instância=${instanceName}, APIKey=${apikey.substring(0, 5)}...`);

    try {
      // PASSO 1: Verificar o status da instância primeiro (exatamente como ChatNexo)
      addLog("Passo 1: Verificando status da instância via HTTP");
      
      // Verificar se a URL e instância são válidas
      if (!baseUrl || !instanceName) {
        throw new Error('URL da API ou nome da instância não definidos');
      }

      // Criar headers EXATAMENTE como no ChatNexo
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Só adiciona apikey se ela não estiver vazia (exatamente como ChatNexo)
      if (apikey && apikey.trim() !== '') {
        headers['apikey'] = apikey;
      }
      
      addLog(`Fazendo requisição com headers: ${JSON.stringify(headers)}`);
      
      // Usar axios exatamente como ChatNexo
      const statusUrl = `${baseUrl}/instance/connectionState/${instanceName}`;
      addLog(`Fazendo requisição GET para: ${statusUrl}`);
      
      // Usar axios exatamente como ChatNexo
      const response = await axios.get(statusUrl, {
        headers: headers
      });

      // A resposta do axios é diferente da resposta do fetch
      if (response.status !== 200) {
        throw new Error(`Erro ao verificar status: ${response.status}`);
      }
      
      // No axios, a resposta já vem processada em response.data
      const dataStatus = response.data;
      addLog(`Status da instância: ${JSON.stringify(dataStatus)}`);
      
      // PASSO 2: Conectar o Socket.io (somente após verificar o status da instância)
      addLog("Passo 2: Agora sim, conectando Socket.io");
      
      // Desconectar socket existente se houver
      if (socketRef.current) {
        addLog("Desconectando socket existente");
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Criar socket com configuração IDÊNTICA ao ChatNexo
      addLog(`Criando socket: ${baseUrl} (transports: websocket,polling)`);
      const socket = io(baseUrl, {
        transports: ['websocket', 'polling'],
        query: {
          instance: instanceName
        },
        extraHeaders: {
          'apikey': apikey
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Monitora TODOS os eventos
      socket.onAny((event, ...args) => {
        addLog(`Evento recebido: ${event} ${JSON.stringify(args)}`);
      });

      // Log de conexão
      socket.on('connect', () => {
        addLog(`CONECTADO! Socket ID: ${socket.id}`);
        setIsConnected(true);

        // Enviar subscribe exatamente como ChatNexo
        const subscribeMessage = {
          action: 'subscribe',
          instance: instanceName
        };
        addLog(`Enviando subscribe: ${JSON.stringify(subscribeMessage)}`);
        socket.emit('subscribe', subscribeMessage);
        
        // Tentar formato alternativo também
        addLog('Enviando subscribe alternativo');
        socket.emit('subscribe', instanceName);
      });

      // Desconexão
      socket.on('disconnect', (reason) => {
        addLog(`DESCONECTADO. Razão: ${reason}`);
        setIsConnected(false);
      });

      // Erro de conexão
      socket.on('connect_error', (error) => {
        addLog(`ERRO DE CONEXÃO: ${error.message}`);
        console.error('Detalhes completos:', error);
      });

      // Erro genérico
      socket.on('error', (error) => {
        addLog(`ERRO: ${JSON.stringify(error)}`);
      });

      // Confirmação de inscrição
      socket.on('subscribed', (data) => {
        addLog(`INSCRITO: ${JSON.stringify(data)}`);
      });

      // Evento de mensagens
      socket.on('messages.upsert', (data) => {
        addLog(`NOVA MENSAGEM: ${JSON.stringify(data)}`);
      });

      socketRef.current = socket;

    } catch (error) {
      addLog(`ERRO: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Teste Ultra Simplificado Socket.io</h1>
        
        {/* Status */}
        <div className="mb-4 bg-white rounded-md shadow p-3 flex items-center">
          <div className="font-medium mr-2">Status:</div>
          <div className={`font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? 'CONECTADO' : 'DESCONECTADO'}
          </div>
          <div className={`ml-2 h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        
        {/* Botão único */}
        <div className="mb-4">
          <button
            onClick={connectSocketExactlyLikeInChatNexo}
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow"
          >
            {isLoading ? 'Conectando...' : 'CONECTAR SOCKET.IO (Exatamente como ChatNexo)'}
          </button>
        </div>
        
        {/* Para desconectar */}
        {isConnected && (
          <div className="mb-4">
            <button
              onClick={() => {
                if (socketRef.current) {
                  socketRef.current.disconnect();
                  addLog('Socket desconectado manualmente');
                }
              }}
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow"
            >
              DESCONECTAR
            </button>
          </div>
        )}
        
        {/* Limpar Logs */}
        <div className="mb-4">
          <button
            onClick={() => setLogs([])}
            className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md shadow"
          >
            LIMPAR LOGS
          </button>
        </div>
        
        {/* Log */}
        <div className="bg-black rounded-md shadow">
          <div className="flex justify-between items-center p-3 border-b border-gray-700">
            <h2 className="text-lg text-white font-medium">Logs</h2>
            <div className="text-xs text-gray-400">{logs.length} mensagens</div>
          </div>
          
          <div className="h-96 overflow-y-auto p-3 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500">Clique no botão acima para testar</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-white mb-1 break-all">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
