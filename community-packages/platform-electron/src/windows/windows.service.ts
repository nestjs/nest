import { Injectable, Type, Injector } from '@nest/core';
import { BrowserWindow } from 'electron';

import { MetadataStorage } from '../storage';
import { EventManager } from '../managers';
import { WindowRef } from './tokens';

@Injectable()
export class WindowsService {
  private readonly windowRefs = new Map<Type<any>, BrowserWindow>();

  constructor(private readonly injector: Injector) {}

  public bindWindowEvents() {
    [...this.windowRefs.entries()].forEach(([window, windowRef]) => {
      const eventManager = new EventManager(this.injector, window);

      eventManager.bindWindowEvents(windowRef);
    });
  }

  public start() {
    this.bindWindowEvents();
  }

  public add(windows: Type<any>[]) {
    windows.forEach(window => {
      const metadata = MetadataStorage.getWindowByType(window.constructor);
      const browserWindow = new BrowserWindow(metadata);

      this.injector
        .bind(WindowRef)
        .toConstantValue(browserWindow)
        .whenInjectedInto(<any>window);

      this.windowRefs.set(window, browserWindow);
    });
  }
}
