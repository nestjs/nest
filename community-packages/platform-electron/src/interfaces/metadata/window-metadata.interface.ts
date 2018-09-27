import { TargetRef } from '@nest/core';

import { BrowserWindowConstructorOptions } from 'electron';

export interface WindowMetadata
  extends BrowserWindowConstructorOptions,
    TargetRef {}
