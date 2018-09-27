// export namespace Deepstream {

export enum ConnectionState {
  CLOSED,
  AWAITING_CONNECTION,
  CHALLENGING,
  AWAITING_AUTHENTICATION,
  AUTHENTICATING,
  OPEN,
  ERROR,
  RECONNECTING,
}

export enum Event {
  TOO_MANY_AUTH_ATTEMPTS,
  INVALID_AUTH_MSG,
  NOT_AUTHENTICATED,
  CONNECTION_ERROR,
  MESSAGE_PERMISSION_ERROR,
  MESSAGE_PARSE_ERROR,
  MESSAGE_DENIED,
  LISTENER_EXISTS,
  NOT_LISTENING,
  IS_CLOSED,
  ACK_TIMEOUT,
  RESPONSE_TIMEOUT,
  DELETE_TIMEOUT,
  UNSOLICITED_MESSAGE,
  RECORD_NOT_FOUND,
  VERSION_EXISTS,
  UNKNOWN_CALLEE,
}

export enum MergeStrategy {}

export interface Options {
  /**
     *A global merge strategy that is applied whenever two clients write to the same record at the same time. Can be overwritten on a per record level. Default merge strategies are exposed by the client constructor. It's also possible to write custom merge strategies as functions. You can find more on handling data conflicts here
     Type: Function
     Default: MERGE_STRATEGIES.REMOTE_WINS
     */
  mergeStrategy?: MergeStrategy;
  /**Specifies the number of milliseconds by which the time until the next reconnection attempt will be incremented after every unsuccessful attempt.
     E.g.for 1500: if the connection is lost,the client will attempt to reconnect immediately, if that fails it will try again after 1.5 seconds, if that fails it will try again after 3 seconds and so on...
     Type: Number
     Default: 4000 */
  reconnectIntervalIncrement?: number;
  /**The number of reconnection attempts until the client gives up and declares the connection closed.
     Type: Number
     Default: 5 */
  maxReconnectAttempts?: number;
  /**The number of milliseconds after which a RPC will error if no Ack-message has been received.
     Type: Number
     Default: 6000 */
  rpcAckTimeout?: number;
  /**The number of milliseconds after which a RPC will error if no response-message has been received.
     Type: Number
     Default: 10000
     */
  rpcResponseTimeout?: number;
  /**The number of milliseconds that can pass after providing/unproviding a RPC or subscribing/unsubscribing/listening to a record or event before an error is thrown.
     Type: Number
     Default: 2000 */
  subscriptionTimeout?: number;
  /**If your app sends a large number of messages in quick succession, the deepstream client will try to split them into smaller packets and send these every ms. This parameter specifies the number of messages after which deepstream sends the packet and queues the remaining messages. Set to Infinity to turn the feature off.
     Type: Number
     Default: 100 */
  maxMessagesPerPacket?: number;
  /**Please see description for maxMessagesPerPacket. Sets the time in ms.
     Type: Number
     Default: 16 */
  timeBetweenSendingQueuedPackages?: number;
  /**The number of milliseconds from the moment client.record.getRecord() is called until an error is thrown since no ack message has been received.
     Type: Number
     Default: 1000 */
  recordReadAckTimeout?: number;
  /**The number of milliseconds from the moment client.record.getRecord() is called until an error is thrown since no data has been received.
     Type: Number
     Default: 3000 */
  recordReadTimeout?: number;
  /**The number of milliseconds from the moment record.delete() is called until an error is thrown since no delete ack message has been received. Please take into account that the deletion is only complete after the record has been deleted from both cache and storage.
     Type: Number
     Default: 3000 */
  recordDeleteTimeout?: number;
  /**Whether the client should try to upgrade the transport from long-polling to something better, e.g. WebSocket.
     Type: Boolean
     Default: true */
  upgrade?: boolean;
  /**Forces JSONP for polling transport.
     Type: Boolean
     Default: false */
  forceJSONP?: boolean;
  /**Determines whether to use JSONP when necessary for polling. If disabled (by settings to false) an error will be emitted (saying "No transports available") if no other transports are available. If another transport is available for opening a connection (e.g. WebSocket) that transport will be used instead.
     Type: Boolean
     Default: true */
  jsonp?: boolean;
  /**Forces base 64 encoding for polling transport even when XHR2 responseType is available and WebSocket even if the used standard supports binary.
     Type: Boolean
     Default: false */
  forceBase64?: boolean;
  /**Enable Cross Domain Requests for IE8 to avoid loading the bar flashing click sounds. Default to false because Cross Domain Requests can't send cookies.
     Type: Boolean
     Default: false */
  enablesXDR?: boolean;
  /**Whether to add the timestamp with each transport request. Note: this is ignored if the browser is IE or Android, in which case requests are always stamped.
     Type: Boolean
     Default: false
     */
  timestampRequests?: boolean;
  /**The GET parameter key to use for the timestamp.
     Type: String
     Default: t */
  timestampParam?: string;
  /**The path to connect to for browser connections.
     Type: String
     Default: /deepstream */
  path?: string;
  /**A list of transports to try (in order). Engine.io always attempts to connect directly with the first one, provided the feature detection test for it passes.
     Type: Array
     Default: ['polling', 'websocket'] */
  transports?: string[];
  /**If true and if the previous websocket connection to the server succeeded, the connection attempt will bypass the normal upgrade process and will initially try websocket. A connection attempt following a transport error will use the normal upgrade process. It is recommended you turn this on only when using SSL/TLS connections, or if you know that your network does not block websockets.
     Type: Boolean
     Default: false */
  rememberUpgrade?: boolean;
}

