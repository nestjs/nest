# Interface: ModuleRefGetOrResolveOpts

Defined in: packages/core/injector/module-ref.ts:11

## Properties

### each?

> `optional` **each**: `boolean`

Defined in: packages/core/injector/module-ref.ts:22

If enabled, instead of returning a first instance registered under a given token,
a list of instances will be returned.

#### Default

```ts
false
```

***

### strict?

> `optional` **strict**: `boolean`

Defined in: packages/core/injector/module-ref.ts:16

If enabled, lookup will only be performed in the host module.

#### Default

```ts
true
```
