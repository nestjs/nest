import { Module } from '@nestjs/common';
import { NodeController } from './node.controller.js';

@Module({
  controllers: [NodeController],
})
export class NodeModule {}
