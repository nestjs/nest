"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
class RouterResponseController {
    constructor(applicationRef) {
        this.applicationRef = applicationRef;
    }
    async apply(resultOrDeffered, response, httpStatusCode) {
        const result = await this.transformToResult(resultOrDeffered);
        return this.applicationRef.reply(response, result, httpStatusCode);
    }
    async render(resultOrDeffered, response, template) {
        const result = await this.transformToResult(resultOrDeffered);
        this.applicationRef.render(response, template, result);
    }
    async transformToResult(resultOrDeffered) {
        if (resultOrDeffered instanceof Promise) {
            return await resultOrDeffered;
        }
        else if (resultOrDeffered && shared_utils_1.isFunction(resultOrDeffered.subscribe)) {
            return await resultOrDeffered.toPromise();
        }
        return resultOrDeffered;
    }
    getStatusByMethod(requestMethod) {
        switch (requestMethod) {
            case common_1.RequestMethod.POST:
                return common_1.HttpStatus.CREATED;
            default:
                return common_1.HttpStatus.OK;
        }
    }
    setHeaders(response, headers) {
        headers.forEach(({ name, value }) => this.applicationRef.setHeader(response, name, value));
    }
}
exports.RouterResponseController = RouterResponseController;
