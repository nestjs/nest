export class RecordWrapper<TData = any, TOptions = any> {
  private _options?: TOptions;

  get options(): TOptions {
    return { ...this._options };
  }

  constructor(public readonly data: TData) {}

  protected updateOptions(options: TOptions) {
    this._options = {
      ...this._options,
      ...options,
    };
  }
}
