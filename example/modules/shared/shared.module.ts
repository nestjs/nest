import { Module } from '../../../src/common/utils/decorators/module.decorator';
import { ChatGateway } from '../users/chat.gateway';
import { Shared } from '../../../src/index';

@Shared()
@Module({
    components: [ ChatGateway ],
    exports: [ ChatGateway ],
})
export class SharedModule {}