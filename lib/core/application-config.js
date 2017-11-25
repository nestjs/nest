"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ApplicationConfig {
    constructor(ioAdapter = null) {
        this.ioAdapter = ioAdapter;
        this.globalPipes = [];
        this.globalFilters = [];
        this.globalInterceptors = [];
        this.globalGuards = [];
        this.globalPrefix = '';
    }
    setGlobalPrefix(prefix) {
        this.globalPrefix = prefix;
    }
    getGlobalPrefix() {
        return this.globalPrefix;
    }
    setIoAdapter(ioAdapter) {
        this.ioAdapter = ioAdapter;
    }
    getIoAdapter() {
        return this.ioAdapter;
    }
    useGlobalPipes(...pipes) {
        this.globalPipes = pipes;
    }
    getGlobalFilters() {
        return this.globalFilters;
    }
    useGlobalFilters(...filters) {
        this.globalFilters = filters;
    }
    getGlobalPipes() {
        return this.globalPipes;
    }
    getGlobalInterceptors() {
        return this.globalInterceptors;
    }
    useGlobalInterceptors(...interceptors) {
        this.globalInterceptors = interceptors;
    }
    getGlobalGuards() {
        return this.globalGuards;
    }
    useGlobalGuards(...guards) {
        this.globalGuards = guards;
    }
}
exports.ApplicationConfig = ApplicationConfig;
