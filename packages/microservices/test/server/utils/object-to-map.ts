export const objectToMap = (obj: Record<string, any>) =>
  new Map(Object.keys(obj).map(key => [key, obj[key]]) as any);
