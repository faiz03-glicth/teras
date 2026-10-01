import { useState, type ReactNode } from 'react';

import { createRepositories } from './di';
import { DiProvider } from './DiProvider';

/** Creates the real repositories once (after config and migrations are known good) and provides them. */
export function RepositoriesProvider({ children }: { children: ReactNode }) {
  const [repositories] = useState(createRepositories);
  return <DiProvider repositories={repositories}>{children}</DiProvider>;
}
