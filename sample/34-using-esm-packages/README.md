## About using ESM with Jest

We are using the `--experimental-vm-modules` NodeJS v18 flag as explained at https://jestjs.io/docs/ecmascript-modules

You can see how to mock an ESM package at [`app.controller.spec.ts`](./src/app.controller.spec.ts)  
You can see how that the real import of an ESM package is working at [`app.e2e-spec.ts`](./test/app.e2e-spec.ts)