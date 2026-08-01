/**
 * Interface describing the microservice middleware context.
 *
 * @publicApi
 */
export interface MicroserviceMiddlewareContext {
  /**
   * Identifier of the transport that received the request.
   */
  transportId: unknown;

  /**
   * Underlying context of the request. For the gRPC transport this is a
   * gRPC call-like object (currently augmented with an `operationId` field),
   * for other transports it is typically a `BaseRpcContext` instance.
   */
  context: unknown;
}

/**
 * Microservice middleware function. It wraps the request processing pipeline
 * before guards and interceptors are executed. Middleware registered on a
 * microservice runs for every message and event handler.
 *
 * @publicApi
 */
export type MicroserviceMiddleware = (
  ctx: MicroserviceMiddlewareContext,
  next: () => Promise<any>,
) => any;
