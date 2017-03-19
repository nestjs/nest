import { Logger } from '../../common/services/logger.service';

export abstract class Server {
    private readonly logger = new Logger(Server.name);
    protected readonly msgHandlers = {};

    abstract listen(callback: () => void);

    getHandlers() {
        return this.msgHandlers;
    }

    add(pattern, callback) {
        this.msgHandlers[JSON.stringify(pattern)] = callback;
    }

    protected handleError(error) {
        this.logger.error(error);
    }
}