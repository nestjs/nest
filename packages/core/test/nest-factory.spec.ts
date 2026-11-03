import { Module } from '@nestjs/common';
import * as internal from '@nestjs/common/internal';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '../nest-factory.js';

@Module({})
class TestModule {}

describe('NestFactory', () => {
  describe('create()', () => {
    let requestedPackages: string[];

    beforeEach(() => {
      requestedPackages = [];
      vi.spyOn(internal, 'tryLoadPackage').mockImplementation(
        async (name: string) => {
          requestedPackages.push(name);
          return null as any;
        },
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should not request @nestjs/platform-express when an adapter is passed', async () => {
      const app = await NestFactory.create(TestModule, new FastifyAdapter(), {
        logger: false,
      });
      await app.close();

      expect(requestedPackages).not.toContain('@nestjs/platform-express');
    });

    it('should still preload @nestjs/microservices', async () => {
      const app = await NestFactory.create(TestModule, new FastifyAdapter(), {
        logger: false,
      });
      await app.close();

      expect(requestedPackages).toContain('@nestjs/microservices');
    });
  });
});
