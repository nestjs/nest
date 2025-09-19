export type HttpExceptionBodyMessage = string | string[] | number;

export interface HttpExceptionBody {
  statusCode: number;
  message: HttpExceptionBodyMessage;
  error?: string;
  errorCode?: string;
}
