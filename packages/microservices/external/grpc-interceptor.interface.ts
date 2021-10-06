/**
 * An interface that shows how an interceptor should look like for GRPC.
 * This listing is incomplete. Full reference: https://github.com/grpc/grpc-node/blob/master/packages/grpc-js/src/client-interceptors.ts
 */
export interface Interceptor {
  (options: any, nextCall: (options: any) => any): any;
}
