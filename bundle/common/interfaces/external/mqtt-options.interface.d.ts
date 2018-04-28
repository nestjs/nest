/// <reference types="node" />
/**
 * @see https://github.com/mqttjs/MQTT.js/
 */
export declare type QoS = 0 | 1 | 2;
export interface MqttClientOptions extends ISecureClientOptions {
    port?: number;
    host?: string;
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
    key?: string | string[] | Buffer | Buffer[] | Object[];
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
