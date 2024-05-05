/**
 * Do NOT add NestJS logic to this interface.  It is meant to ONLY represent the types for the `@confluentinc/kafka-javascript` package.
 *
 * @see https://github.com/confluentinc/confluent-kafka-javascript/blob/master/index.d.ts
 * 
 * Copy the `/types/rdkafka.d.ts` contents from the `@confluentinc/kafka-javascript` package and paste it here.
 * 1. Replace the import statements for config with the contents of `/types/config.d.ts`
 * 2. Replace the import statements for errors with the contents of `/types/errors.d.ts`
 * 3. Replace the import statements for KafkaJS with a type of unknown since KafkaJS won't be used.
 * 4. Replace all instances of `export class` with `export declare class`
 * 5. Replace all instances of `export abstract class` with `export declare abstract class`
 * 6. Replace all instances of `export const` with `export declare const`
 * 7. Replace all instances of `export function` with `export declare function`
 *
 * @publicApi
 *
 */

/// <reference types="node" />
import { Readable, ReadableOptions, Writable, WritableOptions } from 'stream';
import { EventEmitter } from 'events';

// config
// ====== Generated from librdkafka master file CONFIGURATION.md ======
// Code that generated this is a derivative work of the code from Nam Nguyen
// https://gist.github.com/ntgn81/066c2c8ec5b4238f85d1e9168a04e3fb

export interface GlobalConfig {
  /**
   * Indicates the builtin features for this build of librdkafka. An application can either query this value or attempt to set it with its list of required features to check for library support.
   *
   * @default gzip, snappy, ssl, sasl, regex, lz4, sasl_gssapi, sasl_plain, sasl_scram, plugins, zstd, sasl_oauthbearer, http, oidc
   */
  "builtin.features"?: string;

  /**
   * Client identifier.
   *
   * @default rdkafka
   */
  "client.id"?: string;

  /**
   * Initial list of brokers as a CSV list of broker host or host:port. The application may also use `rd_kafka_brokers_add()` to add brokers during runtime.
   */
  "metadata.broker.list"?: string;

  /**
   * Alias for `metadata.broker.list`: Initial list of brokers as a CSV list of broker host or host:port. The application may also use `rd_kafka_brokers_add()` to add brokers during runtime.
   */
  "bootstrap.servers"?: string;

  /**
   * Maximum Kafka protocol request message size. Due to differing framing overhead between protocol versions the producer is unable to reliably enforce a strict max message limit at produce time and may exceed the maximum size by one message in protocol ProduceRequests, the broker will enforce the the topic's `max.message.bytes` limit (see Apache Kafka documentation).
   *
   * @default 1000000
   */
  "message.max.bytes"?: number;

  /**
   * Maximum size for message to be copied to buffer. Messages larger than this will be passed by reference (zero-copy) at the expense of larger iovecs.
   *
   * @default 65535
   */
  "message.copy.max.bytes"?: number;

  /**
   * Maximum Kafka protocol response message size. This serves as a safety precaution to avoid memory exhaustion in case of protocol hickups. This value must be at least `fetch.max.bytes`  + 512 to allow for protocol overhead; the value is adjusted automatically unless the configuration property is explicitly set.
   *
   * @default 100000000
   */
  "receive.message.max.bytes"?: number;

  /**
   * Maximum number of in-flight requests per broker connection. This is a generic property applied to all broker communication, however it is primarily relevant to produce requests. In particular, note that other mechanisms limit the number of outstanding consumer fetch request per broker to one.
   *
   * @default 1000000
   */
  "max.in.flight.requests.per.connection"?: number;

  /**
   * Alias for `max.in.flight.requests.per.connection`: Maximum number of in-flight requests per broker connection. This is a generic property applied to all broker communication, however it is primarily relevant to produce requests. In particular, note that other mechanisms limit the number of outstanding consumer fetch request per broker to one.
   *
   * @default 1000000
   */
  "max.in.flight"?: number;

  /**
   * Period of time in milliseconds at which topic and broker metadata is refreshed in order to proactively discover any new brokers, topics, partitions or partition leader changes. Use -1 to disable the intervalled refresh (not recommended). If there are no locally referenced topics (no topic objects created, no messages produced, no subscription or no assignment) then only the broker list will be refreshed every interval but no more often than every 10s.
   *
   * @default 300000
   */
  "topic.metadata.refresh.interval.ms"?: number;

  /**
   * Metadata cache max age. Defaults to topic.metadata.refresh.interval.ms * 3
   *
   * @default 900000
   */
  "metadata.max.age.ms"?: number;

  /**
   * When a topic loses its leader a new metadata request will be enqueued immediately and then with this initial interval, exponentially increasing upto `retry.backoff.max.ms`, until the topic metadata has been refreshed. If not set explicitly, it will be defaulted to `retry.backoff.ms`. This is used to recover quickly from transitioning leader brokers.
   *
   * @default 100
   */
  "topic.metadata.refresh.fast.interval.ms"?: number;

  /**
   * **DEPRECATED** No longer used.
   *
   * @default 10
   */
  "topic.metadata.refresh.fast.cnt"?: number;

  /**
   * Sparse metadata requests (consumes less network bandwidth)
   *
   * @default true
   */
  "topic.metadata.refresh.sparse"?: boolean;

  /**
   * Apache Kafka topic creation is asynchronous and it takes some time for a new topic to propagate throughout the cluster to all brokers. If a client requests topic metadata after manual topic creation but before the topic has been fully propagated to the broker the client is requesting metadata from, the topic will seem to be non-existent and the client will mark the topic as such, failing queued produced messages with `ERR__UNKNOWN_TOPIC`. This setting delays marking a topic as non-existent until the configured propagation max time has passed. The maximum propagation time is calculated from the time the topic is first referenced in the client, e.g., on produce().
   *
   * @default 30000
   */
  "topic.metadata.propagation.max.ms"?: number;

  /**
   * Topic blacklist, a comma-separated list of regular expressions for matching topic names that should be ignored in broker metadata information as if the topics did not exist.
   */
  "topic.blacklist"?: any;

  /**
   * A comma-separated list of debug contexts to enable. Detailed Producer debugging: broker,topic,msg. Consumer: consumer,cgrp,topic,fetch
   */
  "debug"?: string;

  /**
   * Default timeout for network requests. Producer: ProduceRequests will use the lesser value of `socket.timeout.ms` and remaining `message.timeout.ms` for the first message in the batch. Consumer: FetchRequests will use `fetch.wait.max.ms` + `socket.timeout.ms`. Admin: Admin requests will use `socket.timeout.ms` or explicitly set `rd_kafka_AdminOptions_set_operation_timeout()` value.
   *
   * @default 60000
   */
  "socket.timeout.ms"?: number;

  /**
   * **DEPRECATED** No longer used.
   *
   * @default 1000
   */
  "socket.blocking.max.ms"?: number;

  /**
   * Broker socket send buffer size. System default is used if 0.
   *
   * @default 0
   */
  "socket.send.buffer.bytes"?: number;

  /**
   * Broker socket receive buffer size. System default is used if 0.
   *
   * @default 0
   */
  "socket.receive.buffer.bytes"?: number;

  /**
   * Enable TCP keep-alives (SO_KEEPALIVE) on broker sockets
   *
   * @default false
   */
  "socket.keepalive.enable"?: boolean;

  /**
   * Disable the Nagle algorithm (TCP_NODELAY) on broker sockets.
   *
   * @default false
   */
  "socket.nagle.disable"?: boolean;

  /**
   * Disconnect from broker when this number of send failures (e.g., timed out requests) is reached. Disable with 0. WARNING: It is highly recommended to leave this setting at its default value of 1 to avoid the client and broker to become desynchronized in case of request timeouts. NOTE: The connection is automatically re-established.
   *
   * @default 1
   */
  "socket.max.fails"?: number;

  /**
   * How long to cache the broker address resolving results (milliseconds).
   *
   * @default 1000
   */
  "broker.address.ttl"?: number;

  /**
   * Allowed broker IP address families: any, v4, v6
   *
   * @default any
   */
  "broker.address.family"?: 'any' | 'v4' | 'v6';

  /**
   * Maximum time allowed for broker connection setup (TCP connection setup as well SSL and SASL handshake). If the connection to the broker is not fully functional after this the connection will be closed and retried.
   *
   * @default 30000
   */
  "socket.connection.setup.timeout.ms"?: number;

  /**
   * Close broker connections after the specified time of inactivity. Disable with 0. If this property is left at its default value some heuristics are performed to determine a suitable default value, this is currently limited to identifying brokers on Azure (see librdkafka issue #3109 for more info).
   *
   * @default 0
   */
  "connections.max.idle.ms"?: number;

  /**
   * **DEPRECATED** No longer used. See `reconnect.backoff.ms` and `reconnect.backoff.max.ms`.
   *
   * @default 0
   */
  "reconnect.backoff.jitter.ms"?: number;

  /**
   * The initial time to wait before reconnecting to a broker after the connection has been closed. The time is increased exponentially until `reconnect.backoff.max.ms` is reached. -25% to +50% jitter is applied to each reconnect backoff. A value of 0 disables the backoff and reconnects immediately.
   *
   * @default 100
   */
  "reconnect.backoff.ms"?: number;

  /**
   * The maximum time to wait before reconnecting to a broker after the connection has been closed.
   *
   * @default 10000
   */
  "reconnect.backoff.max.ms"?: number;

  /**
   * librdkafka statistics emit interval. The application also needs to register a stats callback using `rd_kafka_conf_set_stats_cb()`. The granularity is 1000ms. A value of 0 disables statistics.
   *
   * @default 0
   */
  "statistics.interval.ms"?: number;

  /**
   * See `rd_kafka_conf_set_events()`
   *
   * @default 0
   */
  "enabled_events"?: number;

  /**
   * Error callback (set with rd_kafka_conf_set_error_cb())
   */
  "error_cb"?: any;

  /**
   * Throttle callback (set with rd_kafka_conf_set_throttle_cb())
   */
  "throttle_cb"?: any;

  /**
   * Statistics callback (set with rd_kafka_conf_set_stats_cb())
   */
  "stats_cb"?: any;

  /**
   * Log callback (set with rd_kafka_conf_set_log_cb())
   */
  "log_cb"?: any;

  /**
   * Logging level (syslog(3) levels)
   *
   * @default 6
   */
  "log_level"?: number;

