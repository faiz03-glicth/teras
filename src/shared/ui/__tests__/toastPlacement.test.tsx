import { render } from '@testing-library/react-native';
import { Toaster } from 'sonner-native';

import { AppToaster } from '../AppToaster';
import { useToastsAtTop } from '../toast';

jest.mock('sonner-native', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), info: jest.fn(), dismiss: jest.fn() }),
  Toaster: jest.fn(() => null),
}));

function Surface() {
  useToastsAtTop();
  return null;
}
const hosted = () => jest.mocked(Toaster).mock.calls.at(-1)![0];

it('hosts toasts above the tab bar, and at the very top while a surface asks for that', () => {
  const { rerender } = render(<AppToaster />);
  expect(hosted()).toMatchObject({ position: 'bottom-center', offset: 104 });

  rerender(
    <>
      <AppToaster />
      <Surface />
    </>,
  );
  expect(hosted().position).toBe('top-center');
  // Right under the status bar: clear of what sits lower on the surface (the Day sheet's wheel).
  expect(hosted().offset).toBeLessThan(20);

  rerender(<AppToaster />);
  expect(hosted()).toMatchObject({ position: 'bottom-center', offset: 104 });
});
