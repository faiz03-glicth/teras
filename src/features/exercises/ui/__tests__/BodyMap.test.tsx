import { screen } from '@testing-library/react-native';

import type { Highlight } from '@/features/exercises/domain/bodyMap';
import { renderInScheme } from '@test/render';

import { BodyMap } from '../components/BodyMap';

// The drawing is hidden from screen readers (the muscles are named in text beside it).
const hidden = { includeHiddenElements: true };
const highlight: Highlight = { primary: ['chest'], secondary: ['triceps'] };

describe('the body map', () => {
  it('draws the front and the back', () => {
    renderInScheme(<BodyMap highlight={highlight} />, 'light');

    expect(screen.getByTestId('body-front', hidden)).toBeTruthy();
    expect(screen.getByTestId('body-back', hidden)).toBeTruthy();
  });

  it('can leave the back for the next frame, its room kept so the front stays where it is', () => {
    renderInScheme(<BodyMap highlight={highlight} back={false} />, 'light');

    expect(screen.getByTestId('body-front', hidden)).toBeTruthy();
    expect(screen.queryByTestId('body-back', hidden)).toBeNull();
    expect(screen.queryByTestId('highlight-triceps', hidden)).toBeNull();
  });
});
