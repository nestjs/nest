import { v4 } from 'uuid';

const uuid = (function () {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@napi-rs/uuid').v4;
  } catch (e) {
    // for non-supported platforms, fallback to JavaScript implementation
    return v4;
  }
})();

export const randomStringGenerator = () => uuid();