export interface Record extends EventEmitter {
  name: string;
  usages: number;
  isReady: boolean;
  hasProvider: boolean;
  isDestroyed: boolean;
  /**Immediately executes the callback if the record is ready. Otherwise, it registers it as a callback for the ready event. */
  whenReady(callback: (record: Record) => void): void;
  /**Used to set the record's data and can be called with a value. A path can optionally be included. */
  set(path: string, value: any, callback?: (error: string) => void): void;
  set(value: any, callback?: (error: string) => void): void;
  /**Used to return the record's data but if called without an argument, will return all the data. get() can also be used to retrive a specific part by defining a path string. If the part can not be found, undefined will be returned. */
  get(path?: string): any;
  /**Registers that a function will be performed whenever the record's value changes. All of the record's data can be subscribed to by providing a callback function or when changes are performed to a specific path within the record.
     Optional: Passing true will execute the callback immediately with the record's current value.
     Listening to any changes on the record: */
  subscribe(
    path: string,
    callback: (data: any) => void,
    trggerNow?: boolean,
  ): void;
  /**Registers that a function will be performed whenever the record's value changes. All of the record's data can be subscribed to by providing a callback function or when changes are performed to a specific path within the record.
     Optional: Passing true will execute the callback immediately with the record's current value.
     Listening to any changes on the record: */
  subscribe(callback: (data: any) => void, trggerNow?: boolean): void;
  /**Removes a subscription previous made using record.subscribe(). Defining a path with unsubscribe removes that specific path, or with a callback, can remove it from generic subscriptions.
     Info:
     unsubscribe is entirely a client-side operation. To notify the server that the app would no longer interested in the record, use discard() instead.
     Important:
     It is important to unsubscribe all callbacks that are registered when discarding a record. Just calling discard does not guarantee that callbacks will not be called.*/
  unsubscribe(path: string, callback: (data: any) => void): void;
  /**Removes a subscription previous made using record.subscribe() or all subscriptions if callback is null. Defining a path with unsubscribe removes that specific path, or with a callback, can remove it from generic subscriptions.
     Info:
     unsubscribe is entirely a client-side operation. To notify the server that the app would no longer interested in the record, use discard() instead.
     Important:
     It is important to unsubscribe all callbacks that are registered when discarding a record. Just calling discard does not guarantee that callbacks will not be called.*/
  unsubscribe(callback?: (data: any) => void): void;
  /**Removes all change listerners and notifies the server that client no longer wants updates for this record if your application no longer requires the record. */
  discard(): void;
  /**This permanently deletes the record on the server for all users. */
  delete(): void;
}

