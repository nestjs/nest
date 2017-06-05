import { Response } from 'express';
import { ExceptionFilter, Catch } from '../../src/index';

export class CustomException { }

@Catch(CustomException)
export class CustomExceptionFilter implements ExceptionFilter {
    public catch(exception: CustomException, response: Response) {
        response.status(500).json({
            message: 'Custom exception message.',
        });
    }
}