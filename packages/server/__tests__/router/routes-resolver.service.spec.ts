import 'reflect-metadata';
import { RouterMethodFactory } from '@nest/server/router/router-method-factory.service';
import { RouterProxy } from '@nest/server/router/router-proxy.service';
import { BadRequestException } from '@nest/server/errors';
import { RouterBuilder, RoutesResolver } from '@nest/server/router';
import { Test, TestingModule } from '@nest/testing';

import { HTTP_SERVER_PROVIDER } from '../fake-http-server';

describe('RoutesResolver', () => {
  let routesResolver: RoutesResolver;
  let test: TestingModule;

  beforeEach(async () => {
    test = await Test.createTestingModule({
      providers: [
        HTTP_SERVER_PROVIDER,
        RouterMethodFactory,
        RouterBuilder,
        RouterProxy,
        RoutesResolver,
      ],
    }).compile();

    routesResolver = test.get<RoutesResolver>(RoutesResolver);
  });

  describe('mapExternalExceptions', () => {
    describe('SyntaxError', () => {
      it('should map to BadRequestException', () => {
        const err = new SyntaxError();
        const outputErr = routesResolver.mapExternalException(err);
        expect(outputErr).toBeInstanceOf(BadRequestException);
      });
    });
    describe('other', () => {
      it('should behave as an identity', () => {
        const err = new Error();
        const outputErr = routesResolver.mapExternalException(err);
        expect(outputErr).toEqual(err);
      });
    });
  });
});
