/**
 * Sistema simples de eventos para comunicação direta entre componentes
 * Usado para atualização do contador de mensagens em tempo real
 */

type EventCallback = (data: any) => void;

interface EventBus {
  [eventName: string]: EventCallback[];
}

const eventBus: EventBus = {};

/**
 * Inscrever-se para receber notificações de um evento
 */
export const subscribe = (eventName: string, callback: EventCallback): (() => void) => {
  if (!eventBus[eventName]) {
    eventBus[eventName] = [];
  }
  
  // Adicionar callback ao array de inscritos
  eventBus[eventName].push(callback);
  
  // Retornar função para cancelar inscrição
  return () => {
    if (eventBus[eventName]) {
      eventBus[eventName] = eventBus[eventName].filter(cb => cb !== callback);
    }
  };
};

/**
 * Publicar um evento para todos os inscritos
 */
export const publish = (eventName: string, data: any): void => {
  console.log(`[EventBus] Publicando evento '${eventName}' com dados:`, data);
  
  if (eventBus[eventName]) {
    // Chamar todos os callbacks inscritos neste evento
    eventBus[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Erro ao chamar callback para evento '${eventName}':`, error);
      }
    });
  }
};

// Eventos do sistema
export const EVENTS = {
  MESSAGE_COUNTER_UPDATE: 'message_counter_update'
};
