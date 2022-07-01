/**
 * @see https://github.com/mqttjs/MQTT.js/
 */
export declare type QoS = 0 | 1 | 2;

export interface MqttClientOptions extends ISecureClientOptions {
  port?: number; // port is made into a number subsequently
  host?: string; // host does NOT include port
  hostname?: string;
  path?: string;
  protocol?: 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs';

  wsOptions?: {
    [x: string]: any;
  };
  /**
   *  10 seconds, set to 0 to disable
   */
  keepalive?: number;
  /**
   * 'mqttjs_' + Math.random().toString(16).substr(2, 8)
   */
  clientId?: string;
  /**
   * 'MQTT'
   */
  protocolId?: string;
  /**
   * 4
   */
  protocolVersion?: number;
  /**
   * true, set to false to receive QoS 1 and 2 messages while offline
   */
  clean?: boolean;
  /**
   * 1000 milliseconds, interval between two reconnections
   */
  reconnectPeriod?: number;
  /**
   * 30 * 1000 milliseconds, time to wait before a CONNACK is received
   */
  connectTimeout?: number;
  /**
   * the username required by your broker, if any
   */
  username?: string;
  /**
   * the password required by your broker, if any
   */
  password?: string;
  /**
   * a any for the incoming packets
   */
  incomingStore?: any;
  /**
   * a any for the outgoing packets
   */
  outgoingStore?: any;
  queueQoSZero?: boolean;
  reschedulePings?: boolean;
  servers?: Array<{
    host: string;
    port: number;
  }>;
  /**
   * true, set to false to disable re-subscribe functionality
   */
  resubscribe?: boolean;
  /**
   * MQTT 5.0 properties.
   * @type {object}
   */
  properties?: {
    /**
     * Representing the Session Expiry Interval in seconds.
     * @type {number}
     */
    sessionExpiryInterval?: number;
    /**
     * Representing the Receive Maximum value.
     * @type {number}
     */
    receiveMaximum?: number;
    /**
     * Representing the Maximum Packet Size the Client is willing to accept.
     * @type {number}
     */
    maximumPacketSize?: number;
    /**
     * Representing the Topic Alias Maximum value indicates the highest value that
     * the Client will accept as a Topic Alias sent by the Server.
     * @type {number}
     */
    topicAliasMaximum?: number;
    /**
     * The Client uses this value to request the Server to return Response Information in the CONNACK.
     * @type {boolean}
     */
    requestResponseInformation?: boolean;
    /**
     * The Client uses this value to indicate whether the Reason String or User Properties are sent
     * in the case of failures.
     * @type {boolean}
     */
    requestProblemInformation?: boolean;
    /**
     * The User Property is allowed to appear multiple times to represent multiple name, value pairs.
     * @type {object}
     */
    userProperties?: {
      [x: string]: any;
    };
    /**
     * The name of the authentication method used for extended authentication.
     * @type {string}
     */
    authenticationMethod?: string;
    /**
     * Binary Data containing authentication data.
     * @type {any}
     */
    authenticationData?: any;
  };
  /**
   * a message that will sent by the broker automatically when the client disconnect badly.
   */
  will?: {
    /**
     * the topic to publish
     */
    topic: string;
    /**
     * the message to publish
     */
    payload: string;
    /**
     * the QoS
     */
    qos: QoS;
    /**
     * the retain flag
     */
    retain: boolean;
  };
  transformWsUrl?: (url: string, options: any, client: any) => string;
}
export interface ISecureClientOptions {
  /**
   * optional private keys in PEM format
   */
  key?: string | string[] | Buffer | Buffer[] | Record<string, any>[];
  /**
   * optional cert chains in PEM format
   */
  cert?: string | string[] | Buffer | Buffer[];
  /**
   * Optionally override the trusted CA certificates in PEM format
   */
  ca?: string | string[] | Buffer | Buffer[];
  rejectUnauthorized?: boolean;
}
export interface IClientPublishOptions {
  /**
   * the QoS
   */
  qos: QoS;
  /**
   * the retain flag
   */
  retain?: boolean;
  /**
   * whether or not mark a message as duplicate
   */
  dup?: boolean;
}
export interface IClientSubscribeOptions {
  /**
   * the QoS
   */
  qos: QoS;
}
export interface IClientReconnectOptions {
  /**
   * a any for the incoming packets
   */
  incomingStore?: any;
  /**
   * a any for the outgoing packets
   */
  outgoingStore?: any;
}
