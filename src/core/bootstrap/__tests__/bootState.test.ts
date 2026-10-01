import { combineBootState, done, failed, pending } from '../bootState';

describe('combineBootState', () => {
  it('is loading while any task is pending', () => {
    expect(combineBootState([done, pending])).toEqual({ status: 'loading' });
  });

  it('is ready when every task is done', () => {
    expect(combineBootState([done, done])).toEqual({ status: 'ready' });
  });

  it('reports the first failure even if other tasks are pending', () => {
    expect(combineBootState([pending, failed('A', 'first'), failed('B', 'second')])).toEqual({
      status: 'error',
      title: 'A',
      detail: 'first',
    });
  });
});
