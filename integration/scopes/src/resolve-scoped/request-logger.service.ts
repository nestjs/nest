import { Injectable, Scope } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Injectable({ scope: Scope.REQUEST })
export class RequestLoggerService {
  constructor(public loggerService: LoggerService) {}
}
