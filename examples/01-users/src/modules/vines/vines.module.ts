import { Module } from '@nestjs/common';
import { VinesFacade } from './vines.facade';
import { VinesService } from './vines.service';
import { VinesRepository } from './vines.repository';
import { VinesXd } from './vines.xd';

@Module({
    components: [
        VinesFacade,
        VinesService,
        VinesRepository,
        VinesXd,
    ],
    exports: [
        VinesFacade,
    ],
})
export class VinesModule {}