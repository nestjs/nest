import { ExceptionFilter } from '../../../src/common/interfaces/exception-filter.interface';
import { Catch } from '../../../src/common/utils/decorators/catch.decorator';
import { UsersService } from './users.service';

export class CustomException {}

@Catch(CustomException)
export class CustomExceptionFilter implements ExceptionFilter {
    public catch(exception, response) {
        response.status(500).json({
            message: 'Custom exception message.',
        });
    }
}