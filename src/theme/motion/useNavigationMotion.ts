import { useReduceMotion } from '../hooks/useReduceMotion';
import { motion } from '../tokens/motion';

const { full, reduced, fadeMs } = motion.navigation;

export type NavigationMotion = (typeof full | typeof reduced) & { fadeMs: number };

/**
 * Screen transition options for the navigators: the transition names (calmer, no sliding, with Reduce
 * Motion) and the iOS cross-fade duration. Navigation owns which screen shows; this only says how the
 * change looks, so every navigator changes screens the same way.
 */
export function useNavigationMotion(): NavigationMotion {
  return { ...(useReduceMotion() ? reduced : full), fadeMs };
}