  /**
   * Disable spontaneous log_cb from internal librdkafka threads, instead enqueue log messages on queue set with `rd_kafka_set_log_queue()` and serve log callbacks or events through the standard poll APIs. **NOTE**: Log messages will linger in a temporary queue until the log queue has been set.
   *
   * @default false
   */
  "log.queue"?: boolean;

  /**
   * Print internal thread name in log messages (useful for debugging librdkafka internals)
   *
   * @default true
   */
  "log.thread.name"?: boolean;

  /**
   * If enabled librdkafka will initialize the PRNG with srand(current_time.milliseconds) on the first invocation of rd_kafka_new() (required only if rand_r() is not available on your platform). If disabled the application must call srand() prior to calling rd_kafka_new().
   *
   * @default true
   */
  "enable.random.seed"?: boolean;

  /**
   * Log broker disconnects. It might be useful to turn this off when interacting with 0.9 brokers with an aggressive `connections.max.idle.ms` value.
   *
   * @default true
   */
  "log.connection.close"?: boolean;

  /**
   * Background queue event callback (set with rd_kafka_conf_set_background_event_cb())
   */
  "background_event_cb"?: any;

  /**
   * Socket creation callback to provide race-free CLOEXEC
   */
  "socket_cb"?: any;

  /**
   * Socket connect callback
   */
  "connect_cb"?: any;

  /**
   * Socket close callback
   */
  "closesocket_cb"?: any;

  /**
   * File open callback to provide race-free CLOEXEC
   */
  "open_cb"?: any;

  /**
   * Address resolution callback (set with rd_kafka_conf_set_resolve_cb()).
   */
  "resolve_cb"?: any;

  /**
   * Application opaque (set with rd_kafka_conf_set_opaque())
   */
  "opaque"?: any;

  /**
   * Default topic configuration for automatically subscribed topics
   */
  "default_topic_conf"?: any;

  /**
   * Signal that librdkafka will use to quickly terminate on rd_kafka_destroy(). If this signal is not set then there will be a delay before rd_kafka_wait_destroyed() returns true as internal threads are timing out their system calls. If this signal is set however the delay will be minimal. The application should mask this signal as an internal signal handler is installed.
   *
   * @default 0
   */
  "internal.termination.signal"?: number;

  /**
   * Request broker's supported API versions to adjust functionality to available protocol features. If set to false, or the ApiVersionRequest fails, the fallback version `broker.version.fallback` will be used. **NOTE**: Depends on broker version >=0.10.0. If the request is not supported by (an older) broker the `broker.version.fallback` fallback is used.
   *
   * @default true
   */
  "api.version.request"?: boolean;

  /**
   * Timeout for broker API version requests.
   *
   * @default 10000
   */
  "api.version.request.timeout.ms"?: number;

  /**
   * Dictates how long the `broker.version.fallback` fallback is used in the case the ApiVersionRequest fails. **NOTE**: The ApiVersionRequest is only issued when a new connection to the broker is made (such as after an upgrade).
   *
   * @default 0
   */
  "api.version.fallback.ms"?: number;

  /**
   * Older broker versions (before 0.10.0) provide no way for a client to query for supported protocol features (ApiVersionRequest, see `api.version.request`) making it impossible for the client to know what features it may use. As a workaround a user may set this property to the expected broker version and the client will automatically adjust its feature set accordingly if the ApiVersionRequest fails (or is disabled). The fallback broker version will be used for `api.version.fallback.ms`. Valid values are: 0.9.0, 0.8.2, 0.8.1, 0.8.0. Any other value >= 0.10, such as 0.10.2.1, enables ApiVersionRequests.
   *
   * @default 0.10.0
   */
  "broker.version.fallback"?: string;

  /**
   * Allow automatic topic creation on the broker when subscribing to or assigning non-existent topics. The broker must also be configured with `auto.create.topics.enable=true` for this configuration to take effect. Note: the default value (true) for the producer is different from the default value (false) for the consumer. Further, the consumer default value is different from the Java consumer (true), and this property is not supported by the Java producer. Requires broker version >= 0.11.0.0, for older broker versions only the broker configuration applies.
   *
   * @default false
   */
  "allow.auto.create.topics"?: boolean;

  /**
   * Protocol used to communicate with brokers.
   *
   * @default plaintext
   */
  "security.protocol"?: 'plaintext' | 'ssl' | 'sasl_plaintext' | 'sasl_ssl';

  /**
   * A cipher suite is a named combination of authentication, encryption, MAC and key exchange algorithm used to negotiate the security settings for a network connection using TLS or SSL network protocol. See manual page for `ciphers(1)` and `SSL_CTX_set_cipher_list(3).
   */
  "ssl.cipher.suites"?: string;

  /**
   * The supported-curves extension in the TLS ClientHello message specifies the curves (standard/named, or 'explicit' GF(2^k) or GF(p)) the client is willing to have the server use. See manual page for `SSL_CTX_set1_curves_list(3)`. OpenSSL >= 1.0.2 required.
   */
  "ssl.curves.list"?: string;

  /**
   * The client uses the TLS ClientHello signature_algorithms extension to indicate to the server which signature/hash algorithm pairs may be used in digital signatures. See manual page for `SSL_CTX_set1_sigalgs_list(3)`. OpenSSL >= 1.0.2 required.
   */
  "ssl.sigalgs.list"?: string;

  /**
   * Path to client's private key (PEM) used for authentication.
   */
  "ssl.key.location"?: string;

  /**
   * Private key passphrase (for use with `ssl.key.location` and `set_ssl_cert()`)
   */
  "ssl.key.password"?: string;

  /**
   * Client's private key string (PEM format) used for authentication.
   */
  "ssl.key.pem"?: string;

  /**
   * Client's private key as set by rd_kafka_conf_set_ssl_cert()
   */
  "ssl_key"?: any;

  /**
   * Path to client's public key (PEM) used for authentication.
   */
  "ssl.certificate.location"?: string;

  /**
   * Client's public key string (PEM format) used for authentication.
   */
  "ssl.certificate.pem"?: string;

  /**
   * Client's public key as set by rd_kafka_conf_set_ssl_cert()
   */
  "ssl_certificate"?: any;

  /**
   * File or directory path to CA certificate(s) for verifying the broker's key. Defaults: On Windows the system's CA certificates are automatically looked up in the Windows Root certificate store. On Mac OSX this configuration defaults to `probe`. It is recommended to install openssl using Homebrew, to provide CA certificates. On Linux install the distribution's ca-certificates package. If OpenSSL is statically linked or `ssl.ca.location` is set to `probe` a list of standard paths will be probed and the first one found will be used as the default CA certificate location path. If OpenSSL is dynamically linked the OpenSSL library's default path will be used (see `OPENSSLDIR` in `openssl version -a`).
   */
  "ssl.ca.location"?: string;

  /**
   * CA certificate string (PEM format) for verifying the broker's key.
   */
  "ssl.ca.pem"?: string;

  /**
   * CA certificate as set by rd_kafka_conf_set_ssl_cert()
   */
  "ssl_ca"?: any;

  /**
   * Comma-separated list of Windows Certificate stores to load CA certificates from. Certificates will be loaded in the same order as stores are specified. If no certificates can be loaded from any of the specified stores an error is logged and the OpenSSL library's default CA location is used instead. Store names are typically one or more of: MY, Root, Trust, CA.
   *
   * @default Root
   */
  "ssl.ca.certificate.stores"?: string;

  /**
   * Path to CRL for verifying broker's certificate validity.
   */
  "ssl.crl.location"?: string;

  /**
   * Path to client's keystore (PKCS#12) used for authentication.
   */
  "ssl.keystore.location"?: string;

  /**
   * Client's keystore (PKCS#12) password.
   */
  "ssl.keystore.password"?: string;

  /**
   * Comma-separated list of OpenSSL 3.0.x implementation providers. E.g., "default,legacy".
   */
  "ssl.providers"?: string;

  /**
   * **DEPRECATED** Path to OpenSSL engine library. OpenSSL >= 1.1.x required. DEPRECATED: OpenSSL engine support is deprecated and should be replaced by OpenSSL 3 providers.
   */
  "ssl.engine.location"?: string;

  /**
   * OpenSSL engine id is the name used for loading engine.
   *
   * @default dynamic
   */
  "ssl.engine.id"?: string;

  /**
   * OpenSSL engine callback data (set with rd_kafka_conf_set_engine_callback_data()).
   */
  "ssl_engine_callback_data"?: any;

  /**
   * Enable OpenSSL's builtin broker (server) certificate verification. This verification can be extended by the application by implementing a certificate_verify_cb.
   *
   * @default true
   */
  "enable.ssl.certificate.verification"?: boolean;

  /**
   * Endpoint identification algorithm to validate broker hostname using broker certificate. https - Server (broker) hostname verification as specified in RFC2818. none - No endpoint verification. OpenSSL >= 1.0.2 required.
   *
   * @default https
   */
  "ssl.endpoint.identification.algorithm"?: 'none' | 'https';

  /**
   * Callback to verify the broker certificate chain.
   */
  "ssl.certificate.verify_cb"?: any;

  /**
   * SASL mechanism to use for authentication. Supported: GSSAPI, PLAIN, SCRAM-SHA-256, SCRAM-SHA-512, OAUTHBEARER. **NOTE**: Despite the name only one mechanism must be configured.
   *
   * @default GSSAPI
   */
  "sasl.mechanisms"?: string;

  /**
   * Alias for `sasl.mechanisms`: SASL mechanism to use for authentication. Supported: GSSAPI, PLAIN, SCRAM-SHA-256, SCRAM-SHA-512, OAUTHBEARER. **NOTE**: Despite the name only one mechanism must be configured.
   *
   * @default GSSAPI
   */
  "sasl.mechanism"?: string;

  /**
   * Kerberos principal name that Kafka runs as, not including /hostname@REALM
   *
   * @default kafka
   */
  "sasl.kerberos.service.name"?: string;

  /**
   * This client's Kerberos principal name. (Not supported on Windows, will use the logon user's principal).
   *
   * @default kafkaclient
   */
  "sasl.kerberos.principal"?: string;

