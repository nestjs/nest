export const randomStringGenerator = () =>
  Math.random()
    .toString(36)
    .substring(2, 32);
