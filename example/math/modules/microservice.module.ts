import { Module } from '../../../src/common/utils/module.decorator';
import { MathController } from './math.controller';

@Module({
    controllers: [ MathController ]
})
export class MicroserviceModule {}