  /**
   * kinit -t "%{sasl.kerberos.keytab}" -k %{sasl.kerberos.principal} | low        | Shell command to refresh or acquire the client's Kerberos ticket. This command is executed on client creation and every sasl.kerberos.min.time.before.relogin (0=disable). %{config.prop.name} is replaced by corresponding config object value.
   *
   * @default kinit -R -t "%{sasl.kerberos.keytab}" -k %{sasl.kerberos.principal} \
   */
  "sasl.kerberos.kinit.cmd"?: string;

  /**
   * Path to Kerberos keytab file. This configuration property is only used as a variable in `sasl.kerberos.kinit.cmd` as ` ... -t "%{sasl.kerberos.keytab}"`.
   */
  "sasl.kerberos.keytab"?: string;

  /**
   * Minimum time in milliseconds between key refresh attempts. Disable automatic key refresh by setting this property to 0.
   *
   * @default 60000
   */
  "sasl.kerberos.min.time.before.relogin"?: number;

  /**
   * SASL username for use with the PLAIN and SASL-SCRAM-.. mechanisms
   */
  "sasl.username"?: string;

  /**
   * SASL password for use with the PLAIN and SASL-SCRAM-.. mechanism
   */
  "sasl.password"?: string;

  /**
   * SASL/OAUTHBEARER configuration. The format is implementation-dependent and must be parsed accordingly. The default unsecured token implementation (see https://tools.ietf.org/html/rfc7515#appendix-A.5) recognizes space-separated name=value pairs with valid names including principalClaimName, principal, scopeClaimName, scope, and lifeSeconds. The default value for principalClaimName is "sub", the default value for scopeClaimName is "scope", and the default value for lifeSeconds is 3600. The scope value is CSV format with the default value being no/empty scope. For example: `principalClaimName=azp principal=admin scopeClaimName=roles scope=role1,role2 lifeSeconds=600`. In addition, SASL extensions can be communicated to the broker via `extension_NAME=value`. For example: `principal=admin extension_traceId=123`
   */
  "sasl.oauthbearer.config"?: string;

  /**
   * Enable the builtin unsecure JWT OAUTHBEARER token handler if no oauthbearer_refresh_cb has been set. This builtin handler should only be used for development or testing, and not in production.
   *
   * @default false
   */
  "enable.sasl.oauthbearer.unsecure.jwt"?: boolean;

  /**
   * SASL/OAUTHBEARER token refresh callback (set with rd_kafka_conf_set_oauthbearer_token_refresh_cb(), triggered by rd_kafka_poll(), et.al. This callback will be triggered when it is time to refresh the client's OAUTHBEARER token. Also see `rd_kafka_conf_enable_sasl_queue()`.
   */
  "oauthbearer_token_refresh_cb"?: any;

  /**
   * Set to "default" or "oidc" to control which login method to be used. If set to "oidc", the following properties must also be be specified: `sasl.oauthbearer.client.id`, `sasl.oauthbearer.client.secret`, and `sasl.oauthbearer.token.endpoint.url`.
   *
   * @default default
   */
  "sasl.oauthbearer.method"?: 'default' | 'oidc';

  /**
   * Public identifier for the application. Must be unique across all clients that the authorization server handles. Only used when `sasl.oauthbearer.method` is set to "oidc".
   */
  "sasl.oauthbearer.client.id"?: string;

  /**
   * Client secret only known to the application and the authorization server. This should be a sufficiently random string that is not guessable. Only used when `sasl.oauthbearer.method` is set to "oidc".
   */
  "sasl.oauthbearer.client.secret"?: string;

  /**
   * Client use this to specify the scope of the access request to the broker. Only used when `sasl.oauthbearer.method` is set to "oidc".
   */
  "sasl.oauthbearer.scope"?: string;

  /**
   * Allow additional information to be provided to the broker. Comma-separated list of key=value pairs. E.g., "supportFeatureX=true,organizationId=sales-emea".Only used when `sasl.oauthbearer.method` is set to "oidc".
   */
  "sasl.oauthbearer.extensions"?: string;

  /**
   * OAuth/OIDC issuer token endpoint HTTP(S) URI used to retrieve token. Only used when `sasl.oauthbearer.method` is set to "oidc".
   */
  "sasl.oauthbearer.token.endpoint.url"?: string;

  /**
   * List of plugin libraries to load (; separated). The library search path is platform dependent (see dlopen(3) for Unix and LoadLibrary() for Windows). If no filename extension is specified the platform-specific extension (such as .dll or .so) will be appended automatically.
   */
  "plugin.library.paths"?: string;

  /**
   * Interceptors added through rd_kafka_conf_interceptor_add_..() and any configuration handled by interceptors.
   */
  "interceptors"?: any;

  /**
   * A rack identifier for this client. This can be any string value which indicates where this client is physically located. It corresponds with the broker config `broker.rack`.
   */
  "client.rack"?: string;

  /**
   * Controls how the client uses DNS lookups. By default, when the lookup returns multiple IP addresses for a hostname, they will all be attempted for connection before the connection is considered failed. This applies to both bootstrap and advertised servers. If the value is set to `resolve_canonical_bootstrap_servers_only`, each entry will be resolved and expanded into a list of canonical names. NOTE: Default here is different from the Java client's default behavior, which connects only to the first IP address returned for a hostname.
   *
   * @default use_all_dns_ips
   */
  "client.dns.lookup"?: 'use_all_dns_ips' | 'resolve_canonical_bootstrap_servers_only';

  /**
   * Enables or disables `event.*` emitting.
   *
   * @default true
   */
  "event_cb"?: boolean;
}

export interface ProducerGlobalConfig extends GlobalConfig {
  /**
   * Enables the transactional producer. The transactional.id is used to identify the same transactional producer instance across process restarts. It allows the producer to guarantee that transactions corresponding to earlier instances of the same producer have been finalized prior to starting any new transactions, and that any zombie instances are fenced off. If no transactional.id is provided, then the producer is limited to idempotent delivery (if enable.idempotence is set). Requires broker version >= 0.11.0.
   */
  "transactional.id"?: string;

  /**
   * The maximum amount of time in milliseconds that the transaction coordinator will wait for a transaction status update from the producer before proactively aborting the ongoing transaction. If this value is larger than the `transaction.max.timeout.ms` setting in the broker, the init_transactions() call will fail with ERR_INVALID_TRANSACTION_TIMEOUT. The transaction timeout automatically adjusts `message.timeout.ms` and `socket.timeout.ms`, unless explicitly configured in which case they must not exceed the transaction timeout (`socket.timeout.ms` must be at least 100ms lower than `transaction.timeout.ms`). This is also the default timeout value if no timeout (-1) is supplied to the transactional API methods.
   *
   * @default 60000
   */
  "transaction.timeout.ms"?: number;

  /**
   * When set to `true`, the producer will ensure that messages are successfully produced exactly once and in the original produce order. The following configuration properties are adjusted automatically (if not modified by the user) when idempotence is enabled: `max.in.flight.requests.per.connection=5` (must be less than or equal to 5), `retries=INT32_MAX` (must be greater than 0), `acks=all`, `queuing.strategy=fifo`. Producer instantation will fail if user-supplied configuration is incompatible.
   *
   * @default false
   */
  "enable.idempotence"?: boolean;

  /**
   * **EXPERIMENTAL**: subject to change or removal. When set to `true`, any error that could result in a gap in the produced message series when a batch of messages fails, will raise a fatal error (ERR__GAPLESS_GUARANTEE) and stop the producer. Messages failing due to `message.timeout.ms` are not covered by this guarantee. Requires `enable.idempotence=true`.
   *
   * @default false
   */
  "enable.gapless.guarantee"?: boolean;

  /**
   * Maximum number of messages allowed on the producer queue. This queue is shared by all topics and partitions. A value of 0 disables this limit.
   *
   * @default 100000
   */
  "queue.buffering.max.messages"?: number;

  /**
   * Maximum total message size sum allowed on the producer queue. This queue is shared by all topics and partitions. This property has higher priority than queue.buffering.max.messages.
   *
   * @default 1048576
   */
  "queue.buffering.max.kbytes"?: number;

  /**
   * Delay in milliseconds to wait for messages in the producer queue to accumulate before constructing message batches (MessageSets) to transmit to brokers. A higher value allows larger and more effective (less overhead, improved compression) batches of messages to accumulate at the expense of increased message delivery latency.
   *
   * @default 5
   */
  "queue.buffering.max.ms"?: any;

  /**
   * Alias for `queue.buffering.max.ms`: Delay in milliseconds to wait for messages in the producer queue to accumulate before constructing message batches (MessageSets) to transmit to brokers. A higher value allows larger and more effective (less overhead, improved compression) batches of messages to accumulate at the expense of increased message delivery latency.
   *
   * @default 5
   */
  "linger.ms"?: any;

  /**
   * How many times to retry sending a failing Message. **Note:** retrying may cause reordering unless `enable.idempotence` is set to true.
   *
   * @default 2147483647
   */
  "message.send.max.retries"?: number;

  /**
   * Alias for `message.send.max.retries`: How many times to retry sending a failing Message. **Note:** retrying may cause reordering unless `enable.idempotence` is set to true.
   *
   * @default 2147483647
   */
  "retries"?: number;

  /**
   * The backoff time in milliseconds before retrying a protocol request, this is the first backoff time, and will be backed off exponentially until number of retries is exhausted, and it's capped by retry.backoff.max.ms.
   *
   * @default 100
   */
  "retry.backoff.ms"?: number;

  /**
   * The max backoff time in milliseconds before retrying a protocol request, this is the atmost backoff allowed for exponentially backed off requests.
   *
   * @default 1000
   */
  "retry.backoff.max.ms"?: number;

  /**
   * The threshold of outstanding not yet transmitted broker requests needed to backpressure the producer's message accumulator. If the number of not yet transmitted requests equals or exceeds this number, produce request creation that would have otherwise been triggered (for example, in accordance with linger.ms) will be delayed. A lower number yields larger and more effective batches. A higher value can improve latency when using compression on slow machines.
   *
   * @default 1
   */
  "queue.buffering.backpressure.threshold"?: number;

  /**
   * compression codec to use for compressing message sets. This is the default value for all topics, may be overridden by the topic configuration property `compression.codec`.
   *
   * @default none
   */
  "compression.codec"?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';

  /**
   * Alias for `compression.codec`: compression codec to use for compressing message sets. This is the default value for all topics, may be overridden by the topic configuration property `compression.codec`.
   *
   * @default none
   */
  "compression.type"?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';

