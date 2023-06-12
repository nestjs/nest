export type HttpExceptionBodyMessage = string | string[];

export interface HttpExceptionBody {
  message: HttpExceptionBodyMessage;
  error?: string;
  statusCode: number;
}
