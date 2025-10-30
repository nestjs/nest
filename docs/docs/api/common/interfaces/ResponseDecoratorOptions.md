# Interface: ResponseDecoratorOptions

Defined in: packages/common/decorators/http/route-params.decorator.ts:13

The `@Response()`/`@Res` parameter decorator options.

## Properties

### passthrough

> **passthrough**: `boolean`

Defined in: packages/common/decorators/http/route-params.decorator.ts:21

Determines whether the response will be sent manually within the route handler,
with the use of native response handling methods exposed by the platform-specific response object,
or if it should passthrough Nest response processing pipeline.

#### Default

```ts
false
```
