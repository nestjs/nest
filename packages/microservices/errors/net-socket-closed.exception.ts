/**
 * @publicApi
 */
export class NetSocketClosedException extends Error {
  constructor() {
    super(`The net socket is closed.`);
  }
}
