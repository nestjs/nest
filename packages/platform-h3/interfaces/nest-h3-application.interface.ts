import { HttpServer, INestApplication } from '@nestjs/common';
import { H3, H3Event } from 'h3';
import { Server } from 'http';

/**
 * Interface describing methods on NestH3Application.
 *
 * @publicApi
 */
export interface NestH3Application extends INestApplication<Server> {
  /**
   * Returns the underlying HTTP adapter bounded to the H3 app.
   *
   * @returns {HttpServer}
   */
  getHttpAdapter(): HttpServer<H3Event, H3Event, H3>;
}
