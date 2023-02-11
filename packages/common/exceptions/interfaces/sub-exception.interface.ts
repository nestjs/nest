import { TBody } from '../http.exception';

export interface IExceptionBody<T extends TBody = TBody> {
  error?: string;
  message: T | string;
  statusCode: number;
}
