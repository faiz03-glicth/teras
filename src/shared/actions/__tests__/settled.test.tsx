import { act, renderHook } from '@testing-library/react-native';

import { useScreenSettled } from '../settled';

type Listener = (event: { data?: { closing?: boolean } }) => void;

const mockListeners = new Set<Listener>();
const mockNavigation = {
  addListener: jest.fn((_type: 'transitionEnd', listener: Listener) => {
    mockListeners.add(listener);
    return () => mockListeners.delete(listener);
  }),
};

jest.mock('expo-router', () => ({ useNavigation: () => mockNavigation }));

const transitionEnd = (closing: boolean) =>
  act(() => mockListeners.forEach((listener) => listener({ data: { closing } })));

beforeEach(() => {
  jest.useFakeTimers();
  mockListeners.clear();
  mockNavigation.addListener.mockClear();
});

afterEach(() => jest.useRealTimers());

describe('a screen settling once it has slid in', () => {
  it('has not settled while it slides in', () => {
    const { result } = renderHook(() => useScreenSettled());

    expect(result.current).toBe(false);
    expect(mockNavigation.addListener).toHaveBeenCalledWith('transitionEnd', expect.any(Function));
  });

  it('settles the moment its opening slide ends', () => {
    const { result } = renderHook(() => useScreenSettled());

    transitionEnd(false);

    expect(result.current).toBe(true);
  });

  it('does not count the slide of it closing', () => {
    const { result } = renderHook(() => useScreenSettled());

    transitionEnd(true);

    expect(result.current).toBe(false);
  });

  it('settles anyway when no slide ever reports its end (a first screen, a tab)', () => {
    const { result } = renderHook(() => useScreenSettled());

    act(() => jest.advanceTimersByTime(699));
    expect(result.current).toBe(false);
    act(() => jest.advanceTimersByTime(1));

    expect(result.current).toBe(true);
  });

  it('stops listening once settled, and on leaving', () => {
    const { unmount } = renderHook(() => useScreenSettled());
    transitionEnd(false);

    expect(mockListeners.size).toBe(0);
    unmount();
    expect(mockListeners.size).toBe(0);
  });
});
