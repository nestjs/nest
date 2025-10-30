# Interface: ConsoleLoggerOptions

Defined in: packages/common/services/console-logger.service.ts:18

## Public Api

## Properties

### breakLength?

> `optional` **breakLength**: `number`

Defined in: packages/common/services/console-logger.service.ts:97

The length at which input values are split across multiple lines. Set to Infinity to format the input as a single line (in combination with "compact" set to true).
Default Infinity when "compact" is true, 80 otherwise.
Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.

***

### colors?

> `optional` **colors**: `boolean`

Defined in: packages/common/services/console-logger.service.ts:41

If enabled, will print the log message in color.
Default true if json is disabled, false otherwise

***

### compact?

> `optional` **compact**: `number` \| `boolean`

Defined in: packages/common/services/console-logger.service.ts:57

If enabled, will print the log message in a single line, even if it is an object with multiple properties.
If set to a number, the most n inner elements are united on a single line as long as all properties fit into breakLength. Short array elements are also grouped together.
Default true when `json` is enabled, false otherwise.

***

### context?

> `optional` **context**: `string`

Defined in: packages/common/services/console-logger.service.ts:45

The context of the logger.

***

### depth?

> `optional` **depth**: `number`

Defined in: packages/common/services/console-logger.service.ts:85

Specifies the number of times to recurse while formatting object.
This is useful for inspecting large objects. To recurse up to the maximum call stack size pass Infinity or null.
Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.

#### Default

```ts
5
```

***

### forceConsole?

> `optional` **forceConsole**: `boolean`

Defined in: packages/common/services/console-logger.service.ts:51

If enabled, will force the use of console.log/console.error instead of process.stdout/stderr.write.
This is useful for test environments like Jest that can buffer console calls.

#### Default

```ts
false
```

***

### json?

> `optional` **json**: `boolean`

Defined in: packages/common/services/console-logger.service.ts:36

If enabled, will print the log message in JSON format.

***

### logLevels?

> `optional` **logLevels**: (`"verbose"` \| `"debug"` \| `"log"` \| `"warn"` \| `"error"` \| `"fatal"`)[]

Defined in: packages/common/services/console-logger.service.ts:22

Enabled log levels.

***

### maxArrayLength?

> `optional` **maxArrayLength**: `number`

Defined in: packages/common/services/console-logger.service.ts:64

Specifies the maximum number of Array, TypedArray, Map, Set, WeakMap, and WeakSet elements to include when formatting.
Set to null or Infinity to show all elements. Set to 0 or negative to show no elements.
Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.

#### Default

```ts
100
```

***

### maxStringLength?

> `optional` **maxStringLength**: `number`

Defined in: packages/common/services/console-logger.service.ts:71

Specifies the maximum number of characters to include when formatting.
Set to null or Infinity to show all elements. Set to 0 or negative to show no characters.
Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.

#### Default

```ts
10000.
```

***

### prefix?

> `optional` **prefix**: `string`

Defined in: packages/common/services/console-logger.service.ts:32

A prefix to be used for each log message.
Note: This option is not used when `json` is enabled.

***

### showHidden?

> `optional` **showHidden**: `boolean`

Defined in: packages/common/services/console-logger.service.ts:91

If true, object's non-enumerable symbols and properties are included in the formatted result.
WeakMap and WeakSet entries are also included as well as user defined prototype properties

#### Default

```ts
false
```

***

### sorted?

> `optional` **sorted**: `boolean` \| (`a`, `b`) => `number`

Defined in: packages/common/services/console-logger.service.ts:78

If enabled, will sort keys while formatting objects.
Can also be a custom sorting function.
Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.

#### Default

```ts
false
```

***

### timestamp?

> `optional` **timestamp**: `boolean`

Defined in: packages/common/services/console-logger.service.ts:27

If enabled, will print timestamp (time difference) between current and previous log message.
Note: This option is not used when `json` is enabled.