  /**
   * Maximum number of messages batched in one MessageSet. The total MessageSet size is also limited by batch.size and message.max.bytes.
   *
   * @default 10000
   */
  "batch.num.messages"?: number;

  /**
   * Maximum size (in bytes) of all messages batched in one MessageSet, including protocol framing overhead. This limit is applied after the first message has been added to the batch, regardless of the first message's size, this is to ensure that messages that exceed batch.size are produced. The total MessageSet size is also limited by batch.num.messages and message.max.bytes.
   *
   * @default 1000000
   */
  "batch.size"?: number;

  /**
   * Only provide delivery reports for failed messages.
   *
   * @default false
   */
  "delivery.report.only.error"?: boolean;

  /**
   * Delivery report callback (set with rd_kafka_conf_set_dr_cb())
   */
  "dr_cb"?: boolean | Function;

  /**
   * Delivery report callback (set with rd_kafka_conf_set_dr_msg_cb())
   */
  "dr_msg_cb"?: boolean;

  /**
   * Delay in milliseconds to wait to assign new sticky partitions for each topic. By default, set to double the time of linger.ms. To disable sticky behavior, set to 0. This behavior affects messages with the key NULL in all cases, and messages with key lengths of zero when the consistent_random partitioner is in use. These messages would otherwise be assigned randomly. A higher value allows for more effective batching of these messages.
   *
   * @default 10
   */
  "sticky.partitioning.linger.ms"?: number;
}

export interface ConsumerGlobalConfig extends GlobalConfig {
  /**
   * Client group id string. All clients sharing the same group.id belong to the same group.
   */
  "group.id"?: string;

  /**
   * Enable static group membership. Static group members are able to leave and rejoin a group within the configured `session.timeout.ms` without prompting a group rebalance. This should be used in combination with a larger `session.timeout.ms` to avoid group rebalances caused by transient unavailability (e.g. process restarts). Requires broker version >= 2.3.0.
   */
  "group.instance.id"?: string;

  /**
   * The name of one or more partition assignment strategies. The elected group leader will use a strategy supported by all members of the group to assign partitions to group members. If there is more than one eligible strategy, preference is determined by the order of this list (strategies earlier in the list have higher priority). Cooperative and non-cooperative (eager) strategies must not be mixed. Available strategies: range, roundrobin, cooperative-sticky.
   *
   * @default range,roundrobin
   */
  "partition.assignment.strategy"?: string;

  /**
   * Client group session and failure detection timeout. The consumer sends periodic heartbeats (heartbeat.interval.ms) to indicate its liveness to the broker. If no hearts are received by the broker for a group member within the session timeout, the broker will remove the consumer from the group and trigger a rebalance. The allowed range is configured with the **broker** configuration properties `group.min.session.timeout.ms` and `group.max.session.timeout.ms`. Also see `max.poll.interval.ms`.
   *
   * @default 45000
   */
  "session.timeout.ms"?: number;

  /**
   * Group session keepalive heartbeat interval.
   *
   * @default 3000
   */
  "heartbeat.interval.ms"?: number;

  /**
   * Group protocol type for the `generic` group protocol. NOTE: Currently, the only supported group protocol type is `consumer`.
   *
   * @default consumer
   */
  "group.protocol.type"?: string;

  /**
   * How often to query for the current client group coordinator. If the currently assigned coordinator is down the configured query interval will be divided by ten to more quickly recover in case of coordinator reassignment.
   *
   * @default 600000
   */
  "coordinator.query.interval.ms"?: number;

  /**
   * Maximum allowed time between calls to consume messages (e.g., rd_kafka_consumer_poll()) for high-level consumers. If this interval is exceeded the consumer is considered failed and the group will rebalance in order to reassign the partitions to another consumer group member. Warning: Offset commits may be not possible at this point. Note: It is recommended to set `enable.auto.offset.store=false` for long-time processing applications and then explicitly store offsets (using offsets_store()) *after* message processing, to make sure offsets are not auto-committed prior to processing has finished. The interval is checked two times per second. See KIP-62 for more information.
   *
   * @default 300000
   */
  "max.poll.interval.ms"?: number;

  /**
   * Automatically and periodically commit offsets in the background. Note: setting this to false does not prevent the consumer from fetching previously committed start offsets. To circumvent this behaviour set specific start offsets per partition in the call to assign().
   *
   * @default true
   */
  "enable.auto.commit"?: boolean;

  /**
   * The frequency in milliseconds that the consumer offsets are committed (written) to offset storage. (0 = disable). This setting is used by the high-level consumer.
   *
   * @default 5000
   */
  "auto.commit.interval.ms"?: number;

  /**
   * Automatically store offset of last message provided to application. The offset store is an in-memory store of the next offset to (auto-)commit for each partition.
   *
   * @default true
   */
  "enable.auto.offset.store"?: boolean;

  /**
   * Minimum number of messages per topic+partition librdkafka tries to maintain in the local consumer queue.
   *
   * @default 100000
   */
  "queued.min.messages"?: number;

  /**
   * Maximum number of kilobytes of queued pre-fetched messages in the local consumer queue. If using the high-level consumer this setting applies to the single consumer queue, regardless of the number of partitions. When using the legacy simple consumer or when separate partition queues are used this setting applies per partition. This value may be overshot by fetch.message.max.bytes. This property has higher priority than queued.min.messages.
   *
   * @default 65536
   */
  "queued.max.messages.kbytes"?: number;

  /**
   * Maximum time the broker may wait to fill the Fetch response with fetch.min.bytes of messages.
   *
   * @default 500
   */
  "fetch.wait.max.ms"?: number;

  /**
   * How long to postpone the next fetch request for a topic+partition in case the current fetch queue thresholds (queued.min.messages or queued.max.messages.kbytes) have been exceded. This property may need to be decreased if the queue thresholds are set low and the application is experiencing long (~1s) delays between messages. Low values may increase CPU utilization.
   *
   * @default 1000
   */
  "fetch.queue.backoff.ms"?: number;

  /**
   * Initial maximum number of bytes per topic+partition to request when fetching messages from the broker. If the client encounters a message larger than this value it will gradually try to increase it until the entire message can be fetched.
   *
   * @default 1048576
   */
  "fetch.message.max.bytes"?: number;

  /**
   * Alias for `fetch.message.max.bytes`: Initial maximum number of bytes per topic+partition to request when fetching messages from the broker. If the client encounters a message larger than this value it will gradually try to increase it until the entire message can be fetched.
   *
   * @default 1048576
   */
  "max.partition.fetch.bytes"?: number;

  /**
   * Maximum amount of data the broker shall return for a Fetch request. Messages are fetched in batches by the consumer and if the first message batch in the first non-empty partition of the Fetch request is larger than this value, then the message batch will still be returned to ensure the consumer can make progress. The maximum message batch size accepted by the broker is defined via `message.max.bytes` (broker config) or `max.message.bytes` (broker topic config). `fetch.max.bytes` is automatically adjusted upwards to be at least `message.max.bytes` (consumer config).
   *
   * @default 52428800
   */
  "fetch.max.bytes"?: number;

  /**
   * Minimum number of bytes the broker responds with. If fetch.wait.max.ms expires the accumulated data will be sent to the client regardless of this setting.
   *
   * @default 1
   */
  "fetch.min.bytes"?: number;

  /**
   * How long to postpone the next fetch request for a topic+partition in case of a fetch error.
   *
   * @default 500
   */
  "fetch.error.backoff.ms"?: number;

  /**
   * **DEPRECATED** Offset commit store method: 'file' - DEPRECATED: local file store (offset.store.path, et.al), 'broker' - broker commit store (requires Apache Kafka 0.8.2 or later on the broker).
   *
   * @default broker
   */
  "offset.store.method"?: 'none' | 'file' | 'broker';

  /**
   * Controls how to read messages written transactionally: `read_committed` - only return transactional messages which have been committed. `read_uncommitted` - return all messages, even transactional messages which have been aborted.
   *
   * @default read_committed
   */
  "isolation.level"?: 'read_uncommitted' | 'read_committed';

  /**
   * Message consume callback (set with rd_kafka_conf_set_consume_cb())
   */
  "consume_cb"?: any;

  /**
   * Called after consumer group has been rebalanced (set with rd_kafka_conf_set_rebalance_cb())
   */
  "rebalance_cb"?: boolean | Function;

  /**
   * Offset commit result propagation callback. (set with rd_kafka_conf_set_offset_commit_cb())
   */
  "offset_commit_cb"?: boolean | Function;

  /**
   * Emit RD_KAFKA_RESP_ERR__PARTITION_EOF event whenever the consumer reaches the end of a partition.
   *
   * @default false
   */
  "enable.partition.eof"?: boolean;

  /**
   * Verify CRC32 of consumed messages, ensuring no on-the-wire or on-disk corruption to the messages occurred. This check comes at slightly increased CPU usage.
   *
   * @default false
   */
  "check.crcs"?: boolean;
}

export interface TopicConfig {
  /**
   * Application opaque (set with rd_kafka_topic_conf_set_opaque())
   */
  "opaque"?: any;
}

export interface ProducerTopicConfig extends TopicConfig {
  /**
   * This field indicates the number of acknowledgements the leader broker must receive from ISR brokers before responding to the request: *0*=Broker does not send any response/ack to client, *-1* or *all*=Broker will block until message is committed by all in sync replicas (ISRs). If there are less than `min.insync.replicas` (broker configuration) in the ISR set the produce request will fail.
   *
   * @default -1
   */
  "request.required.acks"?: number;

  /**
   * Alias for `request.required.acks`: This field indicates the number of acknowledgements the leader broker must receive from ISR brokers before responding to the request: *0*=Broker does not send any response/ack to client, *-1* or *all*=Broker will block until message is committed by all in sync replicas (ISRs). If there are less than `min.insync.replicas` (broker configuration) in the ISR set the produce request will fail.
   *
   * @default -1
   */
  "acks"?: number;

  /**
   * The ack timeout of the producer request in milliseconds. This value is only enforced by the broker and relies on `request.required.acks` being != 0.
   *
   * @default 30000
   */
  "request.timeout.ms"?: number;