export interface List extends EventEmitter {
  name: string;
  usages: number;
  isReady: boolean;
  /**Invokes callback once the list has been loaded. This might happen synchronously if the list is already available or asynchronously if the list still needs to be retrieved. Some methods, e.g. addEntry() or setEntries() or subscribe() can be used before the list is ready. */
  whenReady(callback: (list: List) => void): void;
  /**Returns false if the list has entries or true if it doesn't. */
  isEmpty(): boolean;
  /**Returns an array of the current entries in the list. */
  getEntries(): string[];
  /**Sets the contents of the list to the provided array of record names. To add or remove specific entries use addEntry() or removeEntry() respectively. */
  setEntries(entries: string[]): void;
  /**Adds a new record name to the list. */
  addEntry(entry: string, index?: number): void;
  /**Removes an entry from the list. removeEntry will not throw any error if the entry doesn't exist. */
  removeEntry(entry: string, index?: number): void;
  /**Registers a function that will be invoked whenever any changes to the list's contents occur. Optionally you can also pass true to execute the callback function straight away with the list's current entries. */
  subscribe(
    callback: (entries: Array<string>) => void,
    trggerNow?: boolean,
  ): void;
  /**Removes a subscription that was previously made using list.subscribe() or all subscriptions if callback is null.
   Please Note: unsubscribe is purely a client side operation. To notify the server that the app no longer requires updates for this list use discard(). */
  unsubscribe(callback?: (entries: Array<string>) => void): void;
  /**Removes all change listeners and notifies the server that the client is no longer interested in updates for this list. */
  discard(): void;
  /**Deletes the list on the server. This action deletes the list for all users from both cache and storage and is irreversible. */
  delete(): void;
}

export interface RPCResponse {
  autoAck: boolean;
  /**
     *Succesfully complete a remote procedure call and sends data back to the requesting client.
     data can be any kind of serializable data, e.g. Objects, Numbers, Booleans or Strings
     If autoAck is disabled and the response is sent before the ack message, the request will still be completed and the ack message will be ignored.
     */
  send(data: any): void;
  /**
   *Rejects the request. Rejections are not errors, but merely a means of saying "I'm busy at the moment, try another client". Upon receiving a rejection deepstream will try to re-route the request to another provider for the same RPC. If there are no more providers left to try, deepstream will send a NO_RPC_PROVIDER error to the client.
   */
  reject(): void;
  /**
   *Send an error to the client. errorMsg will be received as the first argument to the callback registered with client.rpc.make(). This will complete the RPC.
   */
  error(errorMsg: string): void;
  /**
     *Explicitly acknowledges the receipt of a request.
     This is usually done automatically, but can also be performed explicitly by setting response.autoAck = false and calling ack() later. This is useful when a client needs to perform an asynchronous operation to determine if it will accept or reject the request.
     Info

     Requests count as completed once send() or error() was called. Calling ack() after that won't do anything.
     */
  ack(): void;
}

export interface ListenResponse {
  /** Accept the response */
  accept(): void;
  /** Reject the response */
  reject(): void;
}

export interface RecordStatic {
  /** Get a record. */
  getRecord(path: string): Record;
  /** Get a snapshot of a record without livecycle or subscribtions */
  snapshot(name: string, callback: (error: string, data: any) => void): void;
  /** Get a list of record names */
  getList(oath: string): List;
  /** An AnonymousRecord is a record that can change its name. It acts as a wrapper around an actual record that can be swapped out for another one whilst keeping all bindings intact. */
  getAnonymousRecord(): Record;
  /** Check if a record exists and run a callback that contains an error argument and a boolean to indicate whether or not the record exists in deepstream. */
  has(
    name: string,
    callback: (error: string, hasRecord: boolean) => void,
  ): void;
  /** Listen for record subscriptions made by other clients. */
  listen(
    pattern: string,
    callback: (
      match: string,
      isSubscribed: boolean,
      response: ListenResponse,
    ) => void,
  ): void;
  /** Removes a listener that was previously registered using listen() */
  unlisten(pattern: string): void;
}

