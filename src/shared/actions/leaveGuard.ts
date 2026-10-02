import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useRef } from 'react';

import { goBack } from './navigation';

/**
 * While `guarded`, leaving the screen any way (its Back, Android's back button, a swipe) first calls
 * `ask`, with a `leave` to call once the answer is yes. Returns the screen's own way out, for once it
 * has asked or has nothing left to lose (just saved): it goes back without asking again.
 */
export function useLeaveGuard(guarded: boolean, ask: (leave: () => void) => void): () => void {
  const navigation = useNavigation();
  const leaving = useRef(false);

  usePreventRemove(guarded, ({ data }) => {
    const leave = () => navigation.dispatch(data.action);
    if (leaving.current) leave();
    else ask(leave);
  });

  return useCallback(() => {
    leaving.current = true;
    goBack();
  }, []);
}
