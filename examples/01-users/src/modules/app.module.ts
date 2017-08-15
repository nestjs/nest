import { Module, Controller, Get, Component } from '@nestjs/common';
import { VinesModule } from './vines/vines.module';
import { VinesRepository } from './vines/vines.repository';
import { VinesFacade } from './vines/vines.facade';

@Component()
class InMemoryVinesRepository {
    public save(vine) {
        console.log('in memory');
    }
    public getAll() {
        console.log('get in mem');
    }
}

@Controller()
class VinesController {
    constructor(private readonly vinesFacade: VinesFacade) {}
    @Get()
    public save() {
        this.vinesFacade.save();
    }
}

@Module({
    modules: [VinesModule],
    controllers: [VinesController],
    components: [
        { provide: VinesRepository, useClass: InMemoryVinesRepository },
    ],
})
export class ApplicationModule {}