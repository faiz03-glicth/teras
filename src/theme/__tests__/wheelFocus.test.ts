import { centredSlot, motion, slotDistance, wheelFocus } from '@/theme';

const { slotWidth, focusScale, farOpacity } = motion.datePicker;

describe('dateFocus (the date wheel)', () => {
  it('picks the slot under the centre, never outside the wheel', () => {
    expect(centredSlot(0, 30)).toBe(0);
    expect(centredSlot(slotWidth * 0.49, 30)).toBe(0);
    expect(centredSlot(slotWidth * 0.51, 30)).toBe(1);
    expect(centredSlot(-200, 30)).toBe(0);
    expect(centredSlot(slotWidth * 99, 30)).toBe(29);
  });

  it('swells the centred date continuously, and only within one slot of the centre', () => {
    const scales = [0, 0.25, 0.5, 0.75, 1, 2].map((d) => wheelFocus(d, false).scale);
    expect(scales[0]).toBeCloseTo(focusScale);
    // Strictly shrinking as the date leaves the centre: no step.
    for (let i = 1; i < 5; i += 1) expect(scales[i]).toBeLessThan(scales[i - 1] ?? Infinity);
    expect(scales[4]).toBe(1);
    expect(scales[5]).toBe(1);
    // Small steps: a quarter slot never changes the scale by more than half of the whole swell.
    expect((scales[0] ?? 0) - (scales[1] ?? 0)).toBeLessThan((focusScale - 1) / 2);
  });

  it('fades far dates, and keeps the fade but not the swell with Reduce Motion', () => {
    expect(wheelFocus(0, false).opacity).toBe(1);
    expect(wheelFocus(10, false).opacity).toBeCloseTo(farOpacity);
    expect(wheelFocus(0, true)).toEqual({ scale: 1, opacity: 1 });
    expect(wheelFocus(10, true).opacity).toBeCloseTo(farOpacity);
  });

  it('measures distance in slots from the scroll offset', () => {
    expect(slotDistance(slotWidth * 3, 3)).toBe(0);
    expect(slotDistance(slotWidth * 3.5, 3)).toBe(0.5);
    expect(slotDistance(slotWidth * 3.5, 4)).toBe(0.5);
  });
});
