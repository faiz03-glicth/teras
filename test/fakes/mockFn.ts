type AnyFn = (...args: never[]) => unknown;

/** A jest.fn typed to an interface method's exact signature. */
export function mockFn<F extends AnyFn>(implementation: (...args: Parameters<F>) => ReturnType<F>) {
  return jest.fn<ReturnType<F>, Parameters<F>>(implementation);
}
