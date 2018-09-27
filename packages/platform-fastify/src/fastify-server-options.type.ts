import {
  ServerOptions,
  ServerOptionsAsHttp,
  ServerOptionsAsHttp2,
  ServerOptionsAsSecure,
  ServerOptionsAsSecureHttp,
  ServerOptionsAsSecureHttp2,
} from 'fastify';

export type FastifyServerOptions =
  | ServerOptions
  | ServerOptionsAsSecure
  | ServerOptionsAsHttp
  | ServerOptionsAsSecureHttp
  | ServerOptionsAsHttp2
  | ServerOptionsAsSecureHttp2;
