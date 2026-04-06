/**
 * Development-only logging helpers.
 * In production builds Metro eliminates the dead `if (false)` branches,
 * so these calls compile away entirely — no performance cost in prod.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const devWarn = (...args: any[]): void => {
  if (__DEV__) console.warn(...args);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const devError = (...args: any[]): void => {
  if (__DEV__) console.error(...args);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const devLog = (...args: any[]): void => {
  if (__DEV__) console.log(...args);
};
