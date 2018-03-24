export interface ExceptionFilter<T = any, R = any> {
  catch(exception: T, response: R);
}
