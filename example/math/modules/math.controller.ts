import { Controller } from '../../../src/common/utils/controller.decorator';
import { MessagePattern } from '../../../src/microservices/utils/pattern.decorator';

@Controller()
export class MathController {

    @MessagePattern({ command: 'add' })
    multiply(data, respond) {
        if (!data) {
            respond(new Error('Invalid arguments'));
            return;
        }
        const numbers = data.numbers || [];
        respond(null, numbers.reduce((a, b) => a + b));
    }
}