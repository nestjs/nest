export default function optional(module: string, options?: { rethrow?: boolean }) {
    try {
        if (module[0] in { '.': 1 }) {
            module = process.cwd() + module.substr(1);
        }
        return require(module);
    } catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND' && options && options.rethrow) {
            throw err;
        }
    }
    return null;
}