  /**
   * Local message timeout. This value is only enforced locally and limits the time a produced message waits for successful delivery. A time of 0 is infinite. This is the maximum time librdkafka may use to deliver a message (including retries). Delivery error occurs when either the retry count or the message timeout are exceeded. The message timeout is automatically adjusted to `transaction.timeout.ms` if `transactional.id` is configured.
   *
   * @default 300000
   */
  "message.timeout.ms"?: number;

  /**
   * Alias for `message.timeout.ms`: Local message timeout. This value is only enforced locally and limits the time a produced message waits for successful delivery. A time of 0 is infinite. This is the maximum time librdkafka may use to deliver a message (including retries). Delivery error occurs when either the retry count or the message timeout are exceeded. The message timeout is automatically adjusted to `transaction.timeout.ms` if `transactional.id` is configured.
   *
   * @default 300000
   */
  "delivery.timeout.ms"?: number;

  /**
   * **EXPERIMENTAL**: subject to change or removal. **DEPRECATED** Producer queuing strategy. FIFO preserves produce ordering, while LIFO prioritizes new messages.
   *
   * @default fifo
   */
  "queuing.strategy"?: 'fifo' | 'lifo';

  /**
   * **DEPRECATED** No longer used.
   *
   * @default false
   */
  "produce.offset.report"?: boolean;

  /**
   * Partitioner: `random` - random distribution, `consistent` - CRC32 hash of key (Empty and NULL keys are mapped to single partition), `consistent_random` - CRC32 hash of key (Empty and NULL keys are randomly partitioned), `murmur2` - Java Producer compatible Murmur2 hash of key (NULL keys are mapped to single partition), `murmur2_random` - Java Producer compatible Murmur2 hash of key (NULL keys are randomly partitioned. This is functionally equivalent to the default partitioner in the Java Producer.), `fnv1a` - FNV-1a hash of key (NULL keys are mapped to single partition), `fnv1a_random` - FNV-1a hash of key (NULL keys are randomly partitioned).
   *
   * @default consistent_random
   */
  "partitioner"?: string;

  /**
   * Custom partitioner callback (set with rd_kafka_topic_conf_set_partitioner_cb())
   */
  "partitioner_cb"?: any;

  /**
   * **EXPERIMENTAL**: subject to change or removal. **DEPRECATED** Message queue ordering comparator (set with rd_kafka_topic_conf_set_msg_order_cmp()). Also see `queuing.strategy`.
   */
  "msg_order_cmp"?: any;

  /**
   * Compression codec to use for compressing message sets. inherit = inherit global compression.codec configuration.
   *
   * @default inherit
   */
  "compression.codec"?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd' | 'inherit';

  /**
   * Alias for `compression.codec`: compression codec to use for compressing message sets. This is the default value for all topics, may be overridden by the topic configuration property `compression.codec`.
   *
   * @default none
   */
  "compression.type"?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';

  /**
   * Compression level parameter for algorithm selected by configuration property `compression.codec`. Higher values will result in better compression at the cost of more CPU usage. Usable range is algorithm-dependent: [0-9] for gzip; [0-12] for lz4; only 0 for snappy; -1 = codec-dependent default compression level.
   *
   * @default -1
   */
  "compression.level"?: number;
}

export interface ConsumerTopicConfig extends TopicConfig {
  /**
   * **DEPRECATED** [**LEGACY PROPERTY:** This property is used by the simple legacy consumer only. When using the high-level KafkaConsumer, the global `enable.auto.commit` property must be used instead]. If true, periodically commit offset of the last message handed to the application. This committed offset will be used when the process restarts to pick up where it left off. If false, the application will have to call `rd_kafka_offset_store()` to store an offset (optional). Offsets will be written to broker or local file according to offset.store.method.
   *
   * @default true
   */
  "auto.commit.enable"?: boolean;

  /**
   * **DEPRECATED** Alias for `auto.commit.enable`: [**LEGACY PROPERTY:** This property is used by the simple legacy consumer only. When using the high-level KafkaConsumer, the global `enable.auto.commit` property must be used instead]. If true, periodically commit offset of the last message handed to the application. This committed offset will be used when the process restarts to pick up where it left off. If false, the application will have to call `rd_kafka_offset_store()` to store an offset (optional). Offsets will be written to broker or local file according to offset.store.method.
   *
   * @default true
   */
  "enable.auto.commit"?: boolean;

  /**
   * [**LEGACY PROPERTY:** This setting is used by the simple legacy consumer only. When using the high-level KafkaConsumer, the global `auto.commit.interval.ms` property must be used instead]. The frequency in milliseconds that the consumer offsets are committed (written) to offset storage.
   *
   * @default 60000
   */
  "auto.commit.interval.ms"?: number;

  /**
   * Action to take when there is no initial offset in offset store or the desired offset is out of range: 'smallest','earliest' - automatically reset the offset to the smallest offset, 'largest','latest' - automatically reset the offset to the largest offset, 'error' - trigger an error (ERR__AUTO_OFFSET_RESET) which is retrieved by consuming messages and checking 'message->err'.
   *
   * @default largest
   */
  "auto.offset.reset"?: 'smallest' | 'earliest' | 'beginning' | 'largest' | 'latest' | 'end' | 'error';

  /**
   * **DEPRECATED** Path to local file for storing offsets. If the path is a directory a filename will be automatically generated in that directory based on the topic and partition. File-based offset storage will be removed in a future version.
   *
   * @default .
   */
  "offset.store.path"?: string;

  /**
   * **DEPRECATED** fsync() interval for the offset file, in milliseconds. Use -1 to disable syncing, and 0 for immediate sync after each write. File-based offset storage will be removed in a future version.
   *
   * @default -1
   */
  "offset.store.sync.interval.ms"?: number;

  /**
   * **DEPRECATED** Offset commit store method: 'file' - DEPRECATED: local file store (offset.store.path, et.al), 'broker' - broker commit store (requires "group.id" to be configured and Apache Kafka 0.8.2 or later on the broker.).
   *
   * @default broker
   */
  "offset.store.method"?: 'file' | 'broker';

  /**
   * Maximum number of messages to dispatch in one `rd_kafka_consume_callback*()` call (0 = unlimited)
   *
   * @default 0
   */
  "consume.callback.max.messages"?: number;
}

