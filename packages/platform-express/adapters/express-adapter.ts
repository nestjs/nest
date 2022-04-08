import {
  InternalServerErrorException,
  RequestMethod,
  StreamableFile,
  VersioningType,
} from '@nestjs/common';
import {
  VersioningOptions,
  VersionValue,
  VERSION_NEUTRAL,
} from '@nestjs/common/interfaces';
import {
  CorsOptions,
  CorsOptionsDelegate,
} from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import {
  isFunction,
  isNil,
  isObject,
  isString,
} from '@nestjs/common/utils/shared.utils';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import { RouterMethodFactory } from '@nestjs/core/helpers/router-method-factory';
import {
  json as bodyParserJson,
  urlencoded as bodyParserUrlencoded,
} from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';
import * as http from 'http';
import * as https from 'https';
import { ServeStaticOptions } from '../interfaces/serve-static-options.interface';

export class ExpressAdapter extends AbstractHttpAdapter {
  private readonly routerMethodFactory = new RouterMethodFactory();

  constructor(instance?: any) {
    super(instance || express());
  }

  public override reply(response: any, body: any, statusCode?: number) {
    if (statusCode) {
      response.status(statusCode);
    }
    if (isNil(body)) {
      return response.send();
    }
    if (body instanceof StreamableFile) {
      const streamHeaders = body.getHeaders();
      if (
        response.getHeader('Content-Type') === undefined &&
        streamHeaders.type !== undefined
      ) {
        response.setHeader('Content-Type', streamHeaders.type);
      }
      if (
        response.getHeader('Content-Disposition') === undefined &&
        streamHeaders.disposition !== undefined
      ) {
        response.setHeader('Content-Disposition', streamHeaders.disposition);
      }
      if (
        response.getHeader('Content-Length') === undefined &&
        streamHeaders.length !== undefined
      ) {
        response.setHeader('Content-Length', streamHeaders.length);
      }
      return body.getStream().pipe(response);
    }
    return isObject(body) ? response.json(body) : response.send(String(body));
  }

  public override status(response: any, statusCode: number) {
    return response.status(statusCode);
  }

  public override render(response: any, view: string, options: any) {
    return response.render(view, options);
  }

  public override redirect(response: any, statusCode: number, url: string) {
    return response.redirect(statusCode, url);
  }

  public override setErrorHandler(handler: Function, prefix?: string) {
    return this.use(handler);
  }

  public override setNotFoundHandler(handler: Function, prefix?: string) {
    return this.use(handler);
  }

  public override setHeader(response: any, name: string, value: string) {
    return response.set(name, value);
  }

  public override listen(port: string | number, callback?: () => void);
  public override listen(
    port: string | number,
    hostname: string,
    callback?: () => void,
  );
  public override listen(port: any, ...args: any[]) {
    return this.httpServer.listen(port, ...args);
  }

  public override close() {
    if (!this.httpServer) {
      return undefined;
    }
    return new Promise(resolve => this.httpServer.close(resolve));
  }

  public set(...args: any[]) {
    return this.instance.set(...args);
  }

  public enable(...args: any[]) {
    return this.instance.enable(...args);
  }

  public disable(...args: any[]) {
    return this.instance.disable(...args);
  }

  public engine(...args: any[]) {
    return this.instance.engine(...args);
  }

  public override useStaticAssets(path: string, options: ServeStaticOptions) {
    if (options && options.prefix) {
      return this.use(options.prefix, express.static(path, options));
    }
    return this.use(express.static(path, options));
  }

  public setBaseViewsDir(path: string | string[]) {
    return this.set('views', path);
  }

  public override setViewEngine(engine: string) {
    return this.set('view engine', engine);
  }

  public override getRequestHostname(request: any): string {
    return request.hostname;
  }

  public override getRequestMethod(request: any): string {
    return request.method;
  }

  public override getRequestUrl(request: any): string {
    return request.originalUrl;
  }

  public override enableCors(options: CorsOptions | CorsOptionsDelegate<any>) {
    return this.use(cors(options));
  }

