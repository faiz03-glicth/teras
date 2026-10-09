import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { motion } from '@/theme';

import { swipeRest, SwipeToDelete } from '../SwipeToDelete';

const WIDTH = 300;
const SLOP = motion.swipeAction.slopPt;

describe('where a swiped row comes to rest', () => {
  it('closes after a small pull', () => {
    expect(swipeRest(30, 0, WIDTH)).toBe('closed');
  });

  it('stays open on its action once pulled past half of it', () => {
    expect(swipeRest(60, 0, WIDTH)).toBe('open');
  });

  it('opens on a flick left, however short the pull', () => {
    expect(swipeRest(20, -1200, WIDTH)).toBe('open');
  });

  it('closes on a flick right, however far it was pulled', () => {
    expect(swipeRest(240, 1200, WIDTH)).toBe('closed');
  });

  it('does the action once pulled past most of the row', () => {
    expect(swipeRest(190, 0, WIDTH)).toBe('gone');
  });

  it('never does it on a flick alone', () => {
    expect(swipeRest(100, -5000, WIDTH)).toBe('open');
  });

  it('never does it before the row has been measured', () => {
    expect(swipeRest(500, 0, 0)).toBe('open');
  });
});

describe('a row that can be swiped away', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function row() {
    const onDelete = jest.fn();
    render(
      <SwipeToDelete onDelete={onDelete} accessibilityLabel="Delete set 2" testID="row">
        <Text>Set 2</Text>
      </SwipeToDelete>,
    );
    fireEvent(screen.getByTestId('row-content'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height: 52 } },
    });
    return onDelete;
  }

  /** A finger moving `translationX` sideways: the swipe takes over once it has passed the slop. */
  const swipe = (translationX: number, velocityX = 0) => {
    fireGestureHandler(getByGestureTestId('row'), [
      { state: State.BEGAN, translationX: 0 },
      { state: State.ACTIVE, translationX: -SLOP },
      { state: State.ACTIVE, translationX },
      { state: State.END, translationX, velocityX },
    ]);
    act(() => jest.advanceTimersByTime(600));
  };

  it('is deleted when swiped past most of its width', () => {
    const onDelete = row();

    swipe(-240);

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('opens on its Delete key after a shorter swipe, and the key deletes it', () => {
    const onDelete = row();

    swipe(-80);
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Delete set 2' }));
    act(() => jest.advanceTimersByTime(600));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('springs back from a small swipe, with nothing to press', () => {
    const onDelete = row();

    swipe(-30);

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Delete set 2' })).toBeNull();
  });

  it('closes when the open row is tapped', () => {
    const onDelete = row();
    swipe(-80);

    fireEvent.press(screen.getByTestId('row-close'));
    act(() => jest.advanceTimersByTime(600));

    expect(screen.queryByRole('button', { name: 'Delete set 2' })).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('comes back if it is still there a moment after being deleted (the delete failed)', () => {
    const onDelete = row();
    swipe(-240);

    act(() => jest.advanceTimersByTime(2000));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('row-content')).toHaveAnimatedStyle({ transform: [{ translateX: 0 }] });
  });
});
