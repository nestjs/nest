type VoidCallback = () => void;
type OnErrorCallback = (error: Error) => void;

export const enum RmqStatus {
  DISCONNECTED = 'disconnected',
  CONNECTED = 'connected',
}

export const enum RmqEventsMap {
  ERROR = 'error',
  DISCONNECT = 'disconnect',
  CONNECT = 'connect',
}

/**
 * RabbitMQ events map for the ampqlip client.
 * Key is the event name and value is the corresponding callback function.
 * @publicApi
 */
export type RmqEvents = {
  error: OnErrorCallback;
  disconnect: VoidCallback;
  connect: VoidCallback;
};