// errors
// ====== Generated from librdkafka master file src-cpp/rdkafkacpp.h ======
export declare const CODES: { ERRORS: {
  /* Internal errors to rdkafka: */
  /** Begin internal error codes (**-200**) */
  ERR__BEGIN: number,
  /** Received message is incorrect (**-199**) */
  ERR__BAD_MSG: number,
  /** Bad/unknown compression (**-198**) */
  ERR__BAD_COMPRESSION: number,
  /** Broker is going away (**-197**) */
  ERR__DESTROY: number,
  /** Generic failure (**-196**) */
  ERR__FAIL: number,
  /** Broker transport failure (**-195**) */
  ERR__TRANSPORT: number,
  /** Critical system resource (**-194**) */
  ERR__CRIT_SYS_RESOURCE: number,
  /** Failed to resolve broker (**-193**) */
  ERR__RESOLVE: number,
  /** Produced message timed out (**-192**) */
  ERR__MSG_TIMED_OUT: number,
  /** Reached the end of the topic+partition queue on
  *  the broker. Not really an error.
  *  This event is disabled by default,
  *  see the `enable.partition.eof` configuration property (**-191**) */
  ERR__PARTITION_EOF: number,
  /** Permanent: Partition does not exist in cluster (**-190**) */
  ERR__UNKNOWN_PARTITION: number,
  /** File or filesystem error (**-189**) */
  ERR__FS: number,
  /** Permanent: Topic does not exist in cluster (**-188**) */
  ERR__UNKNOWN_TOPIC: number,
  /** All broker connections are down (**-187**) */
  ERR__ALL_BROKERS_DOWN: number,
  /** Invalid argument, or invalid configuration (**-186**) */
  ERR__INVALID_ARG: number,
  /** Operation timed out (**-185**) */
  ERR__TIMED_OUT: number,
  /** Queue is full (**-184**) */
  ERR__QUEUE_FULL: number,
  /** ISR count < required.acks (**-183**) */
  ERR__ISR_INSUFF: number,
  /** Broker node update (**-182**) */
  ERR__NODE_UPDATE: number,
  /** SSL error (**-181**) */
  ERR__SSL: number,
  /** Waiting for coordinator to become available (**-180**) */
  ERR__WAIT_COORD: number,
  /** Unknown client group (**-179**) */
  ERR__UNKNOWN_GROUP: number,
  /** Operation in progress (**-178**) */
  ERR__IN_PROGRESS: number,
  /** Previous operation in progress, wait for it to finish (**-177**) */
  ERR__PREV_IN_PROGRESS: number,
  /** This operation would interfere with an existing subscription (**-176**) */
  ERR__EXISTING_SUBSCRIPTION: number,
  /** Assigned partitions (rebalance_cb) (**-175**) */
  ERR__ASSIGN_PARTITIONS: number,
  /** Revoked partitions (rebalance_cb) (**-174**) */
  ERR__REVOKE_PARTITIONS: number,
  /** Conflicting use (**-173**) */
  ERR__CONFLICT: number,
  /** Wrong state (**-172**) */
  ERR__STATE: number,
  /** Unknown protocol (**-171**) */
  ERR__UNKNOWN_PROTOCOL: number,
  /** Not implemented (**-170**) */
  ERR__NOT_IMPLEMENTED: number,
  /** Authentication failure (**-169**) */
  ERR__AUTHENTICATION: number,
  /** No stored offset (**-168**) */
  ERR__NO_OFFSET: number,
  /** Outdated (**-167**) */
  ERR__OUTDATED: number,
  /** Timed out in queue (**-166**) */
  ERR__TIMED_OUT_QUEUE: number,
  /** Feature not supported by broker (**-165**) */
  ERR__UNSUPPORTED_FEATURE: number,
  /** Awaiting cache update (**-164**) */
  ERR__WAIT_CACHE: number,
  /** Operation interrupted (**-163**) */
  ERR__INTR: number,
  /** Key serialization error (**-162**) */
  ERR__KEY_SERIALIZATION: number,
  /** Value serialization error (**-161**) */
  ERR__VALUE_SERIALIZATION: number,
  /** Key deserialization error (**-160**) */
  ERR__KEY_DESERIALIZATION: number,
  /** Value deserialization error (**-159**) */
  ERR__VALUE_DESERIALIZATION: number,
  /** Partial response (**-158**) */
  ERR__PARTIAL: number,
  /** Modification attempted on read-only object (**-157**) */
  ERR__READ_ONLY: number,
  /** No such entry / item not found (**-156**) */
  ERR__NOENT: number,
  /** Read underflow (**-155**) */
  ERR__UNDERFLOW: number,
  /** Invalid type (**-154**) */
  ERR__INVALID_TYPE: number,
  /** Retry operation (**-153**) */
  ERR__RETRY: number,
  /** Purged in queue (**-152**) */
  ERR__PURGE_QUEUE: number,
  /** Purged in flight (**-151**) */
  ERR__PURGE_INFLIGHT: number,
  /** Fatal error: see RdKafka::Handle::fatal_error() (**-150**) */
  ERR__FATAL: number,
  /** Inconsistent state (**-149**) */
  ERR__INCONSISTENT: number,
  /** Gap-less ordering would not be guaranteed if proceeding (**-148**) */
  ERR__GAPLESS_GUARANTEE: number,
  /** Maximum poll interval exceeded (**-147**) */
  ERR__MAX_POLL_EXCEEDED: number,
  /** Unknown broker (**-146**) */
  ERR__UNKNOWN_BROKER: number,
  /** Functionality not configured (**-145**) */
  ERR__NOT_CONFIGURED: number,
  /** Instance has been fenced (**-144**) */
  ERR__FENCED: number,
  /** Application generated error (**-143**) */
  ERR__APPLICATION: number,
  /** Assignment lost (**-142**) */
  ERR__ASSIGNMENT_LOST: number,
  /** No operation performed (**-141**) */
  ERR__NOOP: number,
  /** No offset to automatically reset to (**-140**) */
  ERR__AUTO_OFFSET_RESET: number,
  /** Partition log truncation detected (**-139**) */
  ERR__LOG_TRUNCATION: number,
  /** End internal error codes (**-100**) */
  ERR__END: number,
  /* Kafka broker errors: */
  /** Unknown broker error (**-1**) */
  ERR_UNKNOWN: number,
  /** Success (**0**) */
  ERR_NO_ERROR: number,
  /** Offset out of range (**1**) */
  ERR_OFFSET_OUT_OF_RANGE: number,
  /** Invalid message (**2**) */
  ERR_INVALID_MSG: number,
  /** Unknown topic or partition (**3**) */
  ERR_UNKNOWN_TOPIC_OR_PART: number,
  /** Invalid message size (**4**) */
  ERR_INVALID_MSG_SIZE: number,
  /** Leader not available (**5**) */
  ERR_LEADER_NOT_AVAILABLE: number,
  /** Not leader for partition (**6**) */
  ERR_NOT_LEADER_FOR_PARTITION: number,
  /** Request timed out (**7**) */
  ERR_REQUEST_TIMED_OUT: number,
  /** Broker not available (**8**) */
  ERR_BROKER_NOT_AVAILABLE: number,
  /** Replica not available (**9**) */
  ERR_REPLICA_NOT_AVAILABLE: number,
  /** Message size too large (**10**) */
  ERR_MSG_SIZE_TOO_LARGE: number,
  /** StaleControllerEpochCode (**11**) */
  ERR_STALE_CTRL_EPOCH: number,
  /** Offset metadata string too large (**12**) */
  ERR_OFFSET_METADATA_TOO_LARGE: number,
  /** Broker disconnected before response received (**13**) */
  ERR_NETWORK_EXCEPTION: number,
  /** Coordinator load in progress (**14**) */
  ERR_COORDINATOR_LOAD_IN_PROGRESS: number,
/** Group coordinator load in progress (**14**) */
  ERR_GROUP_LOAD_IN_PROGRESS: number,
  /** Coordinator not available (**15**) */
  ERR_COORDINATOR_NOT_AVAILABLE: number,
/** Group coordinator not available (**15**) */
  ERR_GROUP_COORDINATOR_NOT_AVAILABLE: number,
  /** Not coordinator (**16**) */
  ERR_NOT_COORDINATOR: number,
/** Not coordinator for group (**16**) */
  ERR_NOT_COORDINATOR_FOR_GROUP: number,
  /** Invalid topic (**17**) */
  ERR_TOPIC_EXCEPTION: number,
  /** Message batch larger than configured server segment size (**18**) */
  ERR_RECORD_LIST_TOO_LARGE: number,
  /** Not enough in-sync replicas (**19**) */
  ERR_NOT_ENOUGH_REPLICAS: number,
  /** Message(s) written to insufficient number of in-sync replicas (**20**) */
  ERR_NOT_ENOUGH_REPLICAS_AFTER_APPEND: number,
  /** Invalid required acks value (**21**) */
  ERR_INVALID_REQUIRED_ACKS: number,
  /** Specified group generation id is not valid (**22**) */
  ERR_ILLEGAL_GENERATION: number,
  /** Inconsistent group protocol (**23**) */
  ERR_INCONSISTENT_GROUP_PROTOCOL: number,
  /** Invalid group.id (**24**) */
  ERR_INVALID_GROUP_ID: number,
  /** Unknown member (**25**) */
  ERR_UNKNOWN_MEMBER_ID: number,
  /** Invalid session timeout (**26**) */
  ERR_INVALID_SESSION_TIMEOUT: number,
  /** Group rebalance in progress (**27**) */
  ERR_REBALANCE_IN_PROGRESS: number,
  /** Commit offset data size is not valid (**28**) */
  ERR_INVALID_COMMIT_OFFSET_SIZE: number,
  /** Topic authorization failed (**29**) */
  ERR_TOPIC_AUTHORIZATION_FAILED: number,
  /** Group authorization failed (**30**) */
  ERR_GROUP_AUTHORIZATION_FAILED: number,
  /** Cluster authorization failed (**31**) */
  ERR_CLUSTER_AUTHORIZATION_FAILED: number,
  /** Invalid timestamp (**32**) */
  ERR_INVALID_TIMESTAMP: number,
  /** Unsupported SASL mechanism (**33**) */
  ERR_UNSUPPORTED_SASL_MECHANISM: number,
  /** Illegal SASL state (**34**) */
  ERR_ILLEGAL_SASL_STATE: number,
  /** Unuspported version (**35**) */
  ERR_UNSUPPORTED_VERSION: number,
  /** Topic already exists (**36**) */
  ERR_TOPIC_ALREADY_EXISTS: number,
  /** Invalid number of partitions (**37**) */
  ERR_INVALID_PARTITIONS: number,
  /** Invalid replication factor (**38**) */
  ERR_INVALID_REPLICATION_FACTOR: number,
  /** Invalid replica assignment (**39**) */
  ERR_INVALID_REPLICA_ASSIGNMENT: number,
  /** Invalid config (**40**) */
  ERR_INVALID_CONFIG: number,
  /** Not controller for cluster (**41**) */
  ERR_NOT_CONTROLLER: number,
  /** Invalid request (**42**) */
  ERR_INVALID_REQUEST: number,
  /** Message format on broker does not support request (**43**) */
  ERR_UNSUPPORTED_FOR_MESSAGE_FORMAT: number,
  /** Policy violation (**44**) */
  ERR_POLICY_VIOLATION: number,
  /** Broker received an out of order sequence number (**45**) */
  ERR_OUT_OF_ORDER_SEQUENCE_NUMBER: number,
  /** Broker received a duplicate sequence number (**46**) */
  ERR_DUPLICATE_SEQUENCE_NUMBER: number,
  /** Producer attempted an operation with an old epoch (**47**) */
  ERR_INVALID_PRODUCER_EPOCH: number,
  /** Producer attempted a transactional operation in an invalid state (**48**) */
  ERR_INVALID_TXN_STATE: number,
  /** Producer attempted to use a producer id which is not
  *  currently assigned to its transactional id (**49**) */
  ERR_INVALID_PRODUCER_ID_MAPPING: number,
  /** Transaction timeout is larger than the maximum
  *  value allowed by the broker's max.transaction.timeout.ms (**50**) */
  ERR_INVALID_TRANSACTION_TIMEOUT: number,
  /** Producer attempted to update a transaction while another
  *  concurrent operation on the same transaction was ongoing (**51**) */
  ERR_CONCURRENT_TRANSACTIONS: number,
  /** Indicates that the transaction coordinator sending a
  *  WriteTxnMarker is no longer the current coordinator for a
  *  given producer (**52**) */
  ERR_TRANSACTION_COORDINATOR_FENCED: number,
  /** Transactional Id authorization failed (**53**) */
  ERR_TRANSACTIONAL_ID_AUTHORIZATION_FAILED: number,
  /** Security features are disabled (**54**) */
  ERR_SECURITY_DISABLED: number,
  /** Operation not attempted (**55**) */
  ERR_OPERATION_NOT_ATTEMPTED: number,
  /** Disk error when trying to access log file on the disk (**56**) */
  ERR_KAFKA_STORAGE_ERROR: number,
  /** The user-specified log directory is not found in the broker config (**57**) */
  ERR_LOG_DIR_NOT_FOUND: number,
  /** SASL Authentication failed (**58**) */
  ERR_SASL_AUTHENTICATION_FAILED: number,
  /** Unknown Producer Id (**59**) */
  ERR_UNKNOWN_PRODUCER_ID: number,
  /** Partition reassignment is in progress (**60**) */
  ERR_REASSIGNMENT_IN_PROGRESS: number,
  /** Delegation Token feature is not enabled (**61**) */
  ERR_DELEGATION_TOKEN_AUTH_DISABLED: number,
  /** Delegation Token is not found on server (**62**) */
  ERR_DELEGATION_TOKEN_NOT_FOUND: number,
  /** Specified Principal is not valid Owner/Renewer (**63**) */
  ERR_DELEGATION_TOKEN_OWNER_MISMATCH: number,
  /** Delegation Token requests are not allowed on this connection (**64**) */
  ERR_DELEGATION_TOKEN_REQUEST_NOT_ALLOWED: number,
  /** Delegation Token authorization failed (**65**) */
  ERR_DELEGATION_TOKEN_AUTHORIZATION_FAILED: number,
  /** Delegation Token is expired (**66**) */
  ERR_DELEGATION_TOKEN_EXPIRED: number,
  /** Supplied principalType is not supported (**67**) */
  ERR_INVALID_PRINCIPAL_TYPE: number,
  /** The group is not empty (**68**) */
  ERR_NON_EMPTY_GROUP: number,
  /** The group id does not exist (**69**) */
  ERR_GROUP_ID_NOT_FOUND: number,
  /** The fetch session ID was not found (**70**) */
  ERR_FETCH_SESSION_ID_NOT_FOUND: number,
  /** The fetch session epoch is invalid (**71**) */
  ERR_INVALID_FETCH_SESSION_EPOCH: number,
  /** No matching listener (**72**) */
  ERR_LISTENER_NOT_FOUND: number,
  /** Topic deletion is disabled (**73**) */
  ERR_TOPIC_DELETION_DISABLED: number,
  /** Leader epoch is older than broker epoch (**74**) */
  ERR_FENCED_LEADER_EPOCH: number,
  /** Leader epoch is newer than broker epoch (**75**) */
  ERR_UNKNOWN_LEADER_EPOCH: number,
  /** Unsupported compression type (**76**) */
  ERR_UNSUPPORTED_COMPRESSION_TYPE: number,
  /** Broker epoch has changed (**77**) */
  ERR_STALE_BROKER_EPOCH: number,
  /** Leader high watermark is not caught up (**78**) */
  ERR_OFFSET_NOT_AVAILABLE: number,
  /** Group member needs a valid member ID (**79**) */
  ERR_MEMBER_ID_REQUIRED: number,
  /** Preferred leader was not available (**80**) */
  ERR_PREFERRED_LEADER_NOT_AVAILABLE: number,
  /** Consumer group has reached maximum size (**81**) */
  ERR_GROUP_MAX_SIZE_REACHED: number,
  /** Static consumer fenced by other consumer with same
  * group.instance.id (**82**) */
  ERR_FENCED_INSTANCE_ID: number,
  /** Eligible partition leaders are not available (**83**) */
  ERR_ELIGIBLE_LEADERS_NOT_AVAILABLE: number,
  /** Leader election not needed for topic partition (**84**) */
  ERR_ELECTION_NOT_NEEDED: number,
  /** No partition reassignment is in progress (**85**) */
  ERR_NO_REASSIGNMENT_IN_PROGRESS: number,
  /** Deleting offsets of a topic while the consumer group is
  *  subscribed to it (**86**) */
  ERR_GROUP_SUBSCRIBED_TO_TOPIC: number,
  /** Broker failed to validate record (**87**) */
  ERR_INVALID_RECORD: number,
  /** There are unstable offsets that need to be cleared (**88**) */
  ERR_UNSTABLE_OFFSET_COMMIT: number,
  /** Throttling quota has been exceeded (**89**) */
  ERR_THROTTLING_QUOTA_EXCEEDED: number,
  /** There is a newer producer with the same transactionalId
  *  which fences the current one (**90**) */
  ERR_PRODUCER_FENCED: number,
  /** Request illegally referred to resource that does not exist (**91**) */
  ERR_RESOURCE_NOT_FOUND: number,
  /** Request illegally referred to the same resource twice (**92**) */
  ERR_DUPLICATE_RESOURCE: number,
  /** Requested credential would not meet criteria for acceptability (**93**) */
  ERR_UNACCEPTABLE_CREDENTIAL: number,
  /** Indicates that the either the sender or recipient of a
  *  voter-only request is not one of the expected voters (**94**) */
  ERR_INCONSISTENT_VOTER_SET: number,
  /** Invalid update version (**95**) */
  ERR_INVALID_UPDATE_VERSION: number,
  /** Unable to update finalized features due to server error (**96**) */
  ERR_FEATURE_UPDATE_FAILED: number,
  /** Request principal deserialization failed during forwarding (**97**) */
  ERR_PRINCIPAL_DESERIALIZATION_FAILURE: number,
}}

