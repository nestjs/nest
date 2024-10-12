## How this works

We are relying on the [`--experimental-require-module`](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require) NodeJS v22 flag so that we can load ESM packages using `require()`

Check out the `package.json` file.

## About automated tests with Jest

While Jest [does not supports](https://github.com/jestjs/jest/issues/15275) the `--experimental-require-module` flag, we cannot use Jest in this project!