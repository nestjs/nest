export class HttpException {
    constructor(
        private readonly response: string | object,
        private readonly status: number) {}

    public getResponse(): string | object {
        return this.response;
    }

    public getStatus(): number {
        return this.status;
    }
}
