import * as sinon from 'sinon';
import { expect } from 'chai';
import { ExceptionsHandler } from '../../exceptions/exceptions-handler';
import { HttpException } from '../../exceptions/http-exception';
import { Logger } from '../../../common/services/logger.service';
import { NestMode } from '../../../common/enums/nest-mode.enum';

describe('ExceptionsHandler', () => {
    let handler: ExceptionsHandler;
    let statusStub: sinon.SinonStub;
    let jsonStub: sinon.SinonStub;
    let response;

    before(() => Logger.setMode(NestMode.TEST));

    beforeEach(() => {
        handler = new ExceptionsHandler();
        statusStub = sinon.stub();
        jsonStub = sinon.stub();

        response = {
            status: statusStub,
            json: jsonStub
        };
        response.status.returns(response);
        response.json.returns(response);
    });

    describe('next', () => {

        it('should method send expected response status code and message when exception is unknown', () => {
            handler.next(new Error(), response);

            expect(statusStub.calledWith(500)).to.be.true;
            expect(jsonStub.calledWith({ message: 'Unkown exception' })).to.be.true;
        });

        it('should method send expected response status code and message when exception is instance of HttpException', () => {
            const status = 401;
            const message = 'Unauthorized';

            handler.next(new HttpException(message, status), response);

            expect(statusStub.calledWith(status)).to.be.true;
            expect(jsonStub.calledWith({ message })).to.be.true;
        });

    });

});