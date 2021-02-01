export class NonFile {
  constructor(private readonly value: string) {}

  pipe() {
    return this.value;
  }
}