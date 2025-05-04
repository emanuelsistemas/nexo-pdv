import { useState, useEffect, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { EvolutionApiConfig } from '../types/chat';

interface UseSocketIOOptions {
  config: EvolutionApiConfig | null;
  onNewMessage?: (data: any) => void;
  onConnectionStatusChange?: (isConnected: boolean) => void;
  enabled?: boolean;
}

const useSocketIO = ({
  config,
  onNewMessage,
  onConnectionStatusChange,
  enabled = true
}: UseSocketIOOptions) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Função para criar a conexão Socket.io
  const connectSocket = useCallback(() => {
    if (!config || !enabled) {
      console.log('Socket.io não será conectado: configuração ausente ou desabilitado');
      return;
    }

    try {
      console.log('Tentando conectar Socket.io para a instância:', config.instanceName);
      const socketUrl = config.baseUrl;
      
      // Validar a URL
      if (!socketUrl) {
        setConnectionError('URL de socket inválida');
        return;
      }
      
      // Inicializar o socket
      const socketInstance = io(socketUrl, {
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        query: {
          instance: config.instanceName
        },
        auth: {
          apikey: config.apikey
        }
      });

      // Configurar eventos do socket
      socketInstance.on('connect', () => {
        console.log('Socket.io conectado!');
        setIsConnected(true);
        setConnectionError(null);
        if (onConnectionStatusChange) onConnectionStatusChange(true);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Socket.io desconectado. Motivo:', reason);
        setIsConnected(false);
        if (onConnectionStatusChange) onConnectionStatusChange(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Erro de conexão Socket.io:', error);
        setConnectionError(`Erro de conexão: ${error.message}`);
        setIsConnected(false);
        if (onConnectionStatusChange) onConnectionStatusChange(false);
      });

      // Escutar por mensagens novas
      socketInstance.on('MESSAGES_UPSERT', (data) => {
        console.log('Nova mensagem recebida via Socket.io:', data);
        if (onNewMessage) onNewMessage(data);
        
        // Preparar para tocar som de notificação
        try {
          const notificationSound = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3');
          notificationSound.play().catch(e => console.error('Erro ao tocar som:', e));
        } catch (error) {
          console.error('Erro ao criar áudio de notificação:', error);
        }
      });

      setSocket(socketInstance);

      // Função de limpeza
      return () => {
        console.log('Desconectando Socket.io...');
        socketInstance.disconnect();
      };
    } catch (error) {
      console.error('Erro ao inicializar Socket.io:', error);
      setConnectionError(`Erro ao inicializar: ${error}`);
      return undefined;
    }
  }, [config, enabled, onNewMessage, onConnectionStatusChange]);

  // Efeito para gerenciar a conexão
  useEffect(() => {
    const cleanup = connectSocket();
    
    return () => {
      if (cleanup) cleanup();
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    };
  }, [connectSocket, socket]);

  // Desconectar manualmente o socket
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      console.log('Socket.io desconectado manualmente');
    }
  }, [socket]);

  // Reconectar manualmente o socket
  const reconnect = useCallback(() => {
    disconnect();
    connectSocket();
  }, [disconnect, connectSocket]);

  return {
    socket,
    isConnected,
    connectionError,
    disconnect,
    reconnect
  };
};

export default useSocketIO;
