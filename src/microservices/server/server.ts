import { Logger } from '@nestjs/common/services/logger.service';

export abstract class Server {
    private readonly logger = new Logger(Server.name);
    protected readonly msgHandlers = {};

    public abstract listen(callback: () => void);
    public abstract close(): void;

    public getHandlers() {
        return this.msgHandlers;
    }

    public add(pattern, callback) {
        this.msgHandlers[JSON.stringify(pattern)] = callback;
    }

    protected handleError(error) {
        this.logger.error(error);
    }
}