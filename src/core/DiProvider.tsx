import { createContext, useContext, type ReactNode } from 'react';

import type { Repositories } from './di';

const RepositoriesContext = createContext<Repositories | null>(null);

export function DiProvider({ repositories, children }: { repositories: Repositories; children: ReactNode }) {
  return <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>;
}

/** For ViewModels, hooks and actions only. Views get data from their ViewModel. */
export function useRepositories(): Repositories {
  const repositories = useContext(RepositoriesContext);
  if (!repositories) throw new Error('useRepositories() must be used inside <DiProvider>.');
  return repositories;
}
