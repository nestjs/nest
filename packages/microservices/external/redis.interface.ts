/* eslint-disable @typescript-eslint/adjacent-overload-signatures */
/* eslint-disable @typescript-eslint/camelcase */

export interface RetryStrategyOptions {
  error: Error;
  total_retry_time: number;
  times_connected: number;
  attempt: number;
}

export interface ClientOpts {
  auth_pass?: string;
  command_queue_high_water?: number;
  command_queue_low_water?: number;
  connect_timeout?: number;
  db?: string;
  detect_buffers?: boolean;
  disable_resubscribing?: boolean;
  enable_offline_queue?: boolean;
  family?: string;
  host?: string;
  max_attempts?: number;
  no_ready_check?: boolean;
  parser?: string;
  password?: string;
  path?: string;
  port?: number;
  prefix?: string;
  rename_commands?: any;
  retry_max_delay?: number;
  retry_strategy?: any;
  retry_unfulfilled_commands?: boolean;
  return_buffers?: boolean;
  socket_keepalive?: boolean;
  socket_nodelay?: boolean;
  string_numbers?: boolean;
  tls?: any;
  url?: string;
}

export interface RedisClient {
  // event: connect
  // event: error
  // event: message
  // event: pmessage
  // event: subscribe
  // event: psubscribe
  // event: unsubscribe
  // event: punsubscribe

  connected: boolean;
  retry_delay: number;
  retry_backoff: number;
  command_queue: any[];
  offline_queue: any[];
  server_info: any;

  /**
   * Forcibly close the connection to the Redis server. Note that this does not wait until all replies have been parsed. If you want to exit cleanly, call client.quit()
   *
   * @param {boolean} flush You should set flush to true, if you are not absolutely sure you do not care about any other commands. If you set flush to false all still running commands will silently fail.
   */
  end(flush: boolean): void;
  unref(): void;

  /**
   * Stop sending commands and queue the commands.
   */
  cork(): void;

  /**
   * Resume and send the queued commands at once.
   */
  uncork(): void;

  // Low level command execution
  send_command(command: string, ...args: any[]): boolean;

  // Connection (http://redis.io/commands#connection)
  auth(password: string, callback?: any): boolean;
  ping(callback?: any): boolean;

  // Strings (http://redis.io/commands#strings)
  append(key: string, value: string, callback?: any): boolean;
  bitcount(key: string, callback?: any): boolean;
  bitcount(key: string, start: number, end: number, callback?: any): boolean;
  set(key: string, value: string, callback?: any): boolean;
  get(key: string, callback?: any): boolean;
  exists(key: string, value: string, callback?: any): boolean;

  publish(channel: string, value: any): boolean;
  subscribe(channel: string): boolean;
  on(event: string, callback: Function): any;
  off(event: string, callback: Function): any;
  addListener(event: string, callback: Function): any;

  /*
   commands = set_union([
   "get", "set", "setnx", "setex", "append", "strlen", "del", "exists", "setbit", "getbit", "setrange", "getrange", "substr",
   "incr", "decr", "mget", "rpush", "lpush", "rpushx", "lpushx", "linsert", "rpop", "lpop", "brpop", "brpoplpush", "blpop", "llen", "lindex",
   "lset", "lrange", "ltrim", "lrem", "rpoplpush", "sadd", "srem", "smove", "sismember", "scard", "spop", "srandmember", "sinter", "sinterstore",
   "sunion", "sunionstore", "sdiff", "sdiffstore", "smembers", "zadd", "zincrby", "zrem", "zremrangebyscore", "zremrangebyrank", "zunionstore",
   "zinterstore", "zrange", "zrangebyscore", "zrevrangebyscore", "zcount", "zrevrange", "zcard", "zscore", "zrank", "zrevrank", "hset", "hsetnx",
   "hget", "hmset", "hmget", "hincrby", "hincrbyfloat", "hdel", "hlen", "hkeys", "hvals", "hgetall", "hexists", "incrby", "decrby", "getset", "mset", "msetnx",
   "randomkey", "select", "move", "rename", "renamenx", "expire", "expireat", "keys", "dbsize", "auth", "ping", "echo", "save", "bgsave",
   "bgrewriteaof", "shutdown", "lastsave", "type", "any", "exec", "discard", "sync", "flushdb", "flushall", "sort", "info", "monitor", "ttl",
   "persist", "slaveof", "debug", "config", "subscribe", "unsubscribe", "psubscribe", "punsubscribe", "publish", "watch", "unwatch", "cluster",
   "restore", "migrate", "dump", "object", "client", "eval", "evalsha"], require("./lib/commands"));
   */

