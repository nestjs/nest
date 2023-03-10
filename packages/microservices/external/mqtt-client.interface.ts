import { EventEmitter } from 'events';

/**
 * @see https://github.com/mqttjs/MQTT.js/
 *
 * @publicApi
 *
 */
export declare class MqttClient extends EventEmitter {
  public connected: boolean;
  public disconnecting: boolean;
  public disconnected: boolean;
  public reconnecting: boolean;
  public incomingStore: any;
  public outgoingStore: any;
  public options: any;
  public queueQoSZero: boolean;

  constructor(streamBuilder: (client: MqttClient) => any, options: any);

  public on(event: 'message', cb: any): this;
  public on(event: 'packetsend' | 'packetreceive', cb: any): this;
  public on(event: 'error', cb: any): this;
  public on(event: string, cb: Function): this;

  public once(event: 'message', cb: any): this;
  public once(event: 'packetsend' | 'packetreceive', cb: any): this;
  public once(event: 'error', cb: any): this;
  public once(event: string, cb: Function): this;

  /**
   * publish - publish <message> to <topic>
   *
   * @param {String} topic - topic to publish to
   * @param {(String|Buffer)} message - message to publish
   *
   * @param {Object}    [opts] - publish options, includes:
   *   @param {Number}  [opts.qos] - qos level to publish on
   *   @param {Boolean} [opts.retain] - whether or not to retain the message
   *
   * @param {Function} [callback] - function(err){}
   *    called when publish succeeds or fails
   * @returns {Client} this - for chaining
   * @api public
   *
   * @example client.publish('topic', 'message')
   * @example
   *     client.publish('topic', 'message', {qos: 1, retain: true})
   * @example client.publish('topic', 'message', console.log)
   */
  public publish(
    topic: string,
    message: string | Buffer,
    opts: any,
    callback?: any,
  ): this;
  public publish(topic: string, message: string | Buffer, callback?: any): this;

  /**
   * subscribe - subscribe to <topic>
   *
   * @param {String, Array, Object} topic - topic(s) to subscribe to, supports objects in the form {'topic': qos}
   * @param {Object} [opts] - optional subscription options, includes:
   * @param  {Number} [opts.qos] - subscribe qos level
   * @param {Function} [callback] - function(err, granted){} where:
   *    {Error} err - subscription error (none at the moment!)
   *    {Array} granted - array of {topic: 't', qos: 0}
   * @returns {MqttClient} this - for chaining
   * @api public
   * @example client.subscribe('topic')
   * @example client.subscribe('topic', {qos: 1})
   * @example client.subscribe({'topic': 0, 'topic2': 1}, console.log)
   * @example client.subscribe('topic', console.log)
   */
  public subscribe(topic: string | string[], opts: any, callback?: any): this;
  public subscribe(topic: string | string[] | any, callback?: any): this;

  /**
   * unsubscribe - unsubscribe from topic(s)
   *
   * @param {string|Array} topic - topics to unsubscribe from
   * @param {Function} [callback] - callback fired on unsuback
   * @returns {MqttClient} this - for chaining
   * @api public
   * @example client.unsubscribe('topic')
   * @example client.unsubscribe('topic', console.log)
   */
  public unsubscribe(topic: string | string[], callback?: any): this;

  /**
   * end - close connection
   *
   * @returns {MqttClient} this - for chaining
   * @param {Boolean} force - do not wait for all in-flight messages to be acked
   * @param {Function} cb - called when the client has been closed
   *
   * @api public
   */
  public end(force?: boolean, cb?: any): this;

  /**
   * removeOutgoingMessage - remove a message in outgoing store
   * the outgoing callback will be called withe Error('Message removed') if the message is removed
   *
   * @param {Number} mid - messageId to remove message
   * @returns {MqttClient} this - for chaining
   * @api public
   *
   * @example client.removeOutgoingMessage(client.getLastMessageId());
   */
  public removeOutgoingMessage(mid: number): this;

  /**
   * reconnect - connect again using the same options as connect()
   *
   * @param {Object} [opts] - optional reconnect options, includes:
   *    {any} incomingStore - a store for the incoming packets
   *    {any} outgoingStore - a store for the outgoing packets
   *    if opts is not given, current stores are used
   *
   * @returns {MqttClient} this - for chaining
   *
   * @api public
   */
  public reconnect(opts?: any): this;

  /**
   * Handle messages with backpressure support, one at a time.
   * Override at will.
   *
   * @param packet packet the packet
   * @param callback callback call when finished
   * @api public
   */
  public handleMessage(packet: any, callback: any): void;

  /**
   * getLastMessageId
   */
  public getLastMessageId(): number;
}