export interface EventStatic {
  /**Subscribes to an event. Callback will receive the data passed to emit() */
  subscribe(event: string, callback: (data: any) => void): void;
  /**Unsubscribes from an event that was previously registered with subscribe(). This stops a client from receiving the event. */
  unsubscribe(event: string, callback: (data: any) => void): void;
  /**Sends the event to all subscribed clients */
  emit(event: string, data: any): void;
  /**Registers the client as a listener for event subscriptions made by other clients. This is useful to create "active" data providers - processes that only send events if clients are actually interested in them. You can find more about listening in the events tutorial
     The callback is invoked with three arguments:
     - eventName: The name of the event that has been matched against the provided pattern
     - isSubscribed: A boolean indicating whether the event is subscribed or unsubscribed
     - response: contains two functions (accept and reject), one of them needs to be called */
  listen(
    pattern: string,
    callback: (
      match: string,
      isSubscribed: boolean,
      response: ListenResponse,
    ) => void,
  ): void;
  /**This removes a previously registered listening pattern and the user will no longer be listening for active/inactive subscriptions. */
  unlisten(pattern: string): void;
}

export interface RPCStatic {
  /** Registers the client as a provider for incoming RPCs of a specific name. The callback will be invoked when another client client.rpc.make().*/
  provide(
    name: string,
    callback: (data: any, response: RPCResponse) => void,
  ): void;
  /**Removes the client as a provider previously registered using provide(). */
  unprovide(name: string): void;
  /**
   * Executes a remote procedure call. callback will be invoked with the returned result or with an error if the RPC failed.
   */
  make(
    name: string,
    data: any,
    callback: (error: string, result: any) => void,
  ): void;
}

export interface Presence {
  /**Subscribes to presence events. Callback will receive the username of the newly added client*/
  subscribe(callback: (username: string, isLoggedIn: boolean) => void): void;
  /**Removes a previously registered presence callback*/
  unsubscribe(callback: (username: string, isLoggedIn: boolean) => void): void;
  /**Queries for currently connected clients*/
  getAll(callback: (usernames: Array<string>) => void): void;
}

export interface EventEmitter {
  /**Subscribe to an event. */
  on(
    type: string,
    callback: (error: string, ...args: Array<any>) => void,
  ): void;
  /**Unsubscribes from an event by:
     - removing a specific callback when called with both arguments.
     deepstream.off( 'error', errorCallback )
     - removing all listeners for an event when only called with an event.
     deepstream.off( 'error' )
     - removing all listeners for all events if called without arguments.
     deepstream.off() */
  off(
    type?: string,
    callback?: (error: string, ...args: Array<any>) => void,
  ): void;
  /** Register a one-time listener for an event. The listener will be removed immediately after its first execution. */
  once(
    type: string,
    callback: (error: string, ...args: Array<any>) => void,
  ): void;
  /**Emits an event. */
  emit(event: string, arguments?: any): void;
  /**Returns an array of listeners that are registered for the event. */
  listeners(event: string): any[];
  /**Returns true if there are listeners registered for that event. */
  hasListeners(event: string): boolean;
  /**Authenticates the client against the server. To learn more about how authentication works, please have a look at the Security Overview.
   *Callback will be called with: success (Boolean), data (Object).
   */
}

export interface Client extends EventEmitter {
  login(
    authParams?: {},
    callback?: (success: boolean, data: any) => void,
  ): Client;
  login(callback: (success: boolean, data: any) => void): Client;
  /**Closes the connection to the server. */
  close(): void;
  /**Returns the current connectionState. Please find a list of available connectionStates here. */
  getConnectionState(): ConnectionState;
  /**Returnes a unique id. The uid starts with a Base64 encoded timestamp to allow for semi-sequentual ordering and ends with a random string. */
  getUid(): string;

  record: RecordStatic;

  event: EventStatic;

  presence: Presence;

  rpc: RPCStatic;
}

export interface Quarantine extends Client {}

export interface Static {
  CONSTANTS: {
    [key: string]: string;
  };
  MERGE_STRATEGIES: {};
  (url: string, options?: Options): Quarantine;
}
// }
