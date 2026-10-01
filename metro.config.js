const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle migrations are imported as .sql files.
config.resolver.sourceExts.push('sql');

// Native Android build output, including each library's node_modules/*/android/build: Metro never needs
// it, and a Gradle build writes and deletes thousands of files there. Without Watchman (Windows), Metro's
// watcher scans every folder it knows for each deleted file, which pinned the dev server for over an hour
// after a build, too busy to serve assets (the dev build's sound effects then failed to load).
config.resolver.blockList = [
  ...[config.resolver.blockList].flat().filter(Boolean),
  /(^|[\\/])android[\\/](app[\\/])?(build|\.cxx)([\\/]|$)/,
];

module.exports = config;
