import { HttpStatus } from '../../enums';

export interface HttpRedirectResponse {
  url: string;
  statusCode: HttpStatus;
}
