import { finished } from 'stream';

type Listener = () => void;

interface Connection {
  destroyed?: boolean;
  once(event: 'close', listener: Listener): unknown;
}

/**
 * The listeners waiting for each connection to close. A client may pipeline
 * any number of requests on one connection, so they share a single "close"
 * listener of it.
 */
const listenersByConnection = new WeakMap<Connection, Set<Listener>>();

function isConnection(socket: unknown): socket is Connection {
  return (
    typeof (socket as Partial<Connection> | undefined)?.once === 'function'
  );
}

/**
 * Calls `listener` once, when `response` has finished, failed or closed, or
 * when the connection of its request has closed.
 *
 * `finished()` alone may never report the latter for the response of a
 * pipelined request (e.g. on Node.js 22): until the responses queued before it
 * are out, it has no socket, and it gets no "close" when the connection goes.
 */
export function onResponseClose(
  response: NodeJS.WritableStream & { req?: { socket?: unknown } },
  listener: Listener,
): void {
  let listeners: Set<Listener> | undefined;
  let isSettled = false;
  const settle = () => {
    if (isSettled) {
      return;
    }
    isSettled = true;
    listeners?.delete(settle);
    listener();
  };
  finished(response, settle);

  const connection = response.req?.socket;
  if (!isConnection(connection)) {
    return;
  }
  if (connection.destroyed) {
    // Asynchronously, as finished() reports a response that has closed
    process.nextTick(settle);
    return;
  }
  listeners = listenersByConnection.get(connection);
  if (!listeners) {
    const connectionListeners = new Set<Listener>();
    listenersByConnection.set(connection, connectionListeners);
    connection.once('close', () => {
      listenersByConnection.delete(connection);
      connectionListeners.forEach(notify => notify());
    });
    listeners = connectionListeners;
  }
  listeners.add(settle);
}
