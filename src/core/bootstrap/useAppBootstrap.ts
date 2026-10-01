import { combineBootState, type BootState } from './bootState';
import { envTask } from './tasks/envTask';
import { useFontsTask } from './tasks/useFontsTask';
import { useMigrationsTask } from './tasks/useMigrationsTask';

/** Composes everything that must finish before the first screen renders. */
export function useAppBootstrap(): BootState {
  const tasks = [envTask(), useFontsTask(), useMigrationsTask()];
  return combineBootState(tasks);
}
