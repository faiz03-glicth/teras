import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { AppError } from '../../errors/AppError';
import { wireFocusManager } from '../focusManager';
import { wireOnlineManager } from '../onlineManager';
import { MAX_NETWORK_RETRIES, shouldRetry } from '../queryClient';

describe('shouldRetry', () => {
  it('retries network failures up to the limit', () => {
    const offline = new TypeError('Network request failed');
    expect(shouldRetry(0, offline)).toBe(true);
    expect(shouldRetry(MAX_NETWORK_RETRIES - 1, new AppError('Network', 'offline'))).toBe(true);
    expect(shouldRetry(MAX_NETWORK_RETRIES, offline)).toBe(false);
  });

  it('never retries other errors', () => {
    expect(shouldRetry(0, new AppError('Unknown', 'boom'))).toBe(false);
    expect(shouldRetry(0, new Error('bad request'))).toBe(false);
  });
});

describe('onlineManager wiring', () => {
  it('follows NetInfo, treating unknown connectivity as online', () => {
    let emit: (state: Partial<NetInfoState>) => void = () => undefined;
    jest.spyOn(NetInfo, 'addEventListener').mockImplementation((listener) => {
      emit = (state) => listener(state as NetInfoState);
      return () => undefined;
    });

    wireOnlineManager();

    emit({ isConnected: false });
    expect(onlineManager.isOnline()).toBe(false);
    emit({ isConnected: null });
    expect(onlineManager.isOnline()).toBe(true);
  });
});

describe('focusManager wiring', () => {
  it('reports focus when the app becomes active', () => {
    let emit: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      emit = listener;
      return { remove: () => undefined };
    });

    wireFocusManager();

    emit('background');
    expect(focusManager.isFocused()).toBe(false);
    emit('active');
    expect(focusManager.isFocused()).toBe(true);
  });
});
