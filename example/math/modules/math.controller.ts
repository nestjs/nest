import { Controller } from '../../../src/common/utils/decorators/controller.decorator';
import { MessagePattern } from '../../../src/microservices/utils/pattern.decorator';

@Controller()
export class MathController {
    @MessagePattern({ command: 'add' })
    add(data, respond) {
        const numbers = data || [];
        respond(null, numbers.reduce((a, b) => a + b));
    }
}