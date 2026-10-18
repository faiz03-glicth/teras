import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * The longest a screen waits to hear that its slide ended. A screen shown with no transition (the first
 * one) never hears it, and settles after this anyway. A tab hears it at once: the tabs send it when their
 * switch ends, and theirs has no animation, so a tab settles a frame or two after it first shows.
 */
const SETTLE_FALLBACK_MS = 700;

/** The one stack event this needs, typed here rather than reaching into the router's build folder. */
interface TransitionEvents {
  addListener(type: 'transitionEnd', listener: (event: { data?: { closing?: boolean } }) => void): () => void;
}

/**
 * Whether the screen has finished sliding in: false on its first render, true once its opening transition
 * ends. A screen draws what the slide shows first and its costly rest (an SVG body, a chart, rows below the
 * fold) once it has settled, so the slide neither waits for that work nor stutters under it.
 */
export function useScreenSettled(): boolean {
  const navigation = useNavigation<TransitionEvents>();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (settled) return;
    const settle = () => setSettled(true);
    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (!event.data?.closing) settle();
    });
    const fallback = setTimeout(settle, SETTLE_FALLBACK_MS);
    return () => {
      unsubscribe();
      clearTimeout(fallback);
    };
  }, [navigation, settled]);

  return settled;
}
