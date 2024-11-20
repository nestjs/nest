type DefaultCallback = (data?: string | number) => any;

export type ServersChangedEvent = {
  added: string[];
  deleted: string[];
};

export const enum NatsStatus {
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  CONNECTED = 'connected',
}

export const enum NatsEventsMap {
  DISCONNECT = 'disconnect',
  RECONNECT = 'reconnect',
  UPDATE = 'update',
}

/**
 * Nats events map for the Nats client.
 * Key is the event name and value is the corresponding callback function.
 * @publicApi
 */
export type NatsEvents = {
  disconnect: DefaultCallback;
  reconnect: DefaultCallback;
  update: (data?: string | number | ServersChangedEvent) => any;
};
