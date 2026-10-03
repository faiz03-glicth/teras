/**
 * Runs an Expo CLI command as "Teras Local" (`APP_VARIANT=local`, app ID `com.faiz.teras.local`), so a
 * build made on this computer installs next to the EAS-built "Teras" instead of clashing with it: the two
 * are signed with different keys, and Android refuses to replace one with the other.
 *
 * `npm run android` and `npm start` go through here. A plain `npx expo run:android` does not, and builds
 * the store ID — which is why this exists: setting the variable by hand is easy to forget, and the shell
 * syntax differs between PowerShell and Git Bash. EAS never runs this; its builds stay "Teras".
 *
 * Usage: node scripts/expo-local.js <expo args…>   e.g.  node scripts/expo-local.js run:android
 */
const { spawnSync } = require('node:child_process');

const result = spawnSync('npx', ['expo', ...process.argv.slice(2)], {
  stdio: 'inherit',
  // npx is a .cmd on Windows, which only runs through a shell.
  shell: process.platform === 'win32',
  env: { ...process.env, APP_VARIANT: 'local' },
});

process.exit(result.status ?? 1);