  get(args: any[], callback?: any): boolean;
  get(...args: any[]): boolean;
  set(args: any[], callback?: any): boolean;
  set(...args: any[]): boolean;
  setnx(args: any[], callback?: any): boolean;
  setnx(...args: any[]): boolean;
  setex(args: any[], callback?: any): boolean;
  setex(...args: any[]): boolean;
  append(args: any[], callback?: any): boolean;
  append(...args: any[]): boolean;
  strlen(args: any[], callback?: any): boolean;
  strlen(...args: any[]): boolean;
  del(args: any[], callback?: any): boolean;
  del(...args: any[]): boolean;
  exists(args: any[], callback?: any): boolean;
  exists(...args: any[]): boolean;
  setbit(args: any[], callback?: any): boolean;
  setbit(...args: any[]): boolean;
  getbit(args: any[], callback?: any): boolean;
  getbit(...args: any[]): boolean;
  setrange(args: any[], callback?: any): boolean;
  setrange(...args: any[]): boolean;
  getrange(args: any[], callback?: any): boolean;
  getrange(...args: any[]): boolean;
  substr(args: any[], callback?: any): boolean;
  substr(...args: any[]): boolean;
  incr(args: any[], callback?: any): boolean;
  incr(...args: any[]): boolean;
  decr(args: any[], callback?: any): boolean;
  decr(...args: any[]): boolean;
  mget(args: any[], callback?: any): boolean;
  mget(...args: any[]): boolean;
  rpush(...args: any[]): boolean;
  lpush(args: any[], callback?: any): boolean;
  lpush(...args: any[]): boolean;
  rpushx(args: any[], callback?: any): boolean;
  rpushx(...args: any[]): boolean;
  lpushx(args: any[], callback?: any): boolean;
  lpushx(...args: any[]): boolean;
  linsert(args: any[], callback?: any): boolean;
  linsert(...args: any[]): boolean;
  rpop(args: any[], callback?: any): boolean;
  rpop(...args: any[]): boolean;
  lpop(args: any[], callback?: any): boolean;
  lpop(...args: any[]): boolean;
  brpop(args: any[], callback?: any): boolean;
  brpop(...args: any[]): boolean;
  brpoplpush(args: any[], callback?: any): boolean;
  brpoplpush(...args: any[]): boolean;
  blpop(args: any[], callback?: any): boolean;
  blpop(...args: any[]): boolean;
  llen(args: any[], callback?: any): boolean;
  llen(...args: any[]): boolean;
  lindex(args: any[], callback?: any): boolean;
  lindex(...args: any[]): boolean;
  lset(args: any[], callback?: any): boolean;
  lset(...args: any[]): boolean;
  lrange(args: any[], callback?: any): boolean;
  lrange(...args: any[]): boolean;
  ltrim(args: any[], callback?: any): boolean;
  ltrim(...args: any[]): boolean;
  lrem(args: any[], callback?: any): boolean;
  lrem(...args: any[]): boolean;
  rpoplpush(args: any[], callback?: any): boolean;
  rpoplpush(...args: any[]): boolean;
  sadd(args: any[], callback?: any): boolean;
  sadd(...args: any[]): boolean;
  srem(args: any[], callback?: any): boolean;
  srem(...args: any[]): boolean;
  smove(args: any[], callback?: any): boolean;
  smove(...args: any[]): boolean;
  sismember(args: any[], callback?: any): boolean;
  sismember(...args: any[]): boolean;
  scard(args: any[], callback?: any): boolean;
  scard(...args: any[]): boolean;
  spop(args: any[], callback?: any): boolean;
  spop(...args: any[]): boolean;
  srandmember(args: any[], callback?: any): boolean;
  srandmember(...args: any[]): boolean;
  sinter(args: any[], callback?: any): boolean;
  sinter(...args: any[]): boolean;
  sinterstore(args: any[], callback?: any): boolean;
  sinterstore(...args: any[]): boolean;
  sunion(args: any[], callback?: any): boolean;
  sunion(...args: any[]): boolean;
  sunionstore(args: any[], callback?: any): boolean;
  sunionstore(...args: any[]): boolean;
  sdiff(args: any[], callback?: any): boolean;
  sdiff(...args: any[]): boolean;
  sdiffstore(args: any[], callback?: any): boolean;
  sdiffstore(...args: any[]): boolean;
  smembers(args: any[], callback?: any): boolean;
  smembers(...args: any[]): boolean;
  zadd(args: any[], callback?: any): boolean;
  zadd(...args: any[]): boolean;
  zincrby(args: any[], callback?: any): boolean;
  zincrby(...args: any[]): boolean;
  zrem(args: any[], callback?: any): boolean;
  zrem(...args: any[]): boolean;
  zremrangebyscore(args: any[], callback?: any): boolean;
  zremrangebyscore(...args: any[]): boolean;
  zremrangebyrank(args: any[], callback?: any): boolean;
  zremrangebyrank(...args: any[]): boolean;
  zunionstore(args: any[], callback?: any): boolean;
  zunionstore(...args: any[]): boolean;
  zinterstore(args: any[], callback?: any): boolean;
  zinterstore(...args: any[]): boolean;
  zrange(args: any[], callback?: any): boolean;
  zrange(...args: any[]): boolean;
  zrangebyscore(args: any[], callback?: any): boolean;
  zrangebyscore(...args: any[]): boolean;
  zrevrangebyscore(args: any[], callback?: any): boolean;
  zrevrangebyscore(...args: any[]): boolean;
  zcount(args: any[], callback?: any): boolean;
  zcount(...args: any[]): boolean;
  zrevrange(args: any[], callback?: any): boolean;
  zrevrange(...args: any[]): boolean;
  zcard(args: any[], callback?: any): boolean;
  zcard(...args: any[]): boolean;
  zscore(args: any[], callback?: any): boolean;
  zscore(...args: any[]): boolean;
  zrank(args: any[], callback?: any): boolean;
  zrank(...args: any[]): boolean;
  zrevrank(args: any[], callback?: any): boolean;
  zrevrank(...args: any[]): boolean;
  hset(args: any[], callback?: any): boolean;
  hset(...args: any[]): boolean;
  hsetnx(args: any[], callback?: any): boolean;
  hsetnx(...args: any[]): boolean;
  hget(args: any[], callback?: any): boolean;
  hget(...args: any[]): boolean;
  hmset(args: any[], callback?: any): boolean;
  hmset(key: string, hash: any, callback?: any): boolean;
  hmset(...args: any[]): boolean;
  hmget(args: any[], callback?: any): boolean;
  hmget(...args: any[]): boolean;
  hincrby(args: any[], callback?: any): boolean;
  hincrby(...args: any[]): boolean;
  hincrbyfloat(args: any[], callback?: any): boolean;
  hincrbyfloat(...args: any[]): boolean;
  hdel(args: any[], callback?: any): boolean;
  hdel(...args: any[]): boolean;
  hlen(args: any[], callback?: any): boolean;
  hlen(...args: any[]): boolean;
  hkeys(args: any[], callback?: any): boolean;
  hkeys(...args: any[]): boolean;
  hvals(args: any[], callback?: any): boolean;
  hvals(...args: any[]): boolean;
  hgetall(args: any[], callback?: any): boolean;
  hgetall(...args: any[]): boolean;
  hgetall(key: string, callback?: any): boolean;
  hexists(args: any[], callback?: any): boolean;
  hexists(...args: any[]): boolean;
  incrby(args: any[], callback?: any): boolean;
  incrby(...args: any[]): boolean;
  decrby(args: any[], callback?: any): boolean;
  decrby(...args: any[]): boolean;
  getset(args: any[], callback?: any): boolean;
  getset(...args: any[]): boolean;
  mset(args: any[], callback?: any): boolean;
  mset(...args: any[]): boolean;
  msetnx(args: any[], callback?: any): boolean;
  msetnx(...args: any[]): boolean;
  randomkey(args: any[], callback?: any): boolean;
  randomkey(...args: any[]): boolean;
  select(args: any[], callback?: any): void;
  select(...args: any[]): void;
  move(args: any[], callback?: any): boolean;
  move(...args: any[]): boolean;
  rename(args: any[], callback?: any): boolean;
  rename(...args: any[]): boolean;
  renamenx(args: any[], callback?: any): boolean;
  renamenx(...args: any[]): boolean;
  expire(args: any[], callback?: any): boolean;
  expire(...args: any[]): boolean;
  expireat(args: any[], callback?: any): boolean;
  expireat(...args: any[]): boolean;
  keys(args: any[], callback?: any): boolean;
  keys(...args: any[]): boolean;
  dbsize(args: any[], callback?: any): boolean;
  dbsize(...args: any[]): boolean;
  auth(args: any[], callback?: any): void;
  auth(...args: any[]): void;
  ping(args: any[], callback?: any): boolean;
  ping(...args: any[]): boolean;
  echo(args: any[], callback?: any): boolean;
  echo(...args: any[]): boolean;
  save(args: any[], callback?: any): boolean;
  save(...args: any[]): boolean;
  bgsave(args: any[], callback?: any): boolean;
  bgsave(...args: any[]): boolean;
  bgrewriteaof(args: any[], callback?: any): boolean;
  bgrewriteaof(...args: any[]): boolean;
  shutdown(args: any[], callback?: any): boolean;
  shutdown(...args: any[]): boolean;
  lastsave(args: any[], callback?: any): boolean;
  lastsave(...args: any[]): boolean;
  type(args: any[], callback?: any): boolean;
  type(...args: any[]): boolean;
  any(args: any[], callback?: any): any;
  any(...args: any[]): any;
  exec(args: any[], callback?: any): boolean;
  exec(...args: any[]): boolean;
  discard(args: any[], callback?: any): boolean;
  discard(...args: any[]): boolean;
  sync(args: any[], callback?: any): boolean;
  sync(...args: any[]): boolean;
  flushdb(args: any[], callback?: any): boolean;
  flushdb(...args: any[]): boolean;
  flushall(args: any[], callback?: any): boolean;
  flushall(...args: any[]): boolean;
  sort(args: any[], callback?: any): boolean;
  sort(...args: any[]): boolean;
  info(args: any[], callback?: any): boolean;
  info(...args: any[]): boolean;
  monitor(args: any[], callback?: any): boolean;
  monitor(...args: any[]): boolean;
  ttl(args: any[], callback?: any): boolean;
  ttl(...args: any[]): boolean;
  persist(args: any[], callback?: any): boolean;
  persist(...args: any[]): boolean;
  slaveof(args: any[], callback?: any): boolean;
  slaveof(...args: any[]): boolean;
  debug(args: any[], callback?: any): boolean;
  debug(...args: any[]): boolean;
  config(args: any[], callback?: any): boolean;
  config(...args: any[]): boolean;
  subscribe(args: any[], callback?: any): boolean;
  subscribe(...args: any[]): boolean;
  unsubscribe(args: any[], callback?: any): boolean;
  unsubscribe(...args: any[]): boolean;
  psubscribe(args: any[], callback?: any): boolean;
  psubscribe(...args: any[]): boolean;
  punsubscribe(args: any[], callback?: any): boolean;
  punsubscribe(...args: any[]): boolean;
  publish(args: any[], callback?: any): boolean;
  publish(...args: any[]): boolean;
  watch(args: any[], callback?: any): boolean;
  watch(...args: any[]): boolean;
  unwatch(args: any[], callback?: any): boolean;
  unwatch(...args: any[]): boolean;
  cluster(args: any[], callback?: any): boolean;
  cluster(...args: any[]): boolean;
  restore(args: any[], callback?: any): boolean;
  restore(...args: any[]): boolean;
  migrate(args: any[], callback?: any): boolean;
  migrate(...args: any[]): boolean;
  dump(args: any[], callback?: any): boolean;
  dump(...args: any[]): boolean;
  object(args: any[], callback?: any): boolean;
  object(...args: any[]): boolean;
  client(args: any[], callback?: any): boolean;
  client(...args: any[]): boolean;
  eval(args: any[], callback?: any): boolean;
  eval(...args: any[]): boolean;
  evalsha(args: any[], callback?: any): boolean;
  evalsha(...args: any[]): boolean;
  script(args: any[], callback?: any): boolean;
  script(...args: any[]): boolean;
  script(key: string, callback?: any): boolean;
  quit(args: any[], callback?: any): boolean;
  quit(...args: any[]): boolean;
  sscan(...args: any[]): boolean;
  sscan(args: any[], callback?: any): boolean;
  scan(...args: any[]): boolean;
  scan(args: any[], callback?: any): boolean;
  hscan(...args: any[]): boolean;
  hscan(args: any[], callback?: any): boolean;
  zscan(...args: any[]): boolean;
  zscan(args: any[], callback?: any): boolean;

  // Extras
  duplicate(options?: any[], callback?: any): RedisClient;
}
