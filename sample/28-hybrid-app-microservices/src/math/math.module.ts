import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MATH_TCP_SERVICE } from './math.constants';
import { MathController } from './math.controller';

@Module({
  imports: [
    ClientsModule.register([{ name: MATH_TCP_SERVICE, transport: Transport.TCP }]),
  ],
  controllers: [MathController],
})
export class MathModule {}
