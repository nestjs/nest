export interface INestListenFreePortOptions {
  /**
   * Port.
   * */
  port?: string | number;
  /**
   * Hostname.
   * */
  hostname?: string;
  /**
   * Callback function that call when port was busy.
   *
   * @param {number} port Busy port.
   * @returns {boolean} Continue finding free port? true - to continue, false - to reject listening with Error.
   * */
  onSkip?: (port: number) => boolean;
  /**
   * Callback function that call when server starts listening.
   *
   * @param {number} port Final selected port.
   * */
  onStart?: (port: number) => void;
}
