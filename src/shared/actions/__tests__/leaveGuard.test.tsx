import { router, Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { Pressable, Text } from 'react-native';

import { useLeaveGuard } from '../leaveGuard';

const ask = jest.fn<void, [leave: () => void]>();

function Editor({ guarded }: { guarded: boolean }) {
  const leave = useLeaveGuard(guarded, ask);
  return (
    <Pressable accessibilityRole="button" onPress={leave}>
      <Text>Save and leave</Text>
    </Pressable>
  );
}

/** Home, with the editor pushed over it. */
function openEditor(guarded: boolean) {
  const view = renderRouter(
    {
      _layout: () => <Stack screenOptions={{ headerShown: false }} />,
      index: () => <Text>Home</Text>,
      edit: () => <Editor guarded={guarded} />,
    },
    { initialUrl: '/' },
  );
  // Untyped, unlike router.push: these routes exist only in this test.
  testRouter.push('/edit');
  return view;
}

beforeEach(() => {
  ask.mockReset();
});

describe('guarding a screen with something to lose', () => {
  it('asks before it is left, and stays until told to go', () => {
    const view = openEditor(true);

    act(() => router.back());

    expect(ask).toHaveBeenCalledTimes(1);
    expect(view.getPathname()).toBe('/edit');

    act(() => ask.mock.calls[0]?.[0]());

    expect(view.getPathname()).toBe('/');
  });

  it('lets the screen leave by its own way out without asking again (once saved)', () => {
    const view = openEditor(true);

    fireEvent.press(screen.getByRole('button', { name: 'Save and leave' }));

    expect(ask).not.toHaveBeenCalled();
    expect(view.getPathname()).toBe('/');
  });

  it('does not ask when there is nothing to lose', () => {
    const view = openEditor(false);

    act(() => router.back());

    expect(ask).not.toHaveBeenCalled();
    expect(view.getPathname()).toBe('/');
  });
});
