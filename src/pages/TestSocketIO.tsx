import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '../lib/supabase';

// Página de teste para conexão Socket.io
export default function TestSocketIO() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  const [config, setConfig] = useState<{
    baseUrl: string;
    apikey: string;
    instanceName: string;
  } | null>(null);
  
  const clearMessages = () => {
    setMessages([]);
  };
  
  // Função para salvar configuração manual
  const saveManualConfig = () => {
    try {
      // Permitir entrada manual
      const baseUrl = prompt('Digite a URL da API Evolution:', 'https://apiwhatsapp.nexopdv.com');
      const apikey = prompt('Digite a API Key:', '');
      const instanceName = prompt('Digite o nome da instância:', '123');
      
      if (baseUrl && apikey && instanceName) {
        const newConfig = { baseUrl, apikey, instanceName };
        
        // Salvar no localStorage
        localStorage.setItem('nexochat_config', JSON.stringify(newConfig));
        
        // Atualizar estado
        setConfig(newConfig);
        
        // Adicionar ao log
        setMessages(prev => [...prev, `Configuração salva: ${JSON.stringify({
          baseUrl,
          instanceName,
          apiKeyLength: apikey.length
        })}`]);
        
        return newConfig;
      }
      return null;
    } catch (error) {
      setMessages(prev => [...prev, `Erro ao salvar configuração: ${error instanceof Error ? error.message : String(error)}`]);
      return null;
    }
  };
  
  // Função para buscar configuração do banco
  const fetchConfigFromDatabase = async (resellerId: string) => {
    setLoading(true);
    setMessages(prev => [...prev, `Buscando configuração para reseller ID: ${resellerId}`]);
    
    try {
      // Buscar diretamente as configurações da revenda
      const { data, error } = await supabase
        .from('nexochat_config')
        .select('*')
        .eq('reseller_id', resellerId)
        .single();
      
      if (error) {
        setMessages(prev => [...prev, `Erro ao buscar configuração: ${error.message}`]);
        return null;
      }
      
      if (data) {
        // Verificar se há configurações da API e instância
        if (!data.evolution_api_url || !data.evolution_api_key || !data.instance_name) {
          setMessages(prev => [...prev, 'Configuração incompleta no banco']);
          return null;
        }
        
        // Formatar configuração
        const newConfig = {
          baseUrl: data.evolution_api_url,
          apikey: data.evolution_api_key,
          instanceName: data.instance_name
        };
        
        // Salvar no localStorage
        localStorage.setItem('nexochat_config', JSON.stringify(newConfig));
        
        // Atualizar estado
        setConfig(newConfig);
        
        setMessages(prev => [...prev, `Configuração encontrada: ${JSON.stringify({
          baseUrl: newConfig.baseUrl,
          instanceName: newConfig.instanceName,
          apiKeyLength: newConfig.apikey.length
        })}`]);
        
        return newConfig;
      } else {
        setMessages(prev => [...prev, 'Nenhuma configuração encontrada para esta revenda']);
        return null;
      }
    } catch (error) {
      setMessages(prev => [...prev, `Erro ao buscar configuração: ${error instanceof Error ? error.message : String(error)}`]);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Função para carregar configuração
  const loadConfig = () => {
    try {
      // Tentar obter do localStorage primeiro (como ChatNexo faz)
      const savedConfig = localStorage.getItem('nexochat_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
        setMessages(prev => [...prev, `Configuração carregada do localStorage: ${JSON.stringify({
          baseUrl: parsedConfig.baseUrl,
          instanceName: parsedConfig.instanceName,
          apiKeyLength: parsedConfig.apikey.length
        })}`]);
        return parsedConfig;
      }
      
      setMessages(prev => [...prev, 'Nenhuma configuração encontrada no localStorage']);
      return null;
    } catch (error) {
      setMessages(prev => [...prev, `Erro ao carregar configuração: ${error instanceof Error ? error.message : String(error)}`]);
      return null;
    }
  };
  
  // Função para conectar ao Socket.io (EXATAMENTE como em ChatNexo)
  const connectSocketIO = (baseUrl: string, instanceName: string, apikey: string) => {
    // Fechar conexão existente se houver
    if (socketRef.current) {
      socketRef.current.disconnect();
      setMessages(prev => [...prev, 'Fechando conexão Socket.io existente']);
    }
    
    try {
      setMessages(prev => [...prev, `Conectando Socket.io para instância ${instanceName} em ${baseUrl} com apikey: ${apikey.substring(0, 5)}...`]);
      
      // Verificar parâmetros
      if (!baseUrl) {
        setMessages(prev => [...prev, 'URL base inválida para conexão Socket.io']);
        return;
      }
      
      if (!instanceName) {
        setMessages(prev => [...prev, 'Nome da instância inválido para conexão Socket.io']);
        return;
      }
      
      // Configurar opções
      setMessages(prev => [...prev, 'Socket.io configurando com opções: ' + JSON.stringify({
        transports: ['websocket', 'polling'],
        query: { instance: instanceName }
      })]);
      
      // Criar socket - EXATAMENTE COMO EM CHATNEXO
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
      
      // Monitorar todos os eventos do Socket
      socket.onAny((event, ...args) => {
        setMessages(prev => [...prev, `Socket.io evento recebido: ${event} ${JSON.stringify(args)}`]);
      });
      
      // Evento de conexão
      socket.on('connect', () => {
        setMessages(prev => [...prev, `Socket.io conectado! Socket ID: ${socket.id}`]);
        setIsConnected(true);
        setConnectionError(null);
        
        // Enviar mensagem de inscrição em eventos
        const subscribeMessage = {
          action: 'subscribe',
          instance: instanceName
        };
        setMessages(prev => [...prev, 'Enviando mensagem de inscrição: ' + JSON.stringify(subscribeMessage)]);
        socket.emit('subscribe', subscribeMessage);
        
        // Também tentar se inscrever com outros formatos
        setMessages(prev => [...prev, 'Tentando inscrição alternativa']);
        socket.emit('subscribe', instanceName);
      });
      
      // Confirmação de inscrição
      socket.on('subscribed', (data) => {
        setMessages(prev => [...prev, 'Inscrição confirmada no Socket.io: ' + JSON.stringify(data)]);
      });
      
      // Desconexão
      socket.on('disconnect', (reason) => {
        setMessages(prev => [...prev, `Socket.io desconectado. Razão: ${reason}`]);
        setIsConnected(false);
      });
      
      // Evento connect_error - importante para depurar problemas
      socket.on('connect_error', (error) => {
        setMessages(prev => [...prev, `Erro de conexão Socket.io: ${error.message}`]);
        setConnectionError(`Erro de conexão: ${error.message}`);
        setIsConnected(false);
      });
      
      // Evento connect_timeout
      socket.on('connect_timeout', () => {
        setMessages(prev => [...prev, 'Timeout na conexão Socket.io']);
        setIsConnected(false);
      });
      
      // Evento de erro
      socket.on('error', (error) => {
        setMessages(prev => [...prev, 'Erro no Socket.io: ' + JSON.stringify(error)]);
        setIsConnected(false);
      });
      
      // Evento de mensagens
      socket.on('messages.upsert', (data) => {
        setMessages(prev => [...prev, 'Nova mensagem recebida: ' + JSON.stringify(data)]);
      });
      
      // Definir o socket para uso futuro
      socketRef.current = socket;
    } catch (error) {
      setMessages(prev => [...prev, `Erro ao conectar ao Socket.io: ${error instanceof Error ? error.message : String(error)}`]);
      setIsConnected(false);
      setConnectionError(`Erro ao conectar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };
  
  // Efeito para carregar configuração ao montar o componente
  useEffect(() => {
    loadConfig();
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Teste de Conexão Socket.io</h1>
        
        {/* Status */}
        <div className="mb-4 p-3 bg-white rounded-md shadow">
          <div className="flex items-center mb-3">
            <span className="mr-2 font-medium">Status:</span>
            <span className={isConnected ? "text-green-600" : "text-red-600"}>
              {isConnected ? "Conectado" : "Desconectado"}
            </span>
            <div 
              className={`ml-2 h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            />
          </div>
          
          {connectionError && (
            <div className="text-red-600 text-sm mt-1">
              {connectionError}
            </div>
          )}
        </div>
        
        {/* Configuração atual */}
        <div className="mb-4 p-3 bg-white rounded-md shadow">
          <h2 className="text-lg font-medium mb-2">Configuração</h2>
          
          {config ? (
            <div className="text-sm">
              <div><strong>URL Base:</strong> {config.baseUrl}</div>
              <div><strong>Instância:</strong> {config.instanceName}</div>
              <div><strong>API Key:</strong> {config.apikey.substring(0, 5)}...</div>
            </div>
          ) : (
            <div className="text-gray-500">Nenhuma configuração encontrada</div>
          )}
        </div>
        
        {/* Ações */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-2">
          <button 
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
            onClick={loadConfig}
          >
            Carregar do localStorage
          </button>
          
          <button 
            className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
            onClick={saveManualConfig}
          >
            Configurar Manualmente
          </button>
          
          <button 
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium"
            onClick={() => {
              const resellerId = prompt('Digite o ID da revenda:');
              if (resellerId) {
                fetchConfigFromDatabase(resellerId);
              }
            }}
          >
            Buscar do Banco
          </button>
          
          <button 
            className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-medium"
            onClick={() => {
              if (config) {
                connectSocketIO(config.baseUrl, config.instanceName, config.apikey);
              } else {
                setMessages(prev => [...prev, 'Configure primeiro antes de conectar']);
              }
            }}
          >
            Conectar Socket.io
          </button>
          
          <button 
            className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
            onClick={() => {
              if (socketRef.current) {
                socketRef.current.disconnect();
                setMessages(prev => [...prev, 'Socket.io desconectado manualmente']);
                setIsConnected(false);
              }
            }}
          >
            Desconectar
          </button>
          
          <button 
            className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
            onClick={clearMessages}
          >
            Limpar Log
          </button>
        </div>
        
        {/* Log de mensagens */}
        <div className="bg-black text-white p-3 rounded-md shadow">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-medium">Log</h2>
            <div className="text-xs text-gray-400">{messages.length} mensagens</div>
          </div>
          
          <div className="h-96 overflow-y-auto font-mono text-sm bg-gray-900 p-2 rounded">
            {loading && (
              <div className="animate-pulse text-yellow-400 mb-2">Carregando...</div>
            )}
            
            {messages.length === 0 ? (
              <div className="text-gray-500">Nenhuma mensagem</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="mb-1 break-all">
                  <span className="text-gray-400">[{idx + 1}]</span> {msg}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
