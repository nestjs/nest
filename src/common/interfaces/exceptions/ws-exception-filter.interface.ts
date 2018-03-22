export interface WsExceptionFilter<T = any, R = any> {
  catch(exception: T, client: R);
}
