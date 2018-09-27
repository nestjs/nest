import { Window, WindowRef, Event } from '@nest/electron';
import { BrowserWindow } from 'electron';
import { Inject } from '@nest/core';

@Window()
export class MainWindow {
  @Inject(WindowRef)
  public readonly windowRef!: BrowserWindow;

  @Event('closed')
  public onClosed() {
    console.log(this.windowRef, 'MainWindow has been closed');
  }
}
