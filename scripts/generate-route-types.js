/**
 * Regenerates .expo/types/router.d.ts (Expo Router typed routes) without starting Metro.
 *
 * Why: on Windows, the Metro watch handler in @expo/cli treats files outside app/ as routes
 * (it checks `relative.startsWith('../')`, but Windows paths use '..\'), which makes route parsing
 * fail and drops every real route from the declarations. This script calls Expo's own generator
 * with a clean require.context of app/, so `tsc` always checks hrefs against the real routes.
 */
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const appRoot = path.join(projectRoot, 'app');
process.env.EXPO_ROUTER_APP_ROOT = appRoot;

const expoDir = path.dirname(require.resolve('expo/package.json', { paths: [projectRoot] }));
const cliDir = path.dirname(require.resolve('@expo/cli/package.json', { paths: [expoDir] }));
const routerServerDir = path.dirname(
  require.resolve('@expo/router-server/package.json', { paths: [cliDir] }),
);

const { getTypedRoutesDeclarationFile } = require(path.join(routerServerDir, 'build/typed-routes/generate'));
const { requireContext } = require(
  require.resolve('expo-router/internal/testing', { paths: [routerServerDir] }),
);
const { EXPO_ROUTER_CTX_IGNORE } = require(
  require.resolve('expo-router/_ctx-shared', { paths: [routerServerDir] }),
);

const declarations = getTypedRoutesDeclarationFile(requireContext(appRoot, true, EXPO_ROUTER_CTX_IGNORE));
if (!declarations) throw new Error('Expo Router returned no typed route declarations.');

const outDir = path.join(projectRoot, '.expo', 'types');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'router.d.ts'), declarations);
console.log('Typed routes written to .expo/types/router.d.ts');
