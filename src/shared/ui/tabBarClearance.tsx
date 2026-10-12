import { createContext, useContext } from 'react';

/**
 * Extra room the tab screens leave at the bottom, over the tab bar's own, for whatever is docked on top
 * of the bar (the workout in progress). The tabs layout says how much; Screen adds it, so the end of a
 * page always scrolls clear of everything docked over it.
 */
const TabBarClearanceContext = createContext(0);

export const TabBarClearance = TabBarClearanceContext.Provider;

export function useTabBarClearance(): number {
  return useContext(TabBarClearanceContext);
}
