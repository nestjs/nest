"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ApplicationReferenceHost {
    set applicationRef(applicationRef) {
        this._applicationRef = applicationRef;
    }
    get applicationRef() {
        return this._applicationRef;
    }
}
exports.ApplicationReferenceHost = ApplicationReferenceHost;