// for a self reference later
const errors = { CODES };

// instead of importing kafkajs we'll export Kafka as unknown
// import { Kafka } from './kafkajs';
type Kafka = unknown;

export interface LibrdKafkaError {
    message: string;
    code: number;
    errno: number;
    origin: string;
    stack?: string;
    isFatal?: boolean;
    isRetriable?: boolean;
    isTxnRequiresAbort?: boolean;
}

export interface ReadyInfo {
    name: string;
}

export interface ClientMetrics {
    connectionOpened: number;
}

export interface MetadataOptions {
    topic?: string;
    allTopics?: boolean;
    timeout?: number;
}

export interface BrokerMetadata {
    id: number;
    host: string;
    port: number;
}

export interface PartitionMetadata {
    id: number;
    leader: number;
    replicas: number[];
    isrs: number[];
}

export interface TopicMetadata {
    name: string;
    partitions: PartitionMetadata[];
}

export interface Metadata {
    orig_broker_id: number;
    orig_broker_name: string;
    topics: TopicMetadata[];
    brokers: BrokerMetadata[];
}

export interface WatermarkOffsets{
    lowOffset: number;
    highOffset: number;
}

export interface TopicPartition {
    topic: string;
    partition: number;
    error?: LibrdKafkaError;
}

export interface TopicPartitionOffset extends TopicPartition{
    offset: number;
}

export type TopicPartitionTime = TopicPartitionOffset;

export type EofEvent = TopicPartitionOffset;

export type Assignment = TopicPartition | TopicPartitionOffset;

export interface DeliveryReport extends TopicPartitionOffset {
    value?: MessageValue;
    size: number;
    key?: MessageKey;
    timestamp?: number;
    opaque?: any;
}

export type NumberNullUndefined = number | null | undefined;

export type MessageKey = Buffer | string | null | undefined;
export type MessageHeader = { [key: string]: string | Buffer };
export type MessageValue = Buffer | null;
export type SubscribeTopic = string | RegExp;
export type SubscribeTopicList = SubscribeTopic[];

export interface Message extends TopicPartitionOffset {
    value: MessageValue;
    size: number;
    topic: string;
    key?: MessageKey;
    timestamp?: number;
    headers?: MessageHeader[];
    opaque?: any;
}

export interface ReadStreamOptions extends ReadableOptions {
    topics: SubscribeTopicList | SubscribeTopic | ((metadata: Metadata) => SubscribeTopicList);
    waitInterval?: number;
    fetchSize?: number;
    objectMode?: boolean;
    highWaterMark?: number;
    autoClose?: boolean;
    streamAsBatch?: boolean;
    connectOptions?: any;
}

export interface WriteStreamOptions extends WritableOptions {
    encoding?: string;
    objectMode?: boolean;
    topic?: string;
    autoClose?: boolean;
    pollInterval?: number;
    connectOptions?: any;
}

export interface ProducerStream extends Writable {
    producer: Producer;
    connect(metadataOptions?: MetadataOptions): void;
    close(cb?: () => void): void;
}

export interface ConsumerStream extends Readable {
    consumer: KafkaConsumer;
    connect(options: ConsumerGlobalConfig): void;
    close(cb?: () => void): void;
}

type KafkaClientEvents = 'disconnected' | 'ready' | 'connection.failure' | 'event.error' | 'event.stats' | 'event.log' | 'event.event' | 'event.throttle';
type KafkaConsumerEvents = 'data' | 'partition.eof' | 'rebalance' | 'rebalance.error' | 'subscribed' | 'unsubscribed' | 'unsubscribe' | 'offset.commit' | KafkaClientEvents;
type KafkaProducerEvents = 'delivery-report' | KafkaClientEvents;

type EventListenerMap = {
    // ### Client
    // connectivity events
    'disconnected': (metrics: ClientMetrics) => void,
    'ready': (info: ReadyInfo, metadata: Metadata) => void,
    'connection.failure': (error: LibrdKafkaError, metrics: ClientMetrics) => void,
    // event messages
    'event.error': (error: LibrdKafkaError) => void,
    'event.stats': (eventData: any) => void,
    'event.log': (eventData: any) => void,
    'event.event': (eventData: any) => void,
    'event.throttle': (eventData: any) => void,
    // ### Consumer only
    // domain events
    'data': (arg: Message) => void,
    'partition.eof': (arg: EofEvent) => void,
    'rebalance': (err: LibrdKafkaError, assignments: TopicPartition[]) => void,
    'rebalance.error': (err: Error) => void,
    // connectivity events
    'subscribed': (topics: SubscribeTopicList) => void,
    'unsubscribe': () => void,
    'unsubscribed': () => void,
    // offsets
    'offset.commit': (error: LibrdKafkaError, topicPartitions: TopicPartitionOffset[]) => void,
    // ### Producer only
    // delivery
    'delivery-report': (error: LibrdKafkaError, report: DeliveryReport) => void,
}

type EventListener<K extends string> = K extends keyof EventListenerMap ? EventListenerMap[K] : never;

export declare abstract class Client<Events extends string> extends EventEmitter {
    constructor(globalConf: GlobalConfig, SubClientType: any, topicConf: TopicConfig);

    connect(metadataOptions?: MetadataOptions, cb?: (err: LibrdKafkaError, data: Metadata) => any): this;

    getClient(): any;

    connectedTime(): number;

    getLastError(): LibrdKafkaError;

    disconnect(cb?: (err: any, data: ClientMetrics) => any): this;
    disconnect(timeout: number, cb?: (err: any, data: ClientMetrics) => any): this;

    isConnected(): boolean;

    getMetadata(metadataOptions?: MetadataOptions, cb?: (err: LibrdKafkaError, data: Metadata) => any): any;

    queryWatermarkOffsets(topic: string, partition: number, timeout: number, cb?: (err: LibrdKafkaError, offsets: WatermarkOffsets) => any): any;
    queryWatermarkOffsets(topic: string, partition: number, cb?: (err: LibrdKafkaError, offsets: WatermarkOffsets) => any): any;

    setSaslCredentials(username: string, password: string): void;

    on<E extends Events>(event: E, listener: EventListener<E>): this;
    once<E extends Events>(event: E, listener: EventListener<E>): this;
}

export declare class KafkaConsumer extends Client<KafkaConsumerEvents> {
    constructor(conf: ConsumerGlobalConfig | ConsumerTopicConfig, topicConf?: ConsumerTopicConfig);

    assign(assignments: Assignment[]): this;

    assignments(): Assignment[];

    commit(topicPartition: TopicPartitionOffset | TopicPartitionOffset[]): this;
    commit(): this;

    commitMessage(msg: TopicPartitionOffset): this;

    commitMessageSync(msg: TopicPartitionOffset): this;