  public override createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): (path: string, callback: Function) => any {
    return this.routerMethodFactory
      .get(this.instance, requestMethod)
      .bind(this.instance);
  }

  public override initHttpServer(options: NestApplicationOptions) {
    const isHttpsEnabled = options && options.httpsOptions;
    if (isHttpsEnabled) {
      this.httpServer = https.createServer(
        options.httpsOptions,
        this.getInstance(),
      );
      return;
    }
    this.httpServer = http.createServer(this.getInstance());
  }

  public override registerParserMiddleware() {
    const parserMiddleware = {
      jsonParser: bodyParserJson(),
      urlencodedParser: bodyParserUrlencoded({ extended: true }),
    };
    Object.keys(parserMiddleware)
      .filter(parser => !this.isMiddlewareApplied(parser))
      .forEach(parserKey => this.use(parserMiddleware[parserKey]));
  }

  public setLocal(key: string, value: any) {
    this.instance.locals[key] = value;
    return this;
  }

  public override getType(): string {
    return 'express';
  }

  public applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ) {
    return <TRequest extends Record<string, any> = any, TResponse = any>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => {
      if (version === VERSION_NEUTRAL) {
        return handler(req, res, next);
      }
      // URL Versioning is done via the path, so the filter continues forward
      if (versioningOptions.type === VersioningType.URI) {
        return handler(req, res, next);
      }

      // Custom Extractor Versioning Handler
      if (versioningOptions.type === VersioningType.CUSTOM) {
        const extractedVersion = versioningOptions.extractor(req);

        if (Array.isArray(version)) {
          if (
            Array.isArray(extractedVersion) &&
            version.filter(v => extractedVersion.includes(v as string)).length
          ) {
            return handler(req, res, next);
          } else if (
            isString(extractedVersion) &&
            version.includes(extractedVersion)
          ) {
            return handler(req, res, next);
          }
        } else if (isString(version)) {
          // Known bug here - if there are multiple versions supported across separate
          // handlers/controllers, we can't select the highest matching handler.
          // Since this code is evaluated per-handler, then we can't see if the highest
          // specified version exists in a different handler.
          if (
            Array.isArray(extractedVersion) &&
            extractedVersion.includes(version)
          ) {
            return handler(req, res, next);
          } else if (
            isString(extractedVersion) &&
            version === extractedVersion
          ) {
            return handler(req, res, next);
          }
        }
      }

      // Media Type (Accept Header) Versioning Handler
      if (versioningOptions.type === VersioningType.MEDIA_TYPE) {
        const MEDIA_TYPE_HEADER = 'Accept';
        const acceptHeaderValue: string | undefined =
          req.headers?.[MEDIA_TYPE_HEADER] ||
          req.headers?.[MEDIA_TYPE_HEADER.toLowerCase()];

        const acceptHeaderVersionParameter = acceptHeaderValue
          ? acceptHeaderValue.split(';')[1]
          : '';

        if (acceptHeaderVersionParameter) {
          const headerVersion = acceptHeaderVersionParameter.split(
            versioningOptions.key,
          )[1];

          if (Array.isArray(version)) {
            if (version.includes(headerVersion)) {
              return handler(req, res, next);
            }
          } else if (isString(version)) {
            if (version === headerVersion) {
              return handler(req, res, next);
            }
          }
        }
      }
      // Header Versioning Handler
      else if (versioningOptions.type === VersioningType.HEADER) {
        const customHeaderVersionParameter: string | undefined =
          req.headers?.[versioningOptions.header] ||
          req.headers?.[versioningOptions.header.toLowerCase()];

        if (customHeaderVersionParameter) {
          if (Array.isArray(version)) {
            if (version.includes(customHeaderVersionParameter)) {
              return handler(req, res, next);
            }
          } else if (isString(version)) {
            if (version === customHeaderVersionParameter) {
              return handler(req, res, next);
            }
          }
        }
      }

      if (!next) {
        throw new InternalServerErrorException(
          'HTTP adapter does not support filtering on version',
        );
      }
      return next();
    };
  }

  private isMiddlewareApplied(name: string): boolean {
    const app = this.getInstance();
    return (
      !!app._router &&
      !!app._router.stack &&
      isFunction(app._router.stack.filter) &&
      app._router.stack.some(
        (layer: any) => layer && layer.handle && layer.handle.name === name,
      )
    );
  }
}
