import { act, renderHook } from '@testing-library/react-native';

import { useStagedReveal } from '../useStagedReveal';

/** Frames run by hand: each test says when the next one comes. */
let frames: FrameRequestCallback[] = [];
const nextFrame = () =>
  act(() => {
    const due = frames;
    frames = [];
    due.forEach((callback) => callback(0));
  });

beforeEach(() => {
  frames = [];
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('useStagedReveal', () => {
  it('shows nothing while the screen is still moving', () => {
    const { result } = renderHook(() => useStagedReveal(false, 3));

    nextFrame();
    nextFrame();

    expect(result.current).toBe(0);
  });

  it('shows one more part on each frame once started, and stops at the last', () => {
    const { result, rerender } = renderHook(({ start }: { start: boolean }) => useStagedReveal(start, 3), {
      initialProps: { start: false },
    });

    rerender({ start: true });
    expect(result.current).toBe(0);

    nextFrame();
    expect(result.current).toBe(1);
    nextFrame();
    expect(result.current).toBe(2);
    nextFrame();
    expect(result.current).toBe(3);
    nextFrame();
    expect(result.current).toBe(3);
    expect(frames).toHaveLength(0);
  });
});