    commitSync(topicPartition: TopicPartitionOffset | TopicPartitionOffset[]): this;

    committed(toppars: TopicPartition[], timeout: number, cb: (err: LibrdKafkaError, topicPartitions: TopicPartitionOffset[]) => void): this;
    committed(timeout: number, cb: (err: LibrdKafkaError, topicPartitions: TopicPartitionOffset[]) => void): this;

    consume(number: number, cb?: (err: LibrdKafkaError, messages: Message[]) => void): void;
    consume(cb: (err: LibrdKafkaError, messages: Message[]) => void): void;
    consume(): void;

    getWatermarkOffsets(topic: string, partition: number): WatermarkOffsets;

    offsetsStore(topicPartitions: TopicPartitionOffset[]): any;

    pause(topicPartitions: TopicPartition[]): any;

    position(toppars?: TopicPartition[]): TopicPartitionOffset[];

    resume(topicPartitions: TopicPartition[]): any;

    seek(toppar: TopicPartitionOffset, timeout: number | null, cb: (err: LibrdKafkaError) => void): this;

    setDefaultConsumeTimeout(timeoutMs: number): void;

    setDefaultConsumeLoopTimeoutDelay(timeoutMs: number): void;

    subscribe(topics: SubscribeTopicList): this;

    subscription(): string[];

    unassign(): this;

    unsubscribe(): this;

    offsetsForTimes(topicPartitions: TopicPartitionTime[], timeout: number, cb?: (err: LibrdKafkaError, offsets: TopicPartitionOffset[]) => any): void;
    offsetsForTimes(topicPartitions: TopicPartitionTime[], cb?: (err: LibrdKafkaError, offsets: TopicPartitionOffset[]) => any): void;

    static createReadStream(conf: ConsumerGlobalConfig, topicConfig: ConsumerTopicConfig, streamOptions: ReadStreamOptions | number): ConsumerStream;
}

export declare class Producer extends Client<KafkaProducerEvents> {
    constructor(conf: ProducerGlobalConfig | ProducerTopicConfig, topicConf?: ProducerTopicConfig);

    flush(timeout?: NumberNullUndefined, cb?: (err: LibrdKafkaError) => void): this;

    poll(): this;

    produce(topic: string, partition: NumberNullUndefined, message: MessageValue, key?: MessageKey, timestamp?: NumberNullUndefined, opaque?: any, headers?: MessageHeader[]): any;

    setPollInterval(interval: number): this;

    static createWriteStream(conf: ProducerGlobalConfig, topicConf: ProducerTopicConfig, streamOptions: WriteStreamOptions): ProducerStream;

    initTransactions(cb: (err: LibrdKafkaError) => void): void;
    initTransactions(timeout: number, cb: (err: LibrdKafkaError) => void): void;
    beginTransaction(cb: (err: LibrdKafkaError) => void): void;
    commitTransaction(cb: (err: LibrdKafkaError) => void): void;
    commitTransaction(timeout: number, cb: (err: LibrdKafkaError) => void): void;
    abortTransaction(cb: (err: LibrdKafkaError) => void): void;
    abortTransaction(timeout: number, cb: (err: LibrdKafkaError) => void): void;
    sendOffsetsToTransaction(offsets: TopicPartitionOffset[], consumer: KafkaConsumer, cb: (err: LibrdKafkaError) => void): void;
    sendOffsetsToTransaction(offsets: TopicPartitionOffset[], consumer: KafkaConsumer, timeout: number, cb: (err: LibrdKafkaError) => void): void;
}

export declare class HighLevelProducer extends Producer {
  produce(topic: string, partition: NumberNullUndefined, message: any, key: any, timestamp: NumberNullUndefined, callback: (err: any, offset?: NumberNullUndefined) => void): any;
  produce(topic: string, partition: NumberNullUndefined, message: any, key: any, timestamp: NumberNullUndefined, headers: MessageHeader[], callback: (err: any, offset?: NumberNullUndefined) => void): any;

  setKeySerializer(serializer: (key: any, cb: (err: any, key: MessageKey) => void) => void): void;
  setKeySerializer(serializer: (key: any) => MessageKey | Promise<MessageKey>): void;
  setValueSerializer(serializer: (value: any, cb: (err: any, value: MessageValue) => void) => void): void;
  setValueSerializer(serializer: (value: any) => MessageValue | Promise<MessageValue>): void;
}

export declare const features: string[];

export declare const librdkafkaVersion: string;

export declare function createReadStream(conf: ConsumerGlobalConfig, topicConf: ConsumerTopicConfig, streamOptions: ReadStreamOptions | number): ConsumerStream;

export declare function createWriteStream(conf: ProducerGlobalConfig, topicConf: ProducerTopicConfig, streamOptions: WriteStreamOptions): ProducerStream;

export interface NewTopic {
    topic: string;
    num_partitions: number;
    replication_factor: number;
    config?: {
        'cleanup.policy'?: 'delete' | 'compact' | 'delete,compact' | 'compact,delete';
        'compression.type'?: 'gzip' | 'snappy' | 'lz4' | 'zstd' | 'uncompressed' | 'producer';
        'delete.retention.ms'?: string;
        'file.delete.delay.ms'?: string;
        'flush.messages'?: string;
        'flush.ms'?: string;
        'follower.replication.throttled.replicas'?: string;
        'index.interval.bytes'?: string;
        'leader.replication.throttled.replicas'?: string;
        'max.compaction.lag.ms'?: string;
        'max.message.bytes'?: string;
        'message.format.version'?: string;
        'message.timestamp.difference.max.ms'?: string;
        'message.timestamp.type'?: string;
        'min.cleanable.dirty.ratio'?: string;
        'min.compaction.lag.ms'?: string;
        'min.insync.replicas'?: string;
        'preallocate'?: string;
        'retention.bytes'?: string;
        'retention.ms'?: string;
        'segment.bytes'?: string;
        'segment.index.bytes'?: string;
        'segment.jitter.ms'?: string;
        'segment.ms'?: string;
        'unclean.leader.election.enable'?: string;
        'message.downconversion.enable'?: string;
    } | { [cfg: string]: string; };
}

export enum ConsumerGroupStates {
    UNKNOWN = 0,
    PREPARING_REBALANCE = 1,
    COMPLETING_REBALANCE = 2,
    STABLE = 3,
    DEAD = 4,
    EMPTY = 5,
}

export interface GroupOverview {
    groupId: string;
    protocolType: string;
    isSimpleConsumerGroup: boolean;
    state: ConsumerGroupStates;
}

export enum AclOperationTypes {
    UNKNOWN = 0,
    ANY = 1,
    ALL = 2,
    READ = 3,
    WRITE = 4,
    CREATE = 5,
    DELETE = 6,
    ALTER = 7,
    DESCRIBE = 8,
    CLUSTER_ACTION = 9,
    DESCRIBE_CONFIGS = 10,
    ALTER_CONFIGS = 11,
    IDEMPOTENT_WRITE = 12,
}

export type MemberDescription = {
    clientHost: string
    clientId: string
    memberId: string
    memberAssignment: Buffer
    memberMetadata: Buffer
    groupInstanceId?: string,
    assignment: TopicPartition[]
}

export type Node = {
    id: number
    host: string
    port: number
    rack?: string
}

export type GroupDescription = {
    groupId: string
    error?: LibrdKafkaError
    members: MemberDescription[]
    protocol: string
    isSimpleConsumerGroup: boolean;
    protocolType: string
    partitionAssignor: string
    state: ConsumerGroupStates
    coordinator: Node
    authorizedOperations?: AclOperationTypes[]
}

export type GroupDescriptions = {
    groups: GroupDescription[],
}

export type DeleteGroupsResult = {
    groupId: string
    errorCode?: number
    error?: LibrdKafkaError
}

export interface IAdminClient {
    createTopic(topic: NewTopic, cb?: (err: LibrdKafkaError) => void): void;
    createTopic(topic: NewTopic, timeout?: number, cb?: (err: LibrdKafkaError) => void): void;

    deleteTopic(topic: string, cb?: (err: LibrdKafkaError) => void): void;
    deleteTopic(topic: string, timeout?: number, cb?: (err: LibrdKafkaError) => void): void;

    createPartitions(topic: string, desiredPartitions: number, cb?: (err: LibrdKafkaError) => void): void;
    createPartitions(topic: string, desiredPartitions: number, timeout?: number, cb?: (err: LibrdKafkaError) => void): void;

    listTopics(cb?: (err: LibrdKafkaError, topics: string[]) => any): void;
    listTopics(options?: { timeout?: number }, cb?: (err: LibrdKafkaError, topics: string[]) => any): void;

    listGroups(cb?: (err: LibrdKafkaError, result: { groups: GroupOverview[], errors: LibrdKafkaError[] }) => any): void;
    listGroups(options?: { timeout?: number, matchConsumerGroupStates?: ConsumerGroupStates[] },
        cb?: (err: LibrdKafkaError, result: { groups: GroupOverview[], errors: LibrdKafkaError[] }) => any): void;

    describeGroups(groupIds: string[], cb?: (err: LibrdKafkaError, result: GroupDescriptions) => any): void;
    describeGroups(groupIds: string[],
        options?: { timeout?: number, includeAuthorizedOperations?: boolean },
        cb?: (err: LibrdKafkaError, result: GroupDescriptions) => any): void;

    deleteGroups(groupIds: string[], cb?: (err: LibrdKafkaError, result: DeleteGroupsResult[]) => any): void;
    deleteGroups(groupIds: string[],
        options?: { timeout?: number },
        cb?: (err: LibrdKafkaError, result: DeleteGroupsResult[]) => any): void;

    disconnect(): void;
}

export type EventHandlers = {
    [event_key: string]: (...args: any[]) => void;
};

export declare abstract class AdminClient {
    static create(conf: GlobalConfig, eventHandlers?: EventHandlers): IAdminClient;
}

export type RdKafka = {
  Consumer: KafkaConsumer,
  Producer: Producer,
  HighLevelProducer: HighLevelProducer,
  AdminClient: AdminClient,
  KafkaConsumer: KafkaConsumer,
  createReadStream: typeof KafkaConsumer.createReadStream,
  createWriteStream: typeof Producer.createWriteStream,
  CODES: typeof errors.CODES,
  Topic: (name: string) => string,
  features: typeof features,
  librdkafkaVersion: typeof librdkafkaVersion,
}
