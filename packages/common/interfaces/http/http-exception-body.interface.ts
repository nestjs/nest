export type HttpExceptionBodyMessage = string | string[] | number;

export interface HttpExceptionBody {
  message: HttpExceptionBodyMessage;
  error?: string;
  statusCode: number;
}
