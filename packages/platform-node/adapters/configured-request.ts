import proxyAddr from '@fastify/proxy-addr';
import type {
  NodeAdapterOptions,
  NodeTrustProxy,
} from '../interfaces/node-adapter-options.interface.js';
import { NodeRequest } from './node-request.js';
import { getHostname } from './utils/hostname.util.js';

type TrustFunction = (address: string, hop: number) => boolean;

/**
 * Compiles the `trustProxy` option the way Express compiles its "trust proxy"
 * setting, and Fastify its `trustProxy` option, but for a hop count, which
 * Fastify no longer trusts and Express does.
 */
function compileTrust(
  trustProxy: Exclude<NodeTrustProxy, false>,
): TrustFunction {
  if (typeof trustProxy === 'function') {
    return trustProxy;
  }
  if (trustProxy === true) {
    return () => true;
  }
  if (typeof trustProxy === 'number') {
    return (_address, hop) => hop < trustProxy;
  }
  return proxyAddr.compile(
    typeof trustProxy === 'string'
      ? trustProxy.split(',').map(entry => entry.trim())
      : trustProxy,
  );
}

// Proxies may join several values with ","; Express reads the first one
function firstValue(header: string): string {
  const index = header.indexOf(',');
  return (index === -1 ? header : header.slice(0, index)).trim();
}

/**
 * The class of the requests of an adapter whose options change how requests
 * read the query string or the headers of proxies: a subclass of
 * `NodeRequest` overriding those getters. Without such options, it is
 * `NodeRequest` itself, so that requests run the same code as without this
 * function.
 *
 * @internal
 */
export function createRequestClass(
  options: Pick<NodeAdapterOptions, 'trustProxy' | 'querystringParser'>,
): typeof NodeRequest {
  const { trustProxy, querystringParser } = options;
  let RequestClass = NodeRequest;

  if (querystringParser !== undefined) {
    if (typeof querystringParser !== 'function') {
      throw new TypeError(
        `Invalid querystringParser: ${String(querystringParser)} (expected a function)`,
      );
    }
    const QUERY = Symbol('query');
    RequestClass = class extends RequestClass {
      declare [QUERY]: Record<string, any> | undefined;

      get query(): Record<string, any> {
        let query = this[QUERY];
        if (query === undefined) {
          const url = this.url!;
          const index = url.indexOf('?');
          // As Fastify calls it: with "" for a URL without a query string
          query = this[QUERY] = querystringParser(
            index === -1 ? '' : url.slice(index + 1),
          );
        }
        return query;
      }

      set query(value: Record<string, any>) {
        this[QUERY] = value;
      }
    };
  }

  if (trustProxy !== undefined && trustProxy !== false) {
    const trust = compileTrust(trustProxy);
    // Whether the socket's peer is a proxy whose headers count
    const isFromTrustedProxy = (req: NodeRequest) =>
      trust(req.socket?.remoteAddress as string, 0);
    const app = Object.freeze({
      get(setting: string): unknown {
        if (setting === 'trust proxy') {
          return trustProxy;
        }
        return setting === 'trust proxy fn' ? trust : undefined;
      },
    });
    RequestClass = class extends RequestClass {
      get ip(): string | undefined {
        return proxyAddr(this, trust);
      }

      get ips(): string[] {
        // From the client to the closest proxy, without the socket's peer
        const addresses = proxyAddr.all(this, trust);
        addresses.reverse().pop();
        return addresses;
      }

      get protocol(): string {
        // Node joins repeated headers it does not know with ", "
        const header = this.headers['x-forwarded-proto'] as string | undefined;
        return header && isFromTrustedProxy(this)
          ? firstValue(header)
          : super.protocol;
      }

      get hostname(): string | undefined {
        const header = this.headers['x-forwarded-host'] as string | undefined;
        return getHostname(
          header && isFromTrustedProxy(this)
            ? firstValue(header)
            : this.headers.host,
        );
      }

      get app(): { get(setting: string): unknown } {
        return app;
      }
    };
  }

  return RequestClass;
}
