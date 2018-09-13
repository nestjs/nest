import { Injectable } from '@nestjs/common';
import { Prisma } from './prisma.binding';

@Injectable()
export class PrismaService extends Prisma {
  constructor() {
    super({
      endpoint: 'https://eu1.prisma.sh/public-agatepuma-476/my-app/dev',
      debug: false,
    });
  }
}
