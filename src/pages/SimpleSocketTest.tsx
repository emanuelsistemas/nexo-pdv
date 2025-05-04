import React, { useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Esta página implementa SOMENTE a lógica de Socket.io do ChatNexo
// Sem hooks personalizados, sem componentes adicionais

export default function SimpleSocketTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  // Função para adicionar logs
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };
  
  // Função para recuperar configuração do localStorage
  const getStoredConfig = () => {
    try {
      const savedConfig = localStorage.getItem('nexochat_config');
      if (savedConfig) {
        return JSON.parse(savedConfig);
      }
    } catch (error) {
      addLog(`Erro ao ler configuração do localStorage: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  };
  
  // Função para salvar configuração no localStorage
  const saveConfig = (config: any) => {
    try {
      localStorage.setItem('nexochat_config', JSON.stringify(config));
      addLog('Configuração salva no localStorage com sucesso.');
    } catch (error) {
      addLog(`Erro ao salvar configuração: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Função para buscar configuração do banco de dados
  const fetchConfigFromDatabase = async (resellerId: string) => {
    setIsLoading(true);
    addLog(`Buscando configuração para reseller ID: ${resellerId}`);
    
    try {
      // Importação dinâmica para supabase
      const { supabase } = await import('../lib/supabase');
      
      // Buscar as configurações da revenda
      const { data, error } = await supabase
        .from('nexochat_config')
        .select('*')
        .eq('reseller_id', resellerId)
        .single();
      
      if (error) {
        addLog(`Erro ao buscar configuração: ${error.message}`);
        setError(error.message);
        return null;
      }
      
      if (data) {
        // Verificar se há configurações da API e instância
        if (!data.evolution_api_url || !data.evolution_api_key || !data.instance_name) {
          const message = 'Configuração incompleta no banco';
          addLog(message);
          setError(message);
          return null;
        }
        
        // Formatar configuração
        const config = {
          baseUrl: data.evolution_api_url,
          apikey: data.evolution_api_key,
          instanceName: data.instance_name
        };
        
        // Salvar no localStorage
        saveConfig(config);
        
        addLog(`Configuração encontrada: ${JSON.stringify({
          baseUrl: config.baseUrl,
          instanceName: config.instanceName,
          apiKeyLength: config.apikey.length
        })}`);
        
        return config;
      } else {
        const message = 'Nenhuma configuração encontrada para esta revenda';
        addLog(message);
        setError(message);
        return null;
      }
    } catch (error) {
      const message = `Erro ao buscar configuração: ${error instanceof Error ? error.message : String(error)}`;
      addLog(message);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // ESTA É A FUNÇÃO CRUCIAL - copiada diretamente do ChatNexo
  const connectSocketIO = (baseUrl: string, instanceName: string, apikey: string) => {
    // Fechar conexão existente se houver
    if (socketRef.current) {
      addLog('Fechando conexão Socket.io existente');
      socketRef.current.disconnect();
    }
    
    try {
      addLog(`Conectando Socket.io para instância ${instanceName} em ${baseUrl} com apikey: ${apikey.substring(0, 5)}...`);
      
      // Verificar se baseUrl tem o formato correto
      if (!baseUrl) {
        const message = 'URL base inválida para conexão Socket.io';
        addLog(message);
        setError(message);
        return;
      }
      
      if (!instanceName) {
        const message = 'Nome da instância inválido para conexão Socket.io';
        addLog(message);
        setError(message);
        return;
      }
      
      // Configurar opções do Socket.io - EXATAMENTE como no ChatNexo
      addLog('Socket.io configurando com opções: ' + JSON.stringify({
        transports: ['websocket', 'polling'],
        query: { instance: instanceName }
      }));
      
      // Vamos criar três variações para testar diferentes configurações
      addLog('TESTE 1: Usando a configuração padrão do ChatNexo');
      let socket;
      
      // ALTERNATIVA 1: Configuração exata do ChatNexo
      socket = io(baseUrl, {
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
      
      // Monitorar todos os eventos do Socket
      socket.onAny((event, ...args) => {
        addLog(`Socket.io evento recebido: ${event} ${JSON.stringify(args)}`);
      });
      
      // Evento de conexão
      socket.on('connect', () => {
        addLog(`Socket.io conectado! Socket ID: ${socket.id}`);
        setIsConnected(true);
        setError(null);
        
        // Enviar mensagem de inscrição em eventos
        const subscribeMessage = {
          action: 'subscribe',
          instance: instanceName
        };
        addLog('Enviando mensagem de inscrição: ' + JSON.stringify(subscribeMessage));
        socket.emit('subscribe', subscribeMessage);
        
        // Também tentar se inscrever com outros formatos
        addLog('Tentando inscrição alternativa');
        socket.emit('subscribe', instanceName);
      });
      
      // Confirmação de inscrição
      socket.on('subscribed', (data) => {
        addLog('Inscrição confirmada no Socket.io: ' + JSON.stringify(data));
      });
      
      // Desconexão
      socket.on('disconnect', (reason) => {
        addLog(`Socket.io desconectado. Razão: ${reason}`);
        setIsConnected(false);
      });
      
      // Evento connect_error - importante para depurar problemas
      socket.on('connect_error', (error) => {
        addLog(`Erro de conexão Socket.io: ${error.message}`);
        addLog('Detalhes completos do erro: ' + JSON.stringify(error, null, 2));
        setError(`Erro de conexão: ${error.message}`);
        setIsConnected(false);
      });
      
      // Evento connect_timeout
      socket.on('connect_timeout', () => {
        addLog('Timeout na conexão Socket.io');
        setIsConnected(false);
      });
      
      // Evento de erro
      socket.on('error', (error) => {
        addLog('Erro no Socket.io: ' + JSON.stringify(error));
        setIsConnected(false);
      });
      
      // Evento de mensagens
      socket.on('messages.upsert', (data) => {
        addLog('Nova mensagem recebida: ' + JSON.stringify(data));
      });
      
      // Definir o socket para uso futuro
      socketRef.current = socket;
    } catch (error) {
      const message = `Erro ao conectar ao Socket.io: ${error instanceof Error ? error.message : String(error)}`;
      addLog(message);
      setError(message);
      setIsConnected(false);
    }
  };
  
  // Interface da página
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Teste Simples de Socket.io (Código do ChatNexo)</h1>
        
        {/* Status */}
        <div className="mb-4 p-3 bg-white rounded-md shadow">
          <div className="flex items-center mb-2">
            <span className="mr-2 font-medium">Status:</span>
            <span className={isConnected ? "text-green-600" : "text-red-600"}>
              {isConnected ? "Conectado" : "Desconectado"}
            </span>
            <div 
              className={`ml-2 h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            />
          </div>
          
          {error && (
            <div className="text-red-600 text-sm mt-1">
              {error}
            </div>
          )}
        </div>
        
        {/* Configuração atual */}
        <div className="mb-4 p-3 bg-white rounded-md shadow">
          <h2 className="text-lg font-medium mb-2">Configuração atual</h2>
          
          {(() => {
            const config = getStoredConfig();
            if (config) {
              return (
                <div className="text-sm">
                  <div><strong>URL Base:</strong> {config.baseUrl}</div>
                  <div><strong>Instância:</strong> {config.instanceName}</div>
                  <div><strong>API Key:</strong> {config.apikey.substring(0, 5)}...</div>
                </div>
              );
            } else {
              return (
                <div className="text-gray-500">Nenhuma configuração encontrada</div>
              );
            }
          })()}
        </div>
        
        {/* Ações */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          <button 
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm"
            onClick={() => {
              const config = getStoredConfig();
              addLog(config ? 'Configuração carregada do localStorage' : 'Nenhuma configuração encontrada no localStorage');
            }}
          >
            Carregar do localStorage
          </button>
          
          <button 
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium text-sm"
            onClick={() => {
              // Entrada manual
              const baseUrl = prompt('Digite a URL da API Evolution:', 'https://apiwhatsapp.nexopdv.com');
              const apikey = prompt('Digite a API Key:', '');
              const instanceName = prompt('Digite o nome da instância:', '123');
              
              if (baseUrl && apikey && instanceName) {
                const config = { baseUrl, apikey, instanceName };
                saveConfig(config);
                addLog('Configuração manual salva');
              } else {
                addLog('Configuração manual cancelada ou incompleta');
              }
            }}
          >
            Configurar Manualmente
          </button>
          
          <button 
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium text-sm"
            onClick={async () => {
              const resellerId = prompt('Digite o ID da revenda:');
              if (resellerId) {
                await fetchConfigFromDatabase(resellerId);
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Buscando...' : 'Buscar do Banco'}
          </button>
          
          <button 
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-sm"
            onClick={() => {
              const config = getStoredConfig();
              if (config && config.baseUrl && config.apikey && config.instanceName) {
                // Usar exatamente a função do ChatNexo
                connectSocketIO(config.baseUrl, config.instanceName, config.apikey);
              } else {
                addLog('Configure primeiro antes de conectar');
              }
            }}
          >
            Conectar Socket.io
          </button>
          
          <button 
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm"
            onClick={() => {
              if (socketRef.current) {
                socketRef.current.disconnect();
                addLog('Socket.io desconectado manualmente');
                setIsConnected(false);
              } else {
                addLog('Não há socket para desconectar');
              }
            }}
          >
            Desconectar
          </button>
          
          <button 
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium text-sm"
            onClick={() => setLogs([])}
          >
            Limpar Logs
          </button>
        </div>
        
              onClick={async () => {
                const config = getStoredConfig();
                if (!config || !config.baseUrl || !config.apikey) {
                  addLog('Configure a URL e API key antes de testar');
                  return;
                }
                
                try {
                  const url = `${config.baseUrl}/instance/connectionState/${config.instanceName}`;
                  addLog(`Testando API com: ${url}`);
                  
                  const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                      'apikey': config.apikey
                    }
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    addLog(`API respondeu com sucesso: ${JSON.stringify(data)}`);
                  } else {
                    addLog(`API respondeu com erro: ${response.status} ${response.statusText}`);
                  }
                } catch (error) {
                  addLog(`Erro ao testar API: ${error instanceof Error ? error.message : String(error)}`);
                }
              }}
            >
              Testar API (/ping)
            </button>
          </div>
        </div>
        
        {/* Log de mensagens */}
        <div className="bg-black text-white p-3 rounded-md shadow">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-medium">Log</h2>
            <div className="text-xs text-gray-400">{logs.length} mensagens</div>
          </div>
          
          <div className="h-96 overflow-y-auto font-mono text-xs leading-tight bg-gray-900 p-2 rounded">
            {isLoading && (
              <div className="animate-pulse text-yellow-400 mb-2">Carregando...</div>
            )}
            
            {logs.length === 0 ? (
              <div className="text-gray-500">Nenhuma mensagem</div>
            ) : (
              logs.map((msg, idx) => (
                <div key={idx} className="mb-1 break-all">
                  {msg}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
