export class HttpException {

    constructor(
        private readonly message: string,
        private readonly status: number) {}

    getMessage() {
        return this.message;
    }

    getStatus() {
        return this.status;
    }
}
