import { HttpStatus } from '../../enums/index.js';

export interface HttpRedirectResponse {
  url: string;
  statusCode: HttpStatus;
}
