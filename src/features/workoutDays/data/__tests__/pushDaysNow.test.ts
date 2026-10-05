import { onlineManager } from '@tanstack/react-query';

import { mockFn } from '@test/fakes/mockFn';

import { pushDaysNow } from '../pushDaysNow';
import type { WorkoutDayRepository } from '../WorkoutDayRepository';

const fake = (push: () => Promise<number> = async () => 1) => ({
  pushPending: mockFn<WorkoutDayRepository['pushPending']>(push),
});

afterEach(() => {
  onlineManager.setOnline(true);
  jest.restoreAllMocks();
});

describe('pushDaysNow', () => {
  it("sends a signed-in person's waiting days", () => {
    const days = fake();

    pushDaysNow(days, 'user-1');

    expect(days.pushPending).toHaveBeenCalledWith('user-1');
  });

  it('sends nothing for a guest, who has no server to send to', () => {
    const days = fake();

    pushDaysNow(days, null);

    expect(days.pushPending).not.toHaveBeenCalled();
  });

  it('waits for the reconnect while offline: the push on coming back online sends them', () => {
    const days = fake();
    onlineManager.setOnline(false);

    pushDaysNow(days, 'user-1');

    expect(days.pushPending).not.toHaveBeenCalled();
  });

  it('never throws or waits when the push fails, and logs only what kind of failure it was', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const days = fake(() => Promise.reject(new TypeError('secret detail')));

    expect(() => pushDaysNow(days, 'user-1')).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));

    expect(error).toHaveBeenCalledWith('[workoutDays] Could not push the day (TypeError)');
  });
});
