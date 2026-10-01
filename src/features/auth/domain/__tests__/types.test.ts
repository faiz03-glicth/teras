import { testUser } from '@test/fakes/fakeRepositories';

import { profileTitle } from '@/features/profile/domain/Profile';

import { firstName, statusFor } from '../types';

describe('statusFor', () => {
  it('maps users to session status', () => {
    expect(statusFor(null)).toBe('signedOut');
    expect(statusFor(testUser({ provider: 'guest' }))).toBe('guest');
    expect(statusFor(testUser({ provider: 'apple' }))).toBe('signedIn');
  });
});

describe('firstName', () => {
  it.each([
    ['Faiz Ahmad', 'Faiz'],
    ['  Faiz  ', 'Faiz'],
    ['', null],
    [null, null],
  ])('%p → %p', (displayName, expected) => {
    expect(firstName({ displayName })).toBe(expected);
  });
});

describe('profileTitle', () => {
  it('prefers the display name, then email, and always says Guest for guests', () => {
    expect(profileTitle({ displayName: 'Faiz', email: 'a@b.co', provider: 'email' })).toBe('Faiz');
    expect(profileTitle({ displayName: ' ', email: 'a@b.co', provider: 'email' })).toBe('a@b.co');
    expect(profileTitle({ displayName: 'Faiz', email: null, provider: 'guest' })).toBe('Guest');
  });
});